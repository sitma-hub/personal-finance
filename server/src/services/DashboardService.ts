import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';
import { GoalService } from './GoalService';
import { ScenarioService } from './ScenarioService';
import { DashboardSummary, AssetAllocation, ExpenseBreakdown, NetWorthTrend, GoalProgress } from '../types';

export class DashboardService {
    private assetService: AssetService;
    private liabilityService: LiabilityService;
    private incomeService: IncomeService;
    private expenseService: ExpenseService;
    private goalService: GoalService;
    private scenarioService: ScenarioService;

    constructor() {
        this.assetService = new AssetService();
        this.liabilityService = new LiabilityService();
        this.incomeService = new IncomeService();
        this.expenseService = new ExpenseService();
        this.goalService = new GoalService();
        this.scenarioService = new ScenarioService();
    }

    async getDashboardSummary(): Promise<DashboardSummary> {
        const [assets, liabilities, incomeStreams, expenses, goals, scenarios] = await Promise.all([
            this.assetService.getAllAssets(),
            this.liabilityService.getAllLiabilities(),
            this.incomeService.getAllIncomeStreams(),
            this.expenseService.getAllExpenses(),
            this.goalService.getAllGoals(),
            this.scenarioService.getAllScenarios()
        ]);

        const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.current_value.toString()), 0);
        const totalLiabilities = liabilities.reduce((sum, liability) => sum + parseFloat(liability.current_balance.toString()), 0);
        const netWorth = totalAssets - totalLiabilities;

        const monthlyIncome = incomeStreams.reduce((sum, income) => {
            // Convert to monthly amount based on frequency
            const amount = parseFloat(income.current_amount.toString());
            switch (income.frequency) {
                case 'monthly':
                    return sum + amount;
                case 'annual':
                    return sum + (amount / 12);
                case 'hourly':
                    return sum + (amount * 40 * 52 / 12); // Assume 40 hours/week, 52 weeks/year
                default:
                    return sum + amount;
            }
        }, 0);
        // Calculate regular expenses
        const regularExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.monthly_amount.toString()), 0);

        // Calculate liability payments (these are also expenses)
        const liabilityPayments = liabilities.reduce((sum, liability) => {
            const monthlyPayment = parseFloat(liability.monthly_payment?.toString() || '0');
            const minimumPayment = parseFloat(liability.minimum_payment?.toString() || '0');
            // Use monthly_payment if available, otherwise fall back to minimum_payment
            return sum + (monthlyPayment || minimumPayment);
        }, 0);

        const monthlyExpenses = regularExpenses + liabilityPayments;
        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

        const activeGoals = goals.filter(goal => !goal.is_achieved);
        const achievedGoals = goals.filter(goal => goal.is_achieved);
        const activeScenarios = scenarios.filter(scenario => scenario.is_active);

        return {
            totalAssets,
            totalLiabilities,
            netWorth,
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            savingsRate,
            assetCount: assets.length,
            liabilityCount: liabilities.length,
            incomeStreamCount: incomeStreams.length,
            expenseCount: expenses.length,
            activeGoalsCount: activeGoals.length,
            achievedGoalsCount: achievedGoals.length,
            activeScenariosCount: activeScenarios.length,
            totalScenariosCount: scenarios.length
        };
    }

    async getAssetAllocation(): Promise<AssetAllocation[]> {
        const assets = await this.assetService.getAllAssets();
        const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.current_value.toString()), 0);

        if (totalValue === 0) {
            return [];
        }

        const allocationMap = new Map<string, number>();

        assets.forEach(asset => {
            const currentValue = allocationMap.get(asset.type) || 0;
            allocationMap.set(asset.type, currentValue + parseFloat(asset.current_value.toString()));
        });

        return Array.from(allocationMap.entries()).map(([type, value]) => ({
            type,
            value,
            percentage: (value / totalValue) * 100
        }));
    }

    async getExpenseBreakdown(): Promise<ExpenseBreakdown[]> {
        const expenses = await this.expenseService.getAllExpenses();
        const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.monthly_amount.toString()), 0);

        if (totalAmount === 0) {
            return [];
        }

        const breakdownMap = new Map<string, number>();

        expenses.forEach(expense => {
            const currentAmount = breakdownMap.get(expense.category) || 0;
            breakdownMap.set(expense.category, currentAmount + parseFloat(expense.monthly_amount.toString()));
        });

        return Array.from(breakdownMap.entries()).map(([category, amount]) => ({
            category,
            amount,
            percentage: (amount / totalAmount) * 100
        }));
    }

    async getNetWorthTrend(months: number = 6): Promise<NetWorthTrend[]> {
        // For now, return mock data. In a real implementation, you'd calculate historical data
        const trends: NetWorthTrend[] = [];
        const currentDate = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setMonth(date.getMonth() - i);

            // Mock data - in reality, you'd calculate from historical records
            const baseValue = 100000 + (Math.random() * 50000);
            trends.push({
                month: date.toISOString().substring(0, 7), // YYYY-MM format
                netWorth: baseValue,
                assets: baseValue * 1.2,
                liabilities: baseValue * 0.2
            });
        }

        return trends;
    }

    async getGoalsProgress(): Promise<GoalProgress[]> {
        const goals = await this.goalService.getAllGoals();

        return goals.map(goal => {
            const targetAmount = parseFloat(goal.target_amount.toString());
            const currentProgress = parseFloat(goal.current_progress.toString());
            const progressPercentage = targetAmount > 0
                ? (currentProgress / targetAmount) * 100
                : 0;

            return {
                id: goal.id,
                name: goal.name,
                targetAmount: targetAmount,
                currentProgress: currentProgress,
                progressPercentage: Math.min(progressPercentage, 100),
                targetDate: goal.target_date.toISOString()
            };
        });
    }

    async getRecentActivity(limit: number = 10): Promise<any[]> {
        // This would typically come from an activity log table
        // For now, return mock recent activities
        const activities = [
            {
                id: '1',
                type: 'asset_added',
                description: 'Added new investment account',
                timestamp: new Date().toISOString(),
                amount: 5000
            },
            {
                id: '2',
                type: 'expense_added',
                description: 'Added monthly rent expense',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                amount: 1200
            },
            {
                id: '3',
                type: 'goal_updated',
                description: 'Updated emergency fund goal',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                amount: 10000
            }
        ];

        return activities.slice(0, limit);
    }

    async runQuickScenario(scenarioType: string, parameters: Record<string, any>): Promise<any> {
        // This would integrate with the scenario service for quick calculations
        return {
            scenarioType,
            parameters,
            result: {
                projectedNetWorth: 150000,
                confidence: 0.85,
                timeframe: '1 year'
            }
        };
    }

    async getMonteCarloPreview(): Promise<any> {
        // This would provide a preview of Monte Carlo simulation results
        return {
            simulations: 1000,
            averageOutcome: 125000,
            percentiles: {
                p5: 80000,
                p25: 100000,
                p50: 125000,
                p75: 150000,
                p95: 200000
            }
        };
    }
}
