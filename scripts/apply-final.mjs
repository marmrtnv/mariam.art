#!/usr/bin/env node
// Применяет решения финального пикера (final-decisions.json).
// remove:true → удаляет .yaml + .jpg; иначе перезаписывает tags (по ORDER) и favorite.
// Использование: node scripts/apply-final.mjs <final-decisions.json>

import fs from "node:fs";

const CONTENT = "src/content/photos";
const ASSETS = "src/assets/photos";
const ORDER = Object.keys(JSON.parse(fs.readFileSync("src/themes.json", "utf8")));

const file = process.argv[2];
if (!file) { console.error("укажи JSON: node scripts/apply-final.mjs <файл>"); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, "utf8"));

let removed = 0, retagged = 0, faved = 0, missing = 0;
for (const r of data) {
  const yamlPath = `${CONTENT}/${r.slug}.yaml`;
  const jpgPath = `${ASSETS}/${r.slug}.jpg`;
  if (!fs.existsSync(yamlPath)) { missing++; continue; }

  if (r.remove) {
    fs.rmSync(yamlPath, { force: true });
    fs.rmSync(jpgPath, { force: true });
    removed++;
    continue;
  }

  let y = fs.readFileSync(yamlPath, "utf8");
  const before = y;
  const tags = [...new Set((r.tags || []).filter((t) => ORDER.includes(t)))]
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const block = tags.length ? "tags:\n" + tags.map((t) => "  - " + t).join("\n") + "\n" : "tags: []\n";
  y = y.replace(/^tags:[\s\S]*?(?=^favorite:)/m, block);
  y = y.replace(/^favorite:.*$/m, `favorite: ${r.favorite ? "true" : "false"}`);
  if (y !== before) {
    fs.writeFileSync(yamlPath, y);
    retagged++;
    if (/^favorite:\s*true/m.test(y)) faved++;
  }
}

console.log(`удалено: ${removed}, перетегировано: ${retagged}, ★ итого: ${faved}` +
  (missing ? `, нет файла: ${missing}` : ""));
console.log("дальше: npm run lqip && npm run build");
