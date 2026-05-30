import { Liability } from '../types';

export { getLiabilityAnnualRateDecimal, getLiabilityMonthlyRate } from './liabilityPayoffProjection';

export function getLiabilityBaseMonthlyPayment(liability: Liability): number {
    const monthlyPayment = Number(liability.monthly_payment || 0);
    const minimumPayment = Number(liability.minimum_payment || 0);
    return monthlyPayment || minimumPayment;
}

export function getLiabilitySpecialRepaymentMonthly(liability: Liability): number {
    if (!liability.special_repayment_enabled || !liability.special_repayment_amount) {
        return 0;
    }
    const amount = Number(liability.special_repayment_amount);
    switch (liability.special_repayment_frequency) {
        case 'quarterly':
            return amount / 3;
        case 'annual':
            return amount / 12;
        case 'monthly':
        default:
            return amount;
    }
}

export function getLiabilityMonthlyPayment(liability: Liability): number {
    return getLiabilityBaseMonthlyPayment(liability) + getLiabilitySpecialRepaymentMonthly(liability);
}
