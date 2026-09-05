export type UserRole = 'admin' | 'traffic_authority' | 'municipal_authority';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface IncidentLocation {
  latitude: float;
  longitude: float;
  accuracyMeters: float;
}

export type float = number;

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';
export type SeverityLevel = 'high' | 'medium' | 'low';

export interface Incident {
  id: string;
  eventId: string;
  incidentType: string;
  severity: SeverityLevel;
  confidence: number;
  timestamp: string;
  location?: IncidentLocation | null;
  recordingId?: string | null;
  status: IncidentStatus;
  description?: string | null;
  deviceId?: string | null;
  busId?: string | null;
  routeId?: string | null;
}

export type AlertStatus = 'unread' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  incidentId: string;
  alertType: string;
  severity: SeverityLevel;
  message: string;
  status: AlertStatus;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalIncidents: number;
  openIncidents: number;
  acknowledgedIncidents: number;
  resolvedIncidents: number;
  highSeverityIncidents: number;
  mediumSeverityIncidents: number;
  lowSeverityIncidents: number;
  totalAlerts: number;
  unreadAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
}

export interface IncidentTypeCount {
  incidentType: string;
  count: number;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface AlertStatusCount {
  status: string;
  count: number;
}

export interface MapIncident {
  id: string;
  incidentType: string;
  severity: SeverityLevel;
  confidence: number;
  timestamp: string;
  location: IncidentLocation;
  status: IncidentStatus;
  deviceId?: string | null;
  busId?: string | null;
  routeId?: string | null;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  origin: string;
  destination: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  operator: string;
  routeId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  deviceIdentifier: string;
  name: string;
  deviceType: string;
  busId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hasCredentials?: boolean;
  lastSeenAt?: string | null;
}

export interface Recording {
  id: string;
  recordingId: string;
  deviceId?: string | null;
  busId?: string | null;
  routeId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
  filePath?: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** @deprecated Use Recording. Alias kept for backward compatibility. */
export type RecordingResponse = Recording;

export interface IncidentEvidence {
  incidentId: string;
  recordingId?: string | null;
  hasRecording: boolean;
  recordingMetadata?: Recording | null;
}

export interface DashboardOverview {
  summary: AnalyticsSummary;
  recentIncidents: Incident[];
  recentAlerts: Alert[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type BackendConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';
export type WebSocketConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'RECONNECTING';

export interface DeviceCredentialResponse {
  deviceId: string;
  apiKey: string;
}
