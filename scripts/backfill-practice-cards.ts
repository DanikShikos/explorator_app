/**
 * One-shot BE-006 backfill: persist grounded practice cards for a stored path
 * without wiping lesson_nodes / user_node_progress. Does not print secrets.
 *
 * Usage (PowerShell):
 *   npx tsx scripts/backfill-practice-cards.ts <bookId> <userId>
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const bookId = process.argv[2];
  const userId = process.argv[3];
  if (!bookId || !userId) {
    console.error("Usage: npx tsx scripts/backfill-practice-cards.ts <bookId> <userId>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing in env");
    process.exit(1);
  }

  const { backfillMissingPracticeCards } = await import("../src/lib/ai/book-processor");
  const result = await backfillMissingPracticeCards(bookId, userId);
  console.log(
    JSON.stringify({
      wrote: result.wrote,
      chapters: result.chapters,
      nodesAttempted: result.nodesAttempted,
    }),
  );
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
