import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FleetPage } from '../pages/Fleet/Index';
import { fleetApi } from '../api/fleet';
import { authApi } from '../api/auth';
import { ConnectionProvider } from '../context/ConnectionContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Route, Bus, Device } from '../types';
import { TOKEN_KEY } from '../utils/auth';

// Mock fleetApi
vi.mock('../api/fleet', () => ({
  fleetApi: {
    getRoutes: vi.fn(),
    getRouteById: vi.fn(),
    createRoute: vi.fn(),
    updateRoute: vi.fn(),
    getBuses: vi.fn(),
    getBusById: vi.fn(),
    createBus: vi.fn(),
    updateBus: vi.fn(),
    getDevices: vi.fn(),
    getDeviceById: vi.fn(),
    createDevice: vi.fn(),
    updateDevice: vi.fn(),
    generateDeviceCredentials: vi.fn(),
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

const mockRoutes: Route[] = [
  {
    id: 'r-1',
    routeNumber: '201',
    name: 'Central Express',
    origin: 'Main Station',
    destination: 'North Terminal',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'r-2',
    routeNumber: '500',
    name: 'Ring Road Loop',
    origin: 'Silk Board',
    destination: 'Hebbal',
    isActive: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockBuses: Bus[] = [
  {
    id: 'b-1',
    busNumber: 'BUS-101',
    registrationNumber: 'KA-01-F-1234',
    operator: 'BMTC',
    routeId: 'r-1',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'b-2',
    busNumber: 'BUS-102',
    registrationNumber: 'KA-01-F-5678',
    operator: 'KSRTC',
    routeId: null,
    isActive: false,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockDevices: Device[] = [
  {
    id: 'd-1',
    deviceIdentifier: 'BUS-CAM-001',
    name: 'Front Dashcam',
    deviceType: 'bus_camera',
    busId: 'b-1',
    isActive: true,
    hasCredentials: true,
    lastSeenAt: '2026-09-05T12:00:00Z',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'd-2',
    deviceIdentifier: 'EDGE-GATE-002',
    name: 'Telemetry Gateway',
    deviceType: 'edge_ai_gateway',
    busId: null,
    isActive: false,
    hasCredentials: false,
    lastSeenAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const TestWrapper: React.FC<{ children: ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/fleet'],
}) => (
  <ThemeProvider>
    <AuthProvider>
      <ConnectionProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ConnectionProvider>
    </AuthProvider>
  </ThemeProvider>
);

const setupAdminUser = () => {
  const token = 'mock-jwt-token';
  const payload = btoa(JSON.stringify({ sub: 'u-1', username: 'admin', role: 'admin' }));
  localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);
  (authApi.getMe as any).mockResolvedValue({ id: 'u-1', username: 'admin', role: 'admin' });
};

const setupNonAdminUser = (role: 'traffic_authority' | 'municipal_authority' = 'traffic_authority') => {
  const token = 'mock-jwt-token';
  const payload = btoa(JSON.stringify({ sub: 'u-2', username: 'operator', role }));
  localStorage.setItem(TOKEN_KEY, `${token}.${payload}.signature`);
  (authApi.getMe as any).mockResolvedValue({ id: 'u-2', username: 'operator', role });
};

describe('STEP 27 — Fleet Management UI Tests (A-AE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminUser();
    (fleetApi.getRoutes as any).mockResolvedValue(mockRoutes);
    (fleetApi.getBuses as any).mockResolvedValue(mockBuses);
    (fleetApi.getDevices as any).mockResolvedValue(mockDevices);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('A: /fleet renders page title and subtitle', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Fleet Management' })).toBeInTheDocument();
      expect(
        screen.getByText('Manage routes, buses, and sensing devices across the operational network.')
      ).toBeInTheDocument();
    });
  });

  it('B: routes load from backend', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(fleetApi.getRoutes).toHaveBeenCalled();
      expect(screen.getAllByText('201').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });
  });

  it('C: buses load from backend', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(fleetApi.getBuses).toHaveBeenCalled();
      expect(screen.getAllByText('BUS-101').length).toBeGreaterThan(0);
      expect(screen.getAllByText('KA-01-F-1234').length).toBeGreaterThan(0);
    });
  });

  it('D: devices load from backend', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(fleetApi.getDevices).toHaveBeenCalled();
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Front Dashcam').length).toBeGreaterThan(0);
    });
  });

  it('E: active/inactive states render correctly', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      const activeBadges = screen.getAllByText('ACTIVE');
      const inactiveBadges = screen.getAllByText('INACTIVE');
      expect(activeBadges.length).toBeGreaterThan(0);
      expect(inactiveBadges.length).toBeGreaterThan(0);
    });
  });

  it('F: unassigned devices render correctly', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('EDGE-GATE-002').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    });
  });

  it('G: unassigned buses render correctly', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-102').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    });
  });

  it('H: admin sees create/edit controls', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Route' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Bus' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Device' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Edit/i }).length).toBeGreaterThan(0);
    });
  });

  it('I: non-admin does not see mutation controls', async () => {
    cleanup();
    setupNonAdminUser('traffic_authority');

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Fleet Management' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add Route' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add Bus' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add Device' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Key/i })).not.toBeInTheDocument();
    });
  });

  it('J: create route sends POST', async () => {
    (fleetApi.createRoute as any).mockResolvedValueOnce({
      id: 'r-3',
      routeNumber: '303',
      name: 'Airport Shuttles',
      origin: 'City Center',
      destination: 'KIA Airport',
      isActive: true,
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });

    const addRouteBtn = screen.getByRole('button', { name: 'Add Route' });
    fireEvent.click(addRouteBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Route' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 201'), { target: { value: '303' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Central City Loop'), {
      target: { value: 'Airport Shuttles' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Station'), {
      target: { value: 'City Center' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. North Terminal'), {
      target: { value: 'KIA Airport' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Route' }));

    await waitFor(() => {
      expect(fleetApi.createRoute).toHaveBeenCalledWith({
        routeNumber: '303',
        name: 'Airport Shuttles',
        origin: 'City Center',
        destination: 'KIA Airport',
        isActive: true,
      });
    });
  });

  it('K: edit route sends PATCH', async () => {
    (fleetApi.updateRoute as any).mockResolvedValueOnce({
      ...mockRoutes[0],
      name: 'Central Express Updated',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit Route 201/i });
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Route' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. Central City Loop'), {
      target: { value: 'Central Express Updated' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(fleetApi.updateRoute).toHaveBeenCalledWith('r-1', expect.objectContaining({
        name: 'Central Express Updated',
      }));
    });
  });

  it('L: create bus sends POST', async () => {
    (fleetApi.createBus as any).mockResolvedValueOnce({
      id: 'b-3',
      busNumber: 'BUS-303',
      registrationNumber: 'KA-01-F-9999',
      operator: 'BMTC',
      routeId: 'r-1',
      isActive: true,
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-101').length).toBeGreaterThan(0);
    });

    const addBusBtn = screen.getByRole('button', { name: 'Add Bus' });
    fireEvent.click(addBusBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Bus' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. BUS-101'), { target: { value: 'BUS-303' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. KA-01-F-1234'), {
      target: { value: 'KA-01-F-9999' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. BMTC Metro Express'), {
      target: { value: 'BMTC' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Bus' }));

    await waitFor(() => {
      expect(fleetApi.createBus).toHaveBeenCalledWith({
        busNumber: 'BUS-303',
        registrationNumber: 'KA-01-F-9999',
        operator: 'BMTC',
        routeId: null,
        isActive: true,
      });
    });
  });

  it('M: edit bus sends PATCH', async () => {
    (fleetApi.updateBus as any).mockResolvedValueOnce({
      ...mockBuses[0],
      operator: 'BMTC Superfast',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-101').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Edit Bus BUS-101/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Bus' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. BMTC Metro Express'), {
      target: { value: 'BMTC Superfast' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(fleetApi.updateBus).toHaveBeenCalledWith('b-1', expect.objectContaining({
        operator: 'BMTC Superfast',
      }));
    });
  });

  it('N: create device sends POST', async () => {
    (fleetApi.createDevice as any).mockResolvedValueOnce({
      id: 'd-3',
      deviceIdentifier: 'BUS-CAM-003',
      name: 'Rear Camera',
      deviceType: 'bus_camera',
      busId: 'b-1',
      isActive: true,
      hasCredentials: false,
      lastSeenAt: null,
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    const addDeviceBtn = screen.getByRole('button', { name: 'Add Device' });
    fireEvent.click(addDeviceBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Sensing Device' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. BUS-CAM-001'), {
      target: { value: 'BUS-CAM-003' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Front AI Dashcam'), {
      target: { value: 'Rear Camera' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Device' }));

    await waitFor(() => {
      expect(fleetApi.createDevice).toHaveBeenCalledWith({
        deviceIdentifier: 'BUS-CAM-003',
        name: 'Rear Camera',
        deviceType: 'bus_camera',
        busId: null,
        isActive: true,
      });
    });
  });

  it('O: edit device sends PATCH', async () => {
    (fleetApi.updateDevice as any).mockResolvedValueOnce({
      ...mockDevices[0],
      name: 'Front Dual Camera',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Edit Device BUS-CAM-001/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Sensing Device' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. Front AI Dashcam'), {
      target: { value: 'Front Dual Camera' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(fleetApi.updateDevice).toHaveBeenCalledWith('d-1', expect.objectContaining({
        name: 'Front Dual Camera',
      }));
    });
  });

  it('P: route selector uses backend routes', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-101').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Edit Bus BUS-101/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Route 201/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Route 500/i })).toBeInTheDocument();
    });
  });

  it('Q: bus selector uses backend buses', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    const editBtn = screen.getByRole('button', { name: /Edit Device BUS-CAM-001/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Bus BUS-101 (KA-01-F-1234)')).toBeInTheDocument();
      expect(screen.getByText('Bus BUS-102 (KA-01-F-5678)')).toBeInTheDocument();
    });
  });

  it('R: credential generation calls correct endpoint', async () => {
    (fleetApi.generateDeviceCredentials as any).mockResolvedValueOnce({
      deviceId: 'BUS-CAM-001',
      apiKey: 'dev_secret_key_abc123',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    const genKeyBtn = screen.getByRole('button', { name: /Generate Key for BUS-CAM-001/i });
    fireEvent.click(genKeyBtn);

    await waitFor(() => {
      expect(fleetApi.generateDeviceCredentials).toHaveBeenCalledWith('d-1');
    });
  });

  it('S & T: generated credential appears only in one-time modal and NOT in table', async () => {
    (fleetApi.generateDeviceCredentials as any).mockResolvedValueOnce({
      deviceId: 'BUS-CAM-001',
      apiKey: 'dev_secret_key_abc123',
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    // Ensure secret is NOT in table before click
    expect(screen.queryByText('dev_secret_key_abc123')).not.toBeInTheDocument();

    const genKeyBtn = screen.getByRole('button', { name: /Generate Key for BUS-CAM-001/i });
    fireEvent.click(genKeyBtn);

    await waitFor(() => {
      expect(screen.getByText('Generated Device API Key')).toBeInTheDocument();
      expect(screen.getByText('dev_secret_key_abc123')).toBeInTheDocument();
      expect(
        screen.getByText('This device key will not be shown again. Copy it now and store it securely.')
      ).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Done & Close' }));

    await waitFor(() => {
      expect(screen.queryByText('Generated Device API Key')).not.toBeInTheDocument();
      expect(screen.queryByText('dev_secret_key_abc123')).not.toBeInTheDocument();
    });
  });

  it('U: copy action works in credential modal', async () => {
    (fleetApi.generateDeviceCredentials as any).mockResolvedValueOnce({
      deviceId: 'BUS-CAM-001',
      apiKey: 'dev_secret_key_abc123',
    });

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Generate Key for BUS-CAM-001/i }));

    await waitFor(() => {
      expect(screen.getByText('dev_secret_key_abc123')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy API Key/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('dev_secret_key_abc123');
    });
  });

  it('V: lastSeenAt renders formatted time', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Recently seen|Seen/i).length).toBeGreaterThan(0);
    });
  });

  it('W: null lastSeenAt renders N/A', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('X: relationship chain renders backend relationships', async () => {
    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Fleet Relationships (Route → Bus → Device)')).toBeInTheDocument();
      expect(screen.getByText('Route 201')).toBeInTheDocument();
      expect(screen.getAllByText('BUS-101').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BUS-CAM-001').length).toBeGreaterThan(0);
    });
  });

  it('Y: loading state renders loading skeletons', async () => {
    (fleetApi.getRoutes as any).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /Refresh/i })).toBeDisabled();
  });

  it('Z: empty state renders empty state message', async () => {
    (fleetApi.getRoutes as any).mockResolvedValueOnce([]);
    (fleetApi.getBuses as any).mockResolvedValueOnce([]);
    (fleetApi.getDevices as any).mockResolvedValueOnce([]);

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No routes registered.')).toBeInTheDocument();
      expect(screen.getByText('No buses registered.')).toBeInTheDocument();
      expect(screen.getByText('No devices registered.')).toBeInTheDocument();
    });
  });

  it('AA: error state renders when all API calls fail', async () => {
    (fleetApi.getRoutes as any).mockRejectedValueOnce(new Error('Network Error'));
    (fleetApi.getBuses as any).mockRejectedValueOnce(new Error('Network Error'));
    (fleetApi.getDevices as any).mockRejectedValueOnce(new Error('Network Error'));

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load fleet data.')).toBeInTheDocument();
    });
  });

  it('AB: retry reloads fleet data on error', async () => {
    (fleetApi.getRoutes as any).mockRejectedValueOnce(new Error('Network Error'));
    (fleetApi.getBuses as any).mockRejectedValueOnce(new Error('Network Error'));
    (fleetApi.getDevices as any).mockRejectedValueOnce(new Error('Network Error'));

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load fleet data.')).toBeInTheDocument();
    });

    (fleetApi.getRoutes as any).mockResolvedValueOnce(mockRoutes);
    (fleetApi.getBuses as any).mockResolvedValueOnce(mockBuses);
    (fleetApi.getDevices as any).mockResolvedValueOnce(mockDevices);

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });
  });

  it('AC: 403 mutation error is handled gracefully', async () => {
    (fleetApi.createRoute as any).mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Permission denied' } },
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });

    const addRouteBtn = screen.getByRole('button', { name: 'Add Route' });
    fireEvent.click(addRouteBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Route' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 201'), { target: { value: '999' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Central City Loop'), {
      target: { value: 'Unauthorized Route' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Station'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. North Terminal'), {
      target: { value: 'B' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Route' }));

    await waitFor(() => {
      expect(screen.getByText('Access denied: Admin permissions required.')).toBeInTheDocument();
    });
  });

  it('AD: 409 duplicate/conflict error is handled gracefully', async () => {
    (fleetApi.createRoute as any).mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Route number already exists' } },
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });

    const addRouteBtn = screen.getByRole('button', { name: 'Add Route' });
    fireEvent.click(addRouteBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Route' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 201'), { target: { value: '201' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Central City Loop'), {
      target: { value: 'Duplicate Route' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Station'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. North Terminal'), {
      target: { value: 'B' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Route' }));

    await waitFor(() => {
      expect(screen.getByText('Conflict: Route number already exists.')).toBeInTheDocument();
    });
  });

  it('AE: 422 validation error is handled gracefully', async () => {
    (fleetApi.createRoute as any).mockRejectedValueOnce({
      response: { status: 422, data: { detail: 'Validation failed' } },
    });

    render(
      <TestWrapper>
        <FleetPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Central Express').length).toBeGreaterThan(0);
    });

    const addRouteBtn = screen.getByRole('button', { name: 'Add Route' });
    fireEvent.click(addRouteBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Route' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. 201'), { target: { value: '201' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Central City Loop'), {
      target: { value: 'Invalid Route' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Station'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. North Terminal'), {
      target: { value: 'B' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Route' }));

    await waitFor(() => {
      expect(screen.getByText('Validation failed: Please check input data.')).toBeInTheDocument();
    });
  });
});
