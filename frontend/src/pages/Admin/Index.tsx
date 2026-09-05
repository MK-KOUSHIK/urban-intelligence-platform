import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ShieldCheck, Key, UserCheck, Settings } from 'lucide-react';
import { RoleGuard } from '../../components/common/RoleGuard';

export const AdminPage: React.FC = () => {
  return (
    <RoleGuard
      allowedRoles={['admin']}
      fallback={
        <div className="flex h-96 items-center justify-center">
          <p className="text-red-400 font-mono text-sm">Access Denied: Administrator role required.</p>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono uppercase">
            System Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Administrative controls, API credentials, and platform security management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="outline" className="border-slate-800 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Key className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-200">Device API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Manage Android edge sensing device authentication credentials.</p>
            </CardContent>
          </Card>

          <Card variant="outline" className="border-slate-800 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-200">Operator Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Manage municipal authority user profiles and role assignments.</p>
            </CardContent>
          </Card>

          <Card variant="outline" className="border-slate-800 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Settings className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-200">Platform Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Configure global incident thresholds and alert propagation rules.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
};
