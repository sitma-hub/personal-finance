import { api } from './api';
import { ApiResponse } from '../types';

export interface BackupIncludes {
    assets: boolean;
    liabilities: boolean;
    income_streams: boolean;
    expenses: boolean;
    asset_value_history: boolean;
    liability_balance_history: boolean;
    net_worth_snapshots: boolean;
    liability_features?: string[];
    asset_features?: string[];
}

export interface BackupPayload {
    version: number;
    exported_at: string;
    includes?: BackupIncludes;
    assets: unknown[];
    liabilities: unknown[];
    income_streams: unknown[];
    expenses: unknown[];
    asset_value_history: unknown[];
    liability_balance_history: unknown[];
    net_worth_snapshots: unknown[];
}

export const backupService = {
    exportAll: async (): Promise<ApiResponse<BackupPayload>> => {
        const response = await api.get('/backup/export');
        return response.data;
    },

    importAll: async (data: BackupPayload): Promise<ApiResponse<{ imported: Record<string, number> }>> => {
        const response = await api.post('/backup/import', data);
        return response.data;
    },
};
