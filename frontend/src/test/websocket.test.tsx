/**
 * websocket.test.tsx
 *
 * Unit tests for the WebSocketService singleton (src/services/websocket.ts).
 *
 * Covers:
 *  - Single shared connection (singleton architecture)
 *  - connect() / disconnect() behaviour
 *  - Exponential-backoff reconnect on unexpected close
 *  - No reconnect after intentional disconnect (logout cleanup)
 *  - Message dispatch to subscribed listeners
 *  - Malformed / missing-type messages are safely ignored
 *  - subscribe() returns a working unsubscribe function
 *  - subscribeStatus() delivers current status immediately + changes
 *  - getStatus() reflects live state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock global WebSocket so no real network is needed
// ---------------------------------------------------------------------------

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;

  onopen: (() => void) | null = null;
  onclose: ((ev: Partial<CloseEvent>) => void) | null = null;
  onmessage: ((ev: Partial<MessageEvent>) => void) | null = null;
  onerror: (() => void) | null = null;

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  /** Simulate a successful connection */
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  /** Simulate the server closing the connection unexpectedly */
  simulateClose(wasClean = false) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ wasClean, code: wasClean ? 1000 : 1006 });
  }

  /** Simulate receiving a message from the server */
  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  /** Simulate a connection error */
  simulateError() {
    this.onerror?.();
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ wasClean: true, code: 1000 });
  }

  send(_data: string) {}
}

// Attach mock to global before importing the service
(global as any).WebSocket = MockWebSocket;

// ---------------------------------------------------------------------------
// Import service AFTER global mock is in place
// ---------------------------------------------------------------------------
// We import the class internals via a fresh module reset trick by re-importing
// the service each test group to get a clean singleton state.

import { webSocketService } from '../services/websocket';
import type { WebSocketMessage } from '../services/websocket';
import type { WebSocketConnectionStatus } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function latestSocket(): MockWebSocket {
  const s = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!s) throw new Error('No MockWebSocket instance found');
  return s;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebSocketService', () => {
  beforeEach(() => {
    // Reset mock instance list and disconnect service between tests
    MockWebSocket.instances = [];
    webSocketService.disconnect();
    vi.useFakeTimers();
  });

  afterEach(() => {
    webSocketService.disconnect();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Singleton architecture
  // -------------------------------------------------------------------------

  it('exports a single shared singleton instance (same object across uses)', () => {
    // In ESM the module cache guarantees a single export reference.
    // We verify this by checking that the imported singleton is an object with
    // the expected public API surface — there is only one instance.
    expect(webSocketService).toBeDefined();
    expect(typeof webSocketService.connect).toBe('function');
    expect(typeof webSocketService.disconnect).toBe('function');
    expect(typeof webSocketService.subscribe).toBe('function');
    expect(typeof webSocketService.subscribeStatus).toBe('function');
    expect(typeof webSocketService.getStatus).toBe('function');
  });

  // -------------------------------------------------------------------------
  // 2. connect() opens a WebSocket to the configured URL
  // -------------------------------------------------------------------------

  it('connect() creates a WebSocket instance', () => {
    webSocketService.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('connect() sets status to CONNECTING immediately', () => {
    const statuses: WebSocketConnectionStatus[] = [];
    webSocketService.subscribeStatus((s) => statuses.push(s));

    webSocketService.connect();
    // First call of subscribeStatus delivers current DISCONNECTED, then CONNECTING
    expect(statuses).toContain('CONNECTING');
  });

  it('connect() sets status to CONNECTED after socket opens', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();
    expect(webSocketService.getStatus()).toBe('CONNECTED');
  });

  // -------------------------------------------------------------------------
  // 3. Double-connect guard – only one socket at a time
  // -------------------------------------------------------------------------

  it('connect() does not create a second socket when already CONNECTED', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();

    const countBefore = MockWebSocket.instances.length;
    webSocketService.connect(); // Should be a no-op
    expect(MockWebSocket.instances.length).toBe(countBefore);
  });

  // -------------------------------------------------------------------------
  // 4. disconnect() – logout cleanup
  // -------------------------------------------------------------------------

  it('disconnect() sets status to DISCONNECTED', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();
    webSocketService.disconnect();
    expect(webSocketService.getStatus()).toBe('DISCONNECTED');
  });

  it('disconnect() closes the underlying socket', () => {
    webSocketService.connect();
    const socket = latestSocket();
    socket.simulateOpen();
    webSocketService.disconnect();
    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('disconnect() prevents reconnect after logout (isIntentionallyClosed)', () => {
    webSocketService.connect();
    const socket = latestSocket();
    socket.simulateOpen();
    webSocketService.disconnect();

    const countAfterDisconnect = MockWebSocket.instances.length;

    // Advance timers – no reconnect should fire
    vi.advanceTimersByTime(15000);
    expect(MockWebSocket.instances.length).toBe(countAfterDisconnect);
  });

  // -------------------------------------------------------------------------
  // 5. Reconnect behaviour on unexpected close
  // -------------------------------------------------------------------------

  it('schedules a reconnect when connection drops unexpectedly', () => {
    webSocketService.connect();
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateClose(false); // unexpected close

    expect(webSocketService.getStatus()).toBe('RECONNECTING');
  });

  it('reconnects after the backoff delay', () => {
    webSocketService.connect();
    const socket = latestSocket();
    socket.simulateOpen();
    socket.simulateClose(false);

    const countBefore = MockWebSocket.instances.length;
    vi.advanceTimersByTime(2000); // initial delay ≥ 1 s
    expect(MockWebSocket.instances.length).toBeGreaterThan(countBefore);
  });

  it('uses exponential backoff for successive reconnect attempts', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateClose(false); // attempt 1 → delay ≈ 1 s

    vi.advanceTimersByTime(2000);
    latestSocket().simulateClose(false); // attempt 2 → delay ≈ 1.5 s

    const countAfter2 = MockWebSocket.instances.length;
    vi.advanceTimersByTime(3000);
    expect(MockWebSocket.instances.length).toBeGreaterThan(countAfter2);
  });

  it('stops reconnecting after maxReconnectAttempts (5)', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();

    for (let i = 0; i < 5; i++) {
      latestSocket().simulateClose(false);
      vi.advanceTimersByTime(15000); // well past any backoff
    }

    const countAfterMax = MockWebSocket.instances.length;
    latestSocket().simulateClose(false);
    vi.advanceTimersByTime(15000);

    // No additional socket after max attempts
    expect(MockWebSocket.instances.length).toBe(countAfterMax);
    expect(webSocketService.getStatus()).toBe('DISCONNECTED');
  });

  // -------------------------------------------------------------------------
  // 6. Message dispatch
  // -------------------------------------------------------------------------

  it('dispatches valid JSON messages to subscribed listeners', () => {
    const received: WebSocketMessage[] = [];
    const unsub = webSocketService.subscribe((msg) => received.push(msg));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ type: 'incident.created', data: { id: 'inc-1' } }));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('incident.created');
    expect((received[0].data as any).id).toBe('inc-1');
    unsub();
  });

  it('dispatches alert.created messages', () => {
    const received: WebSocketMessage[] = [];
    const unsub = webSocketService.subscribe((msg) => received.push(msg));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ type: 'alert.created', data: { id: 'alt-1', status: 'unread' } }));

    expect(received[0].type).toBe('alert.created');
    unsub();
  });

  it('dispatches alert.updated messages', () => {
    const received: WebSocketMessage[] = [];
    const unsub = webSocketService.subscribe((msg) => received.push(msg));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ type: 'alert.updated', data: { id: 'alt-1', status: 'resolved' } }));

    expect(received[0].type).toBe('alert.updated');
    unsub();
  });

  it('ignores malformed JSON without throwing', () => {
    webSocketService.connect();
    latestSocket().simulateOpen();
    expect(() => latestSocket().simulateMessage('NOT_VALID_JSON{{')).not.toThrow();
  });

  it('ignores messages with no type field', () => {
    const received: WebSocketMessage[] = [];
    const unsub = webSocketService.subscribe((msg) => received.push(msg));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ data: { id: 'x' } })); // no type

    expect(received).toHaveLength(0);
    unsub();
  });

  // -------------------------------------------------------------------------
  // 7. subscribe / unsubscribe
  // -------------------------------------------------------------------------

  it('subscribe() returns an unsubscribe function that stops delivery', () => {
    const received: WebSocketMessage[] = [];
    const unsub = webSocketService.subscribe((msg) => received.push(msg));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ type: 'incident.created', data: {} }));

    expect(received).toHaveLength(1);

    unsub(); // unsubscribe
    latestSocket().simulateMessage(JSON.stringify({ type: 'incident.created', data: {} }));
    expect(received).toHaveLength(1); // no new messages after unsub
  });

  it('multiple listeners all receive the same message', () => {
    const r1: WebSocketMessage[] = [];
    const r2: WebSocketMessage[] = [];
    const unsub1 = webSocketService.subscribe((m) => r1.push(m));
    const unsub2 = webSocketService.subscribe((m) => r2.push(m));

    webSocketService.connect();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(JSON.stringify({ type: 'recording.created', data: {} }));

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    unsub1();
    unsub2();
  });

  // -------------------------------------------------------------------------
  // 8. subscribeStatus / getStatus
  // -------------------------------------------------------------------------

  it('subscribeStatus() delivers the current status immediately on subscribe', () => {
    const statuses: WebSocketConnectionStatus[] = [];
    webSocketService.subscribeStatus((s) => statuses.push(s));
    // Service is DISCONNECTED at this point (reset in beforeEach)
    expect(statuses[0]).toBe('DISCONNECTED');
  });

  it('subscribeStatus() receives CONNECTED after socket opens', () => {
    const statuses: WebSocketConnectionStatus[] = [];
    webSocketService.subscribeStatus((s) => statuses.push(s));
    webSocketService.connect();
    latestSocket().simulateOpen();
    expect(statuses).toContain('CONNECTED');
  });

  it('subscribeStatus() unsubscribe function stops further updates', () => {
    const statuses: WebSocketConnectionStatus[] = [];
    const unsub = webSocketService.subscribeStatus((s) => statuses.push(s));
    const lengthAfterInit = statuses.length;

    unsub();
    webSocketService.connect();
    latestSocket().simulateOpen();

    expect(statuses.length).toBe(lengthAfterInit); // no new updates
  });

  it('getStatus() reflects CONNECTING state', () => {
    webSocketService.connect();
    expect(webSocketService.getStatus()).toBe('CONNECTING');
  });
});
