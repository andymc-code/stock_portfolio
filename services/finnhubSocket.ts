import type { StockData } from '../types';

type TradeHandler = (data: StockData) => void;

interface FinnhubTrade {
  s: string;  // symbol
  p: number;  // last price
  v: number;  // volume
  t: number;  // timestamp
}

interface FinnhubMessage {
  type: string;
  data?: FinnhubTrade[];
}

/**
 * Finnhub WebSocket manager for real-time trade updates.
 * Maintains a single connection, auto-reconnects, and batches updates.
 */
class FinnhubSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private subscribers = new Set<string>();
  private handlers: TradeHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private batchBuffer = new Map<string, StockData>();
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private _isConnected = false;
  private _connectionListeners: Array<(connected: boolean) => void> = [];
  private previousCloses = new Map<string, number>();

  constructor() {
    this.apiKey = import.meta.env.VITE_FINNHUB_API_KEY || '';
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /** Subscribe to connection status changes */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this._connectionListeners.push(listener);
    // Immediately notify current status
    listener(this._isConnected);
    return () => {
      this._connectionListeners = this._connectionListeners.filter(l => l !== listener);
    };
  }

  private setConnected(value: boolean) {
    if (this._isConnected !== value) {
      this._isConnected = value;
      this._connectionListeners.forEach(l => l(value));
    }
  }

  /** Register a handler that receives real-time stock data updates */
  addHandler(handler: TradeHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  /** Store previous close prices for change calculation */
  setPreviousClose(ticker: string, prevClose: number) {
    this.previousCloses.set(ticker.toUpperCase(), prevClose);
  }

  /** Connect to Finnhub WebSocket */
  connect() {
    if (!this.apiKey) {
      console.warn('⚠️ Finnhub API key missing — WebSocket disabled');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

      this.ws.onopen = () => {
        console.log('🟢 Finnhub WebSocket connected');
        this.reconnectAttempts = 0;
        this.setConnected(true);

        // Re-subscribe to all tickers
        this.subscribers.forEach(symbol => {
          this.sendSubscribe(symbol);
        });

        // Start batch flush timer (emit updates at ~1 update/sec)
        this.startBatchFlush();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: FinnhubMessage = JSON.parse(event.data);
          if (message.type === 'trade' && message.data) {
            this.processTrades(message.data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        console.log('🔴 Finnhub WebSocket disconnected');
        this.setConnected(false);
        this.stopBatchFlush();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Finnhub WebSocket error:', error);
        this.ws?.close();
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  /** Disconnect and clean up */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopBatchFlush();
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
    this.setConnected(false);
  }

  /** Subscribe to real-time trades for a ticker */
  subscribe(symbol: string) {
    const upper = symbol.toUpperCase();
    if (this.subscribers.has(upper)) return;
    this.subscribers.add(upper);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(upper);
    }
  }

  /** Unsubscribe from a ticker */
  unsubscribe(symbol: string) {
    const upper = symbol.toUpperCase();
    this.subscribers.delete(upper);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: upper }));
    }
  }

  /** Subscribe to a list of tickers, unsubscribing from ones no longer needed */
  syncSubscriptions(tickers: string[]) {
    const newSet = new Set(tickers.map(t => t.toUpperCase()));
    
    // Unsubscribe from removed tickers
    this.subscribers.forEach(existing => {
      if (!newSet.has(existing)) {
        this.unsubscribe(existing);
      }
    });

    // Subscribe to new tickers
    newSet.forEach(ticker => {
      this.subscribe(ticker);
    });
  }

  private sendSubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
  }

  private processTrades(trades: FinnhubTrade[]) {
    // Keep only the latest trade per symbol in the batch buffer
    trades.forEach(trade => {
      const ticker = trade.s.toUpperCase();
      const prevClose = this.previousCloses.get(ticker) || trade.p;
      const changeUSD = trade.p - prevClose;
      const changePercent = prevClose !== 0 ? (changeUSD / prevClose) * 100 : 0;

      this.batchBuffer.set(ticker, {
        ticker,
        price: trade.p,
        changeUSD,
        changePercent,
      });
    });
  }

  private startBatchFlush() {
    this.stopBatchFlush();
    this.batchTimer = setInterval(() => {
      if (this.batchBuffer.size === 0) return;

      // Emit all buffered updates
      this.batchBuffer.forEach((data) => {
        this.handlers.forEach(handler => handler(data));
      });
      this.batchBuffer.clear();
    }, 1000); // Flush every 1 second
  }

  private stopBatchFlush() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached. WebSocket offline.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance
export const finnhubSocket = new FinnhubSocket();
