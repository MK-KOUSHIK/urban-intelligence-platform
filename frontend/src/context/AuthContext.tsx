import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api/auth';
import { TOKEN_KEY, USER_KEY } from '../utils/auth';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendUnavailable: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState<boolean>(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setIsBackendUnavailable(false);
  }, []);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      setIsBackendUnavailable(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      setToken(savedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setIsBackendUnavailable(false);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        // Token is invalid/expired
        logout();
      } else if (!error.response || error.code === 'ERR_NETWORK') {
        // Network or server error - represent backend as unavailable
        setIsBackendUnavailable(true);
      } else {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Listen for centralized 401 unauthorized events from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsBackendUnavailable(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        isLoading,
        isBackendUnavailable,
        login,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
