"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAssetMonths = projectAssetMonths;
exports.addSeries = addSeries;
exports.monthLabelFromNow = monthLabelFromNow;
exports.valueAtMonth = valueAtMonth;
function projectAssetMonths(startValue, monthlyContribution, annualRate, months) {
    const series = [];
    let balance = startValue;
    const monthlyRate = annualRate / 12;
    for (let m = 0; m < months; m++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
        series.push(Math.round(balance * 100) / 100);
    }
    return series;
}
function addSeries(a, b) {
    const len = Math.max(a.length, b.length);
    const result = [];
    for (let i = 0; i < len; i++) {
        result.push((a[i] ?? a[a.length - 1] ?? 0) + (b[i] ?? b[b.length - 1] ?? 0));
    }
    return result;
}
function monthLabelFromNow(offsetMonths) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offsetMonths);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function valueAtMonth(series, monthIndex) {
    if (series.length === 0)
        return 0;
    const idx = Math.min(Math.max(monthIndex, 0), series.length - 1);
    return series[idx] ?? 0;
}
//# sourceMappingURL=projection.js.map