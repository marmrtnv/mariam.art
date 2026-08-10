#!/usr/bin/env node
// Генерирует крошечные размытые превью (blur-up) для всех мастеров → src/lqip.json.
// Ключ — slug (имя файла без расширения). Запускать после добавления/переэнкода фото.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ASSETS = "src/assets/photos";
const OUT = "src/lqip.json";

const out = {};
for (const f of fs.readdirSync(ASSETS)) {
  if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
  const slug = f.replace(/\.[^.]+$/, "");
  const buf = await sharp(path.join(ASSETS, f))
    .resize(24, 24, { fit: "inside" })
    .blur(1)
    .webp({ quality: 40 })
    .toBuffer();
  out[slug] = `data:image/webp;base64,${buf.toString("base64")}`;
}

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`lqip: ${Object.keys(out).length} шт., ${(fs.statSync(OUT).size / 1024).toFixed(0)} КБ`);
