"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioService = void 0;
const database_1 = __importDefault(require("../config/database"));
const AssetService_1 = require("./AssetService");
const LiabilityService_1 = require("./LiabilityService");
const IncomeService_1 = require("./IncomeService");
const ExpenseService_1 = require("./ExpenseService");
class ScenarioService {
    constructor() {
        this.userId = 'user@example.com';
        this.assetService = new AssetService_1.AssetService();
        this.liabilityService = new LiabilityService_1.LiabilityService();
        this.incomeService = new IncomeService_1.IncomeService();
        this.expenseService = new ExpenseService_1.ExpenseService();
    }
    async getAllScenarios() {
        const query = `
      SELECT * FROM scenarios 
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `;
        const result = await database_1.default.query(query, [this.userId]);
        return result.rows;
    }
    async getScenarioById(id) {
        const query = `
      SELECT * FROM scenarios 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rows[0] || null;
    }
    async createScenario(scenarioData) {
        const { name, description, type, parameters, time_horizon_years } = scenarioData;
        const query = `
      INSERT INTO scenarios (
        user_id, name, description, type, parameters, time_horizon_years
      )
      VALUES (
        (SELECT id FROM users WHERE email = $1), $2, $3, $4, $5, $6
      )
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            this.userId,
            name,
            description,
            type,
            JSON.stringify(parameters),
            time_horizon_years
        ]);
        return result.rows[0];
    }
    async updateScenario(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                if (key === 'parameters') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                }
                else {
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
        const result = await database_1.default.query(query, [...values, id, this.userId]);
        return result.rows[0] || null;
    }
    async deleteScenario(id) {
        const query = `
      DELETE FROM scenarios 
      WHERE id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)
    `;
        const result = await database_1.default.query(query, [id, this.userId]);
        return result.rowCount > 0;
    }
    async calculateScenario(scenarioId) {
        const scenario = await this.getScenarioById(scenarioId);
        if (!scenario) {
            throw new Error('Scenario not found');
        }
        const assets = await this.assetService.getAllAssets();
        const liabilities = await this.liabilityService.getAllLiabilities();
        const incomeStreams = await this.incomeService.getAllIncomeStreams();
        const expenses = await this.expenseService.getAllExpenses();
        const projections = this.runProjection(scenario, assets, liabilities, incomeStreams, expenses);
        await this.storeScenarioResults(scenarioId, projections);
        return projections;
    }
    runProjection(scenario, assets, liabilities, incomeStreams, expenses) {
        const projections = [];
        const parameters = scenario.parameters;
        const totalMonths = scenario.time_horizon_years * 12;
        let currentAssets = this.calculateTotalAssets(assets);
        let currentLiabilities = this.calculateTotalLiabilities(liabilities);
        let currentMonthlyIncome = this.calculateTotalMonthlyIncome(incomeStreams);
        let currentMonthlyExpenses = this.calculateTotalMonthlyExpenses(expenses);
        for (let month = 1; month <= totalMonths; month++) {
            const year = Math.floor((month - 1) / 12) + 1;
            const monthInYear = ((month - 1) % 12) + 1;
            const adjustedIncome = this.applyIncomeGrowth(currentMonthlyIncome, parameters, year);
            const adjustedExpenses = this.applyExpenseInflation(currentMonthlyExpenses, parameters, year);
            const adjustedAssets = this.applyAssetGrowth(currentAssets, parameters, year);
            const adjustedLiabilities = this.applyLiabilityChanges(currentLiabilities, parameters, year);
            const monthlySavings = adjustedIncome - adjustedExpenses;
            const newAssets = adjustedAssets + monthlySavings;
            const netWorth = newAssets - adjustedLiabilities;
            const assetBreakdown = this.calculateAssetBreakdown(assets, parameters, year);
            const liabilityBreakdown = this.calculateLiabilityBreakdown(liabilities, parameters, year);
            projections.push({
                year,
                month: monthInYear,
                total_assets: newAssets,
                total_liabilities: adjustedLiabilities,
                net_worth: netWorth,
                monthly_income: adjustedIncome,
                monthly_expenses: adjustedExpenses,
                monthly_savings: monthlySavings,
                asset_breakdown: assetBreakdown,
                liability_breakdown: liabilityBreakdown
            });
            currentAssets = newAssets;
            currentLiabilities = adjustedLiabilities;
            currentMonthlyIncome = adjustedIncome;
            currentMonthlyExpenses = adjustedExpenses;
        }
        return projections;
    }
    calculateTotalAssets(assets) {
        return assets.reduce((total, asset) => total + parseFloat(asset.current_value || 0), 0);
    }
    calculateTotalLiabilities(liabilities) {
        return liabilities.reduce((total, liability) => total + parseFloat(liability.current_balance || 0), 0);
    }
    calculateTotalMonthlyIncome(incomeStreams) {
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
                    monthlyAmount = parseFloat(income.current_amount || 0) * 40 * 52 / 12;
                    break;
            }
            return total + monthlyAmount;
        }, 0);
    }
    calculateTotalMonthlyExpenses(expenses) {
        return expenses.reduce((total, expense) => total + parseFloat(expense.monthly_amount || 0), 0);
    }
    applyIncomeGrowth(currentIncome, parameters, year) {
        const growthRate = parameters.income_growth_rate || 0.03;
        return currentIncome * Math.pow(1 + growthRate, year - 1);
    }
    applyExpenseInflation(currentExpenses, parameters, year) {
        const inflationRate = parameters.expense_inflation_rate || parameters.inflation_rate || 0.025;
        return currentExpenses * Math.pow(1 + inflationRate, year - 1);
    }
    applyAssetGrowth(currentAssets, parameters, year) {
        const returnRate = parameters.market_return_rate || 0.07;
        return currentAssets * Math.pow(1 + returnRate, year - 1);
    }
    applyLiabilityChanges(currentLiabilities, parameters, year) {
        const reductionRate = 0.05;
        return currentLiabilities * Math.pow(1 - reductionRate, year - 1);
    }
    calculateAssetBreakdown(assets, parameters, year) {
        const breakdown = {
            savings: 0,
            investments: 0,
            real_estate: 0,
            other: 0
        };
        assets.forEach(asset => {
            const value = parseFloat(asset.current_value || 0);
            const growthRate = asset.annual_return_rate || parameters.market_return_rate || 0.07;
            const grownValue = value * Math.pow(1 + growthRate, year - 1);
            switch (asset.type) {
                case 'savings_account':
                case 'checking_account':
                    breakdown.savings += grownValue;
                    break;
                case 'investment_account':
                case 'retirement_account':
                    breakdown.investments += grownValue;
                    break;
                case 'real_estate':
                    breakdown.real_estate += grownValue;
                    break;
                default:
                    breakdown.other += grownValue;
            }
        });
        return breakdown;
    }
    calculateLiabilityBreakdown(liabilities, parameters, year) {
        const breakdown = {
            mortgages: 0,
            loans: 0,
            credit_cards: 0,
            other: 0
        };
        liabilities.forEach(liability => {
            const balance = parseFloat(liability.current_balance || 0);
            const reductionRate = 0.05;
            const reducedBalance = balance * Math.pow(1 - reductionRate, year - 1);
            switch (liability.type) {
                case 'mortgage':
                    breakdown.mortgages += reducedBalance;
                    break;
                case 'auto_loan':
                case 'personal_loan':
                case 'student_loan':
                    breakdown.loans += reducedBalance;
                    break;
                case 'credit_card':
                    breakdown.credit_cards += reducedBalance;
                    break;
                default:
                    breakdown.other += reducedBalance;
            }
        });
        return breakdown;
    }
    async storeScenarioResults(scenarioId, projections) {
        await database_1.default.query('DELETE FROM scenario_results WHERE scenario_id = $1', [scenarioId]);
        for (const projection of projections) {
            const query = `
        INSERT INTO scenario_results (
          scenario_id, year, month, total_assets, total_liabilities,
          net_worth, monthly_income, monthly_expenses, monthly_savings, asset_breakdown
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
            await database_1.default.query(query, [
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
    async getScenarioResults(scenarioId) {
        const query = `
      SELECT * FROM scenario_results 
      WHERE scenario_id = $1 
      ORDER BY year, month
    `;
        const result = await database_1.default.query(query, [scenarioId]);
        return result.rows;
    }
    async runMonteCarloSimulation(scenarioId, iterations = 1000, simulationName) {
        const scenario = await this.getScenarioById(scenarioId);
        if (!scenario) {
            throw new Error('Scenario not found');
        }
        const results = [];
        const parameters = scenario.parameters;
        for (let i = 0; i < iterations; i++) {
            const randomParams = this.addRandomVariations(parameters);
            const projection = this.runSingleMonteCarloIteration(scenario, randomParams);
            const finalNetWorth = projection[projection.length - 1]?.net_worth || 0;
            results.push(finalNetWorth);
        }
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
        const query = `
      INSERT INTO monte_carlo_simulations (
        scenario_id, simulation_name, iterations, confidence_levels, results
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            scenarioId,
            simulationName || `Monte Carlo ${new Date().toISOString()}`,
            iterations,
            JSON.stringify(confidenceLevels),
            JSON.stringify({ mean, standardDeviation, results })
        ]);
        return result.rows[0];
    }
    addRandomVariations(parameters) {
        const randomParams = { ...parameters };
        if (randomParams.market_return_rate) {
            randomParams.market_return_rate += (Math.random() - 0.5) * 0.1;
        }
        if (randomParams.inflation_rate) {
            randomParams.inflation_rate += (Math.random() - 0.5) * 0.02;
        }
        if (randomParams.income_growth_rate) {
            randomParams.income_growth_rate += (Math.random() - 0.5) * 0.04;
        }
        return randomParams;
    }
    runSingleMonteCarloIteration(scenario, parameters) {
        const projections = [];
        const totalMonths = scenario.time_horizon_years * 12;
        let currentNetWorth = 100000;
        const annualReturn = parameters.market_return_rate || 0.07;
        for (let month = 1; month <= totalMonths; month++) {
            const year = Math.floor((month - 1) / 12) + 1;
            const monthInYear = ((month - 1) % 12) + 1;
            currentNetWorth *= Math.pow(1 + annualReturn / 12, 1);
            projections.push({
                year,
                month: monthInYear,
                total_assets: currentNetWorth,
                total_liabilities: 0,
                net_worth: currentNetWorth,
                monthly_income: 5000,
                monthly_expenses: 3000,
                monthly_savings: 2000,
                asset_breakdown: { savings: 0, investments: currentNetWorth, real_estate: 0, other: 0 },
                liability_breakdown: { mortgages: 0, loans: 0, credit_cards: 0, other: 0 }
            });
        }
        return projections;
    }
    async getMonteCarloSimulation(simulationId) {
        const query = `
      SELECT * FROM monte_carlo_simulations 
      WHERE id = $1
    `;
        const result = await database_1.default.query(query, [simulationId]);
        return result.rows[0] || null;
    }
}
exports.ScenarioService = ScenarioService;
//# sourceMappingURL=ScenarioService.js.map