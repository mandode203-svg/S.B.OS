# SmartOrder AI

SaaS platform for African restaurants, bars, hotels, and caterers to manage orders, reservations, clients, staff, marketing campaigns, payments, and reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib type declarations (run this after schema changes before typechecking api-server)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter routing, TanStack Query, Recharts, socket.io-client
- API: Express 5, JWT auth (jsonwebtoken + bcryptjs), Socket.io realtime
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schema (businesses, products, orders, reservations, clients, staff, campaigns, transactions)
- `lib/db/src/index.ts` — DB connection + exports all schema tables
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + signToken
- `artifacts/api-server/src/lib/socket.ts` — Socket.io setup + emit helpers
- `artifacts/smartorder/src/pages/` — all frontend pages
- `artifacts/smartorder/src/hooks/useAuth.tsx` — auth context + JWT in localStorage

## Architecture decisions

- JWT stored as `smartorder_token` in localStorage; `custom-fetch.ts` auto-attaches it to all API calls
- Socket.io path is `/api/socket.io`; clients join room `business:<id>` and receive `order:new` / `order:updated` events
- Orders can be placed publicly (no auth) at `POST /api/orders`; the public storefront URL is `/order/:slug`
- Business slug auto-generated from name at registration, deduplicated with numeric suffix
- After any `lib/db` schema changes: run `pnpm run typecheck:libs` before typechecking api-server, then `pnpm --filter @workspace/db run push`

## Product

- **Landing page** — marketing page at `/` with features, testimonials, CTA
- **Auth** — `/register` and `/login` with JWT, business profile stored in localStorage
- **Dashboard** — 10 protected pages: Tableau de bord, Catalogue, Commandes, Réservations, Clients, Personnel, Marketing, Paiements, Rapports, Paramètres
- **Public order page** — `/order/:slug` — clients browse menu and place orders without account
- **Realtime** — Socket.io pushes new orders to the dashboard instantly

## Design system

- Dark only: `#0B0A08` background, `#1A1814` cards, `#E8A325` gold primary, `#FAF5E8` cream text
- 4px border radius, Syne (headings) + DM Sans (body) fonts
- Amount format: "15 000 FCFA" (fr-FR locale)

## User preferences

_Populate as you build._

## Gotchas

- After changing `lib/db` schemas, always run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck`
- Do not run `pnpm dev` at workspace root — use workflow restart instead
- JWT secret defaults to a hardcoded string; set `JWT_SECRET` env var in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
