"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalService = void 0;
const database_1 = __importDefault(require("../config/database"));
class GoalService {
    constructor() {
        this.userId = 'user@example.com';
    }
    async getAllGoals() {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY priority DESC, target_date ASC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getGoalById(id) {
        const query = `
      SELECT * FROM goals 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }
    async createGoal(goalData) {
        const { name, description, target_amount, target_date, current_progress = 0, priority = 1, is_achieved = false } = goalData;
        const query = `
      INSERT INTO goals (
        user_id, name, description, target_amount, target_date,
        current_progress, priority, is_achieved
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            this.userId,
            name,
            description,
            target_amount,
            target_date,
            current_progress,
            priority,
            is_achieved
        ]);
        return result.rows[0];
    }
    async updateGoal(id, updateData) {
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
            return this.getGoalById(id);
        }
        const query = `
      UPDATE goals 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;
        const result = await database_1.default.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }
    async deleteGoal(id) {
        const query = `
      DELETE FROM goals 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rowCount > 0;
    }
    async markGoalAsAchieved(id) {
        const query = `
      UPDATE goals 
      SET is_achieved = true, achieved_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
      RETURNING *
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }
    async getAchievedGoals() {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_achieved = true
      ORDER BY achieved_date DESC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getActiveGoals() {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_achieved = false
      ORDER BY priority DESC, target_date ASC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getGoalsByPriority() {
        const goals = await this.getAllGoals();
        const groupedGoals = {};
        goals.forEach(goal => {
            if (!groupedGoals[goal.priority]) {
                groupedGoals[goal.priority] = [];
            }
            groupedGoals[goal.priority].push(goal);
        });
        return groupedGoals;
    }
    async calculateGoalProgress(goalId) {
        const goal = await this.getGoalById(goalId);
        if (!goal) {
            throw new Error('Goal not found');
        }
        const progress = (goal.current_progress / goal.target_amount) * 100;
        const remaining = goal.target_amount - goal.current_progress;
        const targetDate = new Date(goal.target_date);
        const currentDate = new Date();
        const monthsRemaining = Math.max(0, (targetDate.getFullYear() - currentDate.getFullYear()) * 12 +
            (targetDate.getMonth() - currentDate.getMonth()));
        return {
            progress: Math.round(progress * 100) / 100,
            remaining,
            monthsRemaining
        };
    }
}
exports.GoalService = GoalService;
//# sourceMappingURL=GoalService.js.map