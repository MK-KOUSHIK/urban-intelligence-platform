import React from 'react';
import { Badge } from '../ui/Badge';

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase();

  let variant: 'danger' | 'warning' | 'success' | 'info' | 'neutral' = 'neutral';
  if (norm === 'open' || norm === 'unread') variant = 'danger';
  else if (norm === 'acknowledged' || norm === 'uploading') variant = 'warning';
  else if (norm === 'resolved' || norm === 'available' || norm === 'active') variant = 'success';

  return (
    <Badge variant={variant} size={size}>
      {status.toUpperCase()}
    </Badge>
  );
};
