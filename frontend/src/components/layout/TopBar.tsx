import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatRoleName } from '../../utils/formatters';
import { Sun, Moon, LogOut, ShieldAlert, Menu, User as UserIcon } from 'lucide-react';

export interface TopBarProps {
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Drawer"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-blue-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 font-mono dark:text-slate-100 uppercase">
              Urban Intelligence Platform
            </h1>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
              Municipal Operations Command Center
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus />

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <NotificationDropdown />

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label="Toggle Color Theme"
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </Button>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                {user.username}
              </span>
              <Badge variant="info" size="sm" className="self-end text-[9px] py-0 px-1.5 mt-0.5">
                {formatRoleName(user.role)}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              className="text-xs border-slate-300 dark:border-slate-700"
              aria-label="Sign out of operator session"
            >
              Logout
            </Button>
          </div>
        ) : (
          <Badge variant="neutral" size="sm">
            Guest Operator
          </Badge>
        )}
      </div>
    </header>
  );
};
