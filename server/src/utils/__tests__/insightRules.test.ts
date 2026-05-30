import { runInsightRules } from '../insightRules';
import { InsightMetricsContext } from '../../types';

function baseContext(overrides: Partial<InsightMetricsContext> = {}): InsightMetricsContext {
  return {
    netWorth: 50000,
    totalAssets: 60000,
    totalLiabilities: 10000,
    monthlyIncome: 4000,
    monthlyExpenses: 3000,
    regularExpenses: 3000,
    monthlyAssetContributions: 0,
    monthlySavings: 1000,
    savingsRate: 25,
    wealthBuilding: {
      assetContributions: 1000,
      debtPrincipal: 0,
      specialRepayments: 0,
      total: 1000,
    },
    cashFlowSavingsRate: 25,
    liquidAssets: 18000,
    emergencyRunwayMonths: 6,
    allocation: [],
    topAllocation: null,
    highInterestDebts: [],
    totalDebtMonthlyPayments: 0,
    snapshotCount: 3,
    lastSnapshotMonth: '2026-04',
    monthsSinceLastSnapshot: 1,
    netWorthChange: null,
    actual: null,
    ...overrides,
  };
}

const findRule = (ctx: InsightMetricsContext, id: string) =>
  runInsightRules(ctx).find((i) => i.id === id);

describe('emergency fund rule', () => {
  it('flags critical when runway is below 3 months', () => {
    const insight = findRule(baseContext({ emergencyRunwayMonths: 1.5 }), 'emergency-fund-low');
    expect(insight?.severity).toBe('critical');
  });

  it('warns when runway is between 3 and 6 months', () => {
    const insight = findRule(baseContext({ emergencyRunwayMonths: 4 }), 'emergency-fund-building');
    expect(insight?.severity).toBe('warning');
  });

  it('is positive when runway is at least 6 months', () => {
    const insight = findRule(baseContext({ emergencyRunwayMonths: 8 }), 'emergency-fund-healthy');
    expect(insight?.severity).toBe('positive');
  });
});

describe('savings rate rule', () => {
  it('flags critical when spending exceeds income', () => {
    const insight = findRule(
      baseContext({
        savingsRate: 5,
        monthlySavings: -400,
        wealthBuilding: {
          assetContributions: 200,
          debtPrincipal: 0,
          specialRepayments: 0,
          total: 200,
        },
      }),
      'savings-rate-negative'
    );
    expect(insight?.severity).toBe('critical');
  });

  it('is positive with a strong savings rate', () => {
    const insight = findRule(
      baseContext({
        savingsRate: 30,
        wealthBuilding: {
          assetContributions: 1200,
          debtPrincipal: 0,
          specialRepayments: 0,
          total: 1200,
        },
      }),
      'savings-rate-strong'
    );
    expect(insight?.severity).toBe('positive');
  });
});

describe('high interest debt rule', () => {
  it('warns and lists the worst debt first in the detail', () => {
    const insight = findRule(
      baseContext({
        highInterestDebts: [
          { name: 'Card A', interestRate: 0.1, balance: 2000 },
          { name: 'Card B', interestRate: 0.19, balance: 1000 },
        ],
      }),
      'high-interest-debt'
    );
    expect(insight?.severity).toBe('warning');
    expect(insight?.detail).toContain('Card B');
  });
});

describe('actual vs planned rule', () => {
  it('warns when spending is more than 10% over plan', () => {
    const insight = findRule(
      baseContext({
        actual: {
          month: '2026-05',
          inflow: 4000,
          outflow: 3600,
          spending: 3600,
          savingsInvestments: 0,
          debtInterest: 0,
          debtPrincipal: 0,
          net: 400,
          savingsRate: 10,
          plannedIncome: 4000,
          plannedExpenses: 3000,
          topCategory: { category: 'Food', total: 800 },
          inflowByCategory: [{ category: 'Salary', total: 4000 }],
          outflowByCategory: [{ category: 'Food', total: 800 }],
        },
      }),
      'overspending-vs-plan'
    );
    expect(insight?.severity).toBe('warning');
  });

  it('excludes savings/investment outflow from the spending comparison', () => {
    // Total outflow 4500 would look like overspending, but 1800 of it is
    // investments/transfers, leaving 2700 spending — under the 3000 plan.
    const ctx = baseContext({
      actual: {
        month: '2026-05',
        inflow: 5000,
        outflow: 4200,
          spending: 2400,
          savingsInvestments: 1800,
          debtInterest: 0,
          debtPrincipal: 0,
          net: 800,
        savingsRate: 16,
        plannedIncome: 4000,
        plannedExpenses: 3000,
        topCategory: { category: 'Food', total: 800 },
        inflowByCategory: [{ category: 'Salary', total: 5000 }],
        outflowByCategory: [
          { category: 'Food', total: 600 },
          { category: 'Investment', total: 1800 },
        ],
      },
    });
    expect(findRule(ctx, 'overspending-vs-plan')).toBeUndefined();
    const positive = findRule(ctx, 'underspending-vs-plan');
    expect(positive?.severity).toBe('positive');
    expect(positive?.metrics?.some((mt) => mt.label.includes('excluded'))).toBe(true);
  });
});

describe('runInsightRules ordering', () => {
  it('sorts insights by severity (critical first)', () => {
    const insights = runInsightRules(
      baseContext({ emergencyRunwayMonths: 1, savingsRate: 30 })
    );
    expect(insights.length).toBeGreaterThan(1);
    expect(insights[0]!.severity).toBe('critical');
  });
});
