import { Asset, AssetValueHistory, CreateAssetRequest, UpdateAssetRequest } from '../types';
export declare class AssetService {
    private readonly userId;
    getAllAssets(): Promise<Asset[]>;
    getAssetById(id: string): Promise<Asset | null>;
    createAsset(assetData: CreateAssetRequest): Promise<Asset>;
    updateAsset(id: string, updateData: UpdateAssetRequest): Promise<Asset | null>;
    deleteAsset(id: string): Promise<boolean>;
    getValueHistory(assetId: string): Promise<AssetValueHistory[]>;
    getTotalAssetsValue(): Promise<number>;
    getAssetsByType(): Promise<Record<string, number>>;
}
//# sourceMappingURL=AssetService.d.ts.map