import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Marker, Popup } from 'react-leaflet';
import { mapApi, BoundingBoxParams } from '../../api/map';
import { MapIncident, HeatmapPoint } from '../../types';
import { MapContainer } from '../../components/maps/MapContainer';
import { HeatmapLayer } from '../../components/maps/HeatmapLayer';
import { createSeverityIcon } from '../../components/maps/markerUtils';
import { MapFilters, MapFilterState } from '../../components/map/MapFilters';
import { SelectedIncidentPanel } from '../../components/map/SelectedIncidentPanel';
import { MapLegend } from '../../components/map/MapLegend';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RefreshCw, Flame, AlertCircle, Layers, MapPin } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { useConnection } from '../../hooks/useConnection';


// Sensible Hyderabad municipal bounding box default
const DEFAULT_BOUNDS: BoundingBoxParams = {
  minLatitude: 17.200000,
  maxLatitude: 17.600000,
  minLongitude: 78.200000,
  maxLongitude: 78.700000,
  limit: 1000,
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useConnection();

  // State
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [totalIncidents, setTotalIncidents] = useState<number>(0);
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMapError, setIsMapError] = useState<boolean>(false);
  const [isHeatmapError, setIsHeatmapError] = useState<boolean>(false);
  const [heatmapLoading, setHeatmapLoading] = useState<boolean>(false);

  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [filterState, setFilterState] = useState<MapFilterState>({});

  // Construct query params combining default bounding box and active filters
  const buildQueryParams = useCallback((): BoundingBoxParams => {
    const params: BoundingBoxParams = { ...DEFAULT_BOUNDS };

    if (filterState.severity) params.severity = filterState.severity;
    if (filterState.incidentType) params.incidentType = filterState.incidentType;
    if (filterState.status) params.status = filterState.status;
    if (filterState.from) params.from = filterState.from;
    if (filterState.to) params.to = filterState.to;
    if (filterState.deviceId) params.deviceId = filterState.deviceId;
    if (filterState.busId) params.busId = filterState.busId;
    if (filterState.routeId) params.routeId = filterState.routeId;

    return params;
  }, [filterState]);

  // Fetch Map Incidents
  const fetchMapIncidents = useCallback(async () => {
    setIsLoading(true);
    setIsMapError(false);
    try {
      const params = buildQueryParams();
      const res = await mapApi.getMapIncidents(params);
      setIncidents(res.items || []);
      setTotalIncidents(res.total ?? (res.items?.length || 0));
    } catch (err) {
      console.error('Failed to load map incidents:', err);
      setIsMapError(true);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams]);

  // Fetch Heatmap Points (Separate layer handling so map isn't destroyed if heatmap fails)
  const fetchHeatmapPoints = useCallback(async () => {
    if (!showHeatmap) return;
    setHeatmapLoading(true);
    setIsHeatmapError(false);
    try {
      const params = buildQueryParams();
      const res = await mapApi.getHeatmapPoints(params);
      setHeatmapPoints(res.items || []);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
      setIsHeatmapError(true);
    } finally {
      setHeatmapLoading(false);
    }
  }, [showHeatmap, buildQueryParams]);

  // Main load trigger
  useEffect(() => {
    fetchMapIncidents();
  }, [fetchMapIncidents]);

  // Listen to WebSocket incident events
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'incident.created') {
        const newInc = msg.data as any;
        setIncidents((prev) => [newInc, ...prev]);
        setTotalIncidents((c) => c + 1);
      } else if (msg.type === 'incident.updated') {
        const updInc = msg.data as any;
        setIncidents((prev) => prev.map((i) => (i.id === updInc.id ? updInc : i)));
      }
    });
    return unsubscribe;
  }, [subscribe]);

  // Heatmap toggle trigger
  useEffect(() => {
    if (showHeatmap) {
      fetchHeatmapPoints();
    } else {
      setHeatmapPoints([]);
    }
  }, [showHeatmap, fetchHeatmapPoints]);

  // Refresh handler
  const handleRefresh = () => {
    fetchMapIncidents();
    if (showHeatmap) {
      fetchHeatmapPoints();
    }
  };

  // Filter Actions
  const handleApplyFilters = (newFilters: MapFilterState) => {
    setFilterState(newFilters);
  };

  const handleClearFilters = () => {
    setFilterState({});
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
              Live Traffic Intelligence Map
            </h1>
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-mono text-slate-300 font-semibold">
              Showing {totalIncidents} incidents
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Geospatial GIS telemetry, hazard indicators, and risk density heatmaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectionStatus showWebSocket={true} />

          {/* Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer ${
              showHeatmap
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            aria-label={showHeatmap ? 'Disable Heatmap' : 'Enable Heatmap'}
          >
            <Flame className={`h-4 w-4 ${showHeatmap ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            {showHeatmap ? 'Heatmap: ACTIVE' : 'Incident Heatmap'}
          </button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || heatmapLoading}
            className="gap-1.5 font-mono text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
            aria-label="Refresh Map Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <MapFilters
        filters={filterState}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
      />

      {/* Heatmap Specific Non-Blocking Warning */}
      {isHeatmapError && showHeatmap && (
        <div className="flex items-center gap-2 rounded bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-mono text-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>No heatmap data available or heatmap service failed to load. Markers remain active.</span>
        </div>
      )}

      {/* Main Map + Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Leaflet Map Area */}
        <div className="lg:col-span-8 xl:col-span-9 w-full">
          <MapContainer
            height="620px"
            isLoading={isLoading}
            isError={isMapError}
            isEmpty={!isLoading && !isMapError && incidents.length === 0}
            emptyTitle="No incidents found in the selected area."
            emptyMessage="Adjust bounding box parameters, clear filters, or refresh the map view."
            errorMessage="Could not load map telemetry service. Check connection."
            onRetry={handleRefresh}
          >
            {/* Heatmap Layer */}
            {showHeatmap && heatmapPoints.length > 0 && (
              <HeatmapLayer points={heatmapPoints} radius={30} blur={18} />
            )}

            {/* Incident Markers */}
            {incidents.map((inc) => (
              <Marker
                key={inc.id}
                position={[inc.location.latitude, inc.location.longitude]}
                icon={createSeverityIcon(inc.severity, selectedIncident?.id === inc.id)}
                eventHandlers={{
                  click: () => setSelectedIncident(inc),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[210px] font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-200 pb-1">
                      <span className="font-bold text-slate-900 text-xs tracking-wide">
                        {inc.incidentType}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold text-white uppercase ${
                        inc.severity === 'high' ? 'bg-red-600' : inc.severity === 'medium' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {inc.severity}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className="font-semibold">{inc.status?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="font-semibold">{Math.round(inc.confidence * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Timestamp:</span>
                        <span className="text-[10px]">{formatDateTime(inc.timestamp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coordinates:</span>
                        <span>{inc.location.latitude.toFixed(4)}, {inc.location.longitude.toFixed(4)}</span>
                      </div>

                      {/* Identities (handled cleanly if null/undefined) */}
                      {inc.deviceId && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-500">Device:</span>
                          <span>{inc.deviceId}</span>
                        </div>
                      )}
                      {inc.busId && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-500">Bus:</span>
                          <span>{inc.busId}</span>
                        </div>
                      )}
                      {inc.routeId && (
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-500">Route:</span>
                          <span>{inc.routeId}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="mt-2.5 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-mono py-1 px-2 rounded cursor-pointer transition-colors font-medium text-center block"
                      aria-label="View Incident"
                    >
                      View Incident
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Map Legend Overlay */}
            <MapLegend showHeatmap={showHeatmap} />
          </MapContainer>
        </div>

        {/* Selected Incident Detail Side Panel (Desktop) / Stacked Panel (Mobile) */}
        <div className="lg:col-span-4 xl:col-span-3 w-full h-[620px]">
          <SelectedIncidentPanel
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        </div>
      </div>
    </div>
  );
};
