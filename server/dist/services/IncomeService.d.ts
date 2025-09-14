import { IncomeStream } from '../types';
export declare class IncomeService {
    private readonly userId;
    getAllIncomeStreams(): Promise<IncomeStream[]>;
    getIncomeStreamById(id: string): Promise<IncomeStream | null>;
    createIncomeStream(incomeData: Partial<IncomeStream>): Promise<IncomeStream>;
    updateIncomeStream(id: string, updateData: Partial<IncomeStream>): Promise<IncomeStream | null>;
    deleteIncomeStream(id: string): Promise<boolean>;
    getTotalMonthlyIncome(): Promise<number>;
    getIncomeByType(): Promise<Record<string, number>>;
}
//# sourceMappingURL=IncomeService.d.ts.map