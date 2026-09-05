import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { AlertFilterParams } from '../../api/alerts';

interface AlertFiltersProps {
  filters: AlertFilterParams;
  onApplyFilters: (filters: AlertFilterParams) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export const AlertFilters: React.FC<AlertFiltersProps> = ({
  filters,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<AlertFilterParams>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key: keyof AlertFilterParams, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({ ...localFilters, page: 1 });
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'page' && k !== 'pageSize' && v !== undefined && v !== ''
  ).length;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 shadow-sm backdrop-blur-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Alert Dispatch Filters
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
          aria-label={isExpanded ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
        >
          {isExpanded ? 'Hide Advanced Controls' : 'Show Advanced Controls'}
        </button>
      </div>

      <form onSubmit={handleApply} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Alert Type */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              Alert Type
            </label>
            <select
              aria-label="Filter by Alert Type"
              value={localFilters.alertType || ''}
              onChange={(e) => handleChange('alertType', e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">All Alert Types</option>
              <option value="CRITICAL_HAZARD">Critical Hazard</option>
              <option value="TRAFFIC_SPIKE">Traffic Spike</option>
              <option value="DEVICE_OFFLINE">Device Offline</option>
              <option value="CAMERA_DISCONNECT">Camera Disconnect</option>
            </select>
          </div>

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
              <option value="unread">Unread</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full text-xs font-mono"
              disabled={isLoading}
              aria-label="Apply Filters"
            >
              Apply Filters
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
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800 pt-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Incident ID
              </label>
              <input
                type="text"
                aria-label="Filter by Incident ID"
                placeholder="inc-..."
                value={localFilters.incidentId || ''}
                onChange={(e) => handleChange('incidentId', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

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
          </div>
        )}
      </form>
    </div>
  );
};
