import { useState, useCallback, useRef, useEffect } from 'react';
import type { StockData, StockDataMap } from '../types';
import { fetchStockData } from '../services/stockService';
import { finnhubSocket } from '../services/finnhubSocket';

/**
 * Custom hook to manage stock data fetching, caching, and real-time WebSocket updates.
 */
export const useStockData = () => {
  const [stockData, setStockData] = useState<StockDataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const fetchingRef = useRef(false);

  // Subscribe to WebSocket connection status
  useEffect(() => {
    const unsubscribe = finnhubSocket.onConnectionChange((connected) => {
      setIsLive(connected);
    });
    return unsubscribe;
  }, []);

  // Register WebSocket trade handler — updates stockData in real-time
  useEffect(() => {
    const removeHandler = finnhubSocket.addHandler((data: StockData) => {
      setStockData(prev => {
        const existing = prev[data.ticker];
        // Only update if price actually changed
        if (existing && existing.price === data.price) return prev;
        return { ...prev, [data.ticker]: data };
      });
    });

    return removeHandler;
  }, []);

  const fetchDataForTickers = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0 || fetchingRef.current) return;

    fetchingRef.current = true;
    setError(null);

    const updatedTickers = new Set<string>();

    try {
      await fetchStockData(tickers, (stock: StockData) => {
        if (!updatedTickers.has(stock.ticker)) {
          setStockData(prev => ({ ...prev, [stock.ticker]: stock }));
          updatedTickers.add(stock.ticker);

          // Store previous close in WebSocket manager for change calculation
          const prevClose = stock.price - stock.changeUSD;
          if (prevClose > 0) {
            finnhubSocket.setPreviousClose(stock.ticker, prevClose);
          }
        }
      });

      // After initial REST fetch, connect WebSocket and sync subscriptions
      finnhubSocket.connect();
      finnhubSocket.syncSubscriptions(tickers);
    } catch (err) {
      console.error('Stock data fetch error:', err);
      if (err instanceof Error) {
        setError(`Failed to fetch stock data: ${err.message}`);
      } else {
        setError('An unknown error occurred while fetching stock data.');
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refreshAll = useCallback(async (tickers: string[]) => {
    setIsLoading(true);
    setError(null);
    await fetchDataForTickers(tickers);
    setIsLoading(false);
  }, [fetchDataForTickers]);

  const clearData = useCallback(() => {
    setStockData({});
    setError(null);
    finnhubSocket.disconnect();
  }, []);

  return {
    stockData,
    isLoading,
    isLive,
    error,
    fetchDataForTickers,
    refreshAll,
    clearData,
    setError,
  };
};
