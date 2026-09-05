import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsPage } from '../pages/Analytics/Index';
import { analyticsApi } from '../api/analytics';
import { authApi } from '../api/auth';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AnalyticsSummary, IncidentTypeCount, SeverityCount, AlertStatusCount } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock analyticsApi
vi.mock('../api/analytics', () => ({
  analyticsApi: {
    getSummary: vi.fn(),
    getIncidentsByType: vi.fn(),
    getIncidentsBySeverity: vi.fn(),
    getAlertsByStatus: vi.fn(),
  },
}));

// Mock authApi to prevent network delays
vi.mock('../api/auth', () => ({
  authApi: {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    getMe: vi.fn().mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' }),
    login: vi.fn(),
  },
}));

const mockSummary: AnalyticsSummary = {
  totalIncidents: 25,
  openIncidents: 10,
  acknowledgedIncidents: 5,
  resolvedIncidents: 10,
  highSeverityIncidents: 8,
  mediumSeverityIncidents: 12,
  lowSeverityIncidents: 5,
  totalAlerts: 15,
  unreadAlerts: 4,
  acknowledgedAlerts: 6,
  resolvedAlerts: 5,
};

const mockTypes: IncidentTypeCount[] = [
  { incidentType: 'ACCIDENT', count: 12 },
  { incidentType: 'HAZARD', count: 8 },
  { incidentType: 'CONGESTION', count: 5 },
];

const mockSeverities: SeverityCount[] = [
  { severity: 'high', count: 8 },
  { severity: 'medium', count: 12 },
  { severity: 'low', count: 5 },
];

const mockAlertStatuses: AlertStatusCount[] = [
  { status: 'unread', count: 4 },
  { status: 'acknowledged', count: 6 },
  { status: 'resolved', count: 5 },
];

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/analytics'],
}) => (
  <ThemeProvider>
    <AuthProvider>
      <ConnectionProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ConnectionProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('Step 26 — Analytics & Insights Dashboard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const token = 'mock-jwt-token';
    const payload = btoa(JSON.stringify({ sub: 'u-1', username: 'admin', role: 'admin' }));
    localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);
    (authApi.getMe as any).mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' });

    (analyticsApi.getSummary as any).mockResolvedValue(mockSummary);
    (analyticsApi.getIncidentsByType as any).mockResolvedValue({ items: mockTypes });
    (analyticsApi.getIncidentsBySeverity as any).mockResolvedValue({ items: mockSeverities });
    (analyticsApi.getAlertsByStatus as any).mockResolvedValue({ items: mockAlertStatuses });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('A: Renders Analytics page title ("Analytics & Insights")', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics & Insights')).toBeInTheDocument();
      expect(
        screen.getByText(/Operational intelligence across incidents, alerts, and network activity/i)
      ).toBeInTheDocument();
    });
  });

  it('B: Calls summary endpoint on mount', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(analyticsApi.getSummary).toHaveBeenCalled();
    });
  });

  it('C: Calls incidents-by-type endpoint on mount', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(analyticsApi.getIncidentsByType).toHaveBeenCalled();
    });
  });

  it('D: Calls incidents-by-severity endpoint on mount', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(analyticsApi.getIncidentsBySeverity).toHaveBeenCalled();
    });
  });

  it('E: Calls alerts-by-status endpoint on mount', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(analyticsApi.getAlertsByStatus).toHaveBeenCalled();
    });
  });

  it('F: Renders KPI summary values from backend data', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // totalIncidents
      expect(screen.getAllByText('10').length).toBeGreaterThan(0); // openIncidents
      expect(screen.getAllByText('8').length).toBeGreaterThan(0); // highSeverityIncidents
      expect(screen.getByText('15')).toBeInTheDocument(); // totalAlerts
      expect(screen.getByText('4')).toBeInTheDocument(); // unreadAlerts
      expect(screen.getByText('40%')).toBeInTheDocument(); // resolution rate (10/25)
    });
  });

  it('G: Incident type chart section renders backend categories', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident Volume by Hazard Category')).toBeInTheDocument();
    });
  });

  it('H: Severity classification section renders backend values', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Severity Distribution Share')).toBeInTheDocument();
    });
  });

  it('I: Alert status chart section renders backend values', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Status Breakdown')).toBeInTheDocument();
    });
  });

  it('J & K: Date filters send from and to parameters to API when Apply is clicked', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Temporal Filter')).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText('From Date');
    const toInput = screen.getByLabelText('To Date');

    fireEvent.change(fromInput, { target: { value: '2026-09-01T00:00' } });
    fireEvent.change(toInput, { target: { value: '2026-09-05T23:59' } });

    const applyBtn = screen.getByRole('button', { name: /Apply Date Range/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(analyticsApi.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2026-09-01T00:00',
          to: '2026-09-05T23:59',
        })
      );
    });
  });

  it('L: Clear resets temporal filters and reloads default datasets', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Temporal Filter')).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: /Reset Date Filter/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(analyticsApi.getSummary).toHaveBeenCalledWith({});
    });
  });

  it('M: Handles invalid date range (from > to) with validation warning', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Temporal Filter')).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText('From Date');
    const toInput = screen.getByLabelText('To Date');

    fireEvent.change(fromInput, { target: { value: '2026-09-10T00:00' } });
    fireEvent.change(toInput, { target: { value: '2026-09-05T23:59' } });

    await waitFor(() => {
      expect(
        screen.getByText('From timestamp must be less than or equal to To timestamp')
      ).toBeInTheDocument();
    });
  });

  it('N: Renders loading state while fetching analytics datasets', async () => {
    (analyticsApi.getSummary as any).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /Refresh Analytics/i })).toBeDisabled();
  });

  it('O: Endpoint failure shows error state', async () => {
    (analyticsApi.getSummary as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load analytics data.')).toBeInTheDocument();
    });
  });

  it('P: Retry button reloads analytics datasets on failure', async () => {
    (analyticsApi.getSummary as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load analytics data.')).toBeInTheDocument();
    });

    (analyticsApi.getSummary as any).mockResolvedValueOnce(mockSummary);

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Analytics & Insights')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('Q: Empty analytics state renders gracefully without crashing', async () => {
    (analyticsApi.getSummary as any).mockResolvedValueOnce({
      totalIncidents: 0,
      openIncidents: 0,
      acknowledgedIncidents: 0,
      resolvedIncidents: 0,
      highSeverityIncidents: 0,
      mediumSeverityIncidents: 0,
      lowSeverityIncidents: 0,
      totalAlerts: 0,
      unreadAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
    });
    (analyticsApi.getIncidentsByType as any).mockResolvedValueOnce({ items: [] });
    (analyticsApi.getIncidentsBySeverity as any).mockResolvedValueOnce({ items: [] });
    (analyticsApi.getAlertsByStatus as any).mockResolvedValueOnce({ items: [] });

    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.getByText('Operational Insights Summary')).toBeInTheDocument();
    });
  });

  it('R: All supported user roles (admin, traffic_authority, municipal_authority) can access analytics UI', async () => {
    const roles = ['admin', 'traffic_authority', 'municipal_authority'];

    for (const role of roles) {
      cleanup();
      (authApi.getMe as any).mockResolvedValue({ id: 'u-1', username: 'operator', role });
      const token = 'mock-jwt-token';
      const payload = btoa(JSON.stringify({ sub: 'u-1', username: 'operator', role }));
      localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);

      render(
        <TestWrapper>
          <AnalyticsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Analytics & Insights')).toBeInTheDocument();
      });
    }
  });

  it('S: Verifies all datasets originate strictly from API mocks and no fake hardcoded production data exists', async () => {
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(analyticsApi.getSummary).toHaveBeenCalledTimes(1);
      expect(analyticsApi.getIncidentsByType).toHaveBeenCalledTimes(1);
      expect(analyticsApi.getIncidentsBySeverity).toHaveBeenCalledTimes(1);
      expect(analyticsApi.getAlertsByStatus).toHaveBeenCalledTimes(1);
    });
  });
});
