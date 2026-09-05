import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, title, message, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-sky-500" />,
  };

  const borders = {
    success: 'border-l-4 border-l-emerald-500',
    error: 'border-l-4 border-l-red-500',
    warning: 'border-l-4 border-l-amber-500',
    info: 'border-l-4 border-l-sky-500',
  };

  return (
    <div
      className={clsx(
        'flex w-full max-w-sm items-start gap-3 rounded-md bg-white p-4 shadow-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800',
        borders[type]
      )}
    >
      <div className="shrink-0">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        {message && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
