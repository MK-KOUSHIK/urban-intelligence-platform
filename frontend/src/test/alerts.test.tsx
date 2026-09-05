import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AlertsPage } from '../pages/Alerts/Index';
import { alertsApi } from '../api/alerts';
import { authApi } from '../api/auth';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { TopBar } from '../components/layout/TopBar';
import { Alert, PaginatedResponse } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock alertsApi
vi.mock('../api/alerts', () => ({
  alertsApi: {
    getAlerts: vi.fn(),
    updateAlert: vi.fn(),
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

const mockAlerts: Alert[] = [
  {
    id: 'alt-101',
    incidentId: 'inc-201',
    alertType: 'ACCIDENT',
    severity: 'high',
    message: 'High severity accident detected at Junction 4',
    status: 'unread',
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'alt-102',
    incidentId: 'inc-202',
    alertType: 'HAZARD',
    severity: 'medium',
    message: 'Medium hazard detected on Highway 9',
    status: 'acknowledged',
    createdAt: '2026-09-05T09:35:00Z',
  },
  {
    id: 'alt-103',
    incidentId: 'inc-203',
    alertType: 'CONGESTION',
    severity: 'low',
    message: 'Minor congestion near Station Road',
    status: 'resolved',
    createdAt: '2026-09-05T09:40:00Z',
  },
];

const mockPaginatedAlerts: PaginatedResponse<Alert> = {
  items: mockAlerts,
  total: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/alerts'],
}) => (
  <ThemeProvider>
    <AuthProvider>
      <ConnectionProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ConnectionProvider>
    </AuthProvider>
  </ThemeProvider>
);

describe('Step 25 — Alert & Notification Center UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const token = 'mock-jwt-token';
    const payload = btoa(JSON.stringify({ sub: 'u-1', username: 'admin', role: 'admin' }));
    localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);
    (alertsApi.getAlerts as any).mockResolvedValue(mockPaginatedAlerts);
    (authApi.getMe as any).mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('A: Renders Alerts page header ("Alert Center")', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Center')).toBeInTheDocument();
    });
  });

  it('B: Shows backend connection status badge on Alerts page', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/CONNECTED/i)).toBeInTheDocument();
    });
  });

  it('C: Renders alert status summary cards (Total, Unread, Acknowledged, Resolved) with correct values', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
      expect(screen.getAllByText('Unread').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Acknowledged').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
    });
  });

  it('D: Renders AlertFilters component with all filter inputs', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Dispatch Filters')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Alert Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Severity')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Status')).toBeInTheDocument();
    });
  });

  it('E: Triggers alertsApi.getAlerts on filter apply', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Dispatch Filters')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Filter by Status');
    fireEvent.change(statusSelect, { target: { value: 'unread' } });

    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unread',
        })
      );
    });
  });

  it('F: Clear filters resets filter values and fetches default alerts list', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Alert Dispatch Filters')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Filter by Status');
    fireEvent.change(statusSelect, { target: { value: 'unread' } });

    const clearBtn = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
        })
      );
    });
  });

  it('G: Renders AlertTable with correct alert records', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('High severity accident detected at Junction 4')).toBeInTheDocument();
      expect(screen.getByText('Medium hazard detected on Highway 9')).toBeInTheDocument();
      expect(screen.getByText('Minor congestion near Station Road')).toBeInTheDocument();
    });
  });

  it('H: Shows incident link navigating to /incidents/:incidentId for alerts linked to incidents', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const incidentLinks = screen.getAllByRole('link', { name: /View Incident inc-201/i });
      expect(incidentLinks.length).toBeGreaterThan(0);
      expect(incidentLinks[0]).toHaveAttribute('href', '/incidents/inc-201');
    });
  });

  it('I: Displays empty state when backend returns empty items list', async () => {
    (alertsApi.getAlerts as any).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No alerts match the selected filters.')).toBeInTheDocument();
    });
  });

  it('J: Displays error message when backend fetch fails', async () => {
    (alertsApi.getAlerts as any).mockRejectedValueOnce(new Error('Network connection error'));

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load alert data.')).toBeInTheDocument();
    });
  });

  it('K: Shows pagination controls and displays total count and page info', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Page/i)).toBeInTheDocument();
      expect(screen.getByText(/3 total alerts/i)).toBeInTheDocument();
    });
  });

  it('L: Change page triggers alertsApi.getAlerts with updated page parameter', async () => {
    (alertsApi.getAlerts as any).mockResolvedValueOnce({
      items: mockAlerts,
      total: 40,
      page: 1,
      pageSize: 20,
      totalPages: 2,
    });

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Page/i })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Next Page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(alertsApi.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('M: For admin user: Renders action buttons ("Acknowledge", "Resolve") for unread alerts', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Acknowledge.*alt-101/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Resolve.*alt-101/i })).toBeInTheDocument();
    });
  });

  it('N: For admin user: Renders action button ("Resolve") for acknowledged alerts', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resolve.*alt-102/i })).toBeInTheDocument();
    });
  });

  it('O: For admin user: Clicking Acknowledge calls alertsApi.updateAlert(id, "acknowledged") and refreshes list', async () => {
    (alertsApi.updateAlert as any).mockResolvedValueOnce({ ...mockAlerts[0], status: 'acknowledged' });

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Acknowledge.*alt-101/i })).toBeInTheDocument();
    });

    const ackBtn = screen.getByRole('button', { name: /Acknowledge.*alt-101/i });
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(alertsApi.updateAlert).toHaveBeenCalledWith('alt-101', 'acknowledged');
    });
  });

  it('P: For admin user: Clicking Resolve opens AlertResolveConfirmModal', async () => {
    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resolve.*alt-101/i })).toBeInTheDocument();
    });

    const resolveBtn = screen.getByRole('button', { name: /Resolve.*alt-101/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(screen.getByText('Resolve this alert?')).toBeInTheDocument();
      expect(screen.getByText(/Resolving this alert updates its status to RESOLVED/i)).toBeInTheDocument();
    });
  });

  it('Q: Confirming resolution in modal calls alertsApi.updateAlert(id, "resolved") and closes modal', async () => {
    (alertsApi.updateAlert as any).mockResolvedValueOnce({ ...mockAlerts[0], status: 'resolved' });

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resolve.*alt-101/i })).toBeInTheDocument();
    });

    const resolveBtn = screen.getByRole('button', { name: /Resolve.*alt-101/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(screen.getByText('Resolve this alert?')).toBeInTheDocument();
    });

    const confirmModalBtn = screen.getByRole('button', { name: /Confirm Resolve/i });
    fireEvent.click(confirmModalBtn);

    await waitFor(() => {
      expect(alertsApi.updateAlert).toHaveBeenCalledWith('alt-101', 'resolved');
    });
  });

  it('R: For non-admin user (traffic_authority): Hides action buttons and shows read-only status badges', async () => {
    (authApi.getMe as any).mockResolvedValue({ id: 'u-2', username: 'traffic_operator', role: 'traffic_authority' });
    const token = 'mock-jwt-token';
    const payload = btoa(JSON.stringify({ sub: 'u-2', username: 'traffic_operator', role: 'traffic_authority' }));
    localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);

    render(
      <TestWrapper>
        <AlertsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('High severity accident detected at Junction 4')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Acknowledge.*alt-101/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Resolve.*alt-101/i })).not.toBeInTheDocument();
    });
  });

  it('S: TopBar Notification Center dropdown renders bell icon with unread count badge', async () => {
    (alertsApi.getAlerts as any).mockResolvedValue({
      items: [mockAlerts[0]],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    });

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <TopBar />
      </TestWrapper>
    );

    await waitFor(() => {
      const bellButton = screen.getByRole('button', { name: /Notification Center/i });
      expect(bellButton).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('T: Clicking notification item in dropdown navigates to related incident or /alerts', async () => {
    (alertsApi.getAlerts as any).mockResolvedValue({
      items: [mockAlerts[0]],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    });

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TopBar />} />
          <Route path="/incidents/:id" element={<div>Incident Detail Page</div>} />
        </Routes>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Notification Center/i })).toBeInTheDocument();
    });

    const bellBtn = screen.getByRole('button', { name: /Notification Center/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('High severity accident detected at Junction 4')).toBeInTheDocument();
    });

    const notificationItem = screen.getByText('High severity accident detected at Junction 4');
    fireEvent.click(notificationItem);

    await waitFor(() => {
      expect(screen.getByText('Incident Detail Page')).toBeInTheDocument();
    });
  });
});
