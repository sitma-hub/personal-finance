import { api } from './api';
import { ApiResponse } from '../types';

export interface BackupPayload {
    version: number;
    exported_at: string;
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
