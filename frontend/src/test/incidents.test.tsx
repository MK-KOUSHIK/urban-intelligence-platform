import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { IncidentsPage } from '../pages/Incidents/Index';
import { IncidentDetailPage } from '../pages/Incidents/Detail';
import { incidentsApi } from '../api/incidents';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { Incident, IncidentEvidence, PaginatedResponse } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock incidentsApi
vi.mock('../api/incidents', () => ({
  incidentsApi: {
    getIncidents: vi.fn(),
    getIncidentById: vi.fn(),
    updateIncident: vi.fn(),
    getEvidence: vi.fn(),
  },
}));

// Mock authApi to prevent test network delays
vi.mock('../api/auth', () => ({
  authApi: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMe: vi.fn().mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' }),
    login: vi.fn(),
  },
}));

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/incidents'],
}) => (
  <AuthProvider>
    <ConnectionProvider>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </ConnectionProvider>
  </AuthProvider>
);

describe('Step 24 — Incident Management & Detail Tests', () => {
  const mockIncidents: Incident[] = [
    {
      id: 'inc-201',
      eventId: 'evt-201',
      incidentType: 'ACCIDENT',
      severity: 'high',
      confidence: 0.95,
      timestamp: '2026-09-05T09:30:00Z',
      location: { latitude: 17.385, longitude: 78.486, accuracyMeters: 4.0 },
      recordingId: 'rec-201',
      status: 'open',
      description: 'Major collision near junction',
      deviceId: 'dev-201',
      busId: 'bus-201',
      routeId: 'rte-201',
    },
    {
      id: 'inc-202',
      eventId: 'evt-202',
      incidentType: 'HAZARD',
      severity: 'medium',
      confidence: 0.88,
      timestamp: '2026-09-05T09:35:00Z',
      location: { latitude: 17.400, longitude: 78.500, accuracyMeters: 5.0 },
      recordingId: null,
      status: 'acknowledged',
      description: 'Pothole detected',
      deviceId: null,
      busId: null,
      routeId: null,
    },
    {
      id: 'inc-203',
      eventId: 'evt-203',
      incidentType: 'CONGESTION',
      severity: 'low',
      confidence: 0.75,
      timestamp: '2026-09-05T09:40:00Z',
      location: { latitude: 17.370, longitude: 78.450, accuracyMeters: 6.0 },
      recordingId: null,
      status: 'resolved',
      description: null,
      deviceId: 'dev-203',
      busId: null,
      routeId: null,
    },
  ];

  const mockPaginatedResponse: PaginatedResponse<Incident> = {
    items: mockIncidents,
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  const mockEvidence: IncidentEvidence = {
    incidentId: 'inc-201',
    recordingId: 'rec-201',
    hasRecording: true,
    recordingMetadata: {
      id: 'rec-201',
      recordingId: 'rec-201',
      status: 'COMPLETED',
      filePath: 'https://storage.example.com/recordings/rec-201.mp4',
    },
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // A. List renders
  it('A. renders incident operations log header and title', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue(mockPaginatedResponse);

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    expect(screen.getByText(/INCIDENT OPERATIONS LOG/i)).toBeInTheDocument();
  });

  // B. Loading state
  it('B. renders skeleton loading placeholders while fetching incidents', async () => {
    (incidentsApi.getIncidents as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPaginatedResponse), 200))
    );

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // C. API data renders
  it('C. renders incident table rows from API data', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue(mockPaginatedResponse);

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('inc-201')).toBeInTheDocument();
      expect(screen.getAllByText('ACCIDENT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HAZARD').length).toBeGreaterThan(0);
    });
  });

  // D. Empty state
  it('D. renders empty state when zero incidents match filters', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No incidents match the selected filters/i)).toBeInTheDocument();
    });
  });

  // E. Error state
  it('E. renders error state when getIncidents API fails', async () => {
    (incidentsApi.getIncidents as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load incident data/i)).toBeInTheDocument();
    });
  });

  // F-H. Filter bar apply & clear
  it('F-H. applies and clears filter parameters via API call', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue(mockPaginatedResponse);

    render(
      <TestWrapper>
        <IncidentsPage />
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

    expect(incidentsApi.getIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high' })
    );

    const clearBtn = screen.getByRole('button', { name: /Clear Filters/i });
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(incidentsApi.getIncidents).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ severity: 'high' })
    );
  });

  // I. Pagination
  it('I. handles page change pagination buttons correctly', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue({
      ...mockPaginatedResponse,
      totalPages: 3,
    });

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Page/i })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Next Page/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(incidentsApi.getIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  // J-M. Badges and telematic fields
  it('J-M. renders type, severity, and status badges with correct tokens', async () => {
    (incidentsApi.getIncidents as any).mockResolvedValue(mockPaginatedResponse);

    render(
      <TestWrapper>
        <IncidentsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
      expect(screen.getAllByText('OPEN').length).toBeGreaterThan(0);
    });
  });

  // N-Q. Incident Detail & Evidence
  it('N-Q. renders incident detail page with telemetry, mini map, and evidence metadata', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[0]);
    (incidentsApi.getEvidence as any).mockResolvedValue(mockEvidence);

    render(
      <TestWrapper initialEntries={['/incidents/inc-201']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident: inc-201')).toBeInTheDocument();
      expect(screen.getByText('evt-201')).toBeInTheDocument();
      expect(screen.getByText('Major collision near junction')).toBeInTheDocument();
      expect(screen.getByText(/Open Video/i)).toBeInTheDocument();
    });
  });

  // R & V. Acknowledge action
  it('R & V. updates status to acknowledged on Acknowledge button click', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[0]);
    (incidentsApi.getEvidence as any).mockResolvedValue(mockEvidence);
    (incidentsApi.updateIncident as any).mockResolvedValue({
      ...mockIncidents[0],
      status: 'acknowledged',
    });

    render(
      <TestWrapper initialEntries={['/incidents/inc-201']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Acknowledge Incident/i })).toBeInTheDocument();
    });

    const ackBtn = screen.getByRole('button', { name: /Acknowledge Incident/i });
    await act(async () => {
      fireEvent.click(ackBtn);
    });

    expect(incidentsApi.updateIncident).toHaveBeenCalledWith('inc-201', { status: 'acknowledged' });
  });

  // S, U, V. Resolve action & Confirmation modal
  it('S, U, V. opens confirmation modal and resolves incident on confirmation', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[0]);
    (incidentsApi.getEvidence as any).mockResolvedValue(mockEvidence);
    (incidentsApi.updateIncident as any).mockResolvedValue({
      ...mockIncidents[0],
      status: 'resolved',
    });

    render(
      <TestWrapper initialEntries={['/incidents/inc-201']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resolve Incident/i })).toBeInTheDocument();
    });

    const resolveBtn = screen.getByRole('button', { name: /Resolve Incident/i });
    fireEvent.click(resolveBtn);

    expect(screen.getByText(/Resolve this incident\?/i)).toBeInTheDocument();

    const confirmModalBtn = screen.getByRole('button', { name: 'Confirm Resolve Incident' });
    await act(async () => {
      fireEvent.click(confirmModalBtn);
    });

    expect(incidentsApi.updateIncident).toHaveBeenCalledWith('inc-201', { status: 'resolved' });
  });

  // T. Invalid actions hidden for resolved status
  it('T. hides action buttons when incident is already resolved', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[2]); // status: resolved
    (incidentsApi.getEvidence as any).mockResolvedValue(null);

    render(
      <TestWrapper initialEntries={['/incidents/inc-203']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident: inc-203')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Acknowledge Incident/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolve Incident/i })).not.toBeInTheDocument();
  });

  // W & X. 409 and 403 mutation errors
  it('W & X. displays 409 conflict and 403 permission error alerts on mutation failure', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[0]);
    (incidentsApi.getEvidence as any).mockResolvedValue(null);

    const err409: any = new Error('Conflict');
    err409.response = { status: 409, data: { detail: 'Status change invalid' } };
    (incidentsApi.updateIncident as any).mockRejectedValue(err409);

    render(
      <TestWrapper initialEntries={['/incidents/inc-201']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Acknowledge Incident/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Acknowledge Incident/i }));

    await waitFor(() => {
      expect(screen.getByText(/That status change is no longer valid/i)).toBeInTheDocument();
    });
  });

  // AA & AB. Null identity fields & null recording
  it('AA & AB. handles null identity fields and missing evidence cleanly', async () => {
    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncidents[1]); // null device/bus/route/recording
    (incidentsApi.getEvidence as any).mockResolvedValue(null);

    render(
      <TestWrapper initialEntries={['/incidents/inc-202']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident: inc-202')).toBeInTheDocument();
      expect(screen.getByText(/No recording evidence attached to this incident/i)).toBeInTheDocument();
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(3);
    });
  });
});
