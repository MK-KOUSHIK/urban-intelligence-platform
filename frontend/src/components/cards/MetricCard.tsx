import React, { ReactNode } from 'react';
import { Card } from '../ui/Card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}) => {
  const borderColors = {
    default: 'border-slate-200 dark:border-slate-800',
    danger: 'border-l-4 border-l-red-500 border-slate-200 dark:border-slate-800',
    warning: 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800',
    success: 'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800',
    info: 'border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800',
  };

  return (
    <Card className={borderColors[variant]}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-1 text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center text-xs font-mono">
              <span
                className={`font-semibold ${
                  trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
