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
cd client && npm install && npm start
```

## Stack

- React 18 + Material UI + Recharts
- Express + TypeScript + PostgreSQL 15
- Docker Compose for local dev only
