import { apiClient } from './client';
import { TokenResponse, User } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/api/auth/login', { username, password });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  getBackendStatus: async (): Promise<{ status: string; service: string; version: string }> => {
    const response = await apiClient.get('/api/status');
    return response.data;
  },

  getHealth: async (): Promise<{ status: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
