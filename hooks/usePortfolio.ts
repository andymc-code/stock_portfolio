import { useState, useCallback } from 'react';
import type { PortfolioHolding } from '../types';
import { saveUserData } from '../services/firestoreService';

/**
 * Custom hook to manage portfolio state and operations.
 */
export const usePortfolio = (userId: string | undefined) => {
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);

  const initPortfolio = useCallback((holdings: PortfolioHolding[]) => {
    setPortfolio(holdings);
  }, []);

  const addStock = useCallback(async (ticker: string, shares: number, avgCost?: number) => {
    if (!userId) return;

    const upperTicker = ticker.toUpperCase();
    const existing = portfolio.find(p => p.ticker === upperTicker);

    let newPortfolio: PortfolioHolding[];
    if (existing) {
      // Weighted average cost calculation
      const totalShares = existing.shares + shares;
      const existingCost = (existing.avgCost || 0) * existing.shares;
      const newCost = (avgCost || 0) * shares;
      const weightedAvgCost = totalShares > 0 ? (existingCost + newCost) / totalShares : 0;

      newPortfolio = portfolio.map(p =>
        p.ticker === upperTicker
          ? { ...p, shares: totalShares, avgCost: weightedAvgCost || p.avgCost }
          : p
      );
    } else {
      newPortfolio = [...portfolio, { ticker: upperTicker, shares, avgCost }];
    }

    setPortfolio(newPortfolio);
    await saveUserData(userId, { portfolio: newPortfolio });
    return newPortfolio;
  }, [userId, portfolio]);

  const removeStock = useCallback(async (ticker: string) => {
    if (!userId) return;
    const newPortfolio = portfolio.filter(p => p.ticker !== ticker);
    setPortfolio(newPortfolio);
    await saveUserData(userId, { portfolio: newPortfolio });
    return newPortfolio;
  }, [userId, portfolio]);

  const updateShares = useCallback(async (ticker: string, shares: number) => {
    if (!userId) return;
    const newPortfolio = portfolio.map(p =>
      p.ticker === ticker ? { ...p, shares } : p
    );
    setPortfolio(newPortfolio);
    await saveUserData(userId, { portfolio: newPortfolio });
    return newPortfolio;
  }, [userId, portfolio]);

  const clearPortfolio = useCallback(() => {
    setPortfolio([]);
  }, []);

  return {
    portfolio,
    initPortfolio,
    addStock,
    removeStock,
    updateShares,
    clearPortfolio,
  };
};
