import React, { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { hasRole } from '../../utils/auth';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RoleGuard conditionally renders children if the current authenticated user has an allowed role.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!hasRole(user, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
