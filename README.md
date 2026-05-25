# Personal Net Worth Tracker

A local-only app to track your net worth over time. Enter assets, liabilities, income, and expenses manually — no bank connections.

## Features

- **Assets & liabilities** with value history and "as of" dates
- **Monthly snapshots** to chart net worth over years
- **Cash flow** from income and expenses on the dashboard
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

## Reset database (new schema)

After schema changes (e.g. investment fields):

```bash
docker compose down -v
docker compose up -d
```

This wipes all data. **Export a backup first** from the Backup page if you need to keep anything.

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

**Do not** add your monthly ETF buy as an Expense — that would double-count against cash flow. Update **current value** when you get a broker statement; use **contribution** for your plan.

## Investments and forecasting

1. Add an asset (e.g. "Brokerage ETFs"), type **Investment account**.
2. Set **current value**, **as of** month, **monthly contribution**, and three return rates (defaults 4% / 7% / 10%).
3. Open **Investments** for the forecast band and whether your DCA fits monthly surplus.
4. The **Dashboard** net worth chart shows recorded snapshots plus a forward forecast band.

Forecasts are deterministic illustrations, not predictions.

## Backup

Use **Backup** in the sidebar to download a JSON file. Store it somewhere safe outside Docker. Import replaces all data.

## Development without Docker

```bash
cp server/env.example server/.env
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

## Stack

- React 18 + Vite + Material UI + Recharts
- Express + TypeScript + PostgreSQL 15
- Docker Compose for local dev only
