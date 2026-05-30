# Personal Net Worth Tracker

A local-only app to track your net worth over time. Enter assets, liabilities, income, and expenses manually — no bank connections.

## Features

- **Assets & liabilities** with value history and "as of" dates
- **Monthly snapshots** to chart net worth over years
- **Cash flow** from income and expenses on the dashboard
- **Transactions ledger** for actual income/spending events, with category filtering and CSV import
- **Insights** — rule-based observations (emergency-fund runway, savings rate, allocation concentration, high-interest debt, actual-vs-planned spending, net-worth trend)
- **Optional local AI analysis** via Ollama — a small open-source model turns your metrics into a plain-language summary, entirely on-device
- **Investment forecasting** with monthly DCA and pessimistic / expected / optimistic return scenarios
- **JSON backup/restore** for long-term data safety

## Quick start (Docker)

```bash
./setup.sh
docker compose up -d
```

- Frontend: http://localhost:3000
- API: http://localhost:5000/api
- Postgres: `localhost:5432` (user `pfsm_user`, db `personal_finance_db`)

Data persists in the Docker volume `postgres_data`.

### Permissions (new machine / clone)

Containers run an entrypoint as root that:

1. Creates an `app` user with your host UID/GID (from `.env`, written by `setup.sh`)
2. Owns `node_modules`, `uploads`, `logs`, and lockfiles inside the container
3. Runs `npm ci` when `package.json` or `package-lock.json` changes

You should **not** need `npm install` on the host for Docker. Dependencies live in named volumes (`backend_node_modules`, `frontend_node_modules`), not in your repo tree.

If you skip `setup.sh`, copy `env.docker.example` to `.env` and set `DOCKER_UID` / `DOCKER_GID` to `id -u` and `id -g`.

To reset dependency volumes (permissions, or after major frontend dependency changes such as the Vite migration):

```bash
docker compose down
docker volume rm personal-finance_backend_node_modules personal-finance_frontend_node_modules
docker compose up -d --build
```

(Volume names are prefixed with the compose project name; run `docker volume ls` if yours differs.)

## Database migrations

The baseline schema is created by `server/database/init.sql` on first database creation. Incremental schema changes live in `server/database/migrations/*.sql` and are applied automatically on server startup by the migration runner (`server/src/database/migrate.ts`), which records applied files in a `schema_migrations` table.

To add a schema change, drop a new numbered file (e.g. `004_my_change.sql`) in the migrations folder. Write it idempotently (`IF NOT EXISTS`, etc.) and it will be applied once on the next start — **no need to wipe the database**.

If you ever do want a full reset (wipes all data — **export a backup first**):

```bash
docker compose down -v
docker compose up -d
```

## Where to put things

| What | Where |
|------|--------|
| ETF / brokerage portfolio value | **Assets** → type *Investment* or *Retirement* |
| Planned €/month into ETFs | Same asset → **Monthly contribution** (not Expenses) |
| Expected return scenarios | Same asset → pessimistic / expected / optimistic % per year |
| Forecast chart & DCA vs surplus | **Investments** page |
| Mortgage balance & payment | **Liabilities** (payments count in cash flow automatically) |
| Rent, food, bills | **Expenses** |
| Salary | **Income** |
| Actual purchases/deposits that happened | **Transactions** (or import a CSV) |
| Automated observations & alerts | **Insights** |

**Do not** add your monthly ETF buy as an Expense — that would double-count against cash flow. Update **current value** when you get a broker statement; use **contribution** for your plan.

## Investments and forecasting

1. Add an asset (e.g. "Brokerage ETFs"), type **Investment account**.
2. Set **current value**, **as of** month, **monthly contribution**, and three return rates (defaults 4% / 7% / 10%).
3. Open **Investments** for the forecast band and whether your DCA fits monthly surplus.
4. The **Dashboard** net worth chart shows recorded snapshots plus a forward forecast band.

Forecasts are deterministic illustrations, not predictions.

## Transactions & insights

- **Transactions** records what actually happened (a grocery purchase, a salary deposit). Add them manually or import a bank CSV — the import dialog lets you map columns (date / amount / description / category) and decide how inflow vs outflow is determined.
- **Insights** computes deterministic, rule-based observations from your data (no API keys required, always works). The dashboard shows the most actionable ones; the Insights page shows them all with supporting metrics.

## Optional local AI analysis (Ollama)

The Insights page can generate a written analysis of your finances using a **local** open-source model via [Ollama](https://ollama.com). Everything runs on your machine; no data leaves it. It's shipped as an optional Docker Compose profile, so the app runs fine without it.

Enable it:

```bash
# Start the stack with the LLM profile and the feature flag
LLM_ENABLED=true docker compose --profile llm up -d

# Pull the default small, CPU-friendly model once (~2 GB)
docker compose --profile llm exec ollama ollama pull llama3.2:3b
```

Then open **Insights → AI analysis** and click *Generate analysis*. On CPU-only machines this can take a while. Configure a different model with `OLLAMA_MODEL` (and `OLLAMA_URL` if Ollama runs elsewhere). When the profile is off, the panel shows a setup hint instead.

## Backup

Use **Backup** in the sidebar to download a JSON file. Store it somewhere safe outside Docker. Import replaces all data. Backups are versioned (v3 includes transactions); older v1/v2 files still import.

## Development without Docker

```bash
cp server/env.example server/.env
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

### Tests

```bash
cd server && npm test   # Jest (projection math, insight rules, transaction service)
cd client && npm test   # Vitest (currency, CSV import, dashboard-derived calculations)
```

## Stack

- React 18 + Vite + Material UI + Chart.js + Nivo, data fetching via TanStack Query (React Query)
- Express + TypeScript + PostgreSQL 15, raw SQL with a lightweight migration runner
- Optional local LLM via Ollama (open-source, on-device)
- Docker Compose for local dev only
