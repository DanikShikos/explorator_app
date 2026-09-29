import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ownsResource,
  rlsOwnerPolicyAllows,
  scopedByOwner,
  SERVER_DEMO_USER_ID,
} from "./tenant-isolation";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";

describe("ownsResource / scopedByOwner (app-layer isolation)", () => {
  it("denies a foreign user id (fail closed)", () => {
    expect(ownsResource(alice, bob)).toBe(false);
    expect(scopedByOwner(alice, bob)).toBe(false);
  });

  it("allows only the matching session owner", () => {
    expect(ownsResource(alice, alice)).toBe(true);
    expect(scopedByOwner(alice, alice)).toBe(true);
  });

  it("denies missing or empty resource owner", () => {
    expect(scopedByOwner(alice, null)).toBe(false);
    expect(scopedByOwner(alice, undefined)).toBe(false);
    expect(scopedByOwner(alice, "")).toBe(false);
  });
});

describe("rlsOwnerPolicyAllows (SQL policy predicate)", () => {
  it("denies another authenticated user reading a non-demo row", () => {
    expect(rlsOwnerPolicyAllows(alice, bob)).toBe(false);
  });

  it("allows the row owner when auth.uid matches", () => {
    expect(rlsOwnerPolicyAllows(alice, alice)).toBe(true);
  });

  it("denies anonymous auth.uid on a normal user row", () => {
    expect(rlsOwnerPolicyAllows(null, alice)).toBe(false);
  });

  it("denies foreign auth on the historical demo UUID row (BUG-S05)", () => {
    expect(rlsOwnerPolicyAllows(bob, SERVER_DEMO_USER_ID)).toBe(false);
  });
});

describe("migration SQL owner policies (repo)", () => {
  const root = join(process.cwd(), "drizzle");
  const securitySql = join(process.cwd(), "scripts", "security");

  function assertNoDemoUuid(sql: string) {
    expect(sql).not.toContain(SERVER_DEMO_USER_ID);
    expect(sql).not.toMatch(/00000000-0000-4000-8000-000000000001/);
    expect(sql).not.toMatch(/or\s+user_id\s*=\s*'00000000/i);
  }

  it("notes / quiz_cards / review_logs policies require auth.uid = user_id", () => {
    const sql = readFileSync(join(root, "0000_init.sql"), "utf8");
    expect(sql).toMatch(/create policy "notes_owner"/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    expect(sql).toMatch(/alter table "notes" enable row level security/i);
    assertNoDemoUuid(sql);
  });

  it("books_owner policy ties books to auth.uid", () => {
    const sql = readFileSync(join(root, "0003_books_security.sql"), "utf8");
    expect(sql).toMatch(/create policy "books_owner"/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    expect(sql).toMatch(/alter table "books" enable row level security/i);
    assertNoDemoUuid(sql);
  });

  it("users_stats owner policy present for hearts isolation intent", () => {
    const sql = readFileSync(join(root, "0002_gamification.sql"), "utf8");
    expect(sql).toMatch(/create policy "users_stats_owner"/i);
    expect(sql).toMatch(/alter table "users_stats" enable row level security/i);
    assertNoDemoUuid(sql);
  });

  it("lesson_nodes / user_node_progress RLS + owner checks without demo UUID (BUG-S02)", () => {
    const sql = readFileSync(
      join(root, "0005_lesson_nodes_progress_rls.sql"),
      "utf8",
    );
    expect(sql).toMatch(/alter table "lesson_nodes" enable row level security/i);
    expect(sql).toMatch(
      /alter table "user_node_progress" enable row level security/i,
    );
    expect(sql).toMatch(/create policy "lesson_nodes_owner"/i);
    expect(sql).toMatch(/create policy "user_node_progress_owner"/i);
    expect(sql).toMatch(/b\.user_id\s*=\s*auth\.uid\(\)/);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    assertNoDemoUuid(sql);
  });

  it("applied owner policies SQL has no demo UUID and covers lesson_nodes (S01/S05)", () => {
    const sql = readFileSync(
      join(securitySql, "rls-owner-policies.sql"),
      "utf8",
    );
    expect(sql).toMatch(/ALTER TABLE "lesson_nodes" ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(
      /ALTER TABLE "user_node_progress" ENABLE ROW LEVEL SECURITY/i,
    );
    expect(sql).toMatch(/CREATE POLICY "lesson_nodes_owner"/i);
    expect(sql).toMatch(/CREATE POLICY "user_node_progress_owner"/i);
    expect(sql).toMatch(/CREATE POLICY "books_owner"/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    assertNoDemoUuid(sql);
  });

  it("allow_server_user migration is owner-only without demo UUID", () => {
    const sql = readFileSync(join(root, "0001_allow_server_user.sql"), "utf8");
    expect(sql).toMatch(/create policy "notes_owner"/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/);
    assertNoDemoUuid(sql);
  });
});
describe("API route auth surface (source contract)", () => {
  const api = join(process.cwd(), "src", "app", "api");

  it("notes export requires session and scopes by books.userId / notes.userId", () => {
    const src = readFileSync(join(api, "notes", "export", "route.ts"), "utf8");
    expect(src).toContain("getCurrentUserId");
    expect(src).toContain("eq(books.userId, userId)");
    // Both bookId and all-notes paths must filter by the session owner.
    expect(src.match(/eq\(notes\.userId,\s*userId\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/catch\s*\{[\s\S]*?status:\s*401/);
    expect(src).toContain('Нужен вход');
    // Foreign book must not select other users' notes (empty docx path).
    expect(src).toContain("buildNotesDocx([])");
  });

  it("notes export enforces app rate limit after session", () => {
    const src = readFileSync(join(api, "notes", "export", "route.ts"), "utf8");
    const get = src.slice(src.indexOf("export async function GET"));
    expect(get).toContain("consumeRateLimit");
    expect(get).toContain("NOTES_EXPORT_LIMIT");
    expect(get.indexOf("getCurrentUserId")).toBeLessThan(get.indexOf("consumeRateLimit"));
    expect(get.indexOf("consumeRateLimit")).toBeLessThan(get.indexOf("buildNotesDocx"));
  });

  it("quiz generate requires session (401) and app rate limit before AI", () => {
    const src = readFileSync(join(api, "quiz", "generate", "route.ts"), "utf8");
    const post = src.slice(src.indexOf("export async function POST"));
    expect(post).toContain("getOptionalUser");
    expect(post).toMatch(/status:\s*401/);
    expect(post).toContain("consumeRateLimit");
    expect(post).toContain("QUIZ_GENERATION_LIMIT");
    expect(post.indexOf("getOptionalUser")).toBeLessThan(post.indexOf("generateObjectWithCredits"));
    expect(post.indexOf("consumeRateLimit")).toBeLessThan(post.indexOf("generateObjectWithCredits"));
  });

  it("public share card is rate-limited and never queries books/notes", () => {
    const src = readFileSync(join(api, "share", "[token]", "route.ts"), "utf8");
    const get = src.slice(src.indexOf("export async function GET"));
    expect(get).toContain("consumeRateLimit");
    expect(get).toContain("SHARE_PUBLIC_LIMIT");
    expect(get).toContain("share-public");
    expect(src).not.toContain("getDb");
    expect(src).not.toMatch(/from ["']@\/db/);
    expect(src).not.toContain("listBooks");
    expect(get.indexOf("consumeRateLimit")).toBeLessThan(get.indexOf("verifyShareToken"));
  });
});

