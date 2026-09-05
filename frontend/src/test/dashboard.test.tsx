import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from '../pages/Dashboard/Index';
import { dashboardApi } from '../api/dashboard';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { DashboardOverview } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock dashboardApi
vi.mock('../api/dashboard', () => ({
  dashboardApi: {
    getOverview: vi.fn(),
  },
}));

// Mock authApi health check & getMe to avoid test network delays
vi.mock('../api/auth', () => ({
  authApi: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMe: vi.fn().mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' }),
    login: vi.fn(),
  },
}));

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/dashboard'],
}) => (
  <AuthProvider>
    <ConnectionProvider>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </ConnectionProvider>
  </AuthProvider>
);

describe('Step 22 — Command Center Dashboard Tests', () => {
  const mockOverviewData: DashboardOverview = {
    summary: {
      totalIncidents: 42,
      openIncidents: 12,
      acknowledgedIncidents: 18,
      resolvedIncidents: 12,
      highSeverityIncidents: 5,
      mediumSeverityIncidents: 20,
      lowSeverityIncidents: 17,
      totalAlerts: 8,
      unreadAlerts: 3,
      acknowledgedAlerts: 3,
      resolvedAlerts: 2,
    },
    recentIncidents: [
      {
        id: 'inc-101',
        eventId: 'evt-1',
        incidentType: 'ACCIDENT',
        severity: 'high',
        confidence: 0.94,
        timestamp: '2026-09-05T08:30:00Z',
        location: { latitude: 17.385, longitude: 78.486, accuracyMeters: 5.0 },
        status: 'open',
        recordingId: 'rec-999',
      },
    ],
    recentAlerts: [
      {
        id: 'alt-501',
        incidentId: 'inc-101',
        alertType: 'CRITICAL_HAZARD',
        severity: 'high',
        message: 'High severity accident detected on Main Expressway',
        status: 'unread',
        createdAt: '2026-09-05T08:31:00Z',
      },
    ],
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

  // A. Dashboard renders
  it('A. renders dashboard header and title', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText(/URBAN INTELLIGENCE COMMAND CENTER/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time operational overview/i)).toBeInTheDocument();
  });

  // B. Loading state
  it('B. renders skeleton loading placeholders while fetching data', async () => {
    (dashboardApi.getOverview as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockOverviewData), 200))
    );

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // C. Real overview data renders
  it('C. renders real overview KPI summary metrics from API response', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // totalIncidents
      expect(screen.getAllByText('12').length).toBeGreaterThan(0); // openIncidents / resolvedIncidents
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);  // highSeverityIncidents
      expect(screen.getByText('8')).toBeInTheDocument();  // totalAlerts
    });
  });

  // D. Incident cards render
  it('D. renders incident cards in the recent incidents feed', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/ACCIDENT/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/REC: rec-999/i)).toBeInTheDocument();
    });
  });

  // E. Alert cards render
  it('E. renders alert cards in the recent alerts feed', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/CRITICAL_HAZARD/i)).toBeInTheDocument();
      expect(screen.getByText(/High severity accident detected on Main Expressway/i)).toBeInTheDocument();
    });
  });

  // F. Empty incidents
  it('F. renders empty state when no recent incidents exist', async () => {
    const emptyIncidentsData: DashboardOverview = {
      ...mockOverviewData,
      recentIncidents: [],
    };
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(emptyIncidentsData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No incidents detected/i)).toBeInTheDocument();
    });
  });

  // G. Empty alerts
  it('G. renders empty state when no active alerts exist', async () => {
    const emptyAlertsData: DashboardOverview = {
      ...mockOverviewData,
      recentAlerts: [],
    };
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(emptyAlertsData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No active alerts/i)).toBeInTheDocument();
    });
  });

  // H. API error state
  it('H. displays error state when dashboard API fails', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.reject(new Error('Network error')));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load command center data/i)).toBeInTheDocument();
    });
  });

  // I. Retry behavior
  it('I. re-fetches data when retry button is clicked', async () => {
    (dashboardApi.getOverview as any).mockRejectedValueOnce(new Error('Backend error'));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load command center data/i)).toBeInTheDocument();
    });

    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  // J. Quick navigation
  it('J. renders quick action navigation buttons that navigate to target routes', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <AuthProvider>
        <ConnectionProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/map" element={<div>Live Map Page Target</div>} />
            </Routes>
          </MemoryRouter>
        </ConnectionProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Live Map/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /View Live Map/i }));

    expect(screen.getByText(/Live Map Page Target/i)).toBeInTheDocument();
  });

  // K. Responsive-safe structure
  it('K. renders compact incident table with action buttons', async () => {
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverviewData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Recent Operational Incidents Log/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^View$/i }).length).toBeGreaterThan(0);
    });
  });

  // L. No fake data
  it('L. ensures metrics match exact API response values without fake placeholders', async () => {
    const customData: DashboardOverview = {
      summary: {
        totalIncidents: 99,
        openIncidents: 15,
        acknowledgedIncidents: 50,
        resolvedIncidents: 34,
        highSeverityIncidents: 7,
        mediumSeverityIncidents: 40,
        lowSeverityIncidents: 52,
        totalAlerts: 14,
        unreadAlerts: 5,
        acknowledgedAlerts: 4,
        resolvedAlerts: 5,
      },
      recentIncidents: [],
      recentAlerts: [],
    };
    (dashboardApi.getOverview as any).mockImplementation(() => Promise.resolve(customData));

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('99')).toBeInTheDocument();
      expect(screen.getAllByText('15').length).toBeGreaterThan(0);
      expect(screen.getAllByText('7').length).toBeGreaterThan(0);
      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });
});
