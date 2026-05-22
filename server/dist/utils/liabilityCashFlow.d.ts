import { Liability } from '../types';
export declare function getLiabilityAnnualRateDecimal(interestRate?: number | string | null): number;
export declare function getLiabilityMonthlyRate(interestRate?: number | string | null): number;
export declare function getLiabilityMonthlyPayment(liability: Liability): number;
export declare function getTotalLiabilityMonthlyPayments(liabilities: Liability[]): number;
//# sourceMappingURL=liabilityCashFlow.d.ts.map