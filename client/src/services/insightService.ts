import { api } from './api';
import {
    ApiResponse,
    InsightsResponse,
    LlmStatus,
    LlmAnalysisResponse,
    LlmChatResponse,
    ChatMessage,
} from '../types';

export const insightService = {
    getInsights: async (): Promise<ApiResponse<InsightsResponse>> => {
        const response = await api.get('/insights');
        return response.data;
    },

    getLlmStatus: async (): Promise<ApiResponse<LlmStatus>> => {
        const response = await api.get('/insights/llm-status');
        return response.data;
    },

    generateAnalysis: async (): Promise<ApiResponse<LlmAnalysisResponse>> => {
        // Local LLMs on CPU can be slow; allow a generous timeout.
        const response = await api.post('/insights/analysis', {}, { timeout: 120000 });
        return response.data;
    },

    chat: async (messages: ChatMessage[]): Promise<ApiResponse<LlmChatResponse>> => {
        const response = await api.post('/insights/chat', { messages }, { timeout: 120000 });
        return response.data;
    },
};
