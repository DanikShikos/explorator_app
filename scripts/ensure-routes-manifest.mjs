import { readFile, writeFile } from "node:fs/promises";

const manifestPath = ".next/routes-manifest.json";
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

for (const key of ["dataRoutes", "dynamicRoutes", "staticRoutes"]) {
  if (!Array.isArray(manifest[key])) {
    manifest[key] = [];
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
