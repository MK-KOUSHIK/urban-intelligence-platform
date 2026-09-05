import { apiClient } from './client';
import { Incident, IncidentEvidence, PaginatedResponse } from '../types';

export interface IncidentFilterParams {
  page?: number;
  pageSize?: number;
  incidentType?: string;
  severity?: string;
  status?: string;
  from?: string;
  to?: string;
  deviceId?: string;
  busId?: string;
  routeId?: string;
}

export const incidentsApi = {
  getIncidents: async (params?: IncidentFilterParams): Promise<PaginatedResponse<Incident>> => {
    const response = await apiClient.get<PaginatedResponse<Incident>>('/api/incidents', { params });
    return response.data;
  },

  getIncidentById: async (id: string): Promise<Incident> => {
    const response = await apiClient.get<Incident>(`/api/incidents/${id}`);
    return response.data;
  },

  updateIncident: async (
    id: string,
    update: { status?: string; description?: string }
  ): Promise<Incident> => {
    const response = await apiClient.patch<Incident>(`/api/incidents/${id}`, update);
    return response.data;
  },

  getEvidence: async (incidentId: string): Promise<IncidentEvidence> => {
    const response = await apiClient.get<IncidentEvidence>(`/api/incidents/${incidentId}/evidence`);
    return response.data;
  },
};
