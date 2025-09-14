import pool from '../config/database';
import { Liability } from '../types';

export class LiabilityService {
    private readonly userId = 'user@example.com'; // Single user app

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
            notes
        } = liabilityData;

        const query = `
      INSERT INTO liabilities (
        user_id, name, type, current_balance, interest_rate,
        monthly_payment, minimum_payment, due_date, notes
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
            current_balance,
            interest_rate,
            monthly_payment,
            minimum_payment,
            due_date,
            notes
        ]);

        return result.rows[0];
    }

    async updateLiability(id: string, updateData: Partial<Liability>): Promise<Liability | null> {
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
            return this.getLiabilityById(id);
        }

        const query = `
      UPDATE liabilities 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;

        const result = await pool.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }

    async deleteLiability(id: string): Promise<boolean> {
        const query = `
      DELETE FROM liabilities 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getTotalLiabilitiesValue(): Promise<number> {
        const query = `
      SELECT SUM(current_balance) as total_value
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
