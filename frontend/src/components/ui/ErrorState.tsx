import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
}


export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message,
  description,
  onRetry,
}) => {
  const displayMessage = message ?? description ?? 'An unexpected error occurred while communicating with the backend services.';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/50 dark:bg-red-950/20">
      <div className="mb-3 rounded-full bg-red-100 dark:bg-red-900/50 p-3 text-red-600 dark:text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">{title}</h3>
      <p className="mt-1 text-xs text-red-700 dark:text-red-400 max-w-md">{displayMessage}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="danger" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} aria-label="Retry">
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};
