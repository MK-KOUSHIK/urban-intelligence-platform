import React from 'react';
import { Spinner } from '../ui/Spinner';
import { Shield } from 'lucide-react';

interface AuthLoadingScreenProps {
  message?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  message = 'Checking secure session...',
}) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 shadow-xl shadow-blue-500/5 animate-pulse">
          <Shield className="h-7 w-7" />
        </div>
        
        <div className="space-y-1">
          <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase font-mono">
            Urban Intelligence
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wide">
            Traffic Command Center
          </p>
        </div>

        <div className="flex items-center gap-2.5 mt-2 text-xs text-blue-400 font-mono bg-blue-950/40 px-3.5 py-1.5 rounded-full border border-blue-800/40">
          <Spinner size="sm" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};
