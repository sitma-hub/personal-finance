import axios from 'axios';
import { Scenario, ScenarioFormData, ApiResponse } from '../types';

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

export const scenarioService = {
    getAllScenarios: async (): Promise<ApiResponse<Scenario[]>> => {
        const response = await api.get('/scenarios');
        return response.data;
    },

    getScenarioById: async (id: string): Promise<ApiResponse<Scenario>> => {
        const response = await api.get(`/scenarios/${id}`);
        return response.data;
    },

    createScenario: async (scenarioData: ScenarioFormData): Promise<ApiResponse<Scenario>> => {
        const response = await api.post('/scenarios', scenarioData);
        return response.data;
    },

    updateScenario: async (id: string, scenarioData: Partial<ScenarioFormData>): Promise<ApiResponse<Scenario>> => {
        const response = await api.put(`/scenarios/${id}`, scenarioData);
        return response.data;
    },

    deleteScenario: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/scenarios/${id}`);
        return response.data;
    },

    runScenario: async (id: string): Promise<ApiResponse<any>> => {
        const response = await api.post(`/scenarios/${id}/run`);
        return response.data;
    },

    getScenarioResults: async (id: string): Promise<ApiResponse<any[]>> => {
        const response = await api.get(`/scenarios/${id}/results`);
        return response.data;
    },
};
