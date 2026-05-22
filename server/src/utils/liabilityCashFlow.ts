import { Liability } from '../types';

/**
 * Annual interest rate as decimal (e.g. 0.035).
 * Liabilities are entered as percent in the UI (3.5); values <= 0.25 are treated as decimals.
 */
export function getLiabilityAnnualRateDecimal(interestRate?: number | string | null): number {
  const r = parseFloat(String(interestRate ?? 0));
  if (!r || r <= 0) return 0;
  if (r <= 0.25) return r;
  return r / 100;
}

export function getLiabilityMonthlyRate(interestRate?: number | string | null): number {
  return getLiabilityAnnualRateDecimal(interestRate) / 12;
}

/** Monthly cash outflow from a liability (payment + normalized special repayment). */
export function getLiabilityMonthlyPayment(liability: Liability): number {
  const monthlyPayment = parseFloat(String(liability.monthly_payment || 0));
  const minimumPayment = parseFloat(String(liability.minimum_payment || 0));
  let total = monthlyPayment || minimumPayment;

  if (liability.special_repayment_enabled && liability.special_repayment_amount) {
    const amount = parseFloat(String(liability.special_repayment_amount));
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

export function getTotalLiabilityMonthlyPayments(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + getLiabilityMonthlyPayment(l), 0);
}
