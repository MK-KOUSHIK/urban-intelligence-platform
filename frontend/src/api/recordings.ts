import { apiClient } from './client';
import { Recording, Incident, PaginatedResponse } from '../types';

export interface RecordingFilterParams {
  page?: number;
  pageSize?: number;
  deviceId?: string;
  busId?: string;
  status?: string;
}

export const recordingsApi = {
  getRecordings: async (params?: RecordingFilterParams): Promise<PaginatedResponse<Recording>> => {
    const response = await apiClient.get<PaginatedResponse<Recording>>('/api/recordings', { params });
    return response.data;
  },

  getRecordingById: async (id: string): Promise<Recording> => {
    const response = await apiClient.get<Recording>(`/api/recordings/${id}`);
    return response.data;
  },

  createRecording: async (recording: Partial<Recording>): Promise<Recording> => {
    const response = await apiClient.post<Recording>('/api/recordings', recording);
    return response.data;
  },

  updateRecording: async (id: string, update: Partial<Recording>): Promise<Recording> => {
    const response = await apiClient.patch<Recording>(`/api/recordings/${id}`, update);
    return response.data;
  },

  getRecordingIncidents: async (
    id: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Incident>> => {
    const response = await apiClient.get<PaginatedResponse<Incident>>(`/api/recordings/${id}/incidents`, { params });
    return response.data;
  },
};
