# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` with App Router in `src/app` (APIs in `src/app/api`).
- UI: `src/components/` (domains like `products/`, `orders/`, `ui/`, `layout/`).
- Logic: `src/actions/` (server actions), `src/lib/` (`queries/`, `schemas/`, utils), `src/hooks/`.
- Backend: `src/server/` (e.g., `src/server/db`); SQL in `drizzle/` with `drizzle.config.ts`.
- Assets & docs: `public/`, `docs/`, `notes/`.
- Tests: `tests/` or co-located `*.test.ts(x)` / `*.spec.ts(x)`.
- Scripts: `scripts/` and `./start-database.sh` (local DB helper).

## Build, Test, and Development Commands
- `pnpm dev`: Run locally with Turbo (HMR).
- `pnpm build`: Production build (Next.js).
- `pnpm preview`: Build then start in production mode.
- `pnpm start`: Start a built app.
- `pnpm check`: ESLint and TypeScript checks.
- `pnpm lint` | `pnpm lint:fix`: Lint / auto-fix.
- `pnpm format:check` | `pnpm format:write`: Prettier check/format.
- DB: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio`.
- Local DB: `./start-database.sh` (requires `.env`).

## Coding Style & Naming Conventions
- TypeScript, React 19, Next.js 15, TailwindCSS 4; 2-space indent; prefer named exports.
- Components: PascalCase in `src/components` (e.g., `InventoryTable.tsx`).
- Hooks: `useX` camelCase in `src/hooks` (e.g., `useDebounce.ts`).
- Schemas: Zod in `src/lib/schemas` (e.g., `order.schema.ts`).
- Keep files small; colocate actions/APIs by domain; minimal necessary comments.

## Testing Guidelines
- No runner configured yet. Place tests in `tests/` or beside modules using `*.test.ts(x)` / `*.spec.ts(x)`.
- Focus on critical paths: orders, items, shipments, auth, API handlers.
- Before PR: run `pnpm check`; ensure DB migrations apply cleanly.

## Commit & Pull Request Guidelines
- Commits: Conventional style (`feat:`, `fix:`, `refactor:`, `chore:`).
- PRs: clear description, linked issues, screenshots/GIFs (for UI), verification steps, and env/migration notes (`drizzle/`).
- Quality bar: pass `pnpm check`, format with `pnpm format:write`, validate `pnpm build`.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets. Runtime env validated via `src/env.js` (`@t3-oss/env-nextjs`).
- Search: see `scripts/` for Typesense deploy/init; restrict keys and domains in production.

## Shopify Setup & Usage
- APIs: Admin GraphQL for back office; Functions for checkout/custom logic. Keep API-specific code under `src/lib/shopify/` or domain folders; colocate server actions in `src/actions`.
- Env: add Shopify keys to `.env` (e.g., `SHOPIFY_SHOP`, `SHOPIFY_ADMIN_API_KEY`, `SHOPIFY_ADMIN_API_SECRET`, `SHOPIFY_ACCESS_TOKEN`). Validate via `src/env.js`.
- Auth & scopes: request least privilege; store tokens securely; never log secrets. For app installs, persist shop + token and enforce RBAC with Better Auth.
- GraphQL: define queries/mutations in `src/lib/queries/shopify/`. Use typed clients and Zod-validate inputs/outputs. Paginate with cursors; handle throttling and retries.
- Webhooks: handle under `src/app/api/webhooks/shopify/[topic]/route.ts`; verify HMAC; log events; idempotently upsert resources.
- Local dev: create a test shop, set callback URLs to Next.js routes, and use `pnpm dev`. For tunneling, use your preferred tool.

## Agent-Specific Instructions
- Backend: use server actions (`src/actions`), validate with Zod, return `ActionResult`, keep Vietnamese messages.
- Frontend: ClientUI → Table/Form/Modal; Shadcn UI; RHF + Zod; solid error/loading states.
- Database: schemas in `src/server/db/schema.ts`; use transactions for inventory ops; paginate and index.
- QR/Scanning: `qrcode` + `qr-scanner` in `src/components/scanner`; support batch scanning and robust errors.
- Status flow: `pending → received → sold → shipped`; consistent color semantics.
- Search: Typesense-first; follow existing patterns; strict TS; test with Vietnamese content.
