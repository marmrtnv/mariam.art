#!/usr/bin/env node
// Ингест картинок из inbox/ в каталог сайта: EXIF-дата, сжатие до 3840px, YAML-заготовка.
// Темы потом проставляются вручную или Claude Code. Оригиналы храни отдельно — сюда попадают копии.

import fs from "node:fs";
import path from "node:path";
import exifr from "exifr";
import sharp from "sharp";

const ROOT = process.cwd();
const INBOX = path.join(ROOT, "inbox");
const DONE = path.join(INBOX, "_done");
const ASSETS = path.join(ROOT, "src/assets/photos");
const CONTENT = path.join(ROOT, "src/content/photos");
const MAX = 3840;
const QUALITY = 82;
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp"]);

for (const dir of [INBOX, DONE, ASSETS, CONTENT]) fs.mkdirSync(dir, { recursive: true });

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slugify = (name) =>
  name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const taken = new Set(fs.readdirSync(CONTENT).filter((f) => f.endsWith(".yaml")).map((f) => f.slice(0, -5)));
function uniqueSlug(base) {
  let s = base;
  let i = 2;
  while (!s || taken.has(s)) s = `${base || "photo"}-${i++}`;
  taken.add(s);
  return s;
}

const files = fs.readdirSync(INBOX, { withFileTypes: true })
  .filter((e) => e.isFile() && !e.name.startsWith("."))
  .map((e) => e.name);

if (files.length === 0) {
  console.log("inbox пуст — кинь картинки в ./inbox и запусти снова: npm run ingest");
  process.exit(0);
}

const added = [];
const skipped = [];
const withGps = [];

for (const name of files) {
  const ext = path.extname(name).toLowerCase();
  const src = path.join(INBOX, name);
  if (!SUPPORTED.has(ext)) {
    skipped.push(`${name} — формат ${ext || "?"} не поддержан`);
    continue;
  }

  let date;
  try {
    const exif = await exifr.parse(src, { xmp: true, ifd0: true, exif: true, mergeOutput: true });
    const d = exif?.DateTimeOriginal || exif?.CreateDate;
    if (d instanceof Date && !isNaN(d)) date = d;
    const gps = await exifr.gps(src).catch(() => null);
    if (gps && (gps.latitude || gps.longitude)) withGps.push(name);
  } catch {
    /* нет/битый EXIF */
  }
  if (!(date instanceof Date) || isNaN(date)) date = fs.statSync(src).mtime;

  const slug = uniqueSlug(slugify(name) || ymd(date).replace(/-/g, ""));
  const imageName = `${slug}.jpg`;
  await sharp(src)
    .rotate()
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(ASSETS, imageName));

  const yaml =
    `title: ""\nimage: ${imageName}\nsrc: "${name}"\ndate: ${ymd(date)}\n` +
    `tags: []\nfavorite: false\n`;
  fs.writeFileSync(path.join(CONTENT, `${slug}.yaml`), yaml);

  let dest = path.join(DONE, name);
  if (fs.existsSync(dest)) dest = path.join(DONE, imageName);
  fs.renameSync(src, dest);
  added.push({ imageName, date: ymd(date) });
}

console.log(`\nДобавлено: ${added.length}`);
for (const a of added) console.log(`  + ${a.imageName}  дата=${a.date}  (нужны темы)`);
if (skipped.length) { console.log(`\nПропущено: ${skipped.length}`); for (const s of skipped) console.log(`  - ${s}`); }
if (withGps.length) console.log(`\n⚠ В EXIF есть GPS: ${withGps.join(", ")}`);
if (added.length) console.log(`\nДальше: проставь темы в новых YAML, затем npm run lqip и npm run build`);
