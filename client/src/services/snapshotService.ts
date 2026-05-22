import { api } from './api';
import { ApiResponse, NetWorthSnapshot } from '../types';

export const snapshotService = {
    getAll: async (): Promise<ApiResponse<NetWorthSnapshot[]>> => {
        const response = await api.get('/snapshots');
        return response.data;
    },

    create: async (snapshotMonth?: string, notes?: string): Promise<ApiResponse<NetWorthSnapshot>> => {
        const response = await api.post('/snapshots', { snapshot_month: snapshotMonth, notes });
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/snapshots/${id}`);
        return response.data;
    },
};
