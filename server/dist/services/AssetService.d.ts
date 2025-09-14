import { Asset, InvestmentHolding, RealEstateProperty, CreateAssetRequest, UpdateAssetRequest } from '../types';
export declare class AssetService {
    private readonly userId;
    getAllAssets(): Promise<Asset[]>;
    getAssetById(id: string): Promise<Asset | null>;
    createAsset(assetData: CreateAssetRequest): Promise<Asset>;
    updateAsset(id: string, updateData: UpdateAssetRequest): Promise<Asset | null>;
    deleteAsset(id: string): Promise<boolean>;
    getInvestmentHoldings(assetId: string): Promise<InvestmentHolding[]>;
    addInvestmentHolding(assetId: string, holdingData: Partial<InvestmentHolding>): Promise<InvestmentHolding>;
    getRealEstateProperties(assetId: string): Promise<RealEstateProperty[]>;
    addRealEstateProperty(assetId: string, propertyData: Partial<RealEstateProperty>): Promise<RealEstateProperty>;
    getTotalAssetsValue(): Promise<number>;
    getAssetsByType(): Promise<Record<string, number>>;
}
//# sourceMappingURL=AssetService.d.ts.map