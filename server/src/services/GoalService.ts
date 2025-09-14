import pool from '../config/database';
import { Goal } from '../types';

export class GoalService {
    private readonly userId = 'user@example.com'; // Single user app

    async getAllGoals(): Promise<Goal[]> {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY priority DESC, target_date ASC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getGoalById(id: string): Promise<Goal | null> {
        const query = `
      SELECT * FROM goals 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async createGoal(goalData: Partial<Goal>): Promise<Goal> {
        const {
            name,
            description,
            target_amount,
            target_date,
            current_progress = 0,
            priority = 1,
            is_achieved = false
        } = goalData;

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

        const result = await pool.query(query, [
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

    async updateGoal(id: string, updateData: Partial<Goal>): Promise<Goal | null> {
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
            return this.getGoalById(id);
        }

        const query = `
      UPDATE goals 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;

        const result = await pool.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }

    async deleteGoal(id: string): Promise<boolean> {
        const query = `
      DELETE FROM goals 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }

    async markGoalAsAchieved(id: string): Promise<Goal | null> {
        const query = `
      UPDATE goals 
      SET is_achieved = true, achieved_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
      RETURNING *
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async resetGoalAchievement(id: string): Promise<Goal | null> {
        const query = `
      UPDATE goals 
      SET is_achieved = false, achieved_date = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
      RETURNING *
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async getAchievedGoals(): Promise<Goal[]> {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_achieved = true
      ORDER BY achieved_date DESC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getActiveGoals(): Promise<Goal[]> {
        const query = `
      SELECT * FROM goals 
      WHERE user_id = (SELECT id FROM users WHERE email = $1) 
      AND is_achieved = false
      ORDER BY priority DESC, target_date ASC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getGoalsByPriority(): Promise<Record<number, Goal[]>> {
        const goals = await this.getAllGoals();
        const groupedGoals: Record<number, Goal[]> = {};

        goals.forEach(goal => {
            const priority = goal.priority ?? 0;
            if (!groupedGoals[priority]) {
                groupedGoals[priority] = [];
            }
            groupedGoals[priority].push(goal);
        });

        return groupedGoals;
    }

    async calculateGoalProgress(goalId: string): Promise<{ progress: number; remaining: number; monthsRemaining: number }> {
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
