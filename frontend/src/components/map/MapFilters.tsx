import React, { useState } from 'react';
import { Filter, X, RefreshCw, Calendar, Tag, AlertTriangle, Cpu, Bus as BusIcon, Route as RouteIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export interface MapFilterState {
  severity?: string;
  incidentType?: string;
  status?: string;
  from?: string;
  to?: string;
  deviceId?: string;
  busId?: string;
  routeId?: string;
}

interface MapFiltersProps {
  filters: MapFilterState;
  onApplyFilters: (filters: MapFilterState) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<MapFilterState>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key: keyof MapFilterState, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
  };

  const handleClear = () => {
    const empty: MapFilterState = {};
    setLocalFilters(empty);
    onClearFilters();
  };

  const activeCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 shadow-md backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Map Controls & Filters
          </span>
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-400 border border-blue-500/30">
              {activeCount} active
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-mono text-slate-400 hover:text-slate-200 underline focus:outline-hidden"
          aria-label={isExpanded ? "Collapse Filters" : "Expand Filters"}
        >
          {isExpanded ? 'Hide Filter Controls' : 'Show Advanced Filters'}
        </button>
      </div>

      {/* Quick Filter Strip */}
      <form onSubmit={handleApply} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Severity */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Severity
            </label>
            <select
              aria-label="Filter by Severity"
              value={localFilters.severity || ''}
              onChange={(e) => handleChange('severity', e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Incident Type */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Incident Type
            </label>
            <select
              aria-label="Filter by Incident Type"
              value={localFilters.incidentType || ''}
              onChange={(e) => handleChange('incidentType', e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Types</option>
              <option value="ACCIDENT">Accident</option>
              <option value="HAZARD">Hazard</option>
              <option value="CONGESTION">Congestion</option>
              <option value="WEAPON_DETECTED">Weapon Detected</option>
              <option value="CAMERA_MALFUNCTION">Camera Malfunction</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Status
            </label>
            <select
              aria-label="Filter by Status"
              value={localFilters.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full text-xs font-mono"
              disabled={isLoading}
              aria-label="Apply Filters"
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="w-full text-xs font-mono border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isLoading}
              aria-label="Clear Filters"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 border-t border-slate-800 pt-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                From Date
              </label>
              <input
                type="datetime-local"
                aria-label="Filter From Date"
                value={localFilters.from || ''}
                onChange={(e) => handleChange('from', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                To Date
              </label>
              <input
                type="datetime-local"
                aria-label="Filter To Date"
                value={localFilters.to || ''}
                onChange={(e) => handleChange('to', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Device ID
              </label>
              <input
                type="text"
                aria-label="Filter by Device ID"
                placeholder="dev-..."
                value={localFilters.deviceId || ''}
                onChange={(e) => handleChange('deviceId', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Bus ID
              </label>
              <input
                type="text"
                aria-label="Filter by Bus ID"
                placeholder="bus-..."
                value={localFilters.busId || ''}
                onChange={(e) => handleChange('busId', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Route ID
              </label>
              <input
                type="text"
                aria-label="Filter by Route ID"
                placeholder="rte-..."
                value={localFilters.routeId || ''}
                onChange={(e) => handleChange('routeId', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
