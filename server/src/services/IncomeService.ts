import pool from '../config/database';
import { IncomeStream } from '../types';

export class IncomeService {
    private readonly userId = 'user@example.com'; // Single user app

    async getAllIncomeStreams(): Promise<IncomeStream[]> {
        const query = `
      SELECT * FROM income_streams 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getIncomeStreamById(id: string): Promise<IncomeStream | null> {
        const query = `
      SELECT * FROM income_streams 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async createIncomeStream(incomeData: Partial<IncomeStream>): Promise<IncomeStream> {
        const {
            name,
            type,
            current_amount,
            frequency,
            annual_growth_rate = 0.03,
            start_date,
            end_date,
            notes
        } = incomeData;

        const query = `
      INSERT INTO income_streams (
        user_id, name, type, current_amount, frequency,
        annual_growth_rate, start_date, end_date, notes
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `;

        const result = await pool.query(query, [
            this.userId,
            name,
            type,
            current_amount,
            frequency,
            annual_growth_rate,
            start_date,
            end_date,
            notes
        ]);

        return result.rows[0];
    }

    async updateIncomeStream(id: string, updateData: Partial<IncomeStream>): Promise<IncomeStream | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        // Build dynamic query
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return this.getIncomeStreamById(id);
        }

        const query = `
      UPDATE income_streams 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;

        const result = await pool.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }

    async deleteIncomeStream(id: string): Promise<boolean> {
        const query = `
      DELETE FROM income_streams 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getTotalMonthlyIncome(): Promise<number> {
        const query = `
      SELECT 
        SUM(
          CASE 
            WHEN frequency = 'monthly' THEN current_amount
            WHEN frequency = 'annual' THEN current_amount / 12
            WHEN frequency = 'hourly' THEN current_amount * 40 * 52 / 12 -- Assuming 40 hours/week
            ELSE 0
          END
        ) as total_monthly_income
      FROM income_streams 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
        const result = await pool.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_monthly_income || '0');
    }

    async getIncomeByType(): Promise<Record<string, number>> {
        const query = `
      SELECT 
        type,
        SUM(
          CASE 
            WHEN frequency = 'monthly' THEN current_amount
            WHEN frequency = 'annual' THEN current_amount / 12
            WHEN frequency = 'hourly' THEN current_amount * 40 * 52 / 12
            ELSE 0
          END
        ) as monthly_amount
      FROM income_streams 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY type
    `;
        const result = await pool.query(query, [this.userId]);

        const breakdown: Record<string, number> = {};
        result.rows.forEach(row => {
            breakdown[row.type] = parseFloat(row.monthly_amount);
        });

        return breakdown;
    }
}
