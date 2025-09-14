import pool from '../config/database';
import { Expense } from '../types';

export class ExpenseService {
    private readonly userId = 'user@example.com'; // Single user app

    async getAllExpenses(): Promise<Expense[]> {
        const query = `
      SELECT * FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getExpenseById(id: string): Promise<Expense | null> {
        const query = `
      SELECT * FROM expenses 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async createExpense(expenseData: Partial<Expense>): Promise<Expense> {
        const {
            name,
            category,
            monthly_amount,
            annual_inflation_rate = 0.025,
            is_discretionary = false,
            notes
        } = expenseData;

        const query = `
      INSERT INTO expenses (
        user_id, name, category, monthly_amount, 
        annual_inflation_rate, is_discretionary, notes
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7
      )
      RETURNING *
    `;

        const result = await pool.query(query, [
            this.userId,
            name,
            category,
            monthly_amount,
            annual_inflation_rate,
            is_discretionary,
            notes
        ]);

        return result.rows[0];
    }

    async updateExpense(id: string, updateData: Partial<Expense>): Promise<Expense | null> {
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
            return this.getExpenseById(id);
        }

        const query = `
      UPDATE expenses 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;

        const result = await pool.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }

    async deleteExpense(id: string): Promise<boolean> {
        const query = `
      DELETE FROM expenses 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getTotalMonthlyExpenses(): Promise<number> {
        const query = `
      SELECT SUM(monthly_amount) as total_monthly_expenses
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
        const result = await pool.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_monthly_expenses || '0');
    }

    async getExpensesByCategory(): Promise<Record<string, number>> {
        const query = `
      SELECT category, SUM(monthly_amount) as total_amount
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY category
    `;
        const result = await pool.query(query, [this.userId]);

        const breakdown: Record<string, number> = {};
        result.rows.forEach(row => {
            breakdown[row.category] = parseFloat(row.total_amount);
        });

        return breakdown;
    }

    async getDiscretionaryExpenses(): Promise<Expense[]> {
        const query = `
      SELECT * FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_discretionary = true
      ORDER BY monthly_amount DESC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getTotalDiscretionaryExpenses(): Promise<number> {
        const query = `
      SELECT SUM(monthly_amount) as total_discretionary
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_discretionary = true
    `;
        const result = await pool.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_discretionary || '0');
    }
}
