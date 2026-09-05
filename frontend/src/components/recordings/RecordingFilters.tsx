import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Filter, RotateCcw, Search } from 'lucide-react';

interface RecordingFiltersProps {
  initialFilters?: {
    deviceId?: string;
    busId?: string;
    status?: string;
  };
  onApply: (filters: { deviceId?: string; busId?: string; status?: string }) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export const RecordingFilters: React.FC<RecordingFiltersProps> = ({
  initialFilters = {},
  onApply,
  onReset,
  isLoading = false,
}) => {
  const [deviceId, setDeviceId] = useState(initialFilters.deviceId || '');
  const [busId, setBusId] = useState(initialFilters.busId || '');
  const [status, setStatus] = useState(initialFilters.status || 'all');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      deviceId: deviceId.trim() || undefined,
      busId: busId.trim() || undefined,
      status: status === 'all' ? undefined : status,
    });
  };

  const handleReset = () => {
    setDeviceId('');
    setBusId('');
    setStatus('all');
    onReset();
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'uploading', label: 'uploading' },
    { value: 'uploaded', label: 'uploaded' },
    { value: 'processed', label: 'processed' },
    { value: 'completed', label: 'completed' },
    { value: 'failed', label: 'failed' },
  ];

  return (
    <form onSubmit={handleApply} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Filter className="h-3.5 w-3.5 text-blue-500" />
        <span>Recording Search & Backend Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="recordingDeviceId" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Device ID
          </label>
          <Input
            id="recordingDeviceId"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g. BUS-CAM-001"
            className="h-8 text-xs"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="recordingBusId" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Bus ID
          </label>
          <Input
            id="recordingBusId"
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            placeholder="e.g. BUS-101"
            className="h-8 text-xs"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="recordingStatus" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Status
          </label>
          <Select
            id="recordingStatus"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 text-xs"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={isLoading}
          className="h-8 text-xs gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isLoading}
          className="h-8 text-xs gap-1.5"
        >
          <Search className="h-3.5 w-3.5" /> Apply Filters
        </Button>
      </div>
    </form>
  );
};
