import { useState, useCallback, useRef } from 'react';
import type { PortfolioHolding } from '../types';
import { saveUserData } from '../services/firestoreService';

/**
 * Custom hook to manage portfolio state and operations.
 * Uses refs to avoid stale closure bugs with rapid sequential updates.
 */
export const usePortfolio = (userId: string | undefined) => {
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const portfolioRef = useRef<PortfolioHolding[]>([]);

  // Keep ref in sync with state
  const updatePortfolio = (newPortfolio: PortfolioHolding[]) => {
    portfolioRef.current = newPortfolio;
    setPortfolio(newPortfolio);
  };

  const initPortfolio = useCallback((holdings: PortfolioHolding[]) => {
    portfolioRef.current = holdings;
    setPortfolio(holdings);
  }, []);

  const addStock = useCallback(async (ticker: string, shares: number, avgCost?: number, skipSave = false) => {
    if (!userId) return portfolioRef.current;

    const upperTicker = ticker.toUpperCase();
    const current = portfolioRef.current;
    const existing = current.find(p => p.ticker === upperTicker);

    let newPortfolio: PortfolioHolding[];
    if (existing) {
      // Weighted average cost calculation
      const totalShares = existing.shares + shares;
      const existingCost = (existing.avgCost || 0) * existing.shares;
      const newCost = (avgCost || 0) * shares;
      const weightedAvgCost = totalShares > 0 ? (existingCost + newCost) / totalShares : 0;

      newPortfolio = current.map(p =>
        p.ticker === upperTicker
          ? { ...p, shares: totalShares, avgCost: weightedAvgCost || p.avgCost }
          : p
      );
    } else {
      newPortfolio = [...current, { ticker: upperTicker, shares, avgCost }];
    }

    updatePortfolio(newPortfolio);
    if (!skipSave) {
      saveUserData(userId, { portfolio: newPortfolio }).catch(err => {
        console.error('Failed to save portfolio:', err);
      });
    }
    return newPortfolio;
  }, [userId]);

  const removeStock = useCallback(async (ticker: string) => {
    if (!userId) return;
    const current = portfolioRef.current;
    const newPortfolio = current.filter(p => p.ticker !== ticker);
    updatePortfolio(newPortfolio);
    saveUserData(userId, { portfolio: newPortfolio }).catch(err => {
      console.error('Failed to save portfolio removal:', err);
    });
    return newPortfolio;
  }, [userId]);

  const updateShares = useCallback(async (ticker: string, shares: number) => {
    if (!userId) return;
    const current = portfolioRef.current;
    const newPortfolio = current.map(p =>
      p.ticker === ticker ? { ...p, shares } : p
    );
    updatePortfolio(newPortfolio);
    saveUserData(userId, { portfolio: newPortfolio }).catch(err => {
      console.error('Failed to save portfolio share update:', err);
    });
    return newPortfolio;
  }, [userId]);

  const clearPortfolio = useCallback(() => {
    portfolioRef.current = [];
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
