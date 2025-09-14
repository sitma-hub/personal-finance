import { Scenario, ScenarioResult, CreateScenarioRequest, FinancialProjection, MonteCarloSimulation } from '../types';
export declare class ScenarioService {
    private readonly userId;
    private assetService;
    private liabilityService;
    private incomeService;
    private expenseService;
    getAllScenarios(): Promise<Scenario[]>;
    getScenarioById(id: string): Promise<Scenario | null>;
    createScenario(scenarioData: CreateScenarioRequest): Promise<Scenario>;
    updateScenario(id: string, updateData: Partial<CreateScenarioRequest>): Promise<Scenario | null>;
    deleteScenario(id: string): Promise<boolean>;
    calculateScenario(scenarioId: string): Promise<FinancialProjection[]>;
    private runProjection;
    private calculateTotalAssets;
    private calculateTotalLiabilities;
    private calculateTotalMonthlyIncome;
    private calculateTotalMonthlyExpenses;
    private applyIncomeGrowth;
    private applyExpenseInflation;
    private applyAssetGrowth;
    private applyLiabilityChanges;
    private calculateAssetBreakdown;
    private calculateLiabilityBreakdown;
    storeScenarioResults(scenarioId: string, projections: FinancialProjection[]): Promise<void>;
    getScenarioResults(scenarioId: string): Promise<ScenarioResult[]>;
    runMonteCarloSimulation(scenarioId: string, iterations?: number, simulationName?: string): Promise<MonteCarloSimulation>;
    private addRandomVariations;
    private runSingleMonteCarloIteration;
    getMonteCarloSimulation(simulationId: string): Promise<MonteCarloSimulation | null>;
}
//# sourceMappingURL=ScenarioService.d.ts.map