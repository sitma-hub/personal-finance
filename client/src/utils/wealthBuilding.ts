import type { Asset, Liability } from '../types';
import {
    getLiabilityAnnualRateDecimal,
    getLiabilityBaseMonthlyPayment,
    getLiabilitySpecialRepaymentMonthly,
} from './liabilityCashFlow';

export interface WealthBuildingBreakdown {
    assetContributions: number;
    debtPrincipal: number;
    specialRepayments: number;
    total: number;
}

function num(value: unknown): number {
    return Number(value ?? 0) || 0;
}

export function getLiabilityMonthlyInterest(liability: Liability): number {
    const balance = num(liability.current_balance);
    if (balance <= 0) return 0;
    const annualRate = getLiabilityAnnualRateDecimal(liability.interest_rate);
    return balance * (annualRate / 12);
}

export function getLiabilityPrincipalFromRegularPayment(liability: Liability): number {
    const basePayment = getLiabilityBaseMonthlyPayment(liability);
    if (basePayment <= 0) return 0;
    const interest = getLiabilityMonthlyInterest(liability);
    return Math.max(0, basePayment - interest);
}

export function computeWealthBuildingBreakdown(
    assets: Asset[],
    liabilities: Liability[]
): WealthBuildingBreakdown {
    const assetContributions = assets.reduce((sum, a) => sum + num(a.monthly_contribution), 0);

    let debtPrincipal = 0;
    let specialRepayments = 0;
    for (const liability of liabilities) {
        debtPrincipal += getLiabilityPrincipalFromRegularPayment(liability);
        specialRepayments += getLiabilitySpecialRepaymentMonthly(liability);
    }

    return {
        assetContributions,
        debtPrincipal,
        specialRepayments,
        total: assetContributions + debtPrincipal + specialRepayments,
    };
}

export function computeWealthBuildingSavingsRate(
    monthlyIncome: number,
    breakdown: WealthBuildingBreakdown
): number {
    if (monthlyIncome <= 0) return 0;
    return (breakdown.total / monthlyIncome) * 100;
}
