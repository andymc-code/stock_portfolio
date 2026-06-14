import { useState, useEffect, useRef, useCallback } from 'react';
import type { StockSignal } from '../types';
import { finnhubSocket } from '../services/finnhubSocket';
import type { MarketMover } from '../services/marketService';

interface HistoricalStats {
  avgVolume20D: number;
  high52W: number;
  low52W: number;
  prevClose: number;
  estimatedIV: number;
}

/**
 * Custom hook to calculate real-time Heat Scores and attention signals.
 *
 * Key improvements over v1:
 * - Uses the mover's actual changePercent to seed volatility more accurately
 * - High-Attention triggers when score > 70 OR 2+ triggers fire (was all-3)
 * - Stagnant threshold raised to heatScore < 25 for better visual separation
 * - Heat Score formula uses exponential curves for more spread
 */
export const useSignals = (movers: MarketMover[]) => {
  const [signals, setSignals] = useState<{ [ticker: string]: StockSignal }>({});
  const statsRef = useRef<{ [ticker: string]: HistoricalStats }>({});
  const signalsRef = useRef<{ [ticker: string]: StockSignal }>({});

  // Seed historical base stats from mover data
  useEffect(() => {
    if (movers.length === 0) return;

    const newStats = { ...statsRef.current };
    let changed = false;

    movers.forEach(mover => {
      const ticker = mover.ticker.toUpperCase();
      if (!newStats[ticker]) {
        // Use the actual change percent to estimate daily volatility
        const absChange = Math.abs(mover.changePercent);

        // Seed the 20d avg volume slightly below current volume for gainers/losers
        // (they are on the movers list BECAUSE volume is unusual today)
        const avgVol = mover.volume * (0.3 + Math.random() * 0.4); // 30-70% of today's vol

        // 52-week range: use price + change to estimate proximity
        // Gainers with huge % moves are likely near 52w highs
        const high52W = absChange > 20
          ? mover.price * (1.0 + Math.random() * 0.05) // Very close to high
          : mover.price * (1.05 + Math.random() * 0.4);
        const low52W = mover.price * (0.4 + Math.random() * 0.3);

        // Estimated IV correlates with how much the stock is actually moving
        const estimatedIV = Math.min(15 + absChange * 1.5 + Math.random() * 15, 80);

        newStats[ticker] = {
          avgVolume20D: avgVol,
          high52W,
          low52W,
          prevClose: mover.price - mover.changeUSD,
          estimatedIV,
        };
        changed = true;
      }
    });

    if (changed) {
      statsRef.current = newStats;
    }
  }, [movers]);

  const calculateSignal = useCallback((ticker: string, currentPrice: number, currentVolume: number, changePercent?: number): StockSignal => {
    const stats = statsRef.current[ticker] || {
      avgVolume20D: currentVolume || 1000000,
      high52W: currentPrice * 1.3,
      low52W: currentPrice * 0.7,
      prevClose: currentPrice,
      estimatedIV: 25,
    };

    // --- Metrics ---
    const volumeRatio = stats.avgVolume20D > 0 ? currentVolume / stats.avgVolume20D : 1;
    const distToHigh = stats.high52W > 0 ? Math.abs((currentPrice - stats.high52W) / stats.high52W) * 100 : 999;
    const distToLow = stats.low52W > 0 ? Math.abs((currentPrice - stats.low52W) / stats.low52W) * 100 : 999;
    const distTo52wExtreme = Math.min(distToHigh, distToLow);

    // Use changePercent if available, otherwise calculate from prevClose
    const dailyRange = changePercent !== undefined
      ? Math.abs(changePercent)
      : (stats.prevClose > 0 ? (Math.abs(currentPrice - stats.prevClose) / stats.prevClose) * 100 : 0);

    // --- Triggers (boolean flags) ---
    const unusualVolume = volumeRatio > 1.8;   // Lowered from 2.0 for better sensitivity
    const nearExtreme = distTo52wExtreme <= 3;  // Widened from 2% to 3%
    const volatilitySpike = dailyRange > 5 || stats.estimatedIV > 40;

    // --- Heat Score (1–100) with exponential scaling ---
    // Volume contribution (40 points max) — exponential curve for dramatic separation
    const volRaw = Math.min(volumeRatio / 2.5, 1);
    const volPoints = Math.pow(volRaw, 0.7) * 40;

    // Proximity to 52w extreme (30 points max) — sharp cutoff below 5%
    const extremeRaw = distTo52wExtreme <= 3 ? 1 : Math.max(0, 1 - (distTo52wExtreme - 3) / 12);
    const extremePoints = Math.pow(extremeRaw, 0.6) * 30;

    // Volatility / Daily Range (30 points max) — rewards big movers
    const volSpikeRaw = Math.min(dailyRange / 8, 1);
    const volSpikePoints = Math.pow(volSpikeRaw, 0.7) * 30;

    const heatScore = Math.max(1, Math.min(Math.round(volPoints + extremePoints + volSpikePoints), 100));

    // --- Attention Classification ---
    // High Attention: heatScore > 70 OR at least 2 of 3 triggers fire
    const triggerCount = [unusualVolume, nearExtreme, volatilitySpike].filter(Boolean).length;
    const isHighAttention = heatScore > 70 || triggerCount >= 2;

    // Stagnant: low heat AND barely moving
    const isStagnant = heatScore < 25 && dailyRange < 1.0;

    return {
      ticker,
      heatScore,
      isHighAttention,
      isStagnant,
      triggers: { unusualVolume, nearExtreme, volatilitySpike },
      metrics: { volumeRatio, distTo52wExtreme, dailyRange },
    };
  }, []);

  // Listen to WebSocket and recalculate
  useEffect(() => {
    if (movers.length === 0) return;

    const tickers = movers.map(m => m.ticker);
    finnhubSocket.syncSubscriptions(tickers);

    // Initial signals from mover data
    const initialSignals: { [ticker: string]: StockSignal } = {};
    movers.forEach(mover => {
      const ticker = mover.ticker.toUpperCase();
      initialSignals[ticker] = calculateSignal(ticker, mover.price, mover.volume, mover.changePercent);
    });
    signalsRef.current = initialSignals;
    setSignals(initialSignals);

    // Live updates
    const unsubscribe = finnhubSocket.addHandler((update) => {
      const ticker = update.ticker.toUpperCase();
      const mover = movers.find(m => m.ticker.toUpperCase() === ticker);
      if (!mover) return;

      const newSignal = calculateSignal(ticker, update.price, mover.volume, update.changePercent);
      const updated = { ...signalsRef.current, [ticker]: newSignal };
      signalsRef.current = updated;
      setSignals(updated);
    });

    return () => { unsubscribe(); };
  }, [movers, calculateSignal]);

  return { signals };
};
