import { apiClient } from './client';
import { AnalyticsSummary, IncidentTypeCount, SeverityCount, AlertStatusCount } from '../types';

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export const analyticsApi = {
  getSummary: async (params?: DateRangeParams): Promise<AnalyticsSummary> => {
    const response = await apiClient.get<AnalyticsSummary>('/api/analytics/summary', { params });
    return response.data;
  },

  getIncidentsByType: async (params?: DateRangeParams): Promise<{ items: IncidentTypeCount[] }> => {
    const response = await apiClient.get<{ items: IncidentTypeCount[] }>('/api/analytics/incidents-by-type', { params });
    return response.data;
  },

  getIncidentsBySeverity: async (params?: DateRangeParams): Promise<{ items: SeverityCount[] }> => {
    const response = await apiClient.get<{ items: SeverityCount[] }>('/api/analytics/incidents-by-severity', { params });
    return response.data;
  },

  getAlertsByStatus: async (params?: DateRangeParams): Promise<{ items: AlertStatusCount[] }> => {
    const response = await apiClient.get<{ items: AlertStatusCount[] }>('/api/analytics/alerts-by-status', { params });
    return response.data;
  },
};
