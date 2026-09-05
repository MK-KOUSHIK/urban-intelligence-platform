import React, { ReactNode } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, onReset }) => {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
          <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Filter Parameters</span>
        </div>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Reset
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
};
