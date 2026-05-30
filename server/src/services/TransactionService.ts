import pool from '../config/database';
import {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  MonthlyActualSummary,
  Liability,
  TransactionKind,
  DebtPlannedComponent,
} from '../types';
import {
  normalizeTransactionKind,
  summarizeMonthlyActuals,
} from '../utils/transactionActuals';

function normalizeMonth(month?: string): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  return new Date().toISOString().substring(0, 7);
}

function normalizeDebtPlannedComponent(
  value: string | null | undefined
): DebtPlannedComponent | null {
  if (value === 'regular' || value === 'special') return value;
  return null;
}

function sanitizeLinks(
  kind: TransactionKind,
  links: {
    account_id?: string | null;
    liability_id?: string | null;
    expense_id?: string | null;
    debt_planned_component?: string | null;
  }
): {
  account_id: string | null;
  liability_id: string | null;
  expense_id: string | null;
  debt_planned_component: DebtPlannedComponent | null;
} {
  const debtComponent =
    kind === 'debt_payment'
      ? normalizeDebtPlannedComponent(links.debt_planned_component)
      : null;
  const expenseId =
    kind === 'spending' || kind === 'debt_payment' ? links.expense_id ?? null : null;

  if (kind === 'debt_payment' && debtComponent) {
    return {
      account_id: null,
      liability_id: links.liability_id ?? null,
      expense_id: null,
      debt_planned_component: debtComponent,
    };
  }

  return {
    account_id: kind === 'investment' ? links.account_id ?? null : null,
    liability_id: kind === 'debt_payment' ? links.liability_id ?? null : null,
    expense_id: expenseId,
    debt_planned_component: null,
  };
}

export class TransactionService {
  private readonly userId = 'user@example.com';

  async getAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const conditions = ['user_id = (SELECT id FROM users WHERE email = $1)'];
    const values: unknown[] = [this.userId];
    let p = 2;

    if (filters.from) {
      conditions.push(`txn_date >= $${p++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`txn_date <= $${p++}`);
      values.push(filters.to);
    }
    if (filters.category) {
      conditions.push(`category = $${p++}`);
      values.push(filters.category);
    }
    if (filters.direction) {
      conditions.push(`direction = $${p++}`);
      values.push(filters.direction);
    }
    if (filters.kind) {
      conditions.push(`kind = $${p++}`);
      values.push(filters.kind);
    }
    if (filters.account_id) {
      conditions.push(`account_id = $${p++}`);
      values.push(filters.account_id);
    }

    const query = `
      SELECT * FROM transactions
      WHERE ${conditions.join(' AND ')}
      ORDER BY txn_date DESC, created_at DESC
    `;
    const result = await pool.query(query, values);
    return result.rows;
  }

  async getById(id: string): Promise<Transaction | null> {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)`,
      [id, this.userId]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateTransactionRequest): Promise<Transaction> {
    const {
      txn_date,
      amount,
      direction,
      category = 'Uncategorized',
      account_id = null,
      liability_id = null,
      expense_id = null,
      debt_planned_component = null,
      description,
      notes,
      source = 'manual',
    } = data;
    const kind = normalizeTransactionKind(data.kind, direction);
    const links = sanitizeLinks(kind, {
      account_id: account_id ?? null,
      liability_id: liability_id ?? null,
      expense_id: expense_id ?? null,
      debt_planned_component: debt_planned_component ?? null,
    });

    const result = await pool.query(
      `INSERT INTO transactions (
        user_id, txn_date, amount, direction, kind, category,
        account_id, liability_id, expense_id, debt_planned_component,
        description, notes, source
      ) VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        this.userId,
        txn_date,
        amount,
        direction,
        kind,
        category,
        links.account_id,
        links.liability_id,
        links.expense_id,
        links.debt_planned_component,
        description ?? null,
        notes ?? null,
        source,
      ]
    );
    return result.rows[0];
  }

  async bulkCreate(rows: CreateTransactionRequest[]): Promise<number> {
    if (rows.length === 0) return 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [this.userId]
      );
      const userId = userResult.rows[0]?.id;
      if (!userId) throw new Error('Default user not found');

      let inserted = 0;
      for (const row of rows) {
        if (!row.txn_date || row.amount == null || !row.direction) continue;
        const kind = normalizeTransactionKind(row.kind, row.direction);
        const links = sanitizeLinks(kind, {
          account_id: row.account_id ?? null,
          liability_id: row.liability_id ?? null,
          expense_id: row.expense_id ?? null,
          debt_planned_component: row.debt_planned_component ?? null,
        });
        await client.query(
          `INSERT INTO transactions (
            user_id, txn_date, amount, direction, kind, category,
            account_id, liability_id, expense_id, debt_planned_component,
            description, notes, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            userId,
            row.txn_date,
            row.amount,
            row.direction,
            kind,
            row.category ?? 'Uncategorized',
            links.account_id,
            links.liability_id,
            links.expense_id,
            links.debt_planned_component,
            row.description ?? null,
            row.notes ?? null,
            row.source ?? 'import',
          ]
        );
        inserted += 1;
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: string, data: UpdateTransactionRequest): Promise<Transaction | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const direction = data.direction ?? existing.direction;
    const kind = normalizeTransactionKind(data.kind ?? existing.kind, direction);
    const links = sanitizeLinks(kind, {
      account_id: (data.account_id !== undefined ? data.account_id : existing.account_id) ?? null,
      liability_id: (data.liability_id !== undefined ? data.liability_id : existing.liability_id) ?? null,
      expense_id: (data.expense_id !== undefined ? data.expense_id : existing.expense_id) ?? null,
      debt_planned_component:
        (data.debt_planned_component !== undefined
          ? data.debt_planned_component
          : existing.debt_planned_component) ?? null,
    });

    const merged: UpdateTransactionRequest = {
      ...data,
      kind,
      account_id: links.account_id,
      liability_id: links.liability_id,
      expense_id: links.expense_id,
      debt_planned_component: links.debt_planned_component,
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    const query = `
      UPDATE transactions
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${p} AND user_id = (SELECT id FROM users WHERE email = $${p + 1})
      RETURNING *
    `;
    const result = await pool.query(query, [...values, id, this.userId]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)`,
      [id, this.userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getCategories(): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT category FROM transactions
       WHERE user_id = (SELECT id FROM users WHERE email = $1)
       ORDER BY category`,
      [this.userId]
    );
    return result.rows.map((r) => r.category);
  }

  /** Actuals for a single month (YYYY-MM), classified by explicit transaction kind. */
  async getMonthlyActualSummary(month?: string): Promise<MonthlyActualSummary> {
    const targetMonth = normalizeMonth(month);
    const start = `${targetMonth}-01`;

    const [txnResult, liabilityResult] = await Promise.all([
      pool.query(
        `SELECT * FROM transactions
         WHERE user_id = (SELECT id FROM users WHERE email = $1)
           AND txn_date >= $2::date
           AND txn_date < ($2::date + INTERVAL '1 month')
         ORDER BY txn_date DESC`,
        [this.userId, start]
      ),
      pool.query(
        `SELECT * FROM liabilities
         WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
        [this.userId]
      ),
    ]);

    const liabilitiesById = new Map<string, Liability>();
    for (const row of liabilityResult.rows as Liability[]) {
      liabilitiesById.set(row.id, row);
    }

    const totals = summarizeMonthlyActuals(txnResult.rows as Transaction[], liabilitiesById);

    return {
      month: targetMonth,
      ...totals,
    };
  }
}
