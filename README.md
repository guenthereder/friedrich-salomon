# Friedrich Salomon

A lightweight, self-hosted picture gallery for curated art works and special photographs. Hierarchical tree navigation, OTP-locked viewer access, admin dashboard curation, multi-language (German default, English later), and download prevention.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set JWT_SECRET, ADMIN_USERNAME, OTP_CODE

# 3. Run migrations (auto-creates data/platform.db)
npm run migrate

# 4. Set the admin password
npm run seed:admin -- <your-password>
# To overwrite later: npm run seed:admin -- --force <new-password>

# 5. (Optional) Import images from USB
npm run import:usb

# 6. Start dev server
npm run dev
```

Visit `http://localhost:3000`. Viewers enter the OTP code; admin logs in at `/admin/login`.

## Access model

### Viewers (OTP)
- Single shared one-time code, entered at `/login`.
- Set via `OTP_CODE` in `.env` (takes precedence, no expiry) or rotated from the admin dashboard (stored in DB, expires after 72h).
- On success: HTTP-only JWT cookie (`fs_session`), 72-hour expiry.
- Admin dashboard can set a custom code, rotate to a random one, or revoke.

### Admin
- Username + bcrypt password at `/admin/login`.
- Set password with `npm run seed:admin -- <password>`.
- Or set `ADMIN_PASSWORD_HASH` in `.env` (bcrypt hash).
- 8-hour JWT session.

### Route gating
`src/proxy.ts` gates all routes. Public paths: `/login`, `/admin/login`, `/_next/*`, `/api/image/*`, `/api/locale/*`. Everything else requires a viewer or admin JWT. `/admin/*` requires an admin JWT.

## Data model

Single recursive `node` table:

- `type`: `collection` (folder) or `image` (leaf)
- `parent_id`: nullable, builds the tree
- `slug`: URL-safe name, unique per parent
- `cover_image_id`: for collections, which child image to use as cover
- `layout`: `split-left` | `split-right` | `below` | `image-only` — controls text/image arrangement on detail pages
- `source_path`: relative path in `public/uploads/` (images only)
- `hidden`: boolean, hides from public view

`node_translation` table stores per-locale `title` and `body_markdown`. German (`de`) is required; English (`en`) is optional and falls back to German.

## Multi-language

- German (de) is the default. English (en) can be added per-node from the admin dashboard.
- Locale stored in `fs_locale` cookie, switched via `/api/locale/[locale]` redirect.
- UI chrome strings are in `src/lib/i18n-dict.ts`. Node content comes from `node_translation`.
- Missing translations fall back to German.

## Gallery layout

The public gallery uses a **BSP (binary space partition) guillotine packing algorithm** (`src/lib/layout.ts`):

- The canvas starts as one rectangle. Each image is placed at its natural aspect ratio (~300px height × aspect-scaled width).
- After placement, the remaining space is split into two free rectangles (right + bottom). Free rects are merged to reduce fragmentation.
- The next image picks the free rect it **fills best** (fill-ratio scoring), not just the topmost one. This prevents narrow portraits from wasting wide rects.
- Result: an organic mosaic where landscapes are wide/short and portraits are narrow/tall, interlocking across rows.
- Pre-computed at 6 breakpoints (480–2560px). Client-side `ResizeObserver` picks the active layout.
- Image dimensions read via `sharp` from the actual files.
- Text blocks (images with article bodies) are treated as placement items with a 1.6:1 aspect ratio, so they flow alongside images.

## Image handling

- Images are stored in `public/uploads/`. Thumbnails (`.thumb.ext`) are generated on import via `sharp` (600px max edge).
- Served via tokenized non-guessable URLs (`/api/image/[token]`). Each URL is a 1-hour JWT containing `nodeId` + `variant` (full/thumb). `Cache-Control: no-store`.
- Import script walks `USB_SOURCE_DIR`, creates collections per folder, imports `.jpg/.jpeg/.png`, uses `Beschreibung-Zettel.jpeg` as collection covers. Skips ` a.` duplicate files.

## Download prevention

Client-side deterrent layer (not foolproof — screenshots still work):

- `DownloadGuard` component: blocks right-click on images, drag, `Ctrl+S/U`, `F12`, `Ctrl+Shift+I/J/C`.
- `ProtectedImage` / `GalleryImage`: `-webkit-user-drag: none`, `user-select: none`, transparent overlay above images.
- Tokenized image URLs with no-store cache.

## Admin dashboard (`/admin`)

- **Tree editor**: recursive tree view with expand/collapse, reorder (↑/↓), delete, create collection, upload images (multi-select). Thumbnails shown for image nodes.
- **Node editor** (`/admin/[nodeId]`): locale tabs (de/en), title + markdown body, layout selector, cover image picker, hidden toggle, slug edit.
- **OTP panel**: show current code, rotate to random, revoke, copy login link.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run migrate` | Run DB migrations |
| `npm run seed:admin -- <pw>` | Set admin password (use `--force` to overwrite) |
| `npm run import:usb` | One-time USB image import |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Tech stack

- **Next.js 16** (App Router, Turbopack, proxy convention)
- **SQLite** via `better-sqlite3` (single file, WAL mode)
- **Tailwind CSS** for styling
- `jose` for JWT, `bcryptjs` for admin password
- `sharp` for image processing / dimension reading
- `react-markdown` + `remark-gfm` for article bodies
- No `next-intl` — lightweight custom i18n (DB translations + in-code dictionary)

## Deployment

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET, ADMIN_USERNAME, OTP_CODE

docker compose up -d --build
docker compose exec app npm run seed:admin -- <your-password>
```

The DB (`data/`) and uploads (`public/uploads/`) persist in named Docker
volumes (`db-data`, `uploads-data`), independent of the container's
lifecycle. The database auto-migrates on first use — no separate migrate
step needed.

Other one-off admin scripts run the same way, e.g.:

```bash
docker compose exec app npm run seed:admin -- --force <new-password>
docker compose exec app npm run import:usb
```

To rebuild after pulling new code: `docker compose up -d --build`.

### Bare Node host

Any Node host with a persistent volume for `data/` and `public/uploads/`:

```bash
npm ci
npm run build
npm run start
```

(`npm run migrate` is optional — the DB auto-migrates on first use. Admin
scripts like `seed:admin` need the `devDependencies` installed since they
run via `tsx`, so don't use `--omit=dev`.)

Set all env vars in `.env`. Ensure `JWT_SECRET` is a strong random string (32+ chars).

## Project structure

```
src/
  app/
    page.tsx              # Public root (all top-level collections)
    [...path]/page.tsx    # Public node detail (collection grid or image)
    login/                # Viewer OTP login
    admin/                # Admin dashboard
      login/              # Admin login
      [nodeId]/           # Node editor
    api/
      image/[token]/      # Tokenized image serving
      locale/[locale]/   # Locale switcher
      translation/        # Translation fetch for editor tabs
  components/
    JustifiedGallery.tsx  # BSP gallery rendering (client, ResizeObserver)
    GalleryImage.tsx      # Client image with download prevention
    CollectionView.tsx    # Server: builds layout items + computes gallery
    ProtectedImage.tsx    # Image with shield overlay (detail pages)
    ArticleBlock.tsx      # Markdown renderer
    DownloadGuard.tsx     # Client-side download prevention
    PublicHeader.tsx      # Public header with locale switcher
    LogoutButton.tsx
  lib/
    layout.ts             # BSP guillotine packing algorithm
    nodes.ts              # Node CRUD, tree traversal
    db.ts                 # SQLite connection (auto-migrates)
    migrations.ts         # Schema versioning
    auth.ts               # JWT issue/verify, session cookies
    admin.ts              # bcrypt password management
    otp.ts                # OTP code management (env or DB)
    images.ts             # Image saving, thumbnail, tokenized URLs
    image-token.ts        # JWT for image URLs
    settings.ts           # Settings KV store
    i18n.ts / i18n-dict.ts # Locale helpers + UI dictionary
    tree.ts               # Recursive tree builder for admin
    constants.ts          # Paths, locales, JWT config, layout enum
    env.ts                # Typed env parsing
  proxy.ts                # Route gating (Next 16 proxy convention)
scripts/
  migrate.ts              # Run migrations
  seed-admin.ts           # Set admin password
  import-usb.ts          # USB image import
```
