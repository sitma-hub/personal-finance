import axios from 'axios';
import { Asset, AssetFormData, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add any auth tokens here if needed
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            console.error('Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export const assetService = {
    getAllAssets: async (): Promise<ApiResponse<Asset[]>> => {
        const response = await api.get('/assets');
        return response.data;
    },

    getAssetById: async (id: string): Promise<ApiResponse<Asset>> => {
        const response = await api.get(`/assets/${id}`);
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

    getInvestmentHoldings: async (assetId: string): Promise<ApiResponse<any[]>> => {
        const response = await api.get(`/assets/${assetId}/holdings`);
        return response.data;
    },

    addInvestmentHolding: async (assetId: string, holdingData: any): Promise<ApiResponse<any>> => {
        const response = await api.post(`/assets/${assetId}/holdings`, holdingData);
        return response.data;
    },

    getRealEstateProperties: async (assetId: string): Promise<ApiResponse<any[]>> => {
        const response = await api.get(`/assets/${assetId}/properties`);
        return response.data;
    },

    addRealEstateProperty: async (assetId: string, propertyData: any): Promise<ApiResponse<any>> => {
        const response = await api.post(`/assets/${assetId}/properties`, propertyData);
        return response.data;
    },
};
