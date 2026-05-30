import pool from '../config/database';
import { BackupData, BackupIncludes } from '../types';

/**
 * Current backup format.
 * - v2 adds explicit `includes` metadata
 * - v3 adds the transactions ledger
 * - v4 adds transaction kind + liability/expense links
 * - v5 adds debt_planned_component (regular payment vs Sonderzahlung)
 * v1/v2 backups remain importable (transactions simply absent).
 */
const BACKUP_VERSION = 5;
const SUPPORTED_VERSIONS = [1, 2, 3, 4, 5];

const BACKUP_INCLUDES: BackupIncludes = {
  assets: true,
  liabilities: true,
  income_streams: true,
  expenses: true,
  asset_value_history: true,
  liability_balance_history: true,
  net_worth_snapshots: true,
  transactions: true,
  liability_features: [
    'special_repayment',
    'prepayment_penalty',
    'invest_after_payoff',
    'payoff_invest_asset_id',
  ],
  asset_features: [
    'monthly_contribution',
    'return_scenarios',
    'include_in_projection',
  ],
};

function parseBackupPayload(payload: unknown): BackupData {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup file: expected a JSON object');
  }

  const root = payload as Record<string, unknown>;
  if (typeof root['version'] === 'number' && Array.isArray(root['assets'])) {
    return root as unknown as BackupData;
  }

  const wrapped = root['data'];
  if (wrapped && typeof wrapped === 'object' && typeof (wrapped as BackupData)['version'] === 'number') {
    return wrapped as BackupData;
  }

  throw new Error('Invalid backup format: missing version and data tables');
}

function assertSupportedVersion(version: number): void {
  if (!SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(
      `Unsupported backup version: ${version}. Supported: ${SUPPORTED_VERSIONS.join(', ')}.`
    );
  }
}

/** JSONB column: accept object or string from export file. */
function jsonbParam(value: unknown): string {
  if (value == null) return '[]';
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return '[]';
    }
  }
  return JSON.stringify(value);
}

function assetIdsSet(assets: BackupData['assets']): Set<string> {
  return new Set((assets || []).map((a) => a.id));
}

export class BackupService {
  async exportAll(): Promise<BackupData> {
    const [assets, liabilities, income, expenses, assetHistory, liabilityHistory, snapshots, transactions] =
      await Promise.all([
        pool.query('SELECT * FROM assets ORDER BY created_at'),
        pool.query('SELECT * FROM liabilities ORDER BY created_at'),
        pool.query('SELECT * FROM income_streams ORDER BY created_at'),
        pool.query('SELECT * FROM expenses ORDER BY created_at'),
        pool.query('SELECT * FROM asset_value_history ORDER BY as_of_date, created_at'),
        pool.query('SELECT * FROM liability_balance_history ORDER BY as_of_date, created_at'),
        pool.query('SELECT * FROM net_worth_snapshots ORDER BY snapshot_month'),
        pool.query('SELECT * FROM transactions ORDER BY txn_date, created_at'),
      ]);

    return {
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      includes: { ...BACKUP_INCLUDES },
      assets: assets.rows,
      liabilities: liabilities.rows,
      income_streams: income.rows,
      expenses: expenses.rows,
      asset_value_history: assetHistory.rows,
      liability_balance_history: liabilityHistory.rows,
      net_worth_snapshots: snapshots.rows,
      transactions: transactions.rows,
    };
  }

  async importAll(payload: unknown): Promise<{ imported: Record<string, number> }> {
    const data = parseBackupPayload(payload);
    assertSupportedVersion(data.version);

    const client = await pool.connect();
    const assetIds = assetIdsSet(data.assets);

    try {
      await client.query('BEGIN');

      // Child tables first, then liabilities (FK → assets), then assets
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM asset_value_history');
      await client.query('DELETE FROM liability_balance_history');
      await client.query('DELETE FROM net_worth_snapshots');
      await client.query('DELETE FROM liabilities');
      await client.query('DELETE FROM assets');
      await client.query('DELETE FROM income_streams');
      await client.query('DELETE FROM expenses');

      const userResult = await client.query(
        "SELECT id FROM users WHERE email = 'user@example.com'"
      );
      const userId = userResult.rows[0]?.id;
      if (!userId) {
        throw new Error('Default user not found');
      }

      let assetsImported = 0;
      for (const asset of data.assets || []) {
        await client.query(
          `INSERT INTO assets (
            id, user_id, name, type, current_value, as_of_date, purchase_date, purchase_price,
            monthly_contribution, expected_annual_return, pessimistic_annual_return,
            optimistic_annual_return, include_in_projection, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            asset.id,
            userId,
            asset.name,
            asset.type,
            asset.current_value,
            asset.as_of_date ?? null,
            asset.purchase_date ?? null,
            asset.purchase_price ?? null,
            asset.monthly_contribution ?? 0,
            asset.expected_annual_return ?? null,
            asset.pessimistic_annual_return ?? null,
            asset.optimistic_annual_return ?? null,
            asset.include_in_projection ?? true,
            asset.notes ?? null,
            asset.created_at ?? new Date(),
            asset.updated_at ?? new Date(),
          ]
        );
        assetsImported += 1;
      }

      let liabilitiesImported = 0;
      for (const liability of data.liabilities || []) {
        const payoffAssetId =
          liability.payoff_invest_asset_id &&
          assetIds.has(liability.payoff_invest_asset_id)
            ? liability.payoff_invest_asset_id
            : null;

        await client.query(
          `INSERT INTO liabilities (
            id, user_id, name, type, current_balance, as_of_month, interest_rate,
            monthly_payment, minimum_payment, due_date, notes,
            special_repayment_enabled, special_repayment_amount, special_repayment_frequency,
            max_annual_prepayment_percentage, prepayment_penalty, prepayment_penalty_rate,
            invest_after_payoff, payoff_invest_asset_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            liability.id,
            userId,
            liability.name,
            liability.type,
            liability.current_balance,
            liability.as_of_month ?? null,
            liability.interest_rate ?? null,
            liability.monthly_payment ?? null,
            liability.minimum_payment ?? null,
            liability.due_date ?? null,
            liability.notes ?? null,
            liability.special_repayment_enabled ?? false,
            liability.special_repayment_amount ?? null,
            liability.special_repayment_frequency ?? null,
            liability.max_annual_prepayment_percentage ?? null,
            liability.prepayment_penalty ?? false,
            liability.prepayment_penalty_rate ?? null,
            liability.invest_after_payoff ?? false,
            payoffAssetId,
            liability.created_at ?? new Date(),
            liability.updated_at ?? new Date(),
          ]
        );
        liabilitiesImported += 1;
      }

      let incomeImported = 0;
      for (const income of data.income_streams || []) {
        await client.query(
          `INSERT INTO income_streams (
            id, user_id, name, type, current_amount, frequency, annual_growth_rate,
            start_date, end_date, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            income.id,
            userId,
            income.name,
            income.type,
            income.current_amount,
            income.frequency,
            income.annual_growth_rate ?? 0.03,
            income.start_date ?? null,
            income.end_date ?? null,
            income.notes ?? null,
            income.created_at ?? new Date(),
            income.updated_at ?? new Date(),
          ]
        );
        incomeImported += 1;
      }

      let expensesImported = 0;
      for (const expense of data.expenses || []) {
        await client.query(
          `INSERT INTO expenses (
            id, user_id, name, category, monthly_amount, annual_inflation_rate,
            is_discretionary, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            expense.id,
            userId,
            expense.name,
            expense.category,
            expense.monthly_amount,
            expense.annual_inflation_rate ?? 0.025,
            expense.is_discretionary ?? false,
            expense.notes ?? null,
            expense.created_at ?? new Date(),
            expense.updated_at ?? new Date(),
          ]
        );
        expensesImported += 1;
      }

      let assetHistoryImported = 0;
      for (const h of data.asset_value_history || []) {
        if (!assetIds.has(h.asset_id)) continue;
        await client.query(
          `INSERT INTO asset_value_history (id, asset_id, value, as_of_date, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            h.id,
            h.asset_id,
            h.value,
            h.as_of_date,
            h.notes ?? null,
            h.created_at ?? new Date(),
          ]
        );
        assetHistoryImported += 1;
      }

      const liabilityIds = new Set((data.liabilities || []).map((l) => l.id));
      let liabilityHistoryImported = 0;
      for (const h of data.liability_balance_history || []) {
        if (!liabilityIds.has(h.liability_id)) continue;
        await client.query(
          `INSERT INTO liability_balance_history (id, liability_id, balance, as_of_date, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            h.id,
            h.liability_id,
            h.balance,
            h.as_of_date,
            h.notes ?? null,
            h.created_at ?? new Date(),
          ]
        );
        liabilityHistoryImported += 1;
      }

      let snapshotsImported = 0;
      for (const snap of data.net_worth_snapshots || []) {
        await client.query(
          `INSERT INTO net_worth_snapshots (
            id, snapshot_month, total_assets, total_liabilities, net_worth,
            asset_breakdown, liability_breakdown, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`,
          [
            snap.id,
            snap.snapshot_month,
            snap.total_assets,
            snap.total_liabilities,
            snap.net_worth,
            jsonbParam(snap.asset_breakdown),
            jsonbParam(snap.liability_breakdown),
            snap.notes ?? null,
            snap.created_at ?? new Date(),
          ]
        );
        snapshotsImported += 1;
      }

      const expenseIds = new Set((data.expenses || []).map((e) => e.id));

      let transactionsImported = 0;
      for (const txn of data.transactions || []) {
        const accountId =
          txn.account_id && assetIds.has(txn.account_id) ? txn.account_id : null;
        const liabilityId =
          txn.liability_id && liabilityIds.has(txn.liability_id) ? txn.liability_id : null;
        const expenseId =
          txn.expense_id && expenseIds.has(txn.expense_id) ? txn.expense_id : null;
        const debtPlanned =
          txn.debt_planned_component === 'regular' || txn.debt_planned_component === 'special'
            ? txn.debt_planned_component
            : null;
        const kind =
          txn.kind ??
          (txn.direction === 'inflow' ? 'income' : 'spending');
        await client.query(
          `INSERT INTO transactions (
            id, user_id, txn_date, amount, direction, kind, category,
            account_id, liability_id, expense_id, debt_planned_component,
            description, notes, source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            txn.id,
            userId,
            txn.txn_date,
            txn.amount,
            txn.direction,
            kind,
            txn.category ?? 'Uncategorized',
            accountId,
            liabilityId,
            debtPlanned ? null : expenseId,
            debtPlanned,
            txn.description ?? null,
            txn.notes ?? null,
            txn.source ?? 'manual',
            txn.created_at ?? new Date(),
            txn.updated_at ?? new Date(),
          ]
        );
        transactionsImported += 1;
      }

      await client.query('COMMIT');

      return {
        imported: {
          assets: assetsImported,
          liabilities: liabilitiesImported,
          income_streams: incomeImported,
          expenses: expensesImported,
          asset_value_history: assetHistoryImported,
          liability_balance_history: liabilityHistoryImported,
          net_worth_snapshots: snapshotsImported,
          transactions: transactionsImported,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
