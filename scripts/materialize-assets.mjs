import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "tools", "game-assets");
const publicDir = join(root, "public");

function walk(dir, prefix = "") {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${name.name}` : name.name;
    if (name.isDirectory()) out.push(...walk(join(dir, name.name), rel));
    else out.push(rel);
  }
  return out;
}

mkdirSync(join(publicDir, "game"), { recursive: true });

for (const rel of walk(srcDir)) {
  if (!rel.endsWith(".b64")) continue;
  const outRel = rel.slice(0, -4);
  const outPath = join(publicDir, outRel);
  if (existsSync(outPath)) continue;
  mkdirSync(dirname(outPath), { recursive: true });
  const b64 = readFileSync(join(srcDir, rel), "utf8").replace(/\s+/g, "");
  writeFileSync(outPath, Buffer.from(b64, "base64"));
}
