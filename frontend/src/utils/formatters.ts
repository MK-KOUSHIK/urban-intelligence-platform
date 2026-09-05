import { UserRole } from '../types';

/**
 * Formats user technical role strings into human-readable labels.
 */
export const formatRoleName = (role?: UserRole | string | null): string => {
  if (!role) return 'Unknown Role';
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'traffic_authority':
      return 'Traffic Authority';
    case 'municipal_authority':
      return 'Municipal Authority';
    default:
      return String(role);
  }
};

/**
 * Maps HTTP status codes and network errors to user-friendly messages.
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred.';
  
  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;

    if (status === 401) {
      return typeof detail === 'string' ? detail : 'Invalid credentials or session expired.';
    }
    if (status === 403) {
      return "You don't have permission to perform this action.";
    }
    if (status === 404) {
      return 'The requested resource was not found.';
    }
    if (status === 409) {
      return 'The requested change conflicts with the current state.';
    }
    if (status === 422) {
      return 'Please check the submitted information.';
    }
    if (status >= 500) {
      return 'Unable to connect to the command center.';
    }
  }

  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || !error.response) {
    return 'Unable to connect to the command center.';
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Formats ISO date-time strings into standardized command center date-time representations.
 */
export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (_) {
    return String(dateStr);
  }
};

/**
 * Formats duration in seconds into human-readable representation (e.g. "2m 15s" or "45s").
 */
export const formatDuration = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null) return 'N/A';
  const sec = Math.max(0, Math.floor(seconds));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec > 0 ? `${min}m ${remSec}s` : `${min}m`;
};

/**
 * Formats byte counts into human-readable file size labels (e.g. "45.2 MB").
 */
export const formatFileSize = (bytes?: number | null): string => {
  if (bytes === undefined || bytes === null) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

