# AGENTS.md

## Project: Friedrich Salomon

A lightweight, self-hosted curated picture gallery. Next.js 16 + SQLite + Tailwind.

## Commands

```bash
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
npm run migrate      # Run DB migrations
npm run seed:admin -- <password>          # Set admin password
npm run seed:admin -- --force <password>  # Overwrite admin password
npm run import:usb   # Import images from USB_SOURCE_DIR
```

Always run `npm run typecheck` and `npm run lint` after changes. Both must pass with zero errors.

## Architecture

### Runtime
- Next.js 16 with Turbopack (default). Native modules (`better-sqlite3`, `sharp`) configured via `serverExternalPackages` in `next.config.ts`.
- Next 16 renamed `middleware.ts` → `proxy.ts` (function `middleware` → `proxy`). Proxy uses Node.js runtime.
- `server-only` package omitted from shared lib files — it breaks tsx scripts. Server/client boundary enforced by file structure and Next's RSC system.

### Database
- SQLite (`better-sqlite3`, WAL mode). Auto-migrates on first `getDb()` call.
- Schema: `node` (recursive tree), `node_translation` (per-locale title/body), `settings` (KV), `otp_code` (history).
- Migrations are versioned in `src/lib/migrations.ts`.

### Auth
- Two JWT types: viewer (72h) and admin (8h), both HS256 via `jose`.
- OTP: single shared code. `OTP_CODE` in `.env` takes precedence (no expiry, not revocable from dashboard). DB-stored codes are rotatable/revocable.
- Admin: bcrypt hash in `settings` table or `ADMIN_PASSWORD_HASH` env.
- `src/proxy.ts` gates all routes. Run `npm run seed:admin -- <pw>` to set the password.

### i18n
- Split: `src/lib/i18n-dict.ts` (client-safe: types, dictionaries, `makeT`) and `src/lib/i18n.ts` (server-only: `getLocale` via `next/headers`). Client components must import from `i18n-dict`, not `i18n`.
- German (de) is default and required. English (en) is optional per-node, falls back to de.
- Locale stored in `fs_locale` cookie. Switched via `/api/locale/[locale]` redirect.

### Gallery layout
- BSP guillotine packing algorithm in `src/lib/layout.ts`. NOT justified rows (those force same-height rows). The algorithm places images at their natural aspect ratio, splits remaining space into free rects, and picks the rect each image fills best (fill-ratio scoring).
- Pre-computed at 6 breakpoints (480–2560px). Client `ResizeObserver` picks the active layout.
- `JustifiedGallery` is a client component (uses `ResizeObserver`, `GalleryImage`). `CollectionView` is server (builds layout items, calls `computeResponsiveLayout`).

### Images
- Stored in `public/uploads/` (gitignored). Thumbnails (`.thumb.ext`) via `sharp`.
- Served via tokenized URLs (`/api/image/[token]`) — 1h JWT, `Cache-Control: no-store`.
- Image dimensions read via `sharp().metadata()` for the layout algorithm.

### Server/client boundary
- Server components cannot pass event handlers (`onContextMenu`, etc.) to client components. Use dedicated client components (`GalleryImage`, `ProtectedImage`, `DownloadGuard`) for interactive image elements.
- Client components cannot access static properties on server-imported client-component references. Use separate named exports.
- `useFormState` is deprecated in React 19 → use `useActionState` from `react` (not `react-dom`). `useFormStatus` still from `react-dom`.

### ESLint
- Flat config (`eslint.config.mjs`) with `typescript-eslint`. `eslint-config-next` flat config API varies by version — we use the standalone `typescript-eslint` config to avoid version issues.
- `next lint` is removed in Next 16. Use `npx eslint src/`.

## Conventions

- No comments unless explaining non-obvious logic.
- Conventional commit messages (`feat:`, `fix:`, `chore:`, `refactor:`).
- Match existing file style and patterns.
- Never force-push to main.
- Never commit `.env`, `data/`, or `public/uploads/`.

## Key files

- `src/lib/layout.ts` — BSP packing algorithm + responsive layout computation
- `src/lib/nodes.ts` — Node CRUD, tree traversal, slug management
- `src/components/JustifiedGallery.tsx` — Client gallery rendering with ResizeObserver
- `src/components/CollectionView.tsx` — Server component that builds + computes layout
- `src/proxy.ts` — Route gating
- `scripts/import-usb.ts` — USB import with dedup (` a.` files skipped), cover detection
