import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MapPage } from '../pages/Map/Index';
import { mapApi } from '../api/map';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { MapIncident, HeatmapPoint } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock Leaflet canvas / heat plugin methods if needed in JSDOM
vi.mock('leaflet.heat', () => ({}));

// Mock mapApi
vi.mock('../api/map', () => ({
  mapApi: {
    getMapIncidents: vi.fn(),
    getHeatmapPoints: vi.fn(),
  },
}));

// Mock authApi to prevent test delays
vi.mock('../api/auth', () => ({
  authApi: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMe: vi.fn().mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' }),
    login: vi.fn(),
  },
}));

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/map'],
}) => (
  <AuthProvider>
    <ConnectionProvider>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </ConnectionProvider>
  </AuthProvider>
);

describe('Step 23 — Live Incident Map & Heatmap Tests', () => {
  const mockIncidents: MapIncident[] = [
    {
      id: 'map-inc-01',
      incidentType: 'ACCIDENT',
      severity: 'high',
      confidence: 0.96,
      timestamp: '2026-09-05T09:15:00Z',
      location: { latitude: 17.385, longitude: 78.486, accuracyMeters: 4.5 },
      status: 'open',
      deviceId: 'dev-999',
      busId: 'bus-123',
      routeId: 'rte-456',
    },
    {
      id: 'map-inc-02',
      incidentType: 'HAZARD',
      severity: 'medium',
      confidence: 0.85,
      timestamp: '2026-09-05T09:20:00Z',
      location: { latitude: 17.400, longitude: 78.500, accuracyMeters: 5.0 },
      status: 'acknowledged',
      deviceId: null,
      busId: null,
      routeId: null,
    },
    {
      id: 'map-inc-03',
      incidentType: 'CONGESTION',
      severity: 'low',
      confidence: 0.75,
      timestamp: '2026-09-05T09:25:00Z',
      location: { latitude: 17.370, longitude: 78.450, accuracyMeters: 6.0 },
      status: 'resolved',
      deviceId: 'dev-111',
      busId: null,
      routeId: null,
    },
  ];

  const mockHeatmapPoints: HeatmapPoint[] = [
    { latitude: 17.385, longitude: 78.486, weight: 5 },
    { latitude: 17.400, longitude: 78.500, weight: 3 },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // A. Map page renders
  it('A. renders map page header and title', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    expect(screen.getByText(/LIVE TRAFFIC INTELLIGENCE MAP/i)).toBeInTheDocument();
    expect(screen.getByText(/Geospatial GIS telemetry/i)).toBeInTheDocument();
  });

  // B. Loading state
  it('B. renders spatial grid loading state while fetching map data', async () => {
    (mapApi.getMapIncidents as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ items: mockIncidents, total: 3 }), 200))
    );

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    expect(screen.getByText(/Initializing Spatial Grid/i)).toBeInTheDocument();
  });

  // C. Incident markers render
  it('C. renders incident count and marker instances from API response', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing 3 incidents/i)).toBeInTheDocument();
    });
  });

  // D, E, F. Severity representations
  it('D-F. renders markers with high, medium, and low severity token representation', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/high severity marker/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/medium severity marker/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/low severity marker/i)).toBeInTheDocument();
    });
  });

  // G & H. Popup and Selected Incident panel
  it('G-H. opens selected incident panel when clicking a marker', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/high severity marker/i)).toBeInTheDocument();
    });

    const highMarker = screen.getByLabelText(/high severity marker/i);
    fireEvent.click(highMarker);

    await waitFor(() => {
      expect(screen.getByText('map-inc-01')).toBeInTheDocument();
      expect(screen.getAllByText('dev-999').length).toBeGreaterThan(0);
      expect(screen.getAllByText('bus-123').length).toBeGreaterThan(0);
      expect(screen.getAllByText('rte-456').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /View Full Incident/i })).toBeInTheDocument();
    });
  });

  // I. View Incident navigation
  it('I. navigates to incident detail route when clicking View Full Incident button', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <AuthProvider>
        <ConnectionProvider>
          <MemoryRouter initialEntries={['/map']}>
            <Routes>
              <Route path="/map" element={<MapPage />} />
              <Route path="/incidents/:id" element={<div>Incident Detail Target Page</div>} />
            </Routes>
          </MemoryRouter>
        </ConnectionProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/high severity marker/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/high severity marker/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Full Incident/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /View Full Incident/i }));

    expect(screen.getByText(/Incident Detail Target Page/i)).toBeInTheDocument();
  });

  // J & K. Heatmap toggle & data rendering
  it('J-K. toggles heatmap layer and fetches heatmap data points', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });
    (mapApi.getHeatmapPoints as any).mockResolvedValue({ items: mockHeatmapPoints });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable Heatmap/i })).toBeInTheDocument();
    });

    const heatmapToggle = screen.getByRole('button', { name: /Enable Heatmap/i });
    await act(async () => {
      fireEvent.click(heatmapToggle);
    });

    await waitFor(() => {
      expect(mapApi.getHeatmapPoints).toHaveBeenCalled();
      expect(screen.getByText(/Heatmap Intensity/i)).toBeInTheDocument();
    });
  });

  // L, M, N. Filter controls, Apply & Clear
  it('L-N. renders filter controls and applies/clears query filter state', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Severity/i)).toBeInTheDocument();
    });

    const severitySelect = screen.getByLabelText(/Filter by Severity/i);
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    expect(mapApi.getMapIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high' })
    );

    const clearBtn = screen.getByRole('button', { name: /Clear Filters/i });
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(mapApi.getMapIncidents).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ severity: 'high' })
    );
  });

  // O. Refresh
  it('O. refetches map data when refresh button is clicked', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh Map Data/i })).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh Map Data/i });
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(mapApi.getMapIncidents).toHaveBeenCalledTimes(2);
  });

  // P. Empty state
  it('P. renders empty state when zero incidents return from API', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: [], total: 0 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No incidents found in the selected area/i)).toBeInTheDocument();
    });
  });

  // Q. Map API error
  it('Q. displays map error state when getMapIncidents API fails', async () => {
    (mapApi.getMapIncidents as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load map data/i)).toBeInTheDocument();
    });
  });

  // R. Heatmap specific error handling
  it('R. renders non-blocking warning when heatmap API fails without destroying map', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 3 });
    (mapApi.getHeatmapPoints as any).mockRejectedValue(new Error('Heatmap service error'));

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable Heatmap/i })).toBeInTheDocument();
    });

    const heatmapToggle = screen.getByRole('button', { name: /Enable Heatmap/i });
    await act(async () => {
      fireEvent.click(heatmapToggle);
    });

    await waitFor(() => {
      expect(screen.getByText(/No heatmap data available or heatmap service failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing 3 incidents/i)).toBeInTheDocument(); // Map remains active
    });
  });

  // S. Incident count display
  it('S. displays exact incident count from API total field', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: mockIncidents, total: 42 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing 42 incidents/i)).toBeInTheDocument();
    });
  });

  // T. Null identity fields handling
  it('T. handles null/undefined deviceId, busId, and routeId cleanly with N/A fallbacks', async () => {
    (mapApi.getMapIncidents as any).mockResolvedValue({ items: [mockIncidents[1]], total: 1 });

    render(
      <TestWrapper>
        <MapPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/medium severity marker/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/medium severity marker/i));

    await waitFor(() => {
      expect(screen.getByText('map-inc-02')).toBeInTheDocument();
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(3); // deviceId, busId, routeId
    });
  });
});
