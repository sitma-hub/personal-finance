import {
  computeWealthBuildingBreakdown,
  computeWealthBuildingSavingsRate,
  getLiabilityPrincipalFromRegularPayment,
  getLiabilityMonthlyInterest,
} from '../wealthBuilding';
import { Liability, Asset } from '../../types';

const liability = (overrides: Partial<Liability>): Liability =>
  ({
    id: 'l1',
    user_id: 'u',
    name: 'Mortgage',
    type: 'mortgage',
    current_balance: 240000,
    interest_rate: 3.6,
    monthly_payment: 2000,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as Liability;

const asset = (contribution: number): Asset =>
  ({
    id: 'a1',
    user_id: 'u',
    name: 'ETF',
    type: 'investment_account',
    current_value: 10000,
    monthly_contribution: contribution,
    include_in_projection: true,
    created_at: new Date(),
    updated_at: new Date(),
  }) as Asset;

describe('wealthBuilding', () => {
  it('estimates monthly interest from balance and rate', () => {
    const interest = getLiabilityMonthlyInterest(liability({}));
    expect(interest).toBeCloseTo(720, 0); // 240k * 3.6% / 12
  });

  it('counts principal as payment minus interest', () => {
    const principal = getLiabilityPrincipalFromRegularPayment(liability({}));
    expect(principal).toBeCloseTo(1280, 0); // 2000 - 720
  });

  it('includes investments, principal, and special repayments', () => {
    const breakdown = computeWealthBuildingBreakdown(
      [asset(500)],
      [
        liability({}),
        liability({
          name: 'Extra',
          special_repayment_enabled: true,
          special_repayment_amount: 1200,
          special_repayment_frequency: 'annual',
          monthly_payment: 0,
          current_balance: 0,
          interest_rate: 0,
        }),
      ]
    );
    expect(breakdown.assetContributions).toBe(500);
    expect(breakdown.debtPrincipal).toBeCloseTo(1280, 0);
    expect(breakdown.specialRepayments).toBeCloseTo(100, 0); // 1200/12
    expect(breakdown.total).toBeCloseTo(1880, 0);
  });

  it('computes savings rate as wealth building over income', () => {
    const breakdown = computeWealthBuildingBreakdown([asset(720)], []);
    const rate = computeWealthBuildingSavingsRate(7200, breakdown);
    expect(rate).toBeCloseTo(10, 1);
  });
});
