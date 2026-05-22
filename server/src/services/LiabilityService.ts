import pool from '../config/database';
import { Liability, LiabilityBalanceHistory } from '../types';

function normalizeMonthDate(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }
  return value;
}

export class LiabilityService {
  private readonly userId = 'user@example.com';

  async getAllLiabilities(): Promise<Liability[]> {
    const query = `
      SELECT * FROM liabilities 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [this.userId]);
    return result.rows;
  }

  async getLiabilityById(id: string): Promise<Liability | null> {
    const query = `
      SELECT * FROM liabilities 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
    const result = await pool.query(query, [id, this.userId]);
    return result.rows[0] || null;
  }

  async createLiability(liabilityData: Partial<Liability>): Promise<Liability> {
    const {
      name,
      type,
      current_balance,
      interest_rate,
      monthly_payment,
      minimum_payment,
      due_date,
      as_of_month,
      notes,
      special_repayment_enabled,
      special_repayment_amount,
      special_repayment_frequency,
      max_annual_prepayment_percentage,
      prepayment_penalty,
      prepayment_penalty_rate
    } = liabilityData;

    const normalizedAsOf = normalizeMonthDate(as_of_month as string | Date | undefined) ||
      new Date().toISOString().split('T')[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO liabilities (
          user_id, name, type, current_balance, interest_rate,
          monthly_payment, minimum_payment, due_date, as_of_month, notes,
          special_repayment_enabled, special_repayment_amount, special_repayment_frequency,
          max_annual_prepayment_percentage, prepayment_penalty, prepayment_penalty_rate
        )
        VALUES (
          (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16
        )
        RETURNING *
      `;

      const result = await client.query(query, [
        this.userId,
        name,
        type,
        current_balance,
        interest_rate,
        monthly_payment,
        minimum_payment,
        due_date,
        normalizedAsOf,
        notes,
        special_repayment_enabled ?? false,
        special_repayment_amount,
        special_repayment_frequency,
        max_annual_prepayment_percentage,
        prepayment_penalty ?? false,
        prepayment_penalty_rate
      ]);

      const liability = result.rows[0];

      await client.query(
        `INSERT INTO liability_balance_history (liability_id, balance, as_of_date) VALUES ($1, $2, $3)`,
        [liability.id, current_balance, normalizedAsOf]
      );

      await client.query('COMMIT');
      return liability;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateLiability(id: string, updateData: Partial<Liability>): Promise<Liability | null> {
    const existing = await this.getLiabilityById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        let normalizedValue = value;
        if (key === 'as_of_month') {
          normalizedValue = normalizeMonthDate(value as string | Date) ?? value;
        }
        fields.push(`${key} = $${paramCount}`);
        values.push(normalizedValue);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE liabilities 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
        RETURNING *
      `;

      const result = await client.query(query, [...values, id, this.userId]);
      const liability = result.rows[0];
      if (!liability) {
        await client.query('ROLLBACK');
        return null;
      }

      const balanceChanged = updateData.current_balance !== undefined &&
        parseFloat(String(updateData.current_balance)) !== parseFloat(String(existing.current_balance));

      if (balanceChanged) {
        const asOfDate = normalizeMonthDate(updateData.as_of_month as string | Date) ||
          liability.as_of_month?.toISOString?.().split('T')[0] ||
          new Date().toISOString().split('T')[0];

        await client.query(
          `INSERT INTO liability_balance_history (liability_id, balance, as_of_date) VALUES ($1, $2, $3)`,
          [id, updateData.current_balance, asOfDate]
        );
      }

      await client.query('COMMIT');
      return liability;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteLiability(id: string): Promise<boolean> {
    const query = `
      DELETE FROM liabilities 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
    const result = await pool.query(query, [id, this.userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getBalanceHistory(liabilityId: string): Promise<LiabilityBalanceHistory[]> {
    const query = `
      SELECT h.* FROM liability_balance_history h
      JOIN liabilities l ON h.liability_id = l.id
      WHERE h.liability_id = $1 AND l.user_id = (SELECT id FROM users WHERE email = $2)
      ORDER BY h.as_of_date DESC, h.created_at DESC
    `;
    const result = await pool.query(query, [liabilityId, this.userId]);
    return result.rows;
  }

  async getTotalLiabilitiesValue(): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(current_balance), 0) as total_value
      FROM liabilities 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
    const result = await pool.query(query, [this.userId]);
    return parseFloat(result.rows[0]?.total_value || '0');
  }

  async getLiabilitiesByType(): Promise<Record<string, number>> {
    const query = `
      SELECT type, SUM(current_balance) as total_value
      FROM liabilities 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY type
    `;
    const result = await pool.query(query, [this.userId]);

    const breakdown: Record<string, number> = {};
    result.rows.forEach(row => {
      breakdown[row.type] = parseFloat(row.total_value);
    });

    return breakdown;
  }
}
