import React from 'react';
import { useConnection } from '../../hooks/useConnection';
import { Tooltip } from '../ui/Tooltip';

export const ConnectionStatus: React.FC<{ showWebSocket?: boolean }> = ({ showWebSocket = true }) => {
  const { backendStatus, wsStatus } = useConnection();

  const getBackendDot = () => {
    switch (backendStatus) {
      case 'CONNECTED':
        return 'bg-emerald-500';
      case 'DISCONNECTED':
        return 'bg-red-500';
      case 'CHECKING':
        return 'bg-amber-500 animate-pulse';
    }
  };

  const getWsDot = () => {
    switch (wsStatus) {
      case 'CONNECTED':
        return 'bg-emerald-500';
      case 'DISCONNECTED':
        return 'bg-red-500';
      case 'CONNECTING':
      case 'RECONNECTING':
        return 'bg-amber-500 animate-pulse';
    }
  };

  return (
    <div className="flex items-center gap-4 text-xs font-mono">
      <Tooltip content={`Backend API: ${backendStatus}`}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full ${getBackendDot()}`} />
          <span className="font-semibold text-[11px]">API: {backendStatus}</span>
        </div>
      </Tooltip>

      <Tooltip content={`WebSocket Stream: ${wsStatus}`}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full ${getWsDot()}`} />
          <span className="font-semibold text-[11px]">LIVE: {wsStatus}</span>
        </div>
      </Tooltip>
    </div>
  );
};
