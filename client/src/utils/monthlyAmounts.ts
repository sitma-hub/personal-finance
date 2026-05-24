import { IncomeStream } from '../types';

/** Normalize an income stream to a monthly amount (matches server dashboard logic). */
export function incomeStreamToMonthly(income: IncomeStream): number {
    const amount = Number(income.current_amount);
    switch (income.frequency) {
        case 'monthly':
            return amount;
        case 'annual':
            return amount / 12;
        case 'hourly':
            return (amount * 40 * 52) / 12;
        default:
            return amount;
    }
}

export function totalMonthlyIncome(incomeStreams: IncomeStream[]): number {
    return incomeStreams.reduce((sum, income) => sum + incomeStreamToMonthly(income), 0);
}
