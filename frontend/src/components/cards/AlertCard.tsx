import React from 'react';
import { Card } from '../ui/Card';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Alert } from '../../types';
import { Bell, Clock } from 'lucide-react';

export interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick }) => {
  return (
    <Card
      className="cursor-pointer border-l-4 border-l-amber-500 transition-transform hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 dark:text-slate-200">
            {alert.alertType}
          </span>
        </div>
        <StatusBadge status={alert.status} size="sm" />
      </div>

      <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
        {alert.message}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs">
        <SeverityBadge severity={alert.severity} size="sm" />
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </Card>
  );
};
