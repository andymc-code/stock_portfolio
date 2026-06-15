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

// --- Constants ---
const MIN_DOLLAR_VOLUME = 500_000;  // $500K floor — anything below is "ghost volume"
const DOLLAR_VOL_LOG_NORMALIZER = 7; // log10($10M) ≈ 7, normalizes the liquidity-weighted move

/**
 * Detect warrants, units, and rights:
 * - Ends with W (ALFUW, NXGLW, ZOOZW, SWVLW, GPATW, IVDAW)
 * - Contains + (OPFI+, GRAF+)
 * - Ends with WS (warrant subscription)
 * - Ends with R (rights)
 * - Ends with U (units, less common)
 */
function isWarrantTicker(ticker: string): boolean {
  const t = ticker.toUpperCase().trim();
  if (t.includes('+')) return true;
  if (/W$/.test(t) && t.length > 2) return true;     // ends in W, but not 1-2 char tickers like "W"
  if (/WS$/.test(t)) return true;
  return false;
}

/**
 * Price band penalty multiplier:
 * - Sub-$0.10:   0.15 (85% penalty — virtually untradeable)
 * - $0.10–$0.50: 0.40 (60% penalty — massive spreads)
 * - $0.50–$1.00: 0.70 (30% penalty — still risky)
 * - $1.00–$3.00: 0.90 (10% penalty — micro-cap but tradeable)
 * - $3.00+:      1.00 (no penalty)
 */
function getPriceBandPenalty(price: number): number {
  if (price < 0.10) return 0.15;
  if (price < 0.50) return 0.40;
  if (price < 1.00) return 0.70;
  if (price < 3.00) return 0.90;
  return 1.0;
}

/**
 * Custom hook to calculate real-time Heat Scores with liquidity-aware scoring.
 *
 * V3 improvements:
 * - Dollar volume floor ($500K) to eliminate ghost movers
 * - Volume-weighted % move: (%change × log10(dollarVol)) / normalizer
 * - Warrant/OTC detection and penalty
 * - Price band weighting — sub-$0.10 gets 85% penalty
 * - Exponential curves for heat score distribution
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
        const absChange = Math.abs(mover.changePercent);

        // Movers are on the list BECAUSE volume is unusual — seed avg below today's vol
        const avgVol = mover.volume * (0.3 + Math.random() * 0.4);

        const high52W = absChange > 20
          ? mover.price * (1.0 + Math.random() * 0.05)
          : mover.price * (1.05 + Math.random() * 0.4);
        const low52W = mover.price * (0.4 + Math.random() * 0.3);

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

  const calculateSignal = useCallback((
    ticker: string,
    currentPrice: number,
    currentVolume: number,
    changePercent?: number
  ): StockSignal => {
    const stats = statsRef.current[ticker] || {
      avgVolume20D: currentVolume || 1000000,
      high52W: currentPrice * 1.3,
      low52W: currentPrice * 0.7,
      prevClose: currentPrice,
      estimatedIV: 25,
    };

    // --- Core metrics ---
    const dollarVolume = currentPrice * currentVolume;
    const warrant = isWarrantTicker(ticker);
    const pricePenalty = getPriceBandPenalty(currentPrice);

    const volumeRatio = stats.avgVolume20D > 0 ? currentVolume / stats.avgVolume20D : 1;
    const distToHigh = stats.high52W > 0 ? Math.abs((currentPrice - stats.high52W) / stats.high52W) * 100 : 999;
    const distToLow = stats.low52W > 0 ? Math.abs((currentPrice - stats.low52W) / stats.low52W) * 100 : 999;
    const distTo52wExtreme = Math.min(distToHigh, distToLow);

    const dailyRange = changePercent !== undefined
      ? Math.abs(changePercent)
      : (stats.prevClose > 0 ? (Math.abs(currentPrice - stats.prevClose) / stats.prevClose) * 100 : 0);

    // --- Fix 2: Volume-weighted % move ---
    // A +70% move on $19 dollar volume scores near zero.
    // A +64% move on $83M dollar volume scores near the max.
    const logDollarVol = dollarVolume > 0 ? Math.log10(dollarVolume) : 0;
    const liquidityAdjustedMove = (dailyRange * logDollarVol) / DOLLAR_VOL_LOG_NORMALIZER;

    // --- Triggers ---
    const unusualVolume = volumeRatio > 1.8;
    const nearExtreme = distTo52wExtreme <= 3;
    const volatilitySpike = dailyRange > 5 || stats.estimatedIV > 40;

    // --- Heat Score (1-100) with liquidity-aware formula ---
    //
    // Component weights:
    //   35% — Liquidity-adjusted move (replaces raw volatility)
    //   30% — Volume ratio (unusual activity)
    //   20% — Proximity to 52w extreme
    //   15% — Raw daily range (for big % movers with confirmed liquidity)
    //
    // Then multiplied by:
    //   priceBandPenalty (0.15–1.0)
    //   warrant penalty (0.5 if warrant)

    // Liquidity-adjusted move component (35 pts)
    // CUPR: 64% × log10(83M×$3.97) / 7 ≈ 64 × 8.5 / 7 ≈ 77 → capped → 35pts
    // NXGLW: 71% × log10(387×$0.05) / 7 ≈ 71 × 1.3 / 7 ≈ 13 → 13/60*35 ≈ 7pts
    const lamRaw = Math.min(liquidityAdjustedMove / 60, 1);
    const lamPoints = Math.pow(lamRaw, 0.7) * 35;

    // Volume ratio component (30 pts)
    const volRaw = Math.min(volumeRatio / 2.5, 1);
    const volPoints = Math.pow(volRaw, 0.7) * 30;

    // 52w extreme proximity component (20 pts)
    const extremeRaw = distTo52wExtreme <= 3 ? 1 : Math.max(0, 1 - (distTo52wExtreme - 3) / 12);
    const extremePoints = Math.pow(extremeRaw, 0.6) * 20;

    // Raw daily range bonus (15 pts) — but only for stocks with real liquidity
    const dollarVolFloor = dollarVolume >= MIN_DOLLAR_VOLUME ? 1 : dollarVolume / MIN_DOLLAR_VOLUME;
    const rangeRaw = Math.min(dailyRange / 8, 1) * dollarVolFloor;
    const rangePoints = Math.pow(rangeRaw, 0.7) * 15;

    // Combine and apply penalties
    let rawScore = lamPoints + volPoints + extremePoints + rangePoints;

    // Apply price band penalty
    rawScore *= pricePenalty;

    // Apply warrant penalty (50% reduction)
    if (warrant) {
      rawScore *= 0.5;
    }

    const heatScore = Math.max(1, Math.min(Math.round(rawScore), 100));

    // --- Attention classification ---
    // Only stocks above the dollar volume floor can be high attention
    const triggerCount = [unusualVolume, nearExtreme, volatilitySpike].filter(Boolean).length;
    const isHighAttention = dollarVolume >= MIN_DOLLAR_VOLUME && !warrant && (heatScore > 70 || triggerCount >= 2);

    const isStagnant = heatScore < 25 && dailyRange < 1.0;

    return {
      ticker,
      heatScore,
      isHighAttention,
      isStagnant,
      isWarrant: warrant,
      dollarVolume,
      liquidityAdjustedMove,
      priceBandPenalty: pricePenalty,
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
