import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  AlertOctagon,
  Bell,
  BarChart3,
  Bus,
  Film,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { RoleGuard } from '../common/RoleGuard';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const navItems: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: '/map', label: 'Live Map', icon: <MapPin className="h-4 w-4" /> },
    { to: '/incidents', label: 'Incidents', icon: <AlertOctagon className="h-4 w-4" /> },
    { to: '/alerts', label: 'Alerts', icon: <Bell className="h-4 w-4" /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { to: '/fleet', label: 'Fleet Registry', icon: <Bus className="h-4 w-4" /> },
    { to: '/recordings', label: 'Recordings', icon: <Film className="h-4 w-4" /> },
  ];

  const adminItems: NavItem[] = [
    { to: '/admin', label: 'Admin Controls', icon: <ShieldCheck className="h-4 w-4" />, adminOnly: true },
  ];

  const bottomItems: NavItem[] = [
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside
      className={clsx(
        'flex flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 z-30',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors font-mono',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Admin-only controls section */}
        <RoleGuard allowedRoles={['admin']}>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                System Administration
              </span>
            )}
            <div className="mt-1 space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors font-mono',
                      isActive
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/10'
                    )
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        </RoleGuard>

        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors font-mono',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex border-t border-slate-200 p-2 dark:border-slate-800">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-md py-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
