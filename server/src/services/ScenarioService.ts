import pool from '../config/database';
import { Scenario, ScenarioResult, CreateScenarioRequest, FinancialProjection, MonteCarloSimulation } from '../types';
import { AssetService } from './AssetService';
import { LiabilityService } from './LiabilityService';
import { IncomeService } from './IncomeService';
import { ExpenseService } from './ExpenseService';

export class ScenarioService {
    private readonly userId = 'user@example.com'; // Single user app
    private assetService = new AssetService();
    private liabilityService = new LiabilityService();
    private incomeService = new IncomeService();
    private expenseService = new ExpenseService();

    async getAllScenarios(): Promise<Scenario[]> {
        const query = `
      SELECT * FROM scenarios 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await pool.query(query, [this.userId]);
        return result.rows;
    }

    async getScenarioById(id: string): Promise<Scenario | null> {
        const query = `
      SELECT * FROM scenarios 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }

    async createScenario(scenarioData: CreateScenarioRequest): Promise<Scenario> {
        const {
            name,
            description,
            type,
            parameters,
            time_horizon_years
        } = scenarioData;

        const query = `
      INSERT INTO scenarios (
        user_id, name, description, type, parameters, time_horizon_years
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6
      )
      RETURNING *
    `;

        const result = await pool.query(query, [
            this.userId,
            name,
            description,
            type,
            JSON.stringify(parameters),
            time_horizon_years
        ]);

        return result.rows[0];
    }

    async updateScenario(id: string, updateData: Partial<CreateScenarioRequest>): Promise<Scenario | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        // Build dynamic query
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                if (key === 'parameters') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return this.getScenarioById(id);
        }

        const query = `
      UPDATE scenarios 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = (SELECT id FROM users WHERE email = $${paramCount + 1})
      RETURNING *
    `;

        const result = await pool.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }

    async deleteScenario(id: string): Promise<boolean> {
        const query = `
      DELETE FROM scenarios 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await pool.query(query, [id, this.userId]);
        return (result.rowCount ?? 0) > 0;
    }

    async calculateScenario(scenarioId: string): Promise<FinancialProjection[]> {
        const scenario = await this.getScenarioById(scenarioId);
        if (!scenario) {
            throw new Error('Scenario not found');
        }

        // Get current financial data
        const assets = await this.assetService.getAllAssets();
        const liabilities = await this.liabilityService.getAllLiabilities();
        const incomeStreams = await this.incomeService.getAllIncomeStreams();
        const expenses = await this.expenseService.getAllExpenses();

        // Calculate projections
        const projections = this.runProjection(scenario, assets, liabilities, incomeStreams, expenses);

        // Store results in database
        await this.storeScenarioResults(scenarioId, projections);

        return projections;
    }

    private runProjection(
        scenario: Scenario,
        assets: any[],
        liabilities: any[],
        incomeStreams: any[],
        expenses: any[]
    ): FinancialProjection[] {
        const projections: FinancialProjection[] = [];
        const parameters = scenario.parameters;
        const totalMonths = scenario.time_horizon_years * 12;

        // Initialize current values
        let currentMonthlyIncome = this.calculateTotalMonthlyIncome(incomeStreams);
        let currentMonthlyExpenses = this.calculateTotalMonthlyExpenses(expenses, liabilities);

        // Track individual asset values for proper growth calculation
        const assetValues: Record<string, number> = {};
        assets.forEach(asset => {
            assetValues[asset.id] = parseFloat(asset.current_value || 0);
        });

        // Track individual liability balances
        const liabilityBalances: Record<string, number> = {};
        liabilities.forEach(liability => {
            liabilityBalances[liability.id] = parseFloat(liability.current_balance || 0);
        });

        // Maximum reasonable value to prevent overflow (PostgreSQL DECIMAL(20,2) limit is 10^18)
        const MAX_VALUE = 99999999999999999; // 99 quadrillion - more conservative to prevent any overflow

        for (let month = 1; month <= totalMonths; month++) {
            const year = Math.floor((month - 1) / 12) + 1;
            const monthInYear = ((month - 1) % 12) + 1;

            // Apply income growth (annual, not compound)
            const adjustedIncome = this.applyIncomeGrowth(currentMonthlyIncome, parameters, year);

            // Apply expense inflation (annual, not compound)
            const adjustedExpenses = this.applyExpenseInflation(currentMonthlyExpenses, parameters, year);

            // Calculate monthly savings
            const monthlySavings = adjustedIncome - adjustedExpenses;

            // Update individual asset values with proper compound growth
            let totalAssets = 0;
            let totalAssetContributions = 0;

            assets.forEach(asset => {
                const monthlyGrowthRate = asset.annual_return_rate ?
                    Math.pow(1 + asset.annual_return_rate, 1 / 12) - 1 : 0;

                // Apply monthly compound growth
                assetValues[asset.id] = (assetValues[asset.id] || 0) * (1 + monthlyGrowthRate);

                // Add monthly contributions
                if (asset.monthly_contribution) {
                    assetValues[asset.id] = (assetValues[asset.id] || 0) + parseFloat(asset.monthly_contribution);
                    totalAssetContributions += parseFloat(asset.monthly_contribution);
                }

                totalAssets += assetValues[asset.id] || 0;
            });

            // Update individual liability balances
            let totalLiabilities = 0;
            liabilities.forEach(liability => {
                const currentBalance = liabilityBalances[liability.id] || 0;
                if (currentBalance > 0 && liability.monthly_payment) {
                    const monthlyInterestRate = (liability.interest_rate || 0) / 100 / 12; // Convert percentage to decimal
                    const interestPayment = currentBalance * monthlyInterestRate;
                    const principalPayment = Math.min(
                        parseFloat(liability.monthly_payment) - interestPayment,
                        currentBalance
                    );
                    liabilityBalances[liability.id] = Math.max(0, currentBalance - principalPayment);
                }
                totalLiabilities += liabilityBalances[liability.id] || 0;
            });

            // Add remaining monthly savings to total assets (after accounting for asset-specific contributions)
            const remainingSavings = monthlySavings - totalAssetContributions;
            totalAssets += remainingSavings;

            // Cap values to prevent database overflow
            const cappedAssets = Math.min(totalAssets, MAX_VALUE);
            const cappedLiabilities = Math.min(totalLiabilities, MAX_VALUE);
            const cappedIncome = Math.min(adjustedIncome, MAX_VALUE);
            const cappedExpenses = Math.min(adjustedExpenses, MAX_VALUE);
            const cappedSavings = Math.min(monthlySavings, MAX_VALUE);

            // Calculate net worth
            const netWorth = Math.min(cappedAssets - cappedLiabilities, MAX_VALUE);

            // Asset breakdown using tracked individual values
            const assetBreakdown = this.calculateAssetBreakdownFromValues(assets, assetValues);
            const liabilityBreakdown = this.calculateLiabilityBreakdownFromValues(liabilities, liabilityBalances);
            const expenseBreakdown = this.calculateExpenseBreakdown(expenses, liabilities, parameters, year);

            projections.push({
                year,
                month: monthInYear,
                total_assets: cappedAssets,
                total_liabilities: cappedLiabilities,
                net_worth: netWorth,
                monthly_income: cappedIncome,
                monthly_expenses: cappedExpenses,
                monthly_savings: cappedSavings,
                asset_breakdown: assetBreakdown,
                liability_breakdown: liabilityBreakdown,
                expense_breakdown: expenseBreakdown
            });

            // Update for next iteration
            currentMonthlyIncome = cappedIncome;
            currentMonthlyExpenses = cappedExpenses;
        }

        return projections;
    }


    private calculateTotalMonthlyIncome(incomeStreams: any[]): number {
        return incomeStreams.reduce((total, income) => {
            let monthlyAmount = 0;
            switch (income.frequency) {
                case 'monthly':
                    monthlyAmount = parseFloat(income.current_amount || 0);
                    break;
                case 'annual':
                    monthlyAmount = parseFloat(income.current_amount || 0) / 12;
                    break;
                case 'hourly':
                    monthlyAmount = parseFloat(income.current_amount || 0) * 40 * 52 / 12; // 40 hours/week
                    break;
            }
            return total + monthlyAmount;
        }, 0);
    }

    private calculateTotalMonthlyExpenses(expenses: any[], liabilities: any[]): number {
        // Calculate regular expenses
        const regularExpenses = expenses.reduce((total, expense) => total + parseFloat(expense.monthly_amount || 0), 0);

        // Calculate liability payments (these are also expenses)
        const liabilityPayments = liabilities.reduce((total, liability) => {
            const monthlyPayment = parseFloat(liability.monthly_payment || 0);
            const minimumPayment = parseFloat(liability.minimum_payment || 0);
            // Use monthly_payment if available, otherwise fall back to minimum_payment
            return total + (monthlyPayment || minimumPayment);
        }, 0);

        return regularExpenses + liabilityPayments;
    }

    private applyIncomeGrowth(currentIncome: number, parameters: any, year: number): number {
        const growthRate = parameters.income_growth_rate || 0.03;
        // Apply growth based on years elapsed (year - 1 because year starts at 1)
        return currentIncome * Math.pow(1 + growthRate, year - 1);
    }

    private applyExpenseInflation(currentExpenses: number, parameters: any, year: number): number {
        const inflationRate = parameters.expense_inflation_rate || parameters.inflation_rate || 0.025;
        // Apply inflation based on years elapsed (year - 1 because year starts at 1)
        return currentExpenses * Math.pow(1 + inflationRate, year - 1);
    }


    private calculateAssetBreakdownFromValues(assets: any[], assetValues: Record<string, number>): any {
        const breakdown = {
            savings: 0,
            investments: 0,
            real_estate: 0,
            other: 0
        };

        assets.forEach(asset => {
            const value = assetValues[asset.id] || 0;

            switch (asset.type) {
                case 'savings_account':
                case 'checking_account':
                    breakdown.savings += value;
                    break;
                case 'investment_account':
                case 'retirement_account':
                    breakdown.investments += value;
                    break;
                case 'real_estate':
                    breakdown.real_estate += value;
                    break;
                default:
                    breakdown.other += value;
            }
        });

        return breakdown;
    }

    private calculateLiabilityBreakdownFromValues(liabilities: any[], liabilityBalances: Record<string, number>): any {
        const breakdown = {
            mortgages: 0,
            loans: 0,
            credit_cards: 0,
            other: 0
        };

        liabilities.forEach(liability => {
            const balance = liabilityBalances[liability.id] || 0;

            switch (liability.type) {
                case 'mortgage':
                    breakdown.mortgages += balance;
                    break;
                case 'personal_loan':
                case 'auto_loan':
                case 'student_loan':
                    breakdown.loans += balance;
                    break;
                case 'credit_card':
                    breakdown.credit_cards += balance;
                    break;
                default:
                    breakdown.other += balance;
            }
        });

        return breakdown;
    }


    private calculateExpenseBreakdown(expenses: any[], liabilities: any[], parameters: any, year: number): any {
        // Calculate regular expenses with inflation
        const inflationRate = parameters.expense_inflation_rate || parameters.inflation_rate || 0.025;
        const regularExpenses = expenses.reduce((total, expense) => {
            const monthlyAmount = parseFloat(expense.monthly_amount || 0);
            return total + (monthlyAmount * Math.pow(1 + inflationRate, year - 1));
        }, 0);

        // Calculate liability payments
        const liabilityPayments = liabilities.reduce((total, liability) => {
            const monthlyPayment = parseFloat(liability.monthly_payment || 0);
            const minimumPayment = parseFloat(liability.minimum_payment || 0);
            // Use monthly_payment if available, otherwise fall back to minimum_payment
            return total + (monthlyPayment || minimumPayment);
        }, 0);

        return {
            regular_expenses: regularExpenses,
            liability_payments: liabilityPayments
        };
    }

    async storeScenarioResults(scenarioId: string, projections: FinancialProjection[]): Promise<void> {
        // Clear existing results
        await pool.query('DELETE FROM scenario_results WHERE scenario_id = $1', [scenarioId]);

        // Insert new results
        for (const projection of projections) {
            const query = `
        INSERT INTO scenario_results (
          scenario_id, year, month, total_assets, total_liabilities,
          net_worth, monthly_income, monthly_expenses, monthly_savings, asset_breakdown
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

            await pool.query(query, [
                scenarioId,
                projection.year,
                projection.month,
                projection.total_assets,
                projection.total_liabilities,
                projection.net_worth,
                projection.monthly_income,
                projection.monthly_expenses,
                projection.monthly_savings,
                JSON.stringify(projection.asset_breakdown)
            ]);
        }
    }

    async getScenarioResults(scenarioId: string): Promise<ScenarioResult[]> {
        const query = `
      SELECT * FROM scenario_results 
      WHERE scenario_id = $1 
      ORDER BY year, month
    `;
        const result = await pool.query(query, [scenarioId]);
        return result.rows;
    }

    async runMonteCarloSimulation(scenarioId: string, iterations: number = 1000, simulationName?: string): Promise<MonteCarloSimulation> {
        const scenario = await this.getScenarioById(scenarioId);
        if (!scenario) {
            throw new Error('Scenario not found');
        }

        const results: number[] = [];
        const parameters = scenario.parameters;

        // Run Monte Carlo iterations
        for (let i = 0; i < iterations; i++) {
            // Add random variations to parameters
            const randomParams = this.addRandomVariations(parameters);

            // Run a single projection with random parameters
            const projection = this.runSingleMonteCarloIteration(scenario, randomParams);

            // Store the final net worth
            const finalNetWorth = projection[projection.length - 1]?.net_worth || 0;
            results.push(finalNetWorth);
        }

        // Calculate statistics
        const sortedResults = results.sort((a, b) => a - b);
        const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
        const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
        const standardDeviation = Math.sqrt(variance);

        const confidenceLevels = {
            p5: sortedResults[Math.floor(0.05 * iterations)],
            p25: sortedResults[Math.floor(0.25 * iterations)],
            p50: sortedResults[Math.floor(0.50 * iterations)],
            p75: sortedResults[Math.floor(0.75 * iterations)],
            p95: sortedResults[Math.floor(0.95 * iterations)]
        };

        // Store simulation results
        const query = `
      INSERT INTO monte_carlo_simulations (
        scenario_id, simulation_name, iterations, confidence_levels, results
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const result = await pool.query(query, [
            scenarioId,
            simulationName || `Monte Carlo ${new Date().toISOString()}`,
            iterations,
            JSON.stringify(confidenceLevels),
            JSON.stringify({ mean, standardDeviation, results })
        ]);

        return result.rows[0];
    }

    private addRandomVariations(parameters: any): any {
        const randomParams = { ...parameters };

        // Add random variations to key parameters for realistic Monte Carlo simulation
        // Market return rate variation (±3% around base rate)
        if (randomParams.market_return_rate) {
            randomParams.market_return_rate += (Math.random() - 0.5) * 0.06; // ±3% variation
        } else {
            randomParams.market_return_rate = 0.07 + (Math.random() - 0.5) * 0.06; // Default 7% ±3%
        }

        // Inflation rate variation (±1% around base rate)
        if (randomParams.inflation_rate) {
            randomParams.inflation_rate += (Math.random() - 0.5) * 0.02; // ±1% variation
        } else {
            randomParams.inflation_rate = 0.025 + (Math.random() - 0.5) * 0.02; // Default 2.5% ±1%
        }

        // Income growth rate variation (±2% around base rate)
        if (randomParams.income_growth_rate) {
            randomParams.income_growth_rate += (Math.random() - 0.5) * 0.04; // ±2% variation
        } else {
            randomParams.income_growth_rate = 0.03 + (Math.random() - 0.5) * 0.04; // Default 3% ±2%
        }

        return randomParams;
    }

    private runSingleMonteCarloIteration(scenario: Scenario, parameters: any): FinancialProjection[] {
        const projections: FinancialProjection[] = [];
        const totalMonths = scenario.time_horizon_years * 12;

        // Use randomized parameters for realistic variation
        // Reduced growth rates to prevent database overflow
        const marketReturn = Math.min(parameters.market_return_rate || 0.07, 0.10); // Cap at 10%
        const inflationRate = Math.min(parameters.inflation_rate || 0.025, 0.05); // Cap at 5%
        const incomeGrowthRate = Math.min(parameters.income_growth_rate || 0.03, 0.08); // Cap at 8%

        // Starting values with some variation
        let currentNetWorth = 100000 + (Math.random() - 0.5) * 20000; // ±$10k variation
        let monthlyIncome = 5000 + (Math.random() - 0.5) * 1000; // ±$500 variation
        let monthlyExpenses = 3000 + (Math.random() - 0.5) * 600; // ±$300 variation
        let monthlySavings = monthlyIncome - monthlyExpenses;

        // Maximum value for DECIMAL(20,2) database field: 999,999,999,999,999,999.99
        const MAX_VALUE = 999999999999999999.99;

        for (let month = 1; month <= totalMonths; month++) {
            const year = Math.floor((month - 1) / 12) + 1;
            const monthInYear = ((month - 1) % 12) + 1;

            // Generate monthly market return with reduced volatility to prevent overflow
            const monthlyVolatility = 0.10 / Math.sqrt(12); // 10% annual volatility (reduced from 15%)
            const monthlyReturn = Math.max(-0.20, Math.min(0.20, (marketReturn / 12) + (Math.random() - 0.5) * monthlyVolatility * 2)); // Cap monthly returns at ±20%

            // Apply market return to investments (assume 80% of net worth is invested)
            const investmentPortion = currentNetWorth * 0.8;
            const nonInvestmentPortion = currentNetWorth * 0.2;

            // Apply market return to investments
            const investmentGrowth = investmentPortion * monthlyReturn;
            const newInvestmentValue = investmentPortion + investmentGrowth;

            // Add monthly savings to investments
            const newNetWorth = newInvestmentValue + nonInvestmentPortion + monthlySavings;

            // Update income with growth and inflation
            monthlyIncome *= (1 + incomeGrowthRate / 12);
            monthlyExpenses *= (1 + inflationRate / 12);
            monthlySavings = monthlyIncome - monthlyExpenses;

            // Cap all values to prevent database overflow
            currentNetWorth = Math.min(newNetWorth, MAX_VALUE);
            monthlyIncome = Math.min(monthlyIncome, MAX_VALUE);
            monthlyExpenses = Math.min(monthlyExpenses, MAX_VALUE);
            monthlySavings = Math.min(monthlySavings, MAX_VALUE);
            const cappedInvestmentValue = Math.min(newInvestmentValue, MAX_VALUE);
            const cappedNonInvestmentPortion = Math.min(nonInvestmentPortion, MAX_VALUE);

            projections.push({
                year,
                month: monthInYear,
                total_assets: currentNetWorth,
                total_liabilities: 0,
                net_worth: currentNetWorth,
                monthly_income: monthlyIncome,
                monthly_expenses: monthlyExpenses,
                monthly_savings: monthlySavings,
                asset_breakdown: {
                    savings: cappedNonInvestmentPortion,
                    investments: cappedInvestmentValue,
                    real_estate: 0,
                    other: 0
                },
                liability_breakdown: { mortgages: 0, loans: 0, credit_cards: 0, other: 0 },
                expense_breakdown: { regular_expenses: monthlyExpenses, liability_payments: 0 }
            });
        }

        return projections;
    }

    async getMonteCarloSimulation(simulationId: string): Promise<MonteCarloSimulation | null> {
        const query = `
      SELECT * FROM monte_carlo_simulations 
      WHERE id = $1
    `;
        const result = await pool.query(query, [simulationId]);
        return result.rows[0] || null;
    }
}
