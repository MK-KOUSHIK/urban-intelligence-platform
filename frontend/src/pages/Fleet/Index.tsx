import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ErrorState } from '../../components/ui/ErrorState';
import { RouteTable } from '../../components/fleet/RouteTable';
import { BusTable } from '../../components/fleet/BusTable';
import { DeviceTable } from '../../components/fleet/DeviceTable';
import { FleetRelationships } from '../../components/fleet/FleetRelationships';
import { RouteFormModal } from '../../components/fleet/RouteFormModal';
import { BusFormModal } from '../../components/fleet/BusFormModal';
import { DeviceFormModal } from '../../components/fleet/DeviceFormModal';
import { DeviceCredentialModal } from '../../components/fleet/DeviceCredentialModal';
import { fleetApi } from '../../api/fleet';
import { useAuth } from '../../hooks/useAuth';
import { Route, Bus, Device, DeviceCredentialResponse } from '../../types';
import {
  Route as RouteIcon,
  Bus as BusIcon,
  Cpu,
  Plus,
  RefreshCw,
  Search,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const FleetPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routesError, setRoutesError] = useState<boolean>(false);
  const [busesError, setBusesError] = useState<boolean>(false);
  const [devicesError, setDevicesError] = useState<boolean>(false);

  // Active section tab: 'overview' | 'routes' | 'buses' | 'devices' | 'relationships'
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'buses' | 'devices' | 'relationships'>('overview');

  // Client-side Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeMutationError, setRouteMutationError] = useState<string | null>(null);
  const [isRouteSubmitting, setIsRouteSubmitting] = useState(false);

  const [isBusModalOpen, setIsBusModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [busMutationError, setBusMutationError] = useState<string | null>(null);
  const [isBusSubmitting, setIsBusSubmitting] = useState(false);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceMutationError, setDeviceMutationError] = useState<string | null>(null);
  const [isDeviceSubmitting, setIsDeviceSubmitting] = useState(false);

  // One-time credential modal state
  const [generatedCredential, setGeneratedCredential] = useState<DeviceCredentialResponse | null>(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);

  const fetchFleetData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRoutesError(false);
    setBusesError(false);
    setDevicesError(false);

    const [routesRes, busesRes, devicesRes] = await Promise.allSettled([
      fleetApi.getRoutes(),
      fleetApi.getBuses(),
      fleetApi.getDevices(),
    ]);

    let hasAnySuccess = false;

    if (routesRes.status === 'fulfilled') {
      setRoutes(routesRes.value);
      hasAnySuccess = true;
    } else {
      setRoutesError(true);
    }

    if (busesRes.status === 'fulfilled') {
      setBuses(busesRes.value);
      hasAnySuccess = true;
    } else {
      setBusesError(true);
    }

    if (devicesRes.status === 'fulfilled') {
      setDevices(devicesRes.value);
      hasAnySuccess = true;
    } else {
      setDevicesError(true);
    }

    if (!hasAnySuccess) {
      setError('Unable to load fleet data.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  // Summaries derived strictly from backend datasets
  const activeRoutesCount = useMemo(() => routes.filter((r) => r.isActive).length, [routes]);
  const activeBusesCount = useMemo(() => buses.filter((b) => b.isActive).length, [buses]);
  const activeDevicesCount = useMemo(() => devices.filter((d) => d.isActive).length, [devices]);
  const unassignedDevicesCount = useMemo(() => devices.filter((d) => !d.busId).length, [devices]);

  // Client-side filtering logic
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchesSearch =
        r.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? r.isActive : !r.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchQuery, statusFilter]);

  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const matchesSearch =
        b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.operator.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? b.isActive : !b.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [buses, searchQuery, statusFilter]);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        d.deviceIdentifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? d.isActive : !d.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchQuery, statusFilter]);

  // Route Handlers
  const handleCreateRouteSubmit = async (data: {
    routeNumber: string;
    name: string;
    origin: string;
    destination: string;
    isActive: boolean;
  }) => {
    setIsRouteSubmitting(true);
    setRouteMutationError(null);
    try {
      if (selectedRoute) {
        await fleetApi.updateRoute(selectedRoute.id, data);
      } else {
        await fleetApi.createRoute(data);
      }
      setIsRouteModalOpen(false);
      setSelectedRoute(null);
      await fetchFleetData();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setRouteMutationError('Access denied: Admin permissions required.');
      } else if (err.response?.status === 409) {
        setRouteMutationError('Conflict: Route number already exists.');
      } else if (err.response?.status === 422) {
        setRouteMutationError('Validation failed: Please check input data.');
      } else {
        setRouteMutationError(err.response?.data?.detail || 'Failed to save route.');
      }
    } finally {
      setIsRouteSubmitting(false);
    }
  };

  // Bus Handlers
  const handleCreateBusSubmit = async (data: {
    busNumber: string;
    registrationNumber: string;
    operator: string;
    routeId?: string | null;
    isActive: boolean;
  }) => {
    setIsBusSubmitting(true);
    setBusMutationError(null);
    try {
      if (selectedBus) {
        await fleetApi.updateBus(selectedBus.id, data);
      } else {
        await fleetApi.createBus(data);
      }
      setIsBusModalOpen(false);
      setSelectedBus(null);
      await fetchFleetData();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setBusMutationError('Access denied: Admin permissions required.');
      } else if (err.response?.status === 409) {
        setBusMutationError('Conflict: Bus number or registration already exists.');
      } else if (err.response?.status === 422) {
        setBusMutationError('Validation failed: Please check input data.');
      } else {
        setBusMutationError(err.response?.data?.detail || 'Failed to save bus.');
      }
    } finally {
      setIsBusSubmitting(false);
    }
  };

  // Device Handlers
  const handleCreateDeviceSubmit = async (data: {
    deviceIdentifier: string;
    name: string;
    deviceType: string;
    busId?: string | null;
    isActive: boolean;
  }) => {
    setIsDeviceSubmitting(true);
    setDeviceMutationError(null);
    try {
      if (selectedDevice) {
        await fleetApi.updateDevice(selectedDevice.id, data);
      } else {
        await fleetApi.createDevice(data);
      }
      setIsDeviceModalOpen(false);
      setSelectedDevice(null);
      await fetchFleetData();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setDeviceMutationError('Access denied: Admin permissions required.');
      } else if (err.response?.status === 409) {
        setDeviceMutationError('Conflict: Device identifier already exists.');
      } else if (err.response?.status === 422) {
        setDeviceMutationError('Validation failed: Please check input data.');
      } else {
        setDeviceMutationError(err.response?.data?.detail || 'Failed to save device.');
      }
    } finally {
      setIsDeviceSubmitting(false);
    }
  };

  // Credential Generation Handler
  const handleGenerateKey = async (device: Device) => {
    try {
      const cred = await fleetApi.generateDeviceCredentials(device.id);
      setGeneratedCredential(cred);
      setIsCredentialModalOpen(true);
      await fetchFleetData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate device key.');
    }
  };

  const handleCloseCredentialModal = () => {
    setIsCredentialModalOpen(false);
    setGeneratedCredential(null);
  };

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fleet Management"
          description="Manage routes, buses, and sensing devices across the operational network."
          actions={
            <div className="flex items-center gap-3">
              <ConnectionStatus showWebSocket={true} />
              <Button variant="outline" size="sm" onClick={fetchFleetData} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          }
        />
        <ErrorState
          title="Unable to load fleet data."
          description="Failed to fetch route, bus, or device registries from the backend."
          onRetry={fetchFleetData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Fleet Management"
        description="Manage routes, buses, and sensing devices across the operational network."
        actions={
          <div className="flex items-center gap-3">
            <ConnectionStatus showWebSocket={true} />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFleetData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <RouteIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {activeRoutesCount} <span className="text-xs font-normal text-slate-400">/ {routes.length}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Routes</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <BusIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {activeBusesCount} <span className="text-xs font-normal text-slate-400">/ {buses.length}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Buses</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {activeDevicesCount} <span className="text-xs font-normal text-slate-400">/ {devices.length}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Devices</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {unassignedDevicesCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unassigned Devices</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs & Actions Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="gap-1.5 whitespace-nowrap"
          >
            <Layers className="h-4 w-4" /> Overview & All Sections
          </Button>
          <Button
            variant={activeTab === 'routes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('routes')}
            className="gap-1.5 whitespace-nowrap"
          >
            <RouteIcon className="h-4 w-4" /> Routes ({routes.length})
          </Button>
          <Button
            variant={activeTab === 'buses' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('buses')}
            className="gap-1.5 whitespace-nowrap"
          >
            <BusIcon className="h-4 w-4" /> Buses ({buses.length})
          </Button>
          <Button
            variant={activeTab === 'devices' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('devices')}
            className="gap-1.5 whitespace-nowrap"
          >
            <Cpu className="h-4 w-4" /> Devices ({devices.length})
          </Button>
          <Button
            variant={activeTab === 'relationships' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('relationships')}
            className="gap-1.5 whitespace-nowrap"
          >
            Relationships
          </Button>
        </div>

        {/* Filter Controls & Admin Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px]">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fleet assets..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 text-xs min-w-[120px]"
          />

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRoute(null);
                  setIsRouteModalOpen(true);
                }}
                className="gap-1 text-xs h-9"
              >
                <Plus className="h-3.5 w-3.5" /> Route
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBus(null);
                  setIsBusModalOpen(true);
                }}
                className="gap-1 text-xs h-9"
              >
                <Plus className="h-3.5 w-3.5" /> Bus
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedDevice(null);
                  setIsDeviceModalOpen(true);
                }}
                className="gap-1 text-xs h-9"
              >
                <Plus className="h-3.5 w-3.5" /> Device
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Partial Errors Warning if any single endpoint failed */}
      {(routesError || busesError || devicesError) && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>
            Warning: Some fleet datasets could not be retrieved ({routesError ? 'Routes ' : ''}
            {busesError ? 'Buses ' : ''}
            {devicesError ? 'Devices' : ''}).
          </span>
          <Button variant="ghost" size="sm" onClick={fetchFleetData} className="h-7 text-xs">
            Retry Loading
          </Button>
        </div>
      )}

      {/* Main Content Sections */}
      <div className="space-y-8">
        {/* Section 1: Routes */}
        {(activeTab === 'overview' || activeTab === 'routes') && (
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-500" /> Operational Routes
              </h2>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRoute(null);
                    setIsRouteModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Route
                </Button>
              )}
            </div>
            <CardContent className="p-0">
              <RouteTable
                routes={filteredRoutes}
                buses={buses}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onEdit={(r) => {
                  setSelectedRoute(r);
                  setIsRouteModalOpen(true);
                }}
                onView={(r) => {
                  setSelectedRoute(r);
                  setIsRouteModalOpen(true);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Section 2: Buses */}
        {(activeTab === 'overview' || activeTab === 'buses') && (
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BusIcon className="h-4 w-4 text-blue-500" /> Active Bus Fleet
              </h2>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBus(null);
                    setIsBusModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Bus
                </Button>
              )}
            </div>
            <CardContent className="p-0">
              <BusTable
                buses={filteredBuses}
                routes={routes}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onEdit={(b) => {
                  setSelectedBus(b);
                  setIsBusModalOpen(true);
                }}
                onView={(b) => {
                  setSelectedBus(b);
                  setIsBusModalOpen(true);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Section 3: Devices */}
        {(activeTab === 'overview' || activeTab === 'devices') && (
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-500" /> Sensing & Edge AI Devices
              </h2>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDevice(null);
                    setIsDeviceModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Device
                </Button>
              )}
            </div>
            <CardContent className="p-0">
              <DeviceTable
                devices={filteredDevices}
                buses={buses}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onEdit={(d) => {
                  setSelectedDevice(d);
                  setIsDeviceModalOpen(true);
                }}
                onView={(d) => {
                  setSelectedDevice(d);
                  setIsDeviceModalOpen(true);
                }}
                onGenerateKey={handleGenerateKey}
              />
            </CardContent>
          </Card>
        )}

        {/* Section 4: Relationships */}
        {(activeTab === 'overview' || activeTab === 'relationships') && (
          <FleetRelationships routes={routes} buses={buses} devices={devices} />
        )}
      </div>

      {/* CRUD Modals */}
      <RouteFormModal
        isOpen={isRouteModalOpen}
        onClose={() => {
          setIsRouteModalOpen(false);
          setSelectedRoute(null);
          setRouteMutationError(null);
        }}
        onSubmit={handleCreateRouteSubmit}
        route={selectedRoute}
        isLoading={isRouteSubmitting}
        error={routeMutationError}
      />

      <BusFormModal
        isOpen={isBusModalOpen}
        onClose={() => {
          setIsBusModalOpen(false);
          setSelectedBus(null);
          setBusMutationError(null);
        }}
        onSubmit={handleCreateBusSubmit}
        bus={selectedBus}
        routes={routes}
        isLoading={isBusSubmitting}
        error={busMutationError}
      />

      <DeviceFormModal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          setIsDeviceModalOpen(false);
          setSelectedDevice(null);
          setDeviceMutationError(null);
        }}
        onSubmit={handleCreateDeviceSubmit}
        device={selectedDevice}
        buses={buses}
        isLoading={isDeviceSubmitting}
        error={deviceMutationError}
      />

      {/* One-Time Credential Modal */}
      <DeviceCredentialModal
        isOpen={isCredentialModalOpen}
        onClose={handleCloseCredentialModal}
        credential={generatedCredential}
      />
    </div>
  );
};
