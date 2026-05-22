"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInvestableForProjection = isInvestableForProjection;
exports.getAssetRates = getAssetRates;
exports.buildAssetProjectionSeries = buildAssetProjectionSeries;
exports.isFlatAsset = isFlatAsset;
const types_1 = require("../types");
const projection_1 = require("./projection");
const DEFAULT_RETURNS = {
    pessimistic: 0.04,
    expected: 0.07,
    optimistic: 0.1
};
function isInvestableForProjection(asset) {
    if (!asset.include_in_projection)
        return false;
    if (!types_1.INVESTABLE_ASSET_TYPES.includes(asset.type))
        return false;
    const expected = parseFloat(String(asset.expected_annual_return ?? 0));
    return expected > 0 || parseFloat(String(asset.monthly_contribution ?? 0)) > 0;
}
function getAssetRates(asset) {
    return {
        pessimistic: parseFloat(String(asset.pessimistic_annual_return ?? DEFAULT_RETURNS.pessimistic)),
        expected: parseFloat(String(asset.expected_annual_return ?? DEFAULT_RETURNS.expected)),
        optimistic: parseFloat(String(asset.optimistic_annual_return ?? DEFAULT_RETURNS.optimistic))
    };
}
function buildAssetProjectionSeries(asset, months) {
    const start = parseFloat(String(asset.current_value));
    const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
    const rates = getAssetRates(asset);
    const pess = (0, projection_1.projectAssetMonths)(start, contribution, rates.pessimistic, months);
    const exp = (0, projection_1.projectAssetMonths)(start, contribution, rates.expected, months);
    const opt = (0, projection_1.projectAssetMonths)(start, contribution, rates.optimistic, months);
    return Array.from({ length: months }, (_, i) => ({
        month: (0, projection_1.monthLabelFromNow)(i + 1),
        pessimistic: pess[i] ?? start,
        expected: exp[i] ?? start,
        optimistic: opt[i] ?? start
    }));
}
function isFlatAsset(type) {
    return type === 'real_estate' || type === 'vehicle' || type === 'other_asset' ||
        type === 'checking_account';
}
//# sourceMappingURL=assetProjection.js.map