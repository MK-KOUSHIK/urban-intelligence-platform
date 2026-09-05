import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RecordingsPage } from '../pages/Recordings/Index';
import { RecordingDetailPage } from '../pages/Recordings/Detail';
import { IncidentDetailPage } from '../pages/Incidents/Detail';
import { recordingsApi } from '../api/recordings';
import { incidentsApi } from '../api/incidents';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { RecordingResponse, PaginatedResponse, Incident, IncidentEvidence } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock recordingsApi
vi.mock('../api/recordings', () => ({
  recordingsApi: {
    getRecordings: vi.fn(),
    getRecordingById: vi.fn(),
    getRecordingIncidents: vi.fn(),
  },
}));

// Mock incidentsApi
vi.mock('../api/incidents', () => ({
  incidentsApi: {
    getIncidents: vi.fn(),
    getIncidentById: vi.fn(),
    updateIncident: vi.fn(),
    getEvidence: vi.fn(),
  },
}));

// Mock authApi
vi.mock('../api/auth', () => ({
  authApi: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMe: vi.fn().mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' }),
    login: vi.fn(),
  },
}));

const mockRecordings: RecordingResponse[] = [
  {
    id: 'rec-001',
    recordingId: 'REC-20260905-001',
    deviceId: 'DEV-CAM-101',
    busId: 'BUS-101',
    routeId: 'RTE-201',
    startTime: '2026-09-05T08:00:00Z',
    endTime: '2026-09-05T08:30:00Z',
    durationSeconds: 1800,
    fileSizeBytes: 250000000,
    filePath: 'https://storage.example.com/recordings/rec-001.mp4',
    status: 'COMPLETED',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-05T08:30:00Z',
  },
  {
    id: 'rec-002',
    recordingId: 'REC-20260905-002',
    deviceId: 'DEV-CAM-102',
    busId: null,
    routeId: null,
    startTime: '2026-09-05T09:00:00Z',
    endTime: null,
    durationSeconds: null,
    fileSizeBytes: null,
    filePath: '/var/data/recordings/local-file.h264', // Non-streamable local path
    status: 'RECORDING',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
];

const mockPaginatedRecordings: PaginatedResponse<RecordingResponse> = {
  items: mockRecordings,
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const mockAssociatedIncidents: PaginatedResponse<Incident> = {
  items: [
    {
      id: 'inc-101',
      eventId: 'evt-101',
      incidentType: 'ACCIDENT',
      severity: 'high',
      confidence: 0.92,
      timestamp: '2026-09-05T08:15:00Z',
      location: { latitude: 12.9716, longitude: 77.5946, accuracyMeters: 3.5 },
      recordingId: 'REC-20260905-001',
      status: 'open',
      description: 'Vehicle collision detected',
      deviceId: 'DEV-CAM-101',
      busId: 'BUS-101',
      routeId: 'RTE-201',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/recordings'],
}) => (
  <ThemeProvider>
    <AuthProvider>
      <ConnectionProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ConnectionProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('STEP 28 — Recordings & Evidence Viewer Tests (A-T)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('A: /recordings renders page title and subtitle', async () => {
    (recordingsApi.getRecordings as any).mockResolvedValue(mockPaginatedRecordings);

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Recording Evidence' })).toBeInTheDocument();
      expect(
        screen.getByText('Review sensing recordings and their associated incident evidence.')
      ).toBeInTheDocument();
    });
  });

  it('B: recordings load from backend', async () => {
    (recordingsApi.getRecordings as any).mockResolvedValue(mockPaginatedRecordings);

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(recordingsApi.getRecordings).toHaveBeenCalled();
      expect(screen.getByText('REC-20260905-001')).toBeInTheDocument();
      expect(screen.getByText('REC-20260905-002')).toBeInTheDocument();
      expect(screen.getByText('DEV-CAM-101')).toBeInTheDocument();
      expect(screen.getByText(/BUS-101/)).toBeInTheDocument();
    });
  });

  it('C: recording filters use backend query params', async () => {
    (recordingsApi.getRecordings as any).mockResolvedValue(mockPaginatedRecordings);

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Device ID')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Device ID'), { target: { value: 'DEV-CAM-101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() => {
      expect(recordingsApi.getRecordings).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'DEV-CAM-101' })
      );
    });
  });

  it('D: pagination works', async () => {
    (recordingsApi.getRecordings as any).mockResolvedValue({
      ...mockPaginatedRecordings,
      totalPages: 3,
    });

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(recordingsApi.getRecordings).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('E: empty state renders "No recordings available."', async () => {
    (recordingsApi.getRecordings as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No recordings available.')).toBeInTheDocument();
    });
  });

  it('F: error state renders "Unable to load recording data."', async () => {
    (recordingsApi.getRecordings as any).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load recording data.')).toBeInTheDocument();
    });
  });

  it('G: /recordings/:id loads recording detail page', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue(mockAssociatedIncidents);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Recording Evidence: REC-20260905-001' })).toBeInTheDocument();
    });
  });

  it('H: recording metadata renders', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue(mockAssociatedIncidents);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('DEV-CAM-101')).toBeInTheDocument();
      expect(screen.getByText('BUS-101')).toBeInTheDocument();
      expect(screen.getByText('RTE-201')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText(/238.4 MB/i)).toBeInTheDocument();
    });
  });

  it('I: associated incidents load via getRecordingIncidents', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue(mockAssociatedIncidents);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(recordingsApi.getRecordingIncidents).toHaveBeenCalledWith('rec-001');
      expect(screen.getByText('inc-101')).toBeInTheDocument();
      expect(screen.getByText('ACCIDENT')).toBeInTheDocument();
    });
  });

  it('J: incident links navigate to /incidents/:incidentId', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue(mockAssociatedIncidents);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
          <Route path="/incidents/:id" element={<div>Incident Detail Target</div>} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'View Incident inc-101' })).toBeInTheDocument();
    });

    const incLink = screen.getByRole('link', { name: 'View Incident inc-101' });
    fireEvent.click(incLink);

    await waitFor(() => {
      expect(screen.getByText('Incident Detail Target')).toBeInTheDocument();
    });
  });

  it('K: video player renders when streamable URL exists', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      const videoElement = screen.getByTestId('video-player');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('src', 'https://storage.example.com/recordings/rec-001.mp4');
    });
  });

  it('L: unavailable video state renders "Video unavailable for streaming." when URL is non-streamable or null', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[1]); // filePath: /var/data/...
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    render(
      <TestWrapper initialEntries={['/recordings/rec-002']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Video unavailable for streaming.')).toBeInTheDocument();
      expect(screen.getByText('/var/data/recordings/local-file.h264')).toBeInTheDocument();
    });
  });

  it('M: no fake video URL generated', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[1]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    render(
      <TestWrapper initialEntries={['/recordings/rec-002']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
      expect(screen.queryByText(/http:\/\/fake/i)).not.toBeInTheDocument();
    });
  });

  it('N: incident evidence section links to /recordings/:id', async () => {
    const mockIncident: Incident = {
      id: 'inc-101',
      eventId: 'evt-101',
      incidentType: 'ACCIDENT',
      severity: 'high',
      confidence: 0.95,
      timestamp: '2026-09-05T08:15:00Z',
      location: null,
      recordingId: 'rec-001',
      status: 'open',
      description: 'Collision',
      deviceId: 'DEV-CAM-101',
      busId: 'BUS-101',
      routeId: 'RTE-201',
    };

    const mockEvidence: IncidentEvidence = {
      incidentId: 'inc-101',
      recordingId: 'rec-001',
      hasRecording: true,
      recordingMetadata: mockRecordings[0],
    };

    (incidentsApi.getIncidentById as any).mockResolvedValue(mockIncident);
    (incidentsApi.getEvidence as any).mockResolvedValue(mockEvidence);

    render(
      <TestWrapper initialEntries={['/incidents/inc-101']}>
        <Routes>
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/recordings/:id" element={<div>Recording Detail Target</div>} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Recording Evidence' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View Recording Evidence' }));

    await waitFor(() => {
      expect(screen.getByText('Recording Detail Target')).toBeInTheDocument();
    });
  });

  it('O: location data renders on map when available', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[0]);
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue(mockAssociatedIncidents);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Evidence Location Map')).toBeInTheDocument();
      expect(screen.getByText(/12.971600, 77.594600/)).toBeInTheDocument();
    });
  });

  it('P: null location renders "No location available."', async () => {
    (recordingsApi.getRecordingById as any).mockResolvedValue(mockRecordings[1]); // no location, no incidents
    (recordingsApi.getRecordingIncidents as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

    render(
      <TestWrapper initialEntries={['/recordings/rec-002']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No location available.')).toBeInTheDocument();
    });
  });

  it('Q: loading state renders', async () => {
    (recordingsApi.getRecordings as any).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  });

  it('R: retry reloads recording data on error', async () => {
    (recordingsApi.getRecordings as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <RecordingsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load recording data.')).toBeInTheDocument();
    });

    (recordingsApi.getRecordings as any).mockResolvedValueOnce(mockPaginatedRecordings);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText('REC-20260905-001')).toBeInTheDocument();
    });
  });

  it('S: 401/403 permission handling on recording detail', async () => {
    const err403: any = new Error('Forbidden');
    err403.response = { status: 403 };
    (recordingsApi.getRecordingById as any).mockRejectedValue(err403);

    render(
      <TestWrapper initialEntries={['/recordings/rec-001']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("You don't have permission to view this recording.")).toBeInTheDocument();
    });
  });

  it('T: 404 handling on recording detail', async () => {
    const err404: any = new Error('Not Found');
    err404.response = { status: 404 };
    (recordingsApi.getRecordingById as any).mockRejectedValue(err404);

    render(
      <TestWrapper initialEntries={['/recordings/non-existent-id']}>
        <Routes>
          <Route path="/recordings/:id" element={<RecordingDetailPage />} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Recording not found.')).toBeInTheDocument();
    });
  });
});
