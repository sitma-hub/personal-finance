import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Asset, Liability, IncomeStream, Expense, Goal, Scenario } from '../types';
import { assetService } from '../services/assetService';
import { liabilityService } from '../services/liabilityService';
import { incomeService } from '../services/incomeService';
import { expenseService } from '../services/expenseService';
import { goalService } from '../services/goalService';
import { scenarioService } from '../services/scenarioService';

// Enhanced types for better data integration
export interface FinancialSnapshot {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    debtToIncomeRatio: number;
    liquidityRatio: number;
    emergencyFundMonths: number;
}

export interface FinancialProjection {
    year: number;
    month: number;
    snapshot: FinancialSnapshot;
    goalProgress: Record<string, number>;
    milestones: string[];
    risks: string[];
    opportunities: string[];
}

export interface FinancialInsight {
    type: 'warning' | 'opportunity' | 'achievement' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionItems: string[];
    relatedGoals?: string[];
}

export interface FinancialState {
    // Core data
    assets: Asset[];
    liabilities: Liability[];
    incomeStreams: IncomeStream[];
    expenses: Expense[];
    goals: Goal[];
    scenarios: Scenario[];

    // Computed data
    currentSnapshot: FinancialSnapshot;
    projections: FinancialProjection[];
    insights: FinancialInsight[];

    // UI state
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

type FinancialAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_ASSETS'; payload: Asset[] }
    | { type: 'SET_LIABILITIES'; payload: Liability[] }
    | { type: 'SET_INCOME_STREAMS'; payload: IncomeStream[] }
    | { type: 'SET_EXPENSES'; payload: Expense[] }
    | { type: 'SET_GOALS'; payload: Goal[] }
    | { type: 'SET_SCENARIOS'; payload: Scenario[] }
    | { type: 'UPDATE_FINANCIAL_DATA' }
    | { type: 'COMPUTE_PROJECTIONS' }
    | { type: 'GENERATE_INSIGHTS' };

// Financial calculation utilities
class FinancialCalculator {
    static calculateMonthlyIncome(incomeStreams: IncomeStream[]): number {
        if (!incomeStreams || incomeStreams.length === 0) return 0;

        console.log('🔍 Calculating monthly income from:', incomeStreams);

        return incomeStreams.reduce((total, stream) => {
            console.log('🔍 Processing income stream:', stream);
            if (!stream) return total;

            // Handle both string and number values
            const amount = typeof stream.current_amount === 'string'
                ? parseFloat(stream.current_amount)
                : stream.current_amount || 0;

            console.log('🔍 Income amount:', stream.current_amount, '→ parsed:', amount);

            let monthlyAmount = amount;

            if (stream.frequency === 'annual') {
                monthlyAmount = amount / 12;
            } else if (stream.frequency === 'hourly') {
                // Assume 40 hours/week, 4.33 weeks/month
                monthlyAmount = amount * 40 * 4.33;
            }

            console.log('🔍 Monthly amount after frequency conversion:', monthlyAmount);

            if (isNaN(monthlyAmount)) {
                console.warn('⚠️ Invalid income amount:', stream.current_amount);
                return total;
            }

            return total + monthlyAmount;
        }, 0);
    }

    static calculateMonthlyExpenses(expenses: Expense[]): number {
        if (!expenses || expenses.length === 0) return 0;

        console.log('🔍 Calculating monthly expenses from:', expenses);

        return expenses.reduce((total, expense) => {
            console.log('🔍 Processing expense:', expense);
            if (!expense) return total;

            // Handle both string and number values
            const amount = typeof expense.monthly_amount === 'string'
                ? parseFloat(expense.monthly_amount)
                : expense.monthly_amount || 0;

            console.log('🔍 Expense amount:', expense.monthly_amount, '→ parsed:', amount);

            if (isNaN(amount)) {
                console.warn('⚠️ Invalid expense amount:', expense.monthly_amount);
                return total;
            }

            return total + amount;
        }, 0);
    }

    static calculateTotalAssets(assets: Asset[]): number {
        if (!assets || assets.length === 0) return 0;

        console.log('🔍 Calculating total assets from:', assets);

        return assets.reduce((total, asset) => {
            console.log('🔍 Processing asset:', asset);
            if (!asset) return total;

            // Handle both string and number values
            const value = typeof asset.current_value === 'string'
                ? parseFloat(asset.current_value)
                : asset.current_value || 0;

            console.log('🔍 Asset value:', asset.current_value, '→ parsed:', value);

            if (isNaN(value)) {
                console.warn('⚠️ Invalid asset value:', asset.current_value);
                return total;
            }

            return total + value;
        }, 0);
    }

    static calculateTotalLiabilities(liabilities: Liability[]): number {
        if (!liabilities || liabilities.length === 0) return 0;

        console.log('🔍 Calculating total liabilities from:', liabilities);

        return liabilities.reduce((total, liability) => {
            console.log('🔍 Processing liability:', liability);
            if (!liability) return total;

            // Handle both string and number values
            const balance = typeof liability.current_balance === 'string'
                ? parseFloat(liability.current_balance)
                : liability.current_balance || 0;

            console.log('🔍 Liability balance:', liability.current_balance, '→ parsed:', balance);

            if (isNaN(balance)) {
                console.warn('⚠️ Invalid liability balance:', liability.current_balance);
                return total;
            }

            return total + balance;
        }, 0);
    }

    static calculateFinancialSnapshot(
        assets: Asset[],
        liabilities: Liability[],
        incomeStreams: IncomeStream[],
        expenses: Expense[]
    ): FinancialSnapshot {
        const totalAssets = this.calculateTotalAssets(assets);
        const totalLiabilities = this.calculateTotalLiabilities(liabilities);
        const monthlyIncome = this.calculateMonthlyIncome(incomeStreams);
        const monthlyExpenses = this.calculateMonthlyExpenses(expenses);
        const monthlySavings = monthlyIncome - monthlyExpenses;

        // Calculate liquid assets (savings + checking accounts)
        const liquidAssets = assets
            .filter(asset => asset && (asset.type === 'savings_account' || asset.type === 'checking_account'))
            .reduce((total, asset) => {
                const value = asset.current_value || 0;
                return total + (isNaN(value) ? 0 : value);
            }, 0);

        // Safe division functions to prevent NaN
        const safeDivision = (numerator: number, denominator: number): number => {
            if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 0;
            const result = numerator / denominator;
            return isNaN(result) ? 0 : result;
        };

        const safePercentage = (numerator: number, denominator: number): number => {
            return safeDivision(numerator, denominator) * 100;
        };

        return {
            totalAssets: isNaN(totalAssets) ? 0 : totalAssets,
            totalLiabilities: isNaN(totalLiabilities) ? 0 : totalLiabilities,
            netWorth: isNaN(totalAssets - totalLiabilities) ? 0 : totalAssets - totalLiabilities,
            monthlyIncome: isNaN(monthlyIncome) ? 0 : monthlyIncome,
            monthlyExpenses: isNaN(monthlyExpenses) ? 0 : monthlyExpenses,
            monthlySavings: isNaN(monthlySavings) ? 0 : monthlySavings,
            savingsRate: safePercentage(monthlySavings, monthlyIncome),
            debtToIncomeRatio: safePercentage(totalLiabilities, monthlyIncome * 12),
            liquidityRatio: safeDivision(liquidAssets, monthlyExpenses),
            emergencyFundMonths: safeDivision(liquidAssets, monthlyExpenses),
        };
    }

    static projectFinancials(
        currentSnapshot: FinancialSnapshot,
        assets: Asset[],
        liabilities: Liability[],
        incomeStreams: IncomeStream[],
        expenses: Expense[],
        goals: Goal[],
        yearsToProject: number = 10
    ): FinancialProjection[] {
        const projections: FinancialProjection[] = [];

        // Cap values to prevent database overflow (PostgreSQL DECIMAL(20,2) limit is 10^18)
        const MAX_VALUE = 999999999999999999; // 999 quadrillion

        // Track individual asset values for proper growth calculation
        const assetValues: Record<string, number> = {};
        assets.forEach(asset => {
            assetValues[asset.id] = parseFloat(asset.current_value?.toString() || '0');
        });

        // Track individual liability balances
        const liabilityBalances: Record<string, number> = {};
        liabilities.forEach(liability => {
            liabilityBalances[liability.id] = parseFloat(liability.current_balance?.toString() || '0');
        });

        for (let year = 1; year <= yearsToProject; year++) {
            for (let month = 1; month <= 12; month++) {
                const timeElapsed = year + (month - 1) / 12;

                // Calculate monthly income and expenses first
                const projectedMonthlyIncome = incomeStreams.reduce((total, stream) => {
                    let monthlyAmount = parseFloat(stream.current_amount.toString());
                    const annualGrowthRate = parseFloat(stream.annual_growth_rate?.toString() || '0');

                    if (stream.frequency === 'annual') {
                        monthlyAmount = parseFloat(stream.current_amount.toString()) / 12;
                    } else if (stream.frequency === 'hourly') {
                        monthlyAmount = parseFloat(stream.current_amount.toString()) * 40 * 4.33;
                    }

                    // Apply annual growth rate (not compound over entire period)
                    if (annualGrowthRate > 0) {
                        // Apply growth based on years elapsed, not total time
                        const yearsElapsed = Math.floor(timeElapsed);
                        monthlyAmount *= Math.pow(1 + annualGrowthRate, yearsElapsed);
                    }

                    return total + monthlyAmount;
                }, 0);

                // Project expense inflation (annual inflation applied monthly)
                const projectedMonthlyExpenses = expenses.reduce((total, expense) => {
                    const monthlyAmount = parseFloat(expense.monthly_amount.toString());
                    const annualInflationRate = parseFloat(expense.annual_inflation_rate?.toString() || '0');

                    // Apply inflation based on years elapsed, not total time
                    const yearsElapsed = Math.floor(timeElapsed);
                    const inflatedAmount = monthlyAmount * Math.pow(1 + annualInflationRate, yearsElapsed);
                    return total + inflatedAmount;
                }, 0);

                // Calculate monthly savings
                const monthlySavings = projectedMonthlyIncome - projectedMonthlyExpenses;

                // Cap income and expenses to prevent overflow
                const cappedIncome = Math.min(projectedMonthlyIncome, MAX_VALUE);
                const cappedExpenses = Math.min(projectedMonthlyExpenses, MAX_VALUE);
                const cappedSavings = Math.min(monthlySavings, MAX_VALUE);

                // Update individual asset values with proper compound growth
                let totalAssets = 0;
                let totalAssetContributions = 0;

                assets.forEach(asset => {
                    // Only apply compound growth to investment-type assets
                    const isInvestmentAsset = asset.type === 'investment_account' ||
                        asset.type === 'retirement_account' ||
                        (asset.annual_return_rate && asset.annual_return_rate > 0);

                    if (isInvestmentAsset) {
                        const monthlyGrowthRate = asset.annual_return_rate ?
                            Math.pow(1 + asset.annual_return_rate, 1 / 12) - 1 : 0;

                        // Apply monthly compound growth
                        assetValues[asset.id] = (assetValues[asset.id] || 0) * (1 + monthlyGrowthRate);
                    }

                    // Add monthly contributions
                    if (asset.monthly_contribution) {
                        assetValues[asset.id] = (assetValues[asset.id] || 0) + parseFloat(asset.monthly_contribution.toString());
                        totalAssetContributions += parseFloat(asset.monthly_contribution.toString());
                    }

                    totalAssets += assetValues[asset.id] || 0;
                });

                // Add remaining monthly savings to total assets (after accounting for asset-specific contributions)
                const remainingSavings = monthlySavings - totalAssetContributions;
                totalAssets += remainingSavings;

                // Update individual liability balances
                let totalLiabilities = 0;
                liabilities.forEach(liability => {
                    const currentBalance = liabilityBalances[liability.id] || 0;
                    if (currentBalance > 0 && liability.monthly_payment) {
                        const monthlyInterestRate = (liability.interest_rate || 0) / 100 / 12; // Convert percentage to decimal
                        const interestPayment = currentBalance * monthlyInterestRate;
                        const principalPayment = Math.min(
                            parseFloat(liability.monthly_payment.toString()) - interestPayment,
                            currentBalance
                        );
                        liabilityBalances[liability.id] = Math.max(0, currentBalance - principalPayment);
                    }
                    totalLiabilities += liabilityBalances[liability.id] || 0;
                });

                // Cap values to prevent database overflow (PostgreSQL DECIMAL(20,2) limit is 10^18)
                totalAssets = Math.min(totalAssets, MAX_VALUE);
                totalLiabilities = Math.min(totalLiabilities, MAX_VALUE);

                // Calculate goal progress
                const goalProgress: Record<string, number> = {};
                goals.forEach(goal => {
                    const targetDate = new Date(goal.target_date);
                    const projectionDate = new Date();
                    projectionDate.setFullYear(projectionDate.getFullYear() + year);
                    projectionDate.setMonth(projectionDate.getMonth() + month - 1);

                    if (projectionDate <= targetDate) {
                        // Simple linear progress assumption - could be enhanced
                        const timeToTarget = (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
                        const timeElapsedToTarget = timeElapsed / timeToTarget;
                        const currentProgress = parseFloat(goal.current_progress.toString());
                        const targetAmount = parseFloat(goal.target_amount.toString());
                        const projectedProgress = currentProgress +
                            (targetAmount - currentProgress) * Math.min(timeElapsedToTarget, 1);

                        goalProgress[goal.id] = Math.min(projectedProgress, targetAmount);
                    }
                });

                const snapshot: FinancialSnapshot = {
                    totalAssets: totalAssets,
                    totalLiabilities: totalLiabilities,
                    netWorth: totalAssets - totalLiabilities,
                    monthlyIncome: cappedIncome,
                    monthlyExpenses: cappedExpenses,
                    monthlySavings: cappedSavings,
                    savingsRate: cappedIncome > 0 ?
                        (cappedSavings / cappedIncome) * 100 : 0,
                    debtToIncomeRatio: cappedIncome > 0 ?
                        (totalLiabilities / (cappedIncome * 12)) * 100 : 0,
                    liquidityRatio: 0, // Simplified for now
                    emergencyFundMonths: 0, // Simplified for now
                };

                projections.push({
                    year,
                    month,
                    snapshot,
                    goalProgress,
                    milestones: [],
                    risks: [],
                    opportunities: [],
                });
            }
        }

        return projections;
    }

    static generateInsights(
        currentSnapshot: FinancialSnapshot,
        projections: FinancialProjection[],
        goals: Goal[]
    ): FinancialInsight[] {
        const insights: FinancialInsight[] = [];

        // Emergency fund analysis
        if (currentSnapshot.emergencyFundMonths < 3) {
            insights.push({
                type: 'warning',
                title: 'Insufficient Emergency Fund',
                description: `You have ${currentSnapshot.emergencyFundMonths.toFixed(1)} months of expenses saved. Experts recommend 3-6 months.`,
                impact: 'high',
                actionItems: [
                    'Increase monthly savings to build emergency fund',
                    'Consider opening a high-yield savings account',
                    'Automate transfers to emergency fund'
                ],
                relatedGoals: goals.filter(g => g.name.toLowerCase().includes('emergency')).map(g => g.id)
            });
        }

        // Savings rate analysis
        if (currentSnapshot.savingsRate < 10) {
            insights.push({
                type: 'recommendation',
                title: 'Low Savings Rate',
                description: `Your current savings rate is ${currentSnapshot.savingsRate.toFixed(1)}%. Aim for at least 20%.`,
                impact: 'high',
                actionItems: [
                    'Review and reduce discretionary expenses',
                    'Look for opportunities to increase income',
                    'Automate savings to ensure consistency'
                ]
            });
        } else if (currentSnapshot.savingsRate > 20) {
            insights.push({
                type: 'achievement',
                title: 'Excellent Savings Rate',
                description: `Your savings rate of ${currentSnapshot.savingsRate.toFixed(1)}% is excellent!`,
                impact: 'high',
                actionItems: [
                    'Consider increasing investment contributions',
                    'Explore tax-advantaged accounts',
                    'Review goal timelines - you may achieve them sooner'
                ]
            });
        }

        // Debt analysis
        if (currentSnapshot.debtToIncomeRatio > 40) {
            insights.push({
                type: 'warning',
                title: 'High Debt-to-Income Ratio',
                description: `Your debt-to-income ratio is ${currentSnapshot.debtToIncomeRatio.toFixed(1)}%. Consider debt reduction strategies.`,
                impact: 'high',
                actionItems: [
                    'Create a debt payoff plan',
                    'Consider debt consolidation',
                    'Avoid taking on additional debt'
                ]
            });
        }

        // Goal feasibility analysis
        const oneYearProjection = projections.find(p => p.year === 1 && p.month === 12);
        if (oneYearProjection && currentSnapshot.monthlySavings > 0) {
            goals.forEach(goal => {
                const targetDate = new Date(goal.target_date);
                const yearsToGoal = (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
                const remainingAmount = goal.target_amount - goal.current_progress;
                const monthlyNeeded = remainingAmount / (yearsToGoal * 12);

                if (monthlyNeeded > currentSnapshot.monthlySavings * 0.8) {
                    insights.push({
                        type: 'warning',
                        title: `Goal "${goal.name}" May Be Challenging`,
                        description: `You need to save $${monthlyNeeded.toFixed(0)}/month, but only have $${currentSnapshot.monthlySavings.toFixed(0)} available.`,
                        impact: 'medium',
                        actionItems: [
                            'Consider extending the goal timeline',
                            'Increase monthly savings',
                            'Review and prioritize goals'
                        ],
                        relatedGoals: [goal.id]
                    });
                } else if (monthlyNeeded < currentSnapshot.monthlySavings * 0.3) {
                    insights.push({
                        type: 'opportunity',
                        title: `Goal "${goal.name}" Achievable Ahead of Schedule`,
                        description: `You could reach this goal earlier by allocating more savings to it.`,
                        impact: 'medium',
                        actionItems: [
                            'Consider moving up the target date',
                            'Allocate more monthly savings to this goal',
                            'Set a more ambitious target'
                        ],
                        relatedGoals: [goal.id]
                    });
                }
            });
        }

        return insights;
    }
}

const initialState: FinancialState = {
    assets: [],
    liabilities: [],
    incomeStreams: [],
    expenses: [],
    goals: [],
    scenarios: [],
    currentSnapshot: {
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlySavings: 0,
        savingsRate: 0,
        debtToIncomeRatio: 0,
        liquidityRatio: 0,
        emergencyFundMonths: 0,
    },
    projections: [],
    insights: [],
    loading: false,
    error: null,
    lastUpdated: null,
};

function financialReducer(state: FinancialState, action: FinancialAction): FinancialState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };

        case 'SET_ASSETS':
            return { ...state, assets: action.payload };

        case 'SET_LIABILITIES':
            return { ...state, liabilities: action.payload };

        case 'SET_INCOME_STREAMS':
            return { ...state, incomeStreams: action.payload };

        case 'SET_EXPENSES':
            return { ...state, expenses: action.payload };

        case 'SET_GOALS':
            return { ...state, goals: action.payload };

        case 'SET_SCENARIOS':
            return { ...state, scenarios: action.payload };

        case 'UPDATE_FINANCIAL_DATA':
            console.log('🧮 Calculating financial snapshot with data:', {
                assets: state.assets.length,
                liabilities: state.liabilities.length,
                incomeStreams: state.incomeStreams.length,
                expenses: state.expenses.length
            });

            const currentSnapshot = FinancialCalculator.calculateFinancialSnapshot(
                state.assets,
                state.liabilities,
                state.incomeStreams,
                state.expenses
            );

            console.log('📊 Calculated snapshot:', currentSnapshot);

            return {
                ...state,
                currentSnapshot,
                lastUpdated: new Date(),
            };

        case 'COMPUTE_PROJECTIONS':
            const projections = FinancialCalculator.projectFinancials(
                state.currentSnapshot,
                state.assets,
                state.liabilities,
                state.incomeStreams,
                state.expenses,
                state.goals
            );

            return { ...state, projections };

        case 'GENERATE_INSIGHTS':
            const insights = FinancialCalculator.generateInsights(
                state.currentSnapshot,
                state.projections,
                state.goals
            );

            return { ...state, insights };

        default:
            return state;
    }
}

interface FinancialContextType {
    state: FinancialState;
    actions: {
        loadAllData: () => Promise<void>;
        refreshData: () => Promise<void>;
        addAsset: (asset: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
        updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
        deleteAsset: (id: string) => Promise<void>;
        addLiability: (liability: Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
        updateLiability: (id: string, liability: Partial<Liability>) => Promise<void>;
        deleteLiability: (id: string) => Promise<void>;
        addIncomeStream: (income: Omit<IncomeStream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
        updateIncomeStream: (id: string, income: Partial<IncomeStream>) => Promise<void>;
        deleteIncomeStream: (id: string) => Promise<void>;
        addExpense: (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
        updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
        deleteExpense: (id: string) => Promise<void>;
        addGoal: (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_achieved' | 'achieved_date'>) => Promise<void>;
        updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
        deleteGoal: (id: string) => Promise<void>;
        runProjections: () => void;
        generateInsights: () => void;
    };
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(financialReducer, initialState);
    const hasLoadedData = useRef(false);

    const loadAllData = useCallback(async () => {
        console.log('🔄 Loading financial data...');
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            const [
                assetsResponse,
                liabilitiesResponse,
                incomeResponse,
                expensesResponse,
                goalsResponse,
                scenariosResponse
            ] = await Promise.all([
                assetService.getAllAssets(),
                liabilityService.getAllLiabilities(),
                incomeService.getAllIncomeStreams(),
                expenseService.getAllExpenses(),
                goalService.getAllGoals(),
                scenarioService.getAllScenarios()
            ]);

            console.log('📊 API Responses:', {
                assets: assetsResponse,
                liabilities: liabilitiesResponse,
                income: incomeResponse,
                expenses: expensesResponse,
                goals: goalsResponse,
                scenarios: scenariosResponse
            });

            if (assetsResponse.success && assetsResponse.data) {
                console.log('✅ Loading assets:', assetsResponse.data.length, 'items');
                dispatch({ type: 'SET_ASSETS', payload: assetsResponse.data });
            } else {
                console.warn('⚠️ Assets response failed:', assetsResponse);
            }

            if (liabilitiesResponse.success && liabilitiesResponse.data) {
                console.log('✅ Loading liabilities:', liabilitiesResponse.data.length, 'items');
                dispatch({ type: 'SET_LIABILITIES', payload: liabilitiesResponse.data });
            } else {
                console.warn('⚠️ Liabilities response failed:', liabilitiesResponse);
            }

            if (incomeResponse.success && incomeResponse.data) {
                console.log('✅ Loading income streams:', incomeResponse.data.length, 'items');
                dispatch({ type: 'SET_INCOME_STREAMS', payload: incomeResponse.data });
            } else {
                console.warn('⚠️ Income response failed:', incomeResponse);
            }

            if (expensesResponse.success && expensesResponse.data) {
                console.log('✅ Loading expenses:', expensesResponse.data.length, 'items');
                dispatch({ type: 'SET_EXPENSES', payload: expensesResponse.data });
            } else {
                console.warn('⚠️ Expenses response failed:', expensesResponse);
            }

            if (goalsResponse.success && goalsResponse.data) {
                console.log('✅ Loading goals:', goalsResponse.data.length, 'items');
                dispatch({ type: 'SET_GOALS', payload: goalsResponse.data });
            } else {
                console.warn('⚠️ Goals response failed:', goalsResponse);
            }

            if (scenariosResponse.success && scenariosResponse.data) {
                console.log('✅ Loading scenarios:', scenariosResponse.data.length, 'items');
                dispatch({ type: 'SET_SCENARIOS', payload: scenariosResponse.data });
            } else {
                console.warn('⚠️ Scenarios response failed:', scenariosResponse);
            }

            // Update calculations
            console.log('🧮 Updating financial calculations...');
            dispatch({ type: 'UPDATE_FINANCIAL_DATA' });

        } catch (error) {
            console.error('❌ Failed to load financial data:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load financial data' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    const refreshData = useCallback(async () => {
        dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
        dispatch({ type: 'COMPUTE_PROJECTIONS' });
        dispatch({ type: 'GENERATE_INSIGHTS' });
    }, []);

    // Asset actions
    const addAsset = useCallback(async (assetData: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        try {
            const response = await assetService.createAsset(assetData);
            if (response.success && response.data) {
                dispatch({ type: 'SET_ASSETS', payload: [...state.assets, response.data] });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add asset' });
        }
    }, [state.assets]);

    const updateAsset = useCallback(async (id: string, assetData: Partial<Asset>) => {
        try {
            const response = await assetService.updateAsset(id, assetData);
            if (response.success && response.data) {
                dispatch({
                    type: 'SET_ASSETS',
                    payload: state.assets.map(asset => asset.id === id ? response.data! : asset)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update asset' });
        }
    }, [state.assets]);

    const deleteAsset = useCallback(async (id: string) => {
        try {
            const response = await assetService.deleteAsset(id);
            if (response.success) {
                dispatch({
                    type: 'SET_ASSETS',
                    payload: state.assets.filter(asset => asset.id !== id)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete asset' });
        }
    }, [state.assets]);

    // Liability actions
    const addLiability = useCallback(async (liabilityData: Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        try {
            const response = await liabilityService.createLiability(liabilityData);
            if (response.success && response.data) {
                dispatch({ type: 'SET_LIABILITIES', payload: [...state.liabilities, response.data] });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add liability' });
        }
    }, [state.liabilities]);

    const updateLiability = useCallback(async (id: string, liabilityData: Partial<Liability>) => {
        try {
            const response = await liabilityService.updateLiability(id, liabilityData);
            if (response.success && response.data) {
                dispatch({
                    type: 'SET_LIABILITIES',
                    payload: state.liabilities.map(liability => liability.id === id ? response.data! : liability)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update liability' });
        }
    }, [state.liabilities]);

    const deleteLiability = useCallback(async (id: string) => {
        try {
            const response = await liabilityService.deleteLiability(id);
            if (response.success) {
                dispatch({
                    type: 'SET_LIABILITIES',
                    payload: state.liabilities.filter(liability => liability.id !== id)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete liability' });
        }
    }, [state.liabilities]);

    // Income actions
    const addIncomeStream = useCallback(async (incomeData: Omit<IncomeStream, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        try {
            const response = await incomeService.createIncomeStream(incomeData);
            if (response.success && response.data) {
                dispatch({ type: 'SET_INCOME_STREAMS', payload: [...state.incomeStreams, response.data] });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add income stream' });
        }
    }, [state.incomeStreams]);

    const updateIncomeStream = useCallback(async (id: string, incomeData: Partial<IncomeStream>) => {
        try {
            const response = await incomeService.updateIncomeStream(id, incomeData);
            if (response.success && response.data) {
                dispatch({
                    type: 'SET_INCOME_STREAMS',
                    payload: state.incomeStreams.map(income => income.id === id ? response.data! : income)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update income stream' });
        }
    }, [state.incomeStreams]);

    const deleteIncomeStream = useCallback(async (id: string) => {
        try {
            const response = await incomeService.deleteIncomeStream(id);
            if (response.success) {
                dispatch({
                    type: 'SET_INCOME_STREAMS',
                    payload: state.incomeStreams.filter(income => income.id !== id)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete income stream' });
        }
    }, [state.incomeStreams]);

    // Expense actions
    const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        try {
            const response = await expenseService.createExpense(expenseData);
            if (response.success && response.data) {
                dispatch({ type: 'SET_EXPENSES', payload: [...state.expenses, response.data] });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add expense' });
        }
    }, [state.expenses]);

    const updateExpense = useCallback(async (id: string, expenseData: Partial<Expense>) => {
        try {
            const response = await expenseService.updateExpense(id, expenseData);
            if (response.success && response.data) {
                dispatch({
                    type: 'SET_EXPENSES',
                    payload: state.expenses.map(expense => expense.id === id ? response.data! : expense)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update expense' });
        }
    }, [state.expenses]);

    const deleteExpense = useCallback(async (id: string) => {
        try {
            const response = await expenseService.deleteExpense(id);
            if (response.success) {
                dispatch({
                    type: 'SET_EXPENSES',
                    payload: state.expenses.filter(expense => expense.id !== id)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete expense' });
        }
    }, [state.expenses]);

    // Goal actions
    const addGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_achieved' | 'achieved_date'>) => {
        try {
            const response = await goalService.createGoal(goalData);
            if (response.success && response.data) {
                dispatch({ type: 'SET_GOALS', payload: [...state.goals, response.data] });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to add goal' });
        }
    }, [state.goals]);

    const updateGoal = useCallback(async (id: string, goalData: Partial<Goal>) => {
        try {
            const response = await goalService.updateGoal(id, goalData);
            if (response.success && response.data) {
                dispatch({
                    type: 'SET_GOALS',
                    payload: state.goals.map(goal => goal.id === id ? response.data! : goal)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update goal' });
        }
    }, [state.goals]);

    const deleteGoal = useCallback(async (id: string) => {
        try {
            const response = await goalService.deleteGoal(id);
            if (response.success) {
                dispatch({
                    type: 'SET_GOALS',
                    payload: state.goals.filter(goal => goal.id !== id)
                });
                dispatch({ type: 'UPDATE_FINANCIAL_DATA' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete goal' });
        }
    }, [state.goals]);

    const runProjections = useCallback(() => {
        dispatch({ type: 'COMPUTE_PROJECTIONS' });
    }, []);

    const generateInsights = useCallback(() => {
        dispatch({ type: 'GENERATE_INSIGHTS' });
    }, []);

    // Auto-refresh calculations when data changes
    useEffect(() => {
        if (state.assets.length > 0 || state.liabilities.length > 0 ||
            state.incomeStreams.length > 0 || state.expenses.length > 0) {
            refreshData();
        }
    }, [state.assets, state.liabilities, state.incomeStreams, state.expenses, state.goals, refreshData]);

    // Load data on mount (with dependency array to prevent excessive calls)
    useEffect(() => {
        if (!hasLoadedData.current) {
            console.log('🚀 FinancialContext mounted, loading data for the first time...');
            hasLoadedData.current = true;
            loadAllData();
        }
    }, [loadAllData]);

    const contextValue: FinancialContextType = {
        state,
        actions: {
            loadAllData,
            refreshData,
            addAsset,
            updateAsset,
            deleteAsset,
            addLiability,
            updateLiability,
            deleteLiability,
            addIncomeStream,
            updateIncomeStream,
            deleteIncomeStream,
            addExpense,
            updateExpense,
            deleteExpense,
            addGoal,
            updateGoal,
            deleteGoal,
            runProjections,
            generateInsights,
        },
    };

    return (
        <FinancialContext.Provider value={contextValue}>
            {children}
        </FinancialContext.Provider>
    );
};

export const useFinancial = (): FinancialContextType => {
    const context = useContext(FinancialContext);
    if (context === undefined) {
        throw new Error('useFinancial must be used within a FinancialProvider');
    }
    return context;
};

export { FinancialCalculator };
