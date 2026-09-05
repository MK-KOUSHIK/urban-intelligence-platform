import { Incident, Alert, Recording, WebSocketConnectionStatus } from '../types';

export type WebSocketMessageType =
  | 'incident.created'
  | 'incident.updated'
  | 'alert.created'
  | 'alert.updated'
  | 'recording.created'
  | 'recording.updated';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType | string;
  data: T;
}

export type WebSocketListener = (message: WebSocketMessage) => void;
export type StatusListener = (status: WebSocketConnectionStatus) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private status: WebSocketConnectionStatus = 'DISCONNECTED';
  private listeners: Set<WebSocketListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private initialReconnectDelayMs = 1000;
  private maxReconnectDelayMs = 10000;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;

  private wsUrl: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events';

  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: WebSocketConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus);
        } catch (err) {
          console.error('Error in WS status listener:', err);
        }
      });
    }
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return; // Already connecting or connected
    }

    this.isIntentionallyClosed = false;
    this.setStatus('CONNECTING');

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.socket = null;
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };

      this.socket.onerror = () => {
        if (this.status === 'CONNECTING') {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      this.socket = null;
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('DISCONNECTED');
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('DISCONNECTED');
      return;
    }

    this.setStatus('RECONNECTING');
    this.reconnectAttempts += 1;

    const delay = Math.min(
      this.initialReconnectDelayMs * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    );

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(rawData: any): void {
    try {
      const parsed: WebSocketMessage = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (!parsed || typeof parsed !== 'object' || !parsed.type) {
        return; // Safe ignore malformed payload
      }

      this.listeners.forEach((listener) => {
        try {
          listener(parsed);
        } catch (err) {
          console.error('Error handling WebSocket event listener:', err);
        }
      });
    } catch (err) {
      // Safe ignore invalid JSON
    }
  }

  public subscribe(listener: WebSocketListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Send current status immediately
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }
}

export const webSocketService = new WebSocketService();
