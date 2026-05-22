import {
  Asset,
  AssetType,
  INVESTABLE_ASSET_TYPES,
  ProjectionPoint
} from '../types';
import { projectAssetMonths, monthLabelFromNow } from './projection';

const DEFAULT_RETURNS = {
  pessimistic: 0.04,
  expected: 0.07,
  optimistic: 0.1
};

export function isInvestableForProjection(asset: Asset): boolean {
  if (!asset.include_in_projection) return false;
  if (!INVESTABLE_ASSET_TYPES.includes(asset.type)) return false;
  const expected = parseFloat(String(asset.expected_annual_return ?? 0));
  return expected > 0 || parseFloat(String(asset.monthly_contribution ?? 0)) > 0;
}

export function getAssetRates(asset: Asset): {
  pessimistic: number;
  expected: number;
  optimistic: number;
} {
  return {
    pessimistic: parseFloat(String(asset.pessimistic_annual_return ?? DEFAULT_RETURNS.pessimistic)),
    expected: parseFloat(String(asset.expected_annual_return ?? DEFAULT_RETURNS.expected)),
    optimistic: parseFloat(String(asset.optimistic_annual_return ?? DEFAULT_RETURNS.optimistic))
  };
}

export function buildAssetProjectionSeries(asset: Asset, months: number): ProjectionPoint[] {
  const start = parseFloat(String(asset.current_value));
  const contribution = parseFloat(String(asset.monthly_contribution ?? 0));
  const rates = getAssetRates(asset);

  const pess = projectAssetMonths(start, contribution, rates.pessimistic, months);
  const exp = projectAssetMonths(start, contribution, rates.expected, months);
  const opt = projectAssetMonths(start, contribution, rates.optimistic, months);

  return Array.from({ length: months }, (_, i) => ({
    month: monthLabelFromNow(i + 1),
    pessimistic: pess[i] ?? start,
    expected: exp[i] ?? start,
    optimistic: opt[i] ?? start
  }));
}

export function isFlatAsset(type: AssetType): boolean {
  return type === 'real_estate' || type === 'vehicle' || type === 'other_asset' ||
    type === 'checking_account';
}
