import { api } from './api';
import { Asset, AssetFormData, ApiResponse, AssetValueHistory } from '../types';

export const assetService = {
    getAllAssets: async (): Promise<ApiResponse<Asset[]>> => {
        const response = await api.get('/assets');
        return response.data;
    },

    createAsset: async (assetData: AssetFormData): Promise<ApiResponse<Asset>> => {
        const response = await api.post('/assets', assetData);
        return response.data;
    },

    updateAsset: async (id: string, assetData: Partial<AssetFormData>): Promise<ApiResponse<Asset>> => {
        const response = await api.put(`/assets/${id}`, assetData);
        return response.data;
    },

    deleteAsset: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/assets/${id}`);
        return response.data;
    },

    getValueHistory: async (id: string): Promise<ApiResponse<AssetValueHistory[]>> => {
        const response = await api.get(`/assets/${id}/history`);
        return response.data;
    },
};
