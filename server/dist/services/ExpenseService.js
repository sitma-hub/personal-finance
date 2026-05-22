"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const database_1 = __importDefault(require("../config/database"));
class ExpenseService {
    constructor() {
        this.userId = 'user@example.com';
    }
    async getAllExpenses() {
        const query = `
      SELECT * FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getExpenseById(id) {
        const query = `
      SELECT * FROM expenses 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }
    async createExpense(expenseData) {
        const { name, category, monthly_amount, annual_inflation_rate = 0.025, is_discretionary = false, notes } = expenseData;
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
        const result = await database_1.default.query(query, [
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
    async updateExpense(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
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
        const result = await database_1.default.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }
    async deleteExpense(id) {
        const query = `
      DELETE FROM expenses 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }
    async getTotalMonthlyExpenses() {
        const query = `
      SELECT SUM(monthly_amount) as total_monthly_expenses
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_monthly_expenses || '0');
    }
    async getExpensesByCategory() {
        const query = `
      SELECT category, SUM(monthly_amount) as total_amount
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      GROUP BY category
    `;
        const result = await database_1.default.query(query, [this.userId]);
        const breakdown = {};
        result.rows.forEach(row => {
            breakdown[row.category] = parseFloat(row.total_amount);
        });
        return breakdown;
    }
    async getDiscretionaryExpenses() {
        const query = `
      SELECT * FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_discretionary = true
      ORDER BY monthly_amount DESC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getTotalDiscretionaryExpenses() {
        const query = `
      SELECT SUM(monthly_amount) as total_discretionary
      FROM expenses 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_discretionary = true
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return parseFloat(result.rows[0]?.total_discretionary || '0');
    }
}
exports.ExpenseService = ExpenseService;
//# sourceMappingURL=ExpenseService.js.map