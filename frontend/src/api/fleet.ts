import { apiClient } from './client';
import { Route, Bus, Device, DeviceCredentialResponse } from '../types';

export const fleetApi = {
  // Routes
  getRoutes: async (): Promise<Route[]> => {
    const response = await apiClient.get<Route[]>('/api/registry/routes');
    return response.data;
  },

  getRouteById: async (id: string): Promise<Route> => {
    const response = await apiClient.get<Route>(`/api/registry/routes/${id}`);
    return response.data;
  },

  createRoute: async (route: Partial<Route>): Promise<Route> => {
    const response = await apiClient.post<Route>('/api/registry/routes', route);
    return response.data;
  },

  updateRoute: async (id: string, route: Partial<Route>): Promise<Route> => {
    const response = await apiClient.patch<Route>(`/api/registry/routes/${id}`, route);
    return response.data;
  },

  // Buses
  getBuses: async (): Promise<Bus[]> => {
    const response = await apiClient.get<Bus[]>('/api/registry/buses');
    return response.data;
  },

  getBusById: async (id: string): Promise<Bus> => {
    const response = await apiClient.get<Bus>(`/api/registry/buses/${id}`);
    return response.data;
  },

  createBus: async (bus: Partial<Bus>): Promise<Bus> => {
    const response = await apiClient.post<Bus>('/api/registry/buses', bus);
    return response.data;
  },

  updateBus: async (id: string, bus: Partial<Bus>): Promise<Bus> => {
    const response = await apiClient.patch<Bus>(`/api/registry/buses/${id}`, bus);
    return response.data;
  },

  // Devices
  getDevices: async (): Promise<Device[]> => {
    const response = await apiClient.get<Device[]>('/api/registry/devices');
    return response.data;
  },

  getDeviceById: async (id: string): Promise<Device> => {
    const response = await apiClient.get<Device>(`/api/registry/devices/${id}`);
    return response.data;
  },

  createDevice: async (device: Partial<Device>): Promise<Device> => {
    const response = await apiClient.post<Device>('/api/registry/devices', device);
    return response.data;
  },

  updateDevice: async (id: string, device: Partial<Device>): Promise<Device> => {
    const response = await apiClient.patch<Device>(`/api/registry/devices/${id}`, device);
    return response.data;
  },

  generateDeviceCredentials: async (deviceId: string): Promise<DeviceCredentialResponse> => {
    const response = await apiClient.post<DeviceCredentialResponse>(
      `/api/registry/devices/${deviceId}/credentials`
    );
    return response.data;
  },
};

