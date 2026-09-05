import { User, UserRole } from '../types';

export const TOKEN_KEY = 'urban_intelligence_token';
export const USER_KEY = 'urban_intelligence_user';

/**
 * Checks whether a user has one of the allowed roles.
 */
export const hasRole = (user: User | null, allowedRoles: UserRole[]): boolean => {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Checks if user is an administrator.
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};
