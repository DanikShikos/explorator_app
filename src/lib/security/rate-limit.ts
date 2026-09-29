/**
 * Fixed-window limiter for paid AI calls and public share reads.
 * Production without Upstash refuses the call (fail closed).
 * Local/test falls back to one process-local window.
 */

import { createHash } from "node:crypto";

export const QUIZ_GENERATION_LIMIT = { limit: 12, windowSec: 10 * 60 } as const;
export const BOOK_AI_LIMIT = { limit: 6, windowSec: 60 * 60 } as const;
export const NOTES_EXPORT_LIMIT = { limit: 20, windowSec: 10 * 60 } as const;
export const BOOK_UPLOAD_LIMIT = { limit: 10, windowSec: 60 * 60 } as const;
/** Public share/OG card reads (DO-002). Per client IP; no new env names. */
export const SHARE_PUBLIC_LIMIT = { limit: 60, windowSec: 10 * 60 } as const;

const LIMITED = "Слишком много запросов к генерации. Подождите и попробуйте снова.";
const UNAVAILABLE = "Генерация временно закрыта: не настроен лимит запросов.";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; status: 429 | 503; error: string };

type Mode = "upstash" | "memory" | "closed";

type RateLimitEnv = {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

const memory = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMode(env: RateLimitEnv = process.env): Mode {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return "upstash";
  }
  const production = env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
  return production ? "closed" : "memory";
}

export function fixedWindowDecision(count: number, limit: number) {
  const allowed = Number.isFinite(count) && count >= 1 && count <= limit;
  return { allowed, remaining: allowed ? limit - count : 0 };
}

function memoryConsume(key: string, limit: number, windowSec: number, now: number) {
  const current = memory.get(key);
  if (!current || current.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return fixedWindowDecision(1, limit);
  }
  current.count += 1;
  return fixedWindowDecision(current.count, limit);
}

function readCount(payload: unknown): number | null {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "result" in payload
      ? (payload as { result: unknown }).result
      : null;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const first = rows[0] as unknown;
  const value =
    typeof first === "number"
      ? first
      : first && typeof first === "object" && "result" in first
        ? (first as { result: unknown }).result
        : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * First client IP from proxy headers (or loopback). Used only as rate-limit subject input.
 */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "0.0.0.0";
}

/**
 * Maps an IP (or other opaque client key) to a UUID-shaped subject so consumeRateLimit accepts it.
 * Not reversible to the IP; not a security token.
 */
export function rateLimitSubjectFromIp(ip: string): string {
  const hex = createHash("sha256").update(`explorator:rl-ip:${ip}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export async function consumeRateLimit(
  bucket: string,
  subject: string,
  limit: number,
  windowSec: number,
  env: RateLimitEnv = process.env,
): Promise<RateLimitResult> {
  if (!/^[a-z0-9:-]{1,40}$/i.test(bucket) || !/^[0-9a-f-]{36}$/i.test(subject)) {
    return { ok: false, status: 503, error: UNAVAILABLE };
  }

  const mode = rateLimitMode(env);
  if (mode === "closed") {
    return { ok: false, status: 503, error: UNAVAILABLE };
  }

  const key = `explorator:rl:${bucket}:${subject}`;
  if (mode === "memory") {
    const decision = memoryConsume(key, limit, windowSec, Date.now());
    return decision.allowed
      ? { ok: true, remaining: decision.remaining }
      : { ok: false, status: 429, error: LIMITED };
  }

  const url = env.UPSTASH_REDIS_REST_URL ?? "";
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? "";
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, status: 503, error: UNAVAILABLE };
    }
    const count = readCount(await response.json());
    if (count === null) {
      return { ok: false, status: 503, error: UNAVAILABLE };
    }
    const decision = fixedWindowDecision(count, limit);
    return decision.allowed
      ? { ok: true, remaining: decision.remaining }
      : { ok: false, status: 429, error: LIMITED };
  } catch {
    return { ok: false, status: 503, error: UNAVAILABLE };
  }
}
