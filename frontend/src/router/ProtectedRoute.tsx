import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingScreen } from '../components/common/AuthLoadingScreen';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isBackendUnavailable, restoreSession } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen message="Verifying secure session..." />;
  }

  if (isBackendUnavailable && !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-mono uppercase">
            Backend Service Unavailable
          </h2>
          <p className="text-xs text-slate-400">
            Unable to connect to the command center backend. Please check network connectivity or ensure the service is running.
          </p>
          <Button
            variant="outline"
            onClick={() => restoreSession()}
            className="flex items-center gap-2 mt-2 border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
