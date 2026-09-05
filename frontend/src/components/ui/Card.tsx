import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const baseStyles = 'rounded-lg bg-white p-5 transition-shadow dark:bg-slate-900';

  const variants = {
    default: 'border border-slate-200 shadow-xs dark:border-slate-800',
    outline: 'border border-slate-300 dark:border-slate-700',
    flat: 'bg-slate-50 dark:bg-slate-800/50',
  };

  return (
    <div className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={twMerge('mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h3 className={twMerge('text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={twMerge('space-y-3', className)} {...props}>
    {children}
  </div>
);
