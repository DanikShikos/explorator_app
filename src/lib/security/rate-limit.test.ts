import { describe, expect, it } from "vitest";
import {
  BOOK_UPLOAD_LIMIT,
  NOTES_EXPORT_LIMIT,
  QUIZ_GENERATION_LIMIT,
  SHARE_PUBLIC_LIMIT,
  clientIpFromRequest,
  consumeRateLimit,
  fixedWindowDecision,
  rateLimitMode,
  rateLimitSubjectFromIp,
} from "./rate-limit";
import { isCrossOrigin } from "./request-guards";

describe("rateLimitMode", () => {
  it("uses Upstash when both REST settings exist", () => {
    expect(
      rateLimitMode({
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
        NODE_ENV: "production",
      }),
    ).toBe("upstash");
  });

  it("fails closed in production without Upstash", () => {
    expect(rateLimitMode({ NODE_ENV: "production" })).toBe("closed");
    expect(rateLimitMode({ VERCEL_ENV: "production" })).toBe("closed");
  });

  it("uses a process window outside production", () => {
    expect(rateLimitMode({ NODE_ENV: "development" })).toBe("memory");
    expect(rateLimitMode({ NODE_ENV: "test" })).toBe("memory");
  });
});

describe("fixedWindowDecision", () => {
  it("allows counts inside the window and blocks the next one", () => {
    expect(fixedWindowDecision(1, 2)).toEqual({ allowed: true, remaining: 1 });
    expect(fixedWindowDecision(2, 2)).toEqual({ allowed: true, remaining: 0 });
    expect(fixedWindowDecision(3, 2)).toEqual({ allowed: false, remaining: 0 });
  });
});

describe("consumeRateLimit (in-process memory)", () => {
  const env = { NODE_ENV: "test" as const };

  it("allows under the quiz-ai limit then returns 429", async () => {
    const subject = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0001";
    const limit = 2;
    const windowSec = 60;

    const first = await consumeRateLimit("quiz-ai", subject, limit, windowSec, env);
    const second = await consumeRateLimit("quiz-ai", subject, limit, windowSec, env);
    const third = await consumeRateLimit("quiz-ai", subject, limit, windowSec, env);

    expect(first).toEqual({ ok: true, remaining: 1 });
    expect(second).toEqual({ ok: true, remaining: 0 });
    expect(third).toEqual({
      ok: false,
      status: 429,
      error: "Слишком много запросов к генерации. Подождите и попробуйте снова.",
    });
  });

  it("isolates subjects so one user over-limit does not block another", async () => {
    const a = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0002";
    const b = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0003";
    const limit = 1;
    const windowSec = 60;

    expect(await consumeRateLimit("quiz-ai", a, limit, windowSec, env)).toMatchObject({ ok: true });
    expect(await consumeRateLimit("quiz-ai", a, limit, windowSec, env)).toMatchObject({
      ok: false,
      status: 429,
    });
    expect(await consumeRateLimit("quiz-ai", b, limit, windowSec, env)).toMatchObject({ ok: true });
  });

  it("allows under notes-export then returns 429", async () => {
    const subject = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0010";
    const first = await consumeRateLimit("notes-export", subject, 1, 60, env);
    const second = await consumeRateLimit("notes-export", subject, 1, 60, env);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it("allows under book-upload then returns 429", async () => {
    const subject = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0011";
    const first = await consumeRateLimit("book-upload", subject, 1, 60, env);
    const second = await consumeRateLimit("book-upload", subject, 1, 60, env);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it("keeps quiz / notes-export / book-upload buckets independent", async () => {
    const subject = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeee0012";
    expect(await consumeRateLimit("quiz-ai", subject, 1, 60, env)).toMatchObject({ ok: true });
    expect(await consumeRateLimit("quiz-ai", subject, 1, 60, env)).toMatchObject({
      ok: false,
      status: 429,
    });
    expect(await consumeRateLimit("notes-export", subject, 1, 60, env)).toMatchObject({ ok: true });
    expect(await consumeRateLimit("book-upload", subject, 1, 60, env)).toMatchObject({ ok: true });
  });

  it("allows under share-public then returns 429", async () => {
    const subject = rateLimitSubjectFromIp("203.0.113.50");
    const first = await consumeRateLimit("share-public", subject, 1, 60, env);
    const second = await consumeRateLimit("share-public", subject, 1, 60, env);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: false, status: 429 });
  });

  it("exposes limit constants used by quiz / export / upload / share", () => {
    expect(QUIZ_GENERATION_LIMIT.limit).toBeGreaterThan(0);
    expect(QUIZ_GENERATION_LIMIT.windowSec).toBeGreaterThan(0);
    expect(NOTES_EXPORT_LIMIT.limit).toBeGreaterThan(0);
    expect(NOTES_EXPORT_LIMIT.windowSec).toBeGreaterThan(0);
    expect(BOOK_UPLOAD_LIMIT.limit).toBeGreaterThan(0);
    expect(BOOK_UPLOAD_LIMIT.windowSec).toBeGreaterThan(0);
    expect(SHARE_PUBLIC_LIMIT.limit).toBeGreaterThan(0);
    expect(SHARE_PUBLIC_LIMIT.windowSec).toBeGreaterThan(0);
  });
});

describe("rateLimitSubjectFromIp / clientIpFromRequest", () => {
  it("maps IP to a stable UUID-shaped subject for consumeRateLimit", () => {
    const a = rateLimitSubjectFromIp("203.0.113.10");
    const b = rateLimitSubjectFromIp("203.0.113.10");
    const c = rateLimitSubjectFromIp("203.0.113.11");
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("reads the first x-forwarded-for hop", () => {
    const request = new Request("https://example.test/api/share/x", {
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
    });
    expect(clientIpFromRequest(request)).toBe("198.51.100.7");
  });
});

describe("isCrossOrigin", () => {
  it("treats a missing Origin as same-party", () => {
    expect(isCrossOrigin(null, "localhost:3000")).toBe(false);
  });

  it("rejects another host and a broken Origin", () => {
    expect(isCrossOrigin("https://evil.example", "localhost:3000")).toBe(true);
    expect(isCrossOrigin("not a url", "localhost:3000")).toBe(true);
    expect(isCrossOrigin("http://localhost:3000", "localhost:3000")).toBe(false);
  });
});
