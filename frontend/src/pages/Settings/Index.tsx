import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon, Server, Wifi } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configuration for Command Center UI theme, endpoint URLs, and system parameters."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance & Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current active palette: <span className="font-semibold uppercase font-mono">{theme}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              leftIcon={theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            >
              Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500 shrink-0" />
              <span>API BASE: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>WS URL: {import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
