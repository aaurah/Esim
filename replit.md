# Wayline eSIM

A privacy-conscious global eSIM storefront and operations console, currently running in a clearly labeled sandbox while authorized telecom and payment providers are not configured.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/wayline-esim run typecheck` — check the web app
- `pnpm --filter @workspace/api-server run typecheck` — check API routes
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- After schema changes, seed the development database with demo catalog rows. These examples are not verified carrier coverage or live wholesale inventory.
- Live eSIM provisioning and payments are intentionally disabled until authorized providers are configured and verified.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/wayline-esim` — customer storefront, help/setup pages, and read-only operations console
- `artifacts/api-server` — shared `/api` Express service
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/esim-catalog.ts` — persisted demo plan and coverage-region schema
- `lib/api-client-react` and `lib/api-zod` — generated client hooks and request/response validation

## Architecture decisions

- Catalog and coverage examples are persisted in PostgreSQL but carry a `demoOnly` marker and must not be presented as live telecom inventory.
- Admin endpoints are read-only and expose only non-sensitive readiness counts; do not add mutations or secrets to the public surface.
- No live checkout or provisioning path exists yet. Never report payment settlement, QR activation, recharge, or network access as successful without provider confirmation.
- No eSIM-supplier or BTCPay Server Replit connector was available when checked. Future direct API adapters must keep credentials server-side in Replit Secrets and remain disabled until configured and tested.
- Add authenticated admin access and role checks before implementing provider configuration, customer records, or administrative writes.

## Product

Users can browse sample country and regional data plans, compare allowance and validity, explore sample coverage, use the compatibility checker, and read setup/support guidance. Operators can view sandbox readiness and integration status.

## User preferences

- Use original branding and privacy-aware positioning; do not promise anonymity or untraceability.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run API code generation before using the updated types or hooks.
- The API uses the workspace's `/api` prefix and Replit-managed routing; do not add a Vite proxy or hard-code localhost into frontend requests.
- Payment settlement and telecom provisioning are not active. Keep all UI labels explicit about sandbox examples versus real service.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
