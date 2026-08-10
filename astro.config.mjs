// @ts-check
import { defineConfig } from 'astro/config';

// Чистая статика для GitHub Pages. Контент — в src/content/photos/*.yaml,
// картинки — в src/assets/photos, добавляются через scripts/ingest.mjs (папка inbox/).
//
// Пока сайт живёт на marmrtnv.github.io/mariam.art/ — отсюда base.
// Переезд на свой домен (см. README): site: 'https://mariam.art', base убрать,
// положить public/CNAME с одной строкой `mariam.art`.
export default defineConfig({
  site: 'https://marmrtnv.github.io',
  base: '/mariam.art',
  output: 'static',
});
