import { apiClient } from './client';
import { MapIncident, HeatmapPoint } from '../types';

export interface BoundingBoxParams {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  incidentType?: string;
  severity?: string;
  status?: string;
  from?: string;
  to?: string;
  deviceId?: string;
  busId?: string;
  routeId?: string;
  limit?: number;
}

export const mapApi = {
  getMapIncidents: async (params: BoundingBoxParams): Promise<{ items: MapIncident[]; total: number }> => {
    const response = await apiClient.get<{ items: MapIncident[]; total: number }>('/api/map/incidents', { params });
    return response.data;
  },

  getHeatmapPoints: async (params: BoundingBoxParams): Promise<{ items: HeatmapPoint[] }> => {
    const response = await apiClient.get<{ items: HeatmapPoint[] }>('/api/map/heatmap', { params });
    return response.data;
  },
};
