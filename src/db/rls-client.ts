import type postgres from "postgres";
import { cache } from "react";
import { after } from "next/server";
import { databaseUserId } from "@/lib/current-user";

type Sql = ReturnType<typeof postgres>;
type Tx = postgres.TransactionSql;
type Reserved = Sql & { release: () => void };

let pool: Sql | null = null;

export function rememberPool(client: Sql) {
  pool = client;
}

async function resolveUserId() {
  try {
    const userId = await databaseUserId();
    return /^[0-9a-f-]{36}$/i.test(userId) ? userId : "";
  } catch {
    return "";
  }
}

const requestScope = cache(async () => {
  if (!pool) {
    throw new Error("Database pool is not ready");
  }
  const userId = await resolveUserId();
  const reserved = (await pool.reserve()) as Reserved;
  await reserved`select set_config('request.jwt.claim.sub', ${userId}, false)`;
  await reserved`set role authenticated`;
  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    try {
      await reserved`reset role`;
      await reserved`select set_config('request.jwt.claim.sub', '', false)`;
    } catch {
      // The connection may already be closed.
    }
    reserved.release();
  };
  after(() => {
    void release();
  });
  return reserved;
});

/**
 * Drizzle calls either `await client.unsafe(sql, params)` or
 * `await client.unsafe(sql, params).values()`. The query must start only once.
 */
function scopedUnsafe(query: string, params: unknown[] | undefined) {
  let mode: "rows" | "values" = "rows";
  let pending: Promise<unknown> | null = null;
  const start = () => {
    if (!pending) {
      pending = (async () => {
        const reserved = await requestScope();
        const result = reserved.unsafe(query, (params ?? []) as never[]);
        return mode === "values" ? result.values() : result;
      })();
    }
    return pending;
  };
  const thenable = {
    then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
      return start().then(onFulfilled, onRejected);
    },
    catch(onRejected?: (reason: unknown) => unknown) {
      return start().catch(onRejected);
    },
    finally(onFinally?: () => void) {
      return start().finally(onFinally);
    },
    values() {
      mode = "values";
      return thenable;
    },
  };
  return thenable;
}

/** Queries in one request share a connection already switched to the signed-in user. */
export function scopeSqlClient(client: Sql): Sql {
  rememberPool(client);
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "unsafe") {
        return (query: string, params?: unknown[]) => scopedUnsafe(query, params);
      }
      if (prop === "begin") {
        return (optionsOrFn: unknown, maybeFn?: (tx: Tx) => Promise<unknown>) => {
          const fn = (typeof optionsOrFn === "function" ? optionsOrFn : maybeFn) as
            | ((tx: Tx) => Promise<unknown>)
            | undefined;
          const options = typeof optionsOrFn === "function" ? undefined : optionsOrFn;
          const run = async () => {
            const reserved = await requestScope();
            const invoke = async (tx: Tx) => fn?.(tx);
            return options === undefined ? reserved.begin(invoke) : reserved.begin(options as never, invoke);
          };
          return run();
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Sql;
}

