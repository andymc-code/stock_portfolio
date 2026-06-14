import { useState, useEffect, useRef, useCallback } from 'react';
import type { StockSignal } from '../types';
import { finnhubSocket } from '../services/finnhubSocket';
import type { MarketMover } from '../services/marketService';

interface HistoricalStats {
  avgVolume20D: number;
  high52W: number;
  low52W: number;
  prevClose: number;
  estimatedIV: number; // Implied / historical volatility estimate
}

/**
 * Custom hook to calculate and manage real-time active signals and Heat Scores for a list of stocks.
 */
export const useSignals = (movers: MarketMover[]) => {
  const [signals, setSignals] = useState<{ [ticker: string]: StockSignal }>({});
  const statsRef = useRef<{ [ticker: string]: HistoricalStats }>({});
  const signalsRef = useRef<{ [ticker: string]: StockSignal }>({});

  // Initialize historical base stats for tickers to calculate signal metrics
  useEffect(() => {
    if (movers.length === 0) return;

    const newStats = { ...statsRef.current };
    let changed = false;

    movers.forEach(mover => {
      const ticker = mover.ticker.toUpperCase();
      if (!newStats[ticker]) {
        // Seed realistic daily statistics around the current mover data
        const avgVol = mover.volume * (0.5 + Math.random()); // 20d average volume
        const high52W = mover.price * (1.1 + Math.random() * 0.4);
        const low52W = mover.price * (0.5 + Math.random() * 0.4);
        const estimatedIV = 15 + Math.random() * 45; // 15% to 60% range

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

  // Compute Signal details for a ticker based on current price/volume and base stats
  const calculateSignal = useCallback((ticker: string, currentPrice: number, currentVolume: number): StockSignal => {
    const stats = statsRef.current[ticker] || {
      avgVolume20D: currentVolume || 1000000,
      high52W: currentPrice * 1.3,
      low52W: currentPrice * 0.7,
      prevClose: currentPrice,
      estimatedIV: 25,
    };

    const volumeRatio = stats.avgVolume20D > 0 ? currentVolume / stats.avgVolume20D : 1;
    const distToHigh = stats.high52W > 0 ? Math.abs((currentPrice - stats.high52W) / stats.high52W) * 100 : 999;
    const distToLow = stats.low52W > 0 ? Math.abs((currentPrice - stats.low52W) / stats.low52W) * 100 : 999;
    const distTo52wExtreme = Math.min(distToHigh, distToLow);

    // Dynamic daily range based on current deviation from previous close
    const deviation = Math.abs(currentPrice - stats.prevClose);
    const dailyRange = stats.prevClose > 0 ? (deviation / stats.prevClose) * 100 : 0;

    // Triggers
    const unusualVolume = volumeRatio > 2.0; // Vol > 200% of 20-day average
    const nearExtreme = distTo52wExtreme <= 2.0; // within 2% of 52w high/low
    const volatilitySpike = dailyRange > 4.5 || stats.estimatedIV > 45;

    // Heat Score Calculation (1 to 100)
    // 35% Volume, 35% Proximity to 52w extremes, 30% Volatility
    const volPoints = Math.min((volumeRatio / 2.0) * 35, 35);
    const extremePoints = distTo52wExtreme <= 2.0 ? 35 : Math.max(0, (1 - (distTo52wExtreme - 2) / 8) * 35);
    const volSpikePoints = Math.min((dailyRange / 4.5) * 30, 30);

    const heatScore = Math.min(Math.round(volPoints + extremePoints + volSpikePoints), 100);

    // Attention classification
    const isHighAttention = unusualVolume && nearExtreme && volatilitySpike;
    // Stagnant if low heat score and price is barely moving
    const isStagnant = heatScore < 20 && dailyRange < 0.8;

    return {
      ticker,
      heatScore,
      isHighAttention,
      isStagnant,
      triggers: {
        unusualVolume,
        nearExtreme,
        volatilitySpike,
      },
      metrics: {
        volumeRatio,
        distTo52wExtreme,
        dailyRange,
      },
    };
  }, []);

  // Listen to WebSocket and recalculate updates
  useEffect(() => {
    if (movers.length === 0) return;

    // Sync WebSocket subscriptions
    const tickers = movers.map(m => m.ticker);
    finnhubSocket.syncSubscriptions(tickers);

    // Initial load signals based on movers initial values
    const initialSignals: { [ticker: string]: StockSignal } = {};
    movers.forEach(mover => {
      const ticker = mover.ticker.toUpperCase();
      initialSignals[ticker] = calculateSignal(ticker, mover.price, mover.volume);
    });
    signalsRef.current = initialSignals;
    setSignals(initialSignals);

    // Handle incoming trade updates
    const unsubscribe = finnhubSocket.addHandler((update) => {
      const ticker = update.ticker.toUpperCase();
      const mover = movers.find(m => m.ticker.toUpperCase() === ticker);
      if (!mover) return;

      // Update local tracking
      const newSignal = calculateSignal(ticker, update.price, mover.volume); // Finnhub socket trade volume is tiny, so use alpha vantage daily base volume
      const updated = {
        ...signalsRef.current,
        [ticker]: newSignal,
      };
      signalsRef.current = updated;
      setSignals(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [movers, calculateSignal]);

  return { signals };
};
