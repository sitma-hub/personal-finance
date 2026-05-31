# Personal Net Worth Tracker

A local-only app to track your net worth over time. Enter assets, liabilities, income, and expenses manually — no bank connections.

## Features

- **Assets & liabilities** with value history and "as of" dates
- **Monthly snapshots** to chart net worth over years
- **Cash flow** from income and expenses on the dashboard
- **Transactions ledger** for actual income/spending events, with category filtering and CSV import
- **Insights** — rule-based observations (emergency-fund runway, savings rate, allocation concentration, high-interest debt, actual-vs-planned spending, net-worth trend)
- **Optional local AI analysis** via Ollama — Qwen3 8B turns your metrics into a plain-language summary, entirely on-device
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

The Insights page can generate a written analysis of your finances using a **local** open-source model (Qwen3 8B by default) via [Ollama](https://ollama.com). Everything runs on your machine; no data leaves it.

### Recommended: Windows Ollama on NVIDIA GPU (hybrid laptops)

If Task Manager shows **GPU 0 (Intel UHD)** busy but **GPU 1 (NVIDIA)** at 0%, Docker Ollama inside WSL is likely using the NVIDIA card in a way Windows does not display. **Run Ollama natively on Windows** instead so GPU 1 is used and visible.

In **PowerShell** (Windows):

```powershell
cd \\wsl$\Ubuntu\home\petershofen\code\projects\react\personal-finance
.\scripts\setup-ollama-windows.ps1
```

Or manually:

1. Install [Ollama for Windows](https://ollama.com/download)
2. **Settings → System → Display → Graphics** → add `ollama.exe` → **High performance** (NVIDIA RTX A1000)
3. Pull the model: `ollama pull qwen3:8b`
4. Stop Docker Ollama (frees port 11434): `docker compose --profile llm stop ollama`
5. Ensure project root `.env` has:
   ```env
   LLM_ENABLED=true
   OLLAMA_URL=http://host.docker.internal:11434
   OLLAMA_NUM_CTX=4096
   ```
6. Restart backend: `docker compose up -d backend`

Then open **Insights → AI analysis** and click *Generate analysis*. Watch **GPU 1** in Task Manager — use the **CUDA / Compute** graph (not 3D). GPU 0 (Intel) activity from the browser is normal.

### Alternative: Docker Ollama (Linux / headless)

```bash
OLLAMA_URL=http://ollama:11434 LLM_ENABLED=true docker compose --profile llm up -d
docker compose --profile llm exec ollama ollama pull qwen3:8b
```

Configure a different model with `OLLAMA_MODEL`: use `qwen3:14b` if you have ~12 GB+ VRAM, or `qwen3:4b` for a lighter setup. Set `OLLAMA_THINK=true` for deeper Qwen3 reasoning at the cost of speed.

### GPU notes

- **GPU 0** = Intel UHD (display, browser) — ignore for LLM
- **GPU 1** = NVIDIA RTX A1000 — where Ollama should run
- With 6 GB VRAM, keep `OLLAMA_NUM_CTX=4096` for full GPU offload with `qwen3:8b`

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
- Optional local LLM via Ollama (Qwen3 8B default, open-source, on-device)
- Docker Compose for local dev only
