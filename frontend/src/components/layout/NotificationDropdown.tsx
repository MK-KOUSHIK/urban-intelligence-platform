import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { alertsApi } from '../../api/alerts';
import { Alert } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../utils/formatters';

import { useConnection } from '../../hooks/useConnection';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { subscribe } = useConnection();

  const fetchUnreadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await alertsApi.getAlerts({ status: 'unread', pageSize: 5 });
      setUnreadAlerts(data.items);
      setUnreadCount(data.total);
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadAlerts();

    // Subscribe to central WebSocket stream for live alert updates (No Polling)
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'alert.created') {
        const newAlert = msg.data as Alert;
        if (newAlert && newAlert.status === 'unread') {
          setUnreadAlerts((prev) => {
            if (prev.some((a) => a.id === newAlert.id)) return prev;
            return [newAlert, ...prev].slice(0, 5);
          });
          setUnreadCount((prev) => prev + 1);
        }
      } else if (msg.type === 'alert.updated') {
        const updatedAlert = msg.data as Alert;
        if (updatedAlert) {
          if (updatedAlert.status !== 'unread') {
            setUnreadAlerts((prev) => {
              const exists = prev.some((a) => a.id === updatedAlert.id);
              if (exists) {
                setUnreadCount((c) => Math.max(0, c - 1));
                return prev.filter((a) => a.id !== updatedAlert.id);
              }
              return prev;
            });
          } else {
            setUnreadAlerts((prev) =>
              prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
            );
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAlertClick = (alert: Alert) => {
    setIsOpen(false);
    if (alert.incidentId) {
      navigate(`/incidents/${alert.incidentId}`);
    } else {
      navigate('/alerts');
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/alerts');
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchUnreadAlerts();
        }}
        aria-label="Notification Center"
        aria-expanded={isOpen}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-0 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge variant="danger" size="sm">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <button
              onClick={fetchUnreadAlerts}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
              title="Refresh Notifications"
              aria-label="Refresh Notifications"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && unreadAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-xs text-rose-500 dark:text-rose-400">
                {error}
              </div>
            ) : unreadAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <span>All clear! No unread notifications.</span>
              </div>
            ) : (
              unreadAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="group flex flex-col gap-1.5 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityBadgeVariant(alert.severity)} size="sm">
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {alert.alertType ? alert.alertType.replace(/_/g, ' ') : 'ALERT'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(alert.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="font-mono">
                      {alert.incidentId ? `Incident: ${alert.incidentId.slice(0, 8)}...` : 'System Alert'}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline font-mono">
                      View <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-800/50 text-center">
            <button
              onClick={handleViewAll}
              className="w-full text-center py-1.5 text-xs font-mono font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              View Alert Notification Center &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
