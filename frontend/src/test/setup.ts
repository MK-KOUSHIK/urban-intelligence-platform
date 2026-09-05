import '@testing-library/jest-dom';

// Global ResizeObserver mock for Recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Global WebSocket stub so ConnectionContext does not throw in jsdom tests.
// The stub does nothing — it just satisfies the 'new WebSocket(url)' call made
// by WebSocketService.connect() when an authenticated user is present.
if (!(global as any).WebSocket) {
  (global as any).WebSocket = class StubWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    onopen: any = null;
    onclose: any = null;
    onmessage: any = null;
    onerror: any = null;
    constructor(_url: string) {}
    close() { this.readyState = 3; }
    send(_data: any) {}
  };
}
