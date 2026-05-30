import pool from '../config/database';
import {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  CategorySpendItem,
  MonthlyActualSummary,
} from '../types';

function normalizeMonth(month?: string): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  return new Date().toISOString().substring(0, 7);
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
      description,
      notes,
      source = 'manual',
    } = data;

    const result = await pool.query(
      `INSERT INTO transactions (
        user_id, txn_date, amount, direction, category, account_id, description, notes, source
      ) VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *`,
      [
        this.userId,
        txn_date,
        amount,
        direction,
        category,
        account_id,
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
        await client.query(
          `INSERT INTO transactions (
            user_id, txn_date, amount, direction, category, account_id, description, notes, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            row.txn_date,
            row.amount,
            row.direction,
            row.category ?? 'Uncategorized',
            row.account_id ?? null,
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
    const fields: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${p++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
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

  /** Distinct categories used by this user (for filter dropdowns / autocomplete). */
  async getCategories(): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT category FROM transactions
       WHERE user_id = (SELECT id FROM users WHERE email = $1)
       ORDER BY category`,
      [this.userId]
    );
    return result.rows.map((r) => r.category);
  }

  /** Actuals for a single month (YYYY-MM), broken down by category. */
  async getMonthlyActualSummary(month?: string): Promise<MonthlyActualSummary> {
    const targetMonth = normalizeMonth(month);
    const start = `${targetMonth}-01`;

    const result = await pool.query(
      `SELECT category, direction,
              SUM(amount)::float8 AS total,
              COUNT(*)::int AS count
       FROM transactions
       WHERE user_id = (SELECT id FROM users WHERE email = $1)
         AND txn_date >= $2::date
         AND txn_date < ($2::date + INTERVAL '1 month')
       GROUP BY category, direction
       ORDER BY total DESC`,
      [this.userId, start]
    );

    const byCategory: CategorySpendItem[] = result.rows.map((r) => ({
      category: r.category,
      direction: r.direction,
      total: Number(r.total) || 0,
      count: Number(r.count) || 0,
    }));

    const actualInflow = byCategory
      .filter((c) => c.direction === 'inflow')
      .reduce((sum, c) => sum + c.total, 0);
    const actualOutflow = byCategory
      .filter((c) => c.direction === 'outflow')
      .reduce((sum, c) => sum + c.total, 0);

    return {
      month: targetMonth,
      actualInflow,
      actualOutflow,
      net: actualInflow - actualOutflow,
      byCategory,
    };
  }
}
