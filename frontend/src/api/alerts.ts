import { apiClient } from './client';
import { Alert, PaginatedResponse } from '../types';

export interface AlertFilterParams {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  alertType?: string;
  incidentId?: string;
  from?: string;
  to?: string;
}

export const alertsApi = {
  getAlerts: async (params?: AlertFilterParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>('/api/alerts', { params });
    return response.data;
  },

  updateAlert: async (id: string, status: string): Promise<Alert> => {
    const response = await apiClient.patch<Alert>(`/api/alerts/${id}`, { status });
    return response.data;
  },
};
