import { Goal } from '../types';
export declare class GoalService {
    private readonly userId;
    getAllGoals(): Promise<Goal[]>;
    getGoalById(id: string): Promise<Goal | null>;
    createGoal(goalData: Partial<Goal>): Promise<Goal>;
    updateGoal(id: string, updateData: Partial<Goal>): Promise<Goal | null>;
    deleteGoal(id: string): Promise<boolean>;
    markGoalAsAchieved(id: string): Promise<Goal | null>;
    getAchievedGoals(): Promise<Goal[]>;
    getActiveGoals(): Promise<Goal[]>;
    getGoalsByPriority(): Promise<Record<number, Goal[]>>;
    calculateGoalProgress(goalId: string): Promise<{
        progress: number;
        remaining: number;
        monthsRemaining: number;
    }>;
}
//# sourceMappingURL=GoalService.d.ts.map