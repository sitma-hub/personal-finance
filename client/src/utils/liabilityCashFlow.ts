import { Liability } from '../types';

export function getLiabilityMonthlyPayment(liability: Liability): number {
    const monthlyPayment = Number(liability.monthly_payment || 0);
    const minimumPayment = Number(liability.minimum_payment || 0);
    let total = monthlyPayment || minimumPayment;

    if (liability.special_repayment_enabled && liability.special_repayment_amount) {
        const amount = Number(liability.special_repayment_amount);
        switch (liability.special_repayment_frequency) {
            case 'quarterly':
                total += amount / 3;
                break;
            case 'annual':
                total += amount / 12;
                break;
            case 'monthly':
            default:
                total += amount;
                break;
        }
    }

    return total;
}
