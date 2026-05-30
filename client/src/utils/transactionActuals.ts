import type { Liability, TransactionDirection, TransactionKind } from '../types';
import { getLiabilityAnnualRateDecimal } from './liabilityPayoffProjection';

export function defaultKindForDirection(direction: TransactionDirection): TransactionKind {
    return direction === 'inflow' ? 'income' : 'spending';
}

function num(value: unknown): number {
    return Number(value ?? 0) || 0;
}

export function estimateMonthlyInterest(liability: Liability): number {
    const balance = num(liability.current_balance);
    if (balance <= 0) return 0;
    const annualRate = getLiabilityAnnualRateDecimal(liability.interest_rate);
    return balance * (annualRate / 12);
}

export function splitDebtPayment(
    amount: number,
    liability: Liability | null | undefined
): { interest: number; principal: number } {
    if (amount <= 0) return { interest: 0, principal: 0 };
    if (!liability) return { interest: amount, principal: 0 };
    const interest = Math.min(amount, estimateMonthlyInterest(liability));
    return { interest, principal: Math.max(0, amount - interest) };
}
