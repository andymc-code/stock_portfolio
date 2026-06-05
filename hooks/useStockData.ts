import { useState, useCallback, useRef } from 'react';
import type { StockData, StockDataMap } from '../types';
import { fetchStockData } from '../services/geminiService';

/**
 * Custom hook to manage stock data fetching, caching, and state.
 */
export const useStockData = () => {
  const [stockData, setStockData] = useState<StockDataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

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
        }
      });
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
  }, []);

  return {
    stockData,
    isLoading,
    error,
    fetchDataForTickers,
    refreshAll,
    clearData,
    setError,
  };
};
