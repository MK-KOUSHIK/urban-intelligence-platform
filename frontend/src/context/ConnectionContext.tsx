import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { BackendConnectionStatus, WebSocketConnectionStatus } from '../types';
import { authApi } from '../api/auth';
import { webSocketService, WebSocketMessage, WebSocketListener } from '../services/websocket';
import { AuthContext } from './AuthContext';

interface ConnectionContextType {
  backendStatus: BackendConnectionStatus;
  wsStatus: WebSocketConnectionStatus;
  checkBackendStatus: () => Promise<void>;
  subscribe: (listener: WebSocketListener) => () => void;
}

export const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>('CHECKING');
  const [wsStatus, setWsStatus] = useState<WebSocketConnectionStatus>(webSocketService.getStatus());

  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;

  const checkBackendStatus = async () => {
    setBackendStatus('CHECKING');
    try {
      await authApi.getHealth();
      setBackendStatus('CONNECTED');
    } catch {
      setBackendStatus('DISCONNECTED');
    }
  };

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket status changes
  useEffect(() => {
    const unsub = webSocketService.subscribeStatus((status) => {
      setWsStatus(status);
    });
    return unsub;
  }, []);

  // Manage WebSocket connection based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      webSocketService.connect();
    } else {
      webSocketService.disconnect();
    }

    return () => {
      // Clean shutdown when Provider unmounts
      webSocketService.disconnect();
    };
  }, [isAuthenticated]);

  const subscribe = (listener: WebSocketListener) => {
    return webSocketService.subscribe(listener);
  };

  return (
    <ConnectionContext.Provider value={{ backendStatus, wsStatus, checkBackendStatus, subscribe }}>
      {children}
    </ConnectionContext.Provider>
  );
};
