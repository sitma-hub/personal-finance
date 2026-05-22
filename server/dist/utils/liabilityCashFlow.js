"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiabilityAnnualRateDecimal = getLiabilityAnnualRateDecimal;
exports.getLiabilityMonthlyRate = getLiabilityMonthlyRate;
exports.getLiabilityMonthlyPayment = getLiabilityMonthlyPayment;
exports.getTotalLiabilityMonthlyPayments = getTotalLiabilityMonthlyPayments;
function getLiabilityAnnualRateDecimal(interestRate) {
    const r = parseFloat(String(interestRate ?? 0));
    if (!r || r <= 0)
        return 0;
    if (r <= 0.25)
        return r;
    return r / 100;
}
function getLiabilityMonthlyRate(interestRate) {
    return getLiabilityAnnualRateDecimal(interestRate) / 12;
}
function getLiabilityMonthlyPayment(liability) {
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
function getTotalLiabilityMonthlyPayments(liabilities) {
    return liabilities.reduce((sum, l) => sum + getLiabilityMonthlyPayment(l), 0);
}
//# sourceMappingURL=liabilityCashFlow.js.map