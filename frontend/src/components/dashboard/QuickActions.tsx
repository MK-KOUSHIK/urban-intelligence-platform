import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MapPin, AlertOctagon, Bell, BarChart3, Bus } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    { label: 'View Live Map', path: '/map', icon: <MapPin className="h-4 w-4 text-blue-400" /> },
    { label: 'View Incidents', path: '/incidents', icon: <AlertOctagon className="h-4 w-4 text-red-400" /> },
    { label: 'View Alerts', path: '/alerts', icon: <Bell className="h-4 w-4 text-amber-400" /> },
    { label: 'View Analytics', path: '/analytics', icon: <BarChart3 className="h-4 w-4 text-emerald-400" /> },
    { label: 'View Fleet', path: '/fleet', icon: <Bus className="h-4 w-4 text-purple-400" /> },
  ];

  return (
    <Card className="border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Operational Quick Actions
          </h3>
          <p className="text-[11px] text-slate-400">
            Direct navigation controls for municipal command center feeds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              leftIcon={action.icon}
              className="text-xs font-mono border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};
