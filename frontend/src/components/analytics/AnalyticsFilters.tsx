import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { DateRangeParams } from '../../api/analytics';

interface AnalyticsFiltersProps {
  filters: DateRangeParams;
  onApplyFilters: (filters: DateRangeParams) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  externalError?: string | null;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  externalError = null,
}) => {
  const [localFrom, setLocalFrom] = useState<string>(filters.from || '');
  const [localTo, setLocalTo] = useState<string>(filters.to || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFromChange = (val: string) => {
    setLocalFrom(val);
    if (val && localTo && val > localTo) {
      setValidationError('From timestamp must be less than or equal to To timestamp');
    } else {
      setValidationError(null);
    }
  };

  const handleToChange = (val: string) => {
    setLocalTo(val);
    if (localFrom && val && localFrom > val) {
      setValidationError('From timestamp must be less than or equal to To timestamp');
    } else {
      setValidationError(null);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (localFrom && localTo && localFrom > localTo) {
      setValidationError('From timestamp must be less than or equal to To timestamp');
      return;
    }
    setValidationError(null);
    onApplyFilters({
      from: localFrom || undefined,
      to: localTo || undefined,
    });
  };

  const handleClear = () => {
    setLocalFrom('');
    setLocalTo('');
    setValidationError(null);
    onClearFilters();
  };

  const activeCount = (localFrom ? 1 : 0) + (localTo ? 1 : 0);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 shadow-sm backdrop-blur-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Analytics Temporal Filter
          </span>
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-400 border border-blue-500/30">
              {activeCount} active
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleApply} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="analytics-from-date" className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              From Date
            </label>
            <input
              id="analytics-from-date"
              type="datetime-local"
              aria-label="From Date"
              value={localFrom}
              onChange={(e) => handleFromChange(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden font-mono"
            />
          </div>

          <div>
            <label htmlFor="analytics-to-date" className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
              To Date
            </label>
            <input
              id="analytics-to-date"
              type="datetime-local"
              aria-label="To Date"
              value={localTo}
              onChange={(e) => handleToChange(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full text-xs font-mono"
              disabled={isLoading || !!validationError}
              aria-label="Apply Date Range"
            >
              Apply Filter
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="w-full text-xs font-mono border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isLoading}
              aria-label="Reset Date Filter"
            >
              Reset
            </Button>
          </div>
        </div>

        {(validationError || externalError) && (
          <div className="rounded bg-rose-500/10 border border-rose-500/30 p-2 text-xs font-mono text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{validationError || externalError}</span>
          </div>
        )}
      </form>
    </div>
  );
};
