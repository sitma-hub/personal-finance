import { DashboardSummary, AssetAllocation, ExpenseBreakdown, NetWorthTrend, RecentValueUpdate } from '../types';
export declare class DashboardService {
    private assetService;
    private liabilityService;
    private incomeService;
    private expenseService;
    private snapshotService;
    getDashboardSummary(): Promise<DashboardSummary>;
    getAssetAllocation(): Promise<AssetAllocation[]>;
    getExpenseBreakdown(): Promise<ExpenseBreakdown[]>;
    getNetWorthHistory(): Promise<NetWorthTrend[]>;
    getRecentValueUpdates(limit?: number): Promise<RecentValueUpdate[]>;
}
//# sourceMappingURL=DashboardService.d.ts.map