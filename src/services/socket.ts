import { soundEngine } from '../utils/audio.js';

export type SocketStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

type MessageHandler = (data: any) => void;

class MarketSocketService {
  private ws: WebSocket | null = null;
  private status: SocketStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private subscribedSymbols: Set<string> = new Set();

  constructor() {
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.setStatus('RECONNECTING');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;

        // Resubscribe symbols
        if (this.subscribedSymbols.size > 0) {
          this.send({
            type: 'subscribe',
            symbols: Array.from(this.subscribedSymbols),
          });
        }

        // Start ping/pong heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          this.send({ type: 'ping' });
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch(msg.type, msg);

          // If new actionable alert, automatically trigger audio synthesizer
          if (msg.type === 'alert_new') {
            soundEngine.triggerSignalAlert(msg.id, msg.symbol, msg.direction);
          }
        } catch (err) {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('DISCONNECTED');
        this.ws?.close();
      };
    } catch (e) {
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Reconnection intervals: 1s, 2s, 5s, 10s, 30s as per specification #80
    const delays = [1000, 2000, 5000, 10000, 30000];
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
    this.reconnectAttempts++;

    this.setStatus('RECONNECTING');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(status: SocketStatus) {
    this.status = status;
    this.dispatch('connection_change', { status });
  }

  public getStatus(): SocketStatus {
    return this.status;
  }

  public subscribe(symbols: string[]) {
    symbols.forEach(s => this.subscribedSymbols.add(s.toUpperCase()));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbols });
    }
  }

  public unsubscribe(symbols: string[]) {
    symbols.forEach(s => this.subscribedSymbols.delete(s.toUpperCase()));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbols });
    }
  }

  public on(eventType: string, handler: MessageHandler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    return () => this.off(eventType, handler);
  }

  public off(eventType: string, handler: MessageHandler) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private dispatch(eventType: string, data: any) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(h => {
        try {
          h(data);
        } catch (e) {
          console.warn('Socket handler error:', e);
        }
      });
    }
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const socketService = new MarketSocketService();
