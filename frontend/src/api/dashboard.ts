import { apiClient } from './client';
import { DashboardOverview } from '../types';

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await apiClient.get<DashboardOverview>('/api/dashboard/overview');
    return response.data;
  },
};
