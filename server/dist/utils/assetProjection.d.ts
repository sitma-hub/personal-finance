import { Asset, AssetType, ProjectionPoint } from '../types';
export declare function isInvestableForProjection(asset: Asset): boolean;
export declare function getAssetRates(asset: Asset): {
    pessimistic: number;
    expected: number;
    optimistic: number;
};
export declare function buildAssetProjectionSeries(asset: Asset, months: number): ProjectionPoint[];
export declare function isFlatAsset(type: AssetType): boolean;
//# sourceMappingURL=assetProjection.d.ts.map