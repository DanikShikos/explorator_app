import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\r\n]*/g, "");
}

const forbidden = [
  { name: "DROP TABLE", pattern: /\bdrop\s+table\b/i },
  { name: "DROP SCHEMA", pattern: /\bdrop\s+schema\b/i },
  { name: "TRUNCATE", pattern: /^\s*truncate\b/im },
];

async function sqlFiles(dir) {
  const found = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await sqlFiles(path)));
    } else if (entry.name.endsWith(".sql")) {
      found.push(path);
    }
  }
  return found;
}

const roots = ["drizzle", "scripts/security"];
const files = (await Promise.all(roots.map((dir) => sqlFiles(dir)))).flat();
const hits = [];

for (const file of files) {
  const text = stripComments(await readFile(file, "utf8"));
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) {
      hits.push(`${file}: ${rule.name}`);
    }
  }
}

if (hits.length > 0) {
  console.error("Destructive SQL is not allowed in reviewed migrations:");
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log(`Migration scan ok (${files.length} sql files, no DROP TABLE / DROP SCHEMA / TRUNCATE).`);
