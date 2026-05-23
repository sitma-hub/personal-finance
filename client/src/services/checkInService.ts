import { api } from './api';
import {
    ApiResponse,
    ApplyCheckInRequest,
    CheckInProposal,
    CheckInStatus,
    NetWorthSnapshot,
} from '../types';

export const checkInService = {
    getStatus: async (): Promise<ApiResponse<CheckInStatus>> => {
        const response = await api.get('/check-in/status');
        return response.data;
    },

    getProposal: async (month: string): Promise<ApiResponse<CheckInProposal>> => {
        const response = await api.get(`/check-in/proposals/${month}`);
        return response.data;
    },

    apply: async (payload: ApplyCheckInRequest): Promise<ApiResponse<NetWorthSnapshot>> => {
        const response = await api.post('/check-in/apply', payload);
        return response.data;
    },
};
