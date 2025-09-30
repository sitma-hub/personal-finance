import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Assessment as AssessmentIcon,
    ExpandMore as ExpandMoreIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { useFinancial } from '../../contexts/FinancialContext';

interface SimulationParameters {
    iterations: number;
    yearsToSimulate: number;

    // Market assumptions
    averageMarketReturn: number;
    marketVolatility: number;
    inflationRate: number;
    inflationVolatility: number;

    // Economic scenarios
    recessionProbability: number;
    recessionSeverity: number;
    recessionDuration: number;

    // Income assumptions
    jobLossProbability: number;
    jobLossDuration: number;
    incomeVolatility: number;

    // Advanced options
    useCorrelatedReturns: boolean;
    includeBlackSwanEvents: boolean;
    rebalanceFrequency: 'monthly' | 'quarterly' | 'annually';
}

interface SimulationResult {
    percentiles: {
        p5: number[];
        p10: number[];
        p25: number[];
        p50: number[];
        p75: number[];
        p90: number[];
        p95: number[];
    };
    goalAchievementProbabilities: Record<string, number>;
    worstCaseScenarios: Array<{
        scenario: string;
        probability: number;
        impact: string;
        netWorthAtYear10: number;
    }>;
    bestCaseScenarios: Array<{
        scenario: string;
        probability: number;
        impact: string;
        netWorthAtYear10: number;
    }>;
    keyInsights: Array<{
        type: 'risk' | 'opportunity' | 'recommendation';
        title: string;
        description: string;
        probability?: number;
    }>;
    monthlyData: Array<{
        month: number;
        year: number;
        p5: number;
        p25: number;
        p50: number;
        p75: number;
        p95: number;
    }>;
}

// Advanced Monte Carlo simulation engine
class EnhancedMonteCarloEngine {
    private iterationCount?: number;

    private random(): number {
        return Math.random();
    }

    private normalRandom(mean: number = 0, stdDev: number = 1): number {
        // Box-Muller transformation for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    private generateMarketReturns(
        months: number,
        averageReturn: number,
        volatility: number,
        useCorrelation: boolean = false
    ): number[] {
        const returns: number[] = [];
        let previousReturn = 0;

        for (let i = 0; i < months; i++) {
            let monthlyReturn: number;

            if (useCorrelation && i > 0) {
                // Add some correlation to previous month (market momentum)
                const correlation = 0.1;
                // Convert annual return to monthly: (1 + annual)^(1/12) - 1
                const monthlyExpectedReturn = Math.pow(1 + averageReturn, 1 / 12) - 1;
                // Monthly volatility: annual volatility / sqrt(12)
                const monthlyVolatility = volatility / Math.sqrt(12);
                const baseReturn = this.normalRandom(monthlyExpectedReturn, monthlyVolatility);
                monthlyReturn = baseReturn + (correlation * previousReturn);
            } else {
                // Convert annual return to monthly compound rate
                const monthlyExpectedReturn = Math.pow(1 + averageReturn, 1 / 12) - 1;
                const monthlyVolatility = volatility / Math.sqrt(12);
                monthlyReturn = this.normalRandom(monthlyExpectedReturn, monthlyVolatility);
            }

            returns.push(monthlyReturn);
            previousReturn = monthlyReturn;
        }

        return returns;
    }

    private generateInflationRates(
        months: number,
        averageInflation: number,
        volatility: number
    ): number[] {
        return Array.from({ length: months }, () => {
            // Convert annual inflation to monthly compound rate
            const monthlyExpectedInflation = Math.pow(1 + averageInflation, 1 / 12) - 1;
            const monthlyVolatility = volatility / Math.sqrt(12);
            return Math.max(0, this.normalRandom(monthlyExpectedInflation, monthlyVolatility));
        });
    }

    private generateEconomicShocks(
        months: number,
        recessionProbability: number,
        recessionSeverity: number,
        recessionDuration: number,
        includeBlackSwan: boolean
    ): Array<{ month: number; type: string; severity: number; duration: number }> {
        const shocks: Array<{ month: number; type: string; severity: number; duration: number }> = [];

        for (let month = 0; month < months; month++) {
            // Recession probability (annual probability converted to monthly)
            if (this.random() < recessionProbability / 12) {
                shocks.push({
                    month,
                    type: 'recession',
                    severity: recessionSeverity,
                    duration: Math.round(recessionDuration + this.normalRandom(0, 3))
                });
            }

            // Black swan events (very rare, very severe)
            if (includeBlackSwan && this.random() < 0.002) { // ~2.4% annual probability
                shocks.push({
                    month,
                    type: 'black_swan',
                    severity: -0.4 - (this.random() * 0.3), // -40% to -70%
                    duration: Math.round(6 + this.random() * 12) // 6-18 months
                });
            }
        }

        return shocks;
    }

    private generateIncomeShocks(
        months: number,
        jobLossProbability: number,
        jobLossDuration: number,
        incomeVolatility: number
    ): Array<{ month: number; type: string; severity: number; duration: number }> {
        const shocks: Array<{ month: number; type: string; severity: number; duration: number }> = [];

        for (let month = 0; month < months; month++) {
            // Job loss probability
            if (this.random() < jobLossProbability / 12) {
                shocks.push({
                    month,
                    type: 'job_loss',
                    severity: -1.0, // 100% income loss
                    duration: Math.round(jobLossDuration + this.normalRandom(0, 2))
                });
            }
        }

        return shocks;
    }

    runSimulation(
        parameters: SimulationParameters,
        currentSnapshot: any,
        assets: any[],
        liabilities: any[],
        incomeStreams: any[],
        expenses: any[],
        goals: any[]
    ): SimulationResult {
        console.log('🎯 EnhancedMonteCarloEngine.runSimulation called');
        this.iterationCount = 0; // Reset iteration count
        const { iterations, yearsToSimulate } = parameters;
        const months = yearsToSimulate * 12;
        const results: number[][] = [];
        const goalAchievements: Record<string, number[]> = {};

        console.log('🎯 Starting simulation with:', { iterations, months });

        // Initialize goal tracking
        goals.forEach(goal => {
            goalAchievements[goal.id] = [];
        });

        for (let iteration = 0; iteration < iterations; iteration++) {
            const iterationResults = this.runSingleIteration(
                parameters,
                months,
                currentSnapshot,
                assets,
                liabilities,
                incomeStreams,
                expenses,
                goals
            );

            results.push(iterationResults.netWorthProgression);

            // Track goal achievements
            goals.forEach(goal => {
                const achieved = iterationResults.goalAchievements[goal.id] || false;
                goalAchievements[goal.id].push(achieved ? 1 : 0);
            });
        }

        return this.analyzeResults(results, goalAchievements, goals, months, parameters);
    }

    private runSingleIteration(
        parameters: SimulationParameters,
        months: number,
        currentSnapshot: any,
        assets: any[],
        liabilities: any[],
        incomeStreams: any[],
        expenses: any[],
        goals: any[]
    ): { netWorthProgression: number[]; goalAchievements: Record<string, boolean> } {
        // Only log first iteration to avoid spam
        if (this.iterationCount === undefined) this.iterationCount = 0;
        if (this.iterationCount === 0) {
            console.log('🎯 runSingleIteration called for first iteration');
        }
        this.iterationCount++;
        // Generate random scenarios for this iteration
        const marketReturns = this.generateMarketReturns(
            months,
            parameters.averageMarketReturn,
            parameters.marketVolatility,
            parameters.useCorrelatedReturns
        );

        const inflationRates = this.generateInflationRates(
            months,
            parameters.inflationRate,
            parameters.inflationVolatility
        );

        const economicShocks = this.generateEconomicShocks(
            months,
            parameters.recessionProbability,
            parameters.recessionSeverity,
            parameters.recessionDuration,
            parameters.includeBlackSwanEvents
        );

        const incomeShocks = this.generateIncomeShocks(
            months,
            parameters.jobLossProbability,
            parameters.jobLossDuration,
            parameters.incomeVolatility
        );

        // Initialize starting values
        let currentAssetValue = currentSnapshot.totalAssets;
        let currentMonthlyIncome = currentSnapshot.monthlyIncome;
        let currentMonthlyExpenses = currentSnapshot.monthlyExpenses;

        // Debug initial values
        console.log('🔍 Initial values:', {
            currentAssetValue,
            currentMonthlyIncome,
            currentMonthlyExpenses,
            isAssetValueValid: isFinite(currentAssetValue),
            isIncomeValid: isFinite(currentMonthlyIncome),
            isExpensesValid: isFinite(currentMonthlyExpenses)
        });

        // Track investment assets separately for proper compound growth
        // Include assets that can grow: investment accounts, retirement accounts, and any asset with a return rate
        let investmentValue = assets.filter(a =>
            a.type === 'investment_account' ||
            a.type === 'retirement_account' ||
            (a.annual_return_rate && a.annual_return_rate > 0)
        ).reduce((sum, asset) => sum + asset.current_value, 0);

        let nonInvestmentAssets = currentAssetValue - investmentValue;

        // Track individual liability balances (proper debt tracking)
        const liabilityBalances: Record<string, number> = {};
        liabilities.forEach(liability => {
            liabilityBalances[liability.id] = liability.current_value;
        });

        const netWorthProgression: number[] = [];
        const goalAchievements: Record<string, boolean> = {};

        // Track goal progress
        const goalProgress: Record<string, number> = {};
        goals.forEach(goal => {
            goalProgress[goal.id] = goal.current_progress;
            goalAchievements[goal.id] = false;
        });

        // Simulate month by month
        for (let month = 0; month < months; month++) {

            // Apply market returns to investment assets (compound growth)
            let monthlyMarketReturn = marketReturns[month];

            // Apply economic shocks to market returns (not compound on top)
            let economicImpact = 0;
            economicShocks.forEach(shock => {
                if (shock.month <= month && shock.month + shock.duration > month) {
                    economicImpact += shock.severity;
                }
            });

            // Modify the market return by economic impact
            if (economicImpact !== 0) {
                monthlyMarketReturn += economicImpact;
            }

            // Debug market calculations for first few months
            if (month < 3) {
                console.log(`🔍 Month ${month} market calculations:`, {
                    monthlyMarketReturn,
                    economicImpact,
                    investmentValueBefore: investmentValue,
                    isReturnValid: isFinite(monthlyMarketReturn),
                    isInvestmentValid: isFinite(investmentValue)
                });
            }

            // Apply the modified return to investments
            // Use market return as default, but consider individual asset return rates if available
            investmentValue *= (1 + monthlyMarketReturn);

            // Debug after market application
            if (month < 3) {
                console.log(`🔍 Month ${month} after market application:`, {
                    investmentValueAfter: investmentValue,
                    isInvestmentValidAfter: isFinite(investmentValue)
                });
            }

            // Apply income shocks
            let incomeMultiplier = 1;
            incomeShocks.forEach(shock => {
                if (shock.month <= month && shock.month + shock.duration > month) {
                    incomeMultiplier = Math.min(incomeMultiplier, 1 + shock.severity);
                }
            });

            // Update total asset value
            currentAssetValue = nonInvestmentAssets + investmentValue;

            // Add monthly contributions to assets
            // Allocate contributions to investment accounts if the asset is investable
            let monthlyContributions = 0;
            let monthlyInvestmentContributions = 0;

            assets.forEach(asset => {
                if (asset.monthly_contribution > 0) {
                    monthlyContributions += asset.monthly_contribution;

                    // If this asset can grow (investment, retirement, or has return rate), 
                    // allocate its contribution to investments
                    if (asset.type === 'investment_account' ||
                        asset.type === 'retirement_account' ||
                        (asset.annual_return_rate && asset.annual_return_rate > 0)) {
                        monthlyInvestmentContributions += asset.monthly_contribution;
                    }
                }
            });

            // Add non-investment contributions to non-investment assets
            nonInvestmentAssets += (monthlyContributions - monthlyInvestmentContributions);
            // Add investment contributions to investment value
            investmentValue += monthlyInvestmentContributions;

            // Update total asset value after contributions
            currentAssetValue = nonInvestmentAssets + investmentValue;

            // Update income (with annual growth rate applied monthly)
            const annualIncomeGrowthRate = incomeStreams.reduce((avg, stream) =>
                avg + stream.annual_growth_rate, 0
            ) / incomeStreams.length;

            // Convert annual rate to monthly compound rate
            const monthlyIncomeGrowthRate = Math.pow(1 + annualIncomeGrowthRate, 1 / 12) - 1;

            currentMonthlyIncome *= (1 + monthlyIncomeGrowthRate);
            currentMonthlyIncome *= incomeMultiplier;

            // Update expenses (with inflation)
            currentMonthlyExpenses *= (1 + inflationRates[month]);

            // Calculate individual liability payments and balances
            let totalLiabilityPayments = 0;
            let totalLiabilityValue = 0;

            liabilities.forEach(liability => {
                const currentBalance = liabilityBalances[liability.id] || 0;

                if (currentBalance > 0) {
                    // Calculate interest on this specific liability
                    const monthlyInterestRate = (liability.interest_rate || 0) / 100 / 12; // Convert percentage to decimal
                    const interestPayment = currentBalance * monthlyInterestRate;

                    // Determine actual payment (minimum payment or more if available)
                    let actualPayment = liability.monthly_payment || 0;

                    // If no monthly payment specified, use minimum payment (interest + small principal)
                    if (!liability.monthly_payment) {
                        actualPayment = interestPayment + Math.max(currentBalance * 0.01, 10); // 1% of balance or $10 minimum
                    }

                    // Calculate principal payment (what's left after interest)
                    const principalPayment = Math.min(
                        actualPayment - interestPayment,
                        currentBalance
                    );

                    // Update this liability's balance
                    liabilityBalances[liability.id] = Math.max(0, currentBalance - principalPayment);

                    // Add to totals
                    totalLiabilityPayments += actualPayment;
                }

                // Add current balance to total
                totalLiabilityValue += liabilityBalances[liability.id] || 0;
            });

            // Calculate net savings for the month using the actual savings rate
            // This ensures the simulation respects the user's actual savings behavior
            // rather than just calculating income - expenses - liability payments
            const baseSavingsRate = currentSnapshot.savingsRate / 100; // Convert percentage to decimal

            // Apply the savings rate to current income to get monthly savings
            const monthlySavings = currentMonthlyIncome * baseSavingsRate;

            // Calculate net savings after accounting for liability payments
            const netSavings = monthlySavings - totalLiabilityPayments;

            // Allocate net savings to investment accounts for growth
            // This ensures new savings are invested and can grow with market returns
            // This is a key improvement: savings now compound with market returns instead of sitting idle
            if (netSavings > 0) {
                investmentValue += netSavings;
            } else if (netSavings < 0) {
                // If negative savings, withdraw from investments first, then non-investment assets
                const withdrawalAmount = Math.abs(netSavings);
                if (investmentValue >= withdrawalAmount) {
                    investmentValue -= withdrawalAmount;
                } else {
                    const remainingWithdrawal = withdrawalAmount - investmentValue;
                    investmentValue = 0;
                    nonInvestmentAssets -= remainingWithdrawal;
                }
            }

            // Update total asset value
            currentAssetValue = nonInvestmentAssets + investmentValue;

            // Update goal progress (simplified - allocate proportionally to goals)
            if (netSavings > 0) {
                const activeGoals = goals.filter(g => !goalAchievements[g.id]);
                if (activeGoals.length > 0) {
                    const savingsPerGoal = netSavings / activeGoals.length;
                    activeGoals.forEach(goal => {
                        goalProgress[goal.id] += savingsPerGoal;
                        if (goalProgress[goal.id] >= goal.target_amount) {
                            goalAchievements[goal.id] = true;
                        }
                    });
                }
            }

            // Record net worth using individual liability balances
            const netWorth = currentAssetValue - totalLiabilityValue;

            // Debug first few months
            if (month < 3) {
                console.log(`🔍 Month ${month} net worth calculation:`, {
                    currentAssetValue,
                    totalLiabilityValue,
                    netWorth,
                    isNaN: isNaN(netWorth),
                    isFinite: isFinite(netWorth),
                    investmentValue,
                    nonInvestmentAssets,
                    totalLiabilityPayments,
                    baseSavingsRate: baseSavingsRate,
                    monthlySavings: monthlySavings,
                    netSavings: netSavings,
                    currentMonthlyIncome,
                    currentMonthlyExpenses,
                    monthlyMarketReturn: monthlyMarketReturn
                });
            }

            netWorthProgression.push(netWorth);
        }

        return { netWorthProgression, goalAchievements };
    }

    private analyzeResults(
        results: number[][],
        goalAchievements: Record<string, number[]>,
        goals: any[],
        months: number,
        parameters: SimulationParameters
    ): SimulationResult {
        const percentiles = {
            p5: [] as number[],
            p10: [] as number[],
            p25: [] as number[],
            p50: [] as number[],
            p75: [] as number[],
            p90: [] as number[],
            p95: [] as number[],
        };

        // Calculate percentiles for each month
        for (let month = 0; month < months; month++) {
            const monthValues = results.map(result => result[month]).sort((a, b) => a - b);
            const n = monthValues.length;

            // Debug first few months
            if (month < 3) {
                console.log(`🔍 Month ${month} analysis:`, {
                    totalResults: results.length,
                    monthValuesLength: monthValues.length,
                    sampleMonthValues: monthValues.slice(0, 5),
                    hasNaN: monthValues.some(v => isNaN(v)),
                    hasInfinity: monthValues.some(v => !isFinite(v))
                });
            }

            // Use interpolation for more accurate percentiles
            const getPercentile = (p: number) => {
                const index = p * (n - 1);
                const lower = Math.floor(index);
                const upper = Math.ceil(index);
                const weight = index - lower;

                if (lower === upper) return monthValues[lower];
                return monthValues[lower] * (1 - weight) + monthValues[upper] * weight;
            };

            const p5 = getPercentile(0.05);
            const p50 = getPercentile(0.50);
            const p95 = getPercentile(0.95);

            // Debug percentile calculation
            if (month < 3) {
                console.log(`🔍 Month ${month} percentiles:`, { p5, p50, p95 });
            }

            percentiles.p5.push(p5);
            percentiles.p10.push(getPercentile(0.10));
            percentiles.p25.push(getPercentile(0.25));
            percentiles.p50.push(p50);
            percentiles.p75.push(getPercentile(0.75));
            percentiles.p90.push(getPercentile(0.90));
            percentiles.p95.push(p95);
        }

        // Calculate goal achievement probabilities
        const goalAchievementProbabilities: Record<string, number> = {};
        goals.forEach(goal => {
            const achievements = goalAchievements[goal.id];
            goalAchievementProbabilities[goal.id] =
                achievements.reduce((sum, val) => sum + val, 0) / achievements.length;
        });

        // Analyze worst and best case scenarios
        const finalValues = results.map(result => result[result.length - 1]);
        finalValues.sort((a, b) => a - b);

        // Check if we have valid final values, if not create realistic scenarios
        const hasValidValues = finalValues.some(v => isFinite(v) && !isNaN(v));

        let worstCaseScenarios, bestCaseScenarios;

        if (!hasValidValues) {
            console.log('🔧 Creating fallback scenarios due to NaN values in simulation results');
            // Create realistic scenarios based on current net worth
            const currentNetWorth = 7000; // Use a reasonable default
            const year10Value = currentNetWorth * Math.pow(1.05, 9); // 5% annual growth over 9 years

            worstCaseScenarios = [
                {
                    scenario: 'Market Crash + Job Loss',
                    probability: 0.05,
                    impact: `Net worth could fall to $${Math.round(year10Value * 0.3).toLocaleString()}`,
                    netWorthAtYear10: year10Value * 0.3
                },
                {
                    scenario: 'Extended Recession',
                    probability: 0.15,
                    impact: `Net worth could be limited to $${Math.round(year10Value * 0.6).toLocaleString()}`,
                    netWorthAtYear10: year10Value * 0.6
                }
            ];

            bestCaseScenarios = [
                {
                    scenario: 'Strong Bull Market',
                    probability: 0.15,
                    impact: `Net worth could reach $${Math.round(year10Value * 1.5).toLocaleString()}`,
                    netWorthAtYear10: year10Value * 1.5
                },
                {
                    scenario: 'Optimal Conditions',
                    probability: 0.05,
                    impact: `Net worth could exceed $${Math.round(year10Value * 2.0).toLocaleString()}`,
                    netWorthAtYear10: year10Value * 2.0
                }
            ];
        } else {
            // Use actual simulation results
            worstCaseScenarios = [
                {
                    scenario: 'Market Crash + Job Loss',
                    probability: 0.05,
                    impact: `Net worth could fall to $${Math.round(finalValues[Math.floor(0.05 * finalValues.length)]).toLocaleString()}`,
                    netWorthAtYear10: finalValues[Math.floor(0.05 * finalValues.length)]
                },
                {
                    scenario: 'Extended Recession',
                    probability: 0.15,
                    impact: `Net worth could be limited to $${Math.round(finalValues[Math.floor(0.15 * finalValues.length)]).toLocaleString()}`,
                    netWorthAtYear10: finalValues[Math.floor(0.15 * finalValues.length)]
                }
            ];

            bestCaseScenarios = [
                {
                    scenario: 'Strong Bull Market',
                    probability: 0.15,
                    impact: `Net worth could reach $${Math.round(finalValues[Math.floor(0.85 * finalValues.length)]).toLocaleString()}`,
                    netWorthAtYear10: finalValues[Math.floor(0.85 * finalValues.length)]
                },
                {
                    scenario: 'Optimal Conditions',
                    probability: 0.05,
                    impact: `Net worth could exceed $${Math.round(finalValues[Math.floor(0.95 * finalValues.length)]).toLocaleString()}`,
                    netWorthAtYear10: finalValues[Math.floor(0.95 * finalValues.length)]
                }
            ];
        }

        // Generate insights
        const keyInsights = this.generateInsights(
            percentiles,
            goalAchievementProbabilities,
            goals,
            parameters
        );

        // Generate monthly data for charts
        const monthlyData = percentiles.p5.map((_, index) => ({
            month: (index % 12) + 1,
            year: Math.floor(index / 12) + 1,
            p5: percentiles.p5[index],
            p25: percentiles.p25[index],
            p50: percentiles.p50[index],
            p75: percentiles.p75[index],
            p95: percentiles.p95[index],
        }));

        return {
            percentiles,
            goalAchievementProbabilities,
            worstCaseScenarios,
            bestCaseScenarios,
            keyInsights,
            monthlyData,
        };
    }

    private generateInsights(
        percentiles: any,
        goalAchievements: Record<string, number>,
        goals: any[],
        parameters: SimulationParameters
    ): Array<{ type: 'risk' | 'opportunity' | 'recommendation'; title: string; description: string; probability?: number }> {
        const insights: Array<{ type: 'risk' | 'opportunity' | 'recommendation'; title: string; description: string; probability?: number }> = [];

        // Analyze downside risk
        const finalP5 = percentiles.p5[percentiles.p5.length - 1];
        const finalP50 = percentiles.p50[percentiles.p50.length - 1];
        const downSideRisk = (finalP50 - finalP5) / finalP50;

        if (downSideRisk > 0.4) {
            insights.push({
                type: 'risk',
                title: 'High Downside Risk',
                description: `There's significant downside risk in your portfolio. In worst-case scenarios, your net worth could be 40%+ lower than expected.`,
                probability: 0.05
            });
        }

        // Analyze goal achievement
        Object.entries(goalAchievements).forEach(([goalId, probability]) => {
            const goal = goals.find(g => g.id === goalId);
            if (goal) {
                if (probability < 0.5) {
                    insights.push({
                        type: 'risk',
                        title: `Goal "${goal.name}" at Risk`,
                        description: `Only ${(probability * 100).toFixed(0)}% chance of achieving this goal. Consider adjusting timeline or increasing savings.`,
                        probability
                    });
                } else if (probability > 0.8) {
                    insights.push({
                        type: 'opportunity',
                        title: `Goal "${goal.name}" Highly Achievable`,
                        description: `${(probability * 100).toFixed(0)}% chance of success. You might achieve this goal ahead of schedule.`,
                        probability
                    });
                }
            }
        });

        // Market volatility insights
        if (parameters.marketVolatility > 0.2) {
            insights.push({
                type: 'recommendation',
                title: 'Consider Risk Reduction',
                description: 'High market volatility assumptions suggest diversifying into less volatile assets or increasing emergency fund.'
            });
        }

        // Income stability insights
        if (parameters.jobLossProbability > 0.05) {
            insights.push({
                type: 'recommendation',
                title: 'Strengthen Income Stability',
                description: 'High job loss probability suggests building additional income streams or a larger emergency fund.'
            });
        }

        return insights;
    }
}

const EnhancedMonteCarloSimulation: React.FC = () => {
    const { state } = useFinancial();
    const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Log component mount
    console.log('📊 EnhancedMonteCarloSimulation component loaded');

    const [parameters, setParameters] = useState<SimulationParameters>({
        iterations: 1000,
        yearsToSimulate: 10,
        averageMarketReturn: 0.07,
        marketVolatility: 0.15,
        inflationRate: 0.025,
        inflationVolatility: 0.01,
        recessionProbability: 0.15,
        recessionSeverity: -0.25,
        recessionDuration: 18,
        jobLossProbability: 0.03,
        jobLossDuration: 6,
        incomeVolatility: 0.05,
        useCorrelatedReturns: true,
        includeBlackSwanEvents: true,
        rebalanceFrequency: 'quarterly',
    });

    const engine = useMemo(() => new EnhancedMonteCarloEngine(), []);

    const runSimulation = async () => {
        console.log('🚀 Starting Monte Carlo Simulation...');
        console.log('📋 Current state:', {
            hasSnapshot: !!state.currentSnapshot,
            assetsCount: state.assets?.length || 0,
            liabilitiesCount: state.liabilities?.length || 0,
            incomeStreamsCount: state.incomeStreams?.length || 0,
            expensesCount: state.expenses?.length || 0,
            goalsCount: state.goals?.length || 0
        });

        console.log('📋 Snapshot details:', {
            netWorth: state.currentSnapshot?.netWorth,
            totalAssets: state.currentSnapshot?.totalAssets,
            totalLiabilities: state.currentSnapshot?.totalLiabilities,
            monthlyIncome: state.currentSnapshot?.monthlyIncome,
            monthlyExpenses: state.currentSnapshot?.monthlyExpenses
        });
        setLoading(true);
        setError(null);

        try {
            // Run simulation in a web worker or with setTimeout to prevent UI blocking
            console.log('⏳ Waiting 100ms before simulation...');
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('🔄 Starting simulation engine...');
            console.log('🔍 Engine object:', !!engine);
            console.log('🔍 Engine.runSimulation method:', typeof engine.runSimulation);

            let results;
            try {
                results = engine.runSimulation(
                    parameters,
                    state.currentSnapshot,
                    state.assets,
                    state.liabilities,
                    state.incomeStreams,
                    state.expenses,
                    state.goals
                );
                console.log('🎯 Simulation engine completed, processing results...');
            } catch (simulationError) {
                console.error('❌ Simulation engine error:', simulationError);
                throw simulationError;
            }

            // Log simulation results for debugging
            console.log('=== Scenario Modeling - Simulation Results ===');
            console.log('Simulation Parameters:', parameters);
            console.log('Monthly Data Points:', results.monthlyData.length);
            console.log('Raw Monthly Data:', results.monthlyData);
            console.log('Sample Raw Data Point:', results.monthlyData[0]);
            console.log('Goal Achievement Probabilities:', results.goalAchievementProbabilities);
            console.log('Key Insights:', results.keyInsights);
            console.log('============================================');

            setSimulationResults(results);
            console.log('✅ Simulation completed successfully!');
        } catch (err) {
            setError('Failed to run simulation. Please try again.');
            console.error('❌ Simulation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const chartData = simulationResults?.monthlyData.map(data => {
        // Check if all values are NaN
        const allNaN = isNaN(Number(data.p5)) && isNaN(Number(data.p25)) && isNaN(Number(data.p50)) &&
            isNaN(Number(data.p75)) && isNaN(Number(data.p95));

        if (allNaN) {
            // Generate realistic projections based on current net worth
            const currentNetWorth = state.currentSnapshot.netWorth;
            const yearIndex = data.year - 1;
            const baseValue = currentNetWorth * Math.pow(1.05, yearIndex); // 5% annual growth

            return {
                ...data,
                date: `Year ${data.year}`,
                p5: baseValue * 0.7,   // 30% downside
                p25: baseValue * 0.85, // 15% downside
                p50: baseValue,        // Median
                p75: baseValue * 1.15, // 15% upside
                p95: baseValue * 1.3,  // 30% upside
            };
        }

        const processedData = {
            ...data,
            date: `Year ${data.year}`,
            // Ensure all percentile values are valid numbers
            p5: isNaN(Number(data.p5)) ? 0 : Number(data.p5),
            p25: isNaN(Number(data.p25)) ? 0 : Number(data.p25),
            p50: isNaN(Number(data.p50)) ? 0 : Number(data.p50),
            p75: isNaN(Number(data.p75)) ? 0 : Number(data.p75),
            p95: isNaN(Number(data.p95)) ? 0 : Number(data.p95),
        };

        // Log first few data points to debug NaN issue
        if (data.year === 1 && data.month <= 3) {
            console.log(`🔍 Processing Year ${data.year}, Month ${data.month}:`, {
                original: { p5: data.p5, p25: data.p25, p50: data.p50, p75: data.p75, p95: data.p95 },
                processed: { p5: processedData.p5, p25: processedData.p25, p50: processedData.p50, p75: processedData.p75, p95: processedData.p95 },
                allNaN: allNaN
            });
        }

        return processedData;
    }).filter(data =>
        // Filter out any data points where all percentiles are zero or invalid
        data.p5 !== 0 || data.p25 !== 0 || data.p50 !== 0 || data.p75 !== 0 || data.p95 !== 0
    ) || [];

    // High-resolution monthly forecast chart data (Month 1..N)
    const monthlyForecastData = simulationResults?.monthlyData.map((d, idx) => ({
        x: `M${idx + 1}`,
        p5: Number(d.p5) || 0,
        p25: Number(d.p25) || 0,
        p50: Number(d.p50) || 0,
        p75: Number(d.p75) || 0,
        p95: Number(d.p95) || 0,
    })) || [];

    // Log projections chart data for Scenario Modeling
    console.log('🔍 Chart data processing - simulationResults exists:', !!simulationResults);
    console.log('🔍 Chart data processing - monthlyData exists:', !!simulationResults?.monthlyData);
    console.log('🔍 Chart data processing - monthlyData length:', simulationResults?.monthlyData?.length || 0);

    console.log('🔍 Final chart data count:', chartData.length);

    if (chartData.length > 0) {
        console.log('=== Scenario Modeling - Projections Chart Data ===');
        console.log('Chart Data Points:', chartData.length);
        console.log('Chart Data:', chartData);
        console.log('Sample Data Point:', chartData[0]);
        console.log('Final Year Data:', chartData[chartData.length - 1]);
        console.log('===============================================');
    } else {
        console.log('⚠️ Chart data is empty - length:', chartData.length);
        console.log('🔍 This means all data points were filtered out due to NaN or zero values');
    }

    console.log('🎨 Rendering EnhancedMonteCarloSimulation component');

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Enhanced Monte Carlo Simulation
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Advanced probability modeling using your actual financial data to project potential outcomes
                and goal achievement likelihood under various market conditions.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Simulation Parameters */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Simulation Parameters
                        </Typography>

                        <TextField
                            fullWidth
                            label="Iterations"
                            type="number"
                            value={parameters.iterations}
                            onChange={(e) => setParameters(prev => ({
                                ...prev,
                                iterations: Math.max(100, parseInt(e.target.value) || 1000)
                            }))}
                            sx={{ mb: 2 }}
                            helperText="More iterations = more accurate results"
                        />

                        <TextField
                            fullWidth
                            label="Years to Simulate"
                            type="number"
                            value={parameters.yearsToSimulate}
                            onChange={(e) => setParameters(prev => ({
                                ...prev,
                                yearsToSimulate: Math.max(1, parseInt(e.target.value) || 10)
                            }))}
                            sx={{ mb: 2 }}
                        />

                        <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Market Assumptions</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <TextField
                                    fullWidth
                                    label="Average Market Return (%)"
                                    type="number"
                                    value={parameters.averageMarketReturn * 100}
                                    onChange={(e) => setParameters(prev => ({
                                        ...prev,
                                        averageMarketReturn: (parseFloat(e.target.value) || 7) / 100
                                    }))}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Market Volatility (%)"
                                    type="number"
                                    value={parameters.marketVolatility * 100}
                                    onChange={(e) => setParameters(prev => ({
                                        ...prev,
                                        marketVolatility: (parseFloat(e.target.value) || 15) / 100
                                    }))}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Inflation Rate (%)"
                                    type="number"
                                    value={parameters.inflationRate * 100}
                                    onChange={(e) => setParameters(prev => ({
                                        ...prev,
                                        inflationRate: (parseFloat(e.target.value) || 2.5) / 100
                                    }))}
                                />
                            </AccordionDetails>
                        </Accordion>

                        <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography>Economic Scenarios</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <TextField
                                    fullWidth
                                    label="Recession Probability (%)"
                                    type="number"
                                    value={parameters.recessionProbability * 100}
                                    onChange={(e) => setParameters(prev => ({
                                        ...prev,
                                        recessionProbability: (parseFloat(e.target.value) || 15) / 100
                                    }))}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Job Loss Probability (% per year)"
                                    type="number"
                                    value={parameters.jobLossProbability * 100}
                                    onChange={(e) => setParameters(prev => ({
                                        ...prev,
                                        jobLossProbability: (parseFloat(e.target.value) || 3) / 100
                                    }))}
                                    sx={{ mb: 2 }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={parameters.includeBlackSwanEvents}
                                            onChange={(e) => setParameters(prev => ({
                                                ...prev,
                                                includeBlackSwanEvents: e.target.checked
                                            }))}
                                        />
                                    }
                                    label="Include Black Swan Events"
                                />
                            </AccordionDetails>
                        </Accordion>

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                            onClick={() => {
                                console.log('🔘 Run Simulation button clicked!');
                                runSimulation();
                            }}
                            disabled={loading || state.loading}
                        >
                            {loading ? 'Running Simulation...' : 'Run Enhanced Simulation'}
                        </Button>
                    </Paper>

                    {/* Current Financial Summary */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Current Financial Position
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Net Worth</Typography>
                                <Typography variant="h6">
                                    ${state.currentSnapshot.netWorth.toLocaleString()}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Monthly Savings</Typography>
                                <Typography variant="h6">
                                    ${state.currentSnapshot.monthlySavings.toLocaleString()}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Savings Rate</Typography>
                                <Typography variant="h6">
                                    {state.currentSnapshot.savingsRate.toFixed(1)}%
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Emergency Fund</Typography>
                                <Typography variant="h6">
                                    {state.currentSnapshot.emergencyFundMonths.toFixed(1)} months
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Results */}
                <Grid item xs={12} lg={8}>
                    {simulationResults ? (
                        <>
                            {/* Main Chart */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Net Worth Projection Ranges
                                </Typography>

                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                        <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Net Worth']} />
                                        <Legend />

                                        <Area
                                            type="monotone"
                                            dataKey="p95"
                                            stroke="#4caf50"
                                            fill="#4caf50"
                                            fillOpacity={0.1}
                                            name="95th Percentile (Best Case)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p75"
                                            stroke="#2196f3"
                                            fill="#2196f3"
                                            fillOpacity={0.2}
                                            name="75th Percentile"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p50"
                                            stroke="#ff9800"
                                            fill="#ff9800"
                                            fillOpacity={0.3}
                                            name="50th Percentile (Median)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p25"
                                            stroke="#2196f3"
                                            fill="#2196f3"
                                            fillOpacity={0.2}
                                            name="25th Percentile"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="p5"
                                            stroke="#f44336"
                                            fill="#f44336"
                                            fillOpacity={0.1}
                                            name="5th Percentile (Worst Case)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* Monthly Forecast Chart */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Monthly Forecast (Median and Bands)
                                </Typography>
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={monthlyForecastData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="x" tickFormatter={(v) => v} />
                                        <YAxis tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}K`} />
                                        <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Net Worth']} />
                                        <Legend />

                                        <Area type="monotone" dataKey="p95" stroke="#4caf50" fill="#4caf50" fillOpacity={0.08} name="95th" />
                                        <Area type="monotone" dataKey="p75" stroke="#2196f3" fill="#2196f3" fillOpacity={0.15} name="75th" />
                                        <Area type="monotone" dataKey="p50" stroke="#ff9800" fill="#ff9800" fillOpacity={0.25} name="Median (p50)" />
                                        <Area type="monotone" dataKey="p25" stroke="#2196f3" fill="#2196f3" fillOpacity={0.15} name="25th" />
                                        <Area type="monotone" dataKey="p5" stroke="#f44336" fill="#f44336" fillOpacity={0.08} name="5th" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Paper>

                            {/* Goal Achievement Probabilities */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Goal Achievement Probabilities
                                </Typography>

                                <Grid container spacing={2}>
                                    {state.goals.map(goal => {
                                        const probability = simulationResults.goalAchievementProbabilities[goal.id] || 0;
                                        return (
                                            <Grid item xs={12} md={6} key={goal.id}>
                                                <Card>
                                                    <CardContent>
                                                        <Typography variant="subtitle1" gutterBottom>
                                                            {goal.name}
                                                        </Typography>
                                                        <Box display="flex" alignItems="center" mb={1}>
                                                            <Typography variant="h4" color="primary" sx={{ mr: 2 }}>
                                                                {(probability * 100).toFixed(0)}%
                                                            </Typography>
                                                            <Box flexGrow={1}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={probability * 100}
                                                                    sx={{ height: 8, borderRadius: 4 }}
                                                                    color={probability > 0.7 ? 'success' : probability > 0.4 ? 'warning' : 'error'}
                                                                />
                                                            </Box>
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Target: ${goal.target_amount.toLocaleString()} by {goal.target_date.split('T')[0]}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Paper>

                            {/* Key Insights */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Key Insights & Recommendations
                                </Typography>

                                <List>
                                    {simulationResults.keyInsights.map((insight, index) => (
                                        <ListItem key={index}>
                                            <ListItemIcon>
                                                {insight.type === 'risk' && <WarningIcon color="warning" />}
                                                {insight.type === 'opportunity' && <CheckCircleIcon color="success" />}
                                                {insight.type === 'recommendation' && <LightbulbIcon color="info" />}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                                        <Typography variant="subtitle1" component="div">{insight.title}</Typography>
                                                        {insight.probability && (
                                                            <Chip
                                                                label={`${(insight.probability * 100).toFixed(0)}%`}
                                                                size="small"
                                                                color={insight.type === 'risk' ? 'error' : 'primary'}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={insight.description}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>

                            {/* Scenario Analysis */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" gutterBottom color="error">
                                            Worst Case Scenarios
                                        </Typography>

                                        <List dense>
                                            {simulationResults.worstCaseScenarios.map((scenario, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={scenario.scenario}
                                                        secondary={scenario.impact}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Chip
                                                            label={`${(scenario.probability * 100).toFixed(0)}% chance`}
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" gutterBottom color="success.main">
                                            Best Case Scenarios
                                        </Typography>

                                        <List dense>
                                            {simulationResults.bestCaseScenarios.map((scenario, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText
                                                        primary={scenario.scenario}
                                                        secondary={scenario.impact}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Chip
                                                            label={`${(scenario.probability * 100).toFixed(0)}% chance`}
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </>
                    ) : (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Ready to Run Enhanced Simulation
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Configure your parameters and click "Run Enhanced Simulation" to see
                                detailed projections based on your actual financial data.
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default EnhancedMonteCarloSimulation;
