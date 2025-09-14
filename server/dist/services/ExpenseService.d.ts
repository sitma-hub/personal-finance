import { Expense } from '../types';
export declare class ExpenseService {
    private readonly userId;
    getAllExpenses(): Promise<Expense[]>;
    getExpenseById(id: string): Promise<Expense | null>;
    createExpense(expenseData: Partial<Expense>): Promise<Expense>;
    updateExpense(id: string, updateData: Partial<Expense>): Promise<Expense | null>;
    deleteExpense(id: string): Promise<boolean>;
    getTotalMonthlyExpenses(): Promise<number>;
    getExpensesByCategory(): Promise<Record<string, number>>;
    getDiscretionaryExpenses(): Promise<Expense[]>;
    getTotalDiscretionaryExpenses(): Promise<number>;
}
//# sourceMappingURL=ExpenseService.d.ts.map