import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, width, height, style, ...props }) => {
  return (
    <div
      className={clsx('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
};
