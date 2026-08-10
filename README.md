# mariam.art

Персональная галерея работ. Astro (статика) → GitHub Pages.

Сейчас сайт публикуется на **https://marmrtnv.github.io/mariam.art/**.
Переезд на собственный домен — в конце файла.

## Быстрый старт

```bash
npm ci        # поставить зависимости (нужен Node 20+)
npm run dev   # локальный сервер, http://localhost:4321/mariam.art/
npm run build # собрать в dist/
```

## Как добавить работы

1. Положи картинки (jpg/png/webp) в папку `inbox/` в корне проекта.
2. `npm run ingest` — каждая картинка сожмётся до 3840px и попадёт в `src/assets/photos/`,
   рядом появится карточка `src/content/photos/<slug>.yaml` с датой из EXIF и пустыми тегами.
   Оригиналы уедут в `inbox/_done/`.
3. Проставь темы в YAML (список тем — в `src/themes.json`):

   ```yaml
   title: ""
   image: my-work.jpg
   date: 2026-03-14
   tags:
     - painting
     - abstract
   favorite: false
   ```

4. `npm run lqip` — пересчитать размытые превью (blur-up при загрузке).
5. `npm run build` — проверить, что собирается. Дальше `git commit && git push`.

Картинки лежат в репозитории намеренно: сборка идёт в GitHub Actions, доступа к твоему
компьютеру у неё нет. 3840px — компромисс между качеством на 4K-экране и весом репозитория.

## Темы

Список тем и их подписи — один файл `src/themes.json`. Меняешь его — меняются и чипсы-фильтры
в галерее, и пикеры. Ключ (`painting`) идёт в YAML, значение (`Painting`) показывается на сайте.
Порядок ключей = порядок чипсов.

## Пикеры (когда работ много)

* `npm run picker -- <папка>` — HTML-страница для отбора картинок из любой папки: миниатюры,
  просмотр оригинала, галочки. Выбор копируется списком путей.
* `npm run final-picker` — страница по уже добавленному каталогу: отсев (🗑), избранное (★),
  правка тем чипсами. Кнопка **Download** отдаёт `final-decisions.json`.
* `npm run apply-final final-decisions.json` — применить решения (удалить/перетегировать/★),
  затем `npm run lqip && npm run build`.

Обе страницы самодостаточные, открываются двойным кликом, сервер не нужен.

## Деплой

`.github/workflows/deploy.yml` собирает и публикует сайт при каждом push в `main`.

Чтобы это заработало, в репозитории нужно один раз включить Pages:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

⚠️ У приватного репозитория GitHub Pages доступен только на платном плане (GitHub Pro и выше).
На бесплатном — сделай репозиторий публичным, иначе публикация не включится.

Первая сборка идёт дольше обычного: все картинки пережимаются в WebP с нуля.

## Переезд на домен mariam.art

1. Купить домен (`.art` — например Namecheap, Porkbun, Cloudflare).
2. В DNS домена прописать:
   * `A` для `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   * `CNAME` для `www` → `marmrtnv.github.io`
3. В `astro.config.mjs`: `site: 'https://mariam.art'`, строку `base` удалить.
4. Создать файл `public/CNAME` с единственной строкой: `mariam.art`
5. Settings → Pages → Custom domain → `mariam.art`, дождаться проверки, включить **Enforce HTTPS**.

Что править под себя: имя, подпись и контакты в `src/pages/index.astro` и `src/pages/about.astro`
(помечены `TODO`), тексты «Об авторе» там же, аватар — `src/assets/avatar.jpg`.
