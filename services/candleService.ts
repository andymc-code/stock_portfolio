/**
 * Fetches OHLCV (candle) data from Polygon.io for sparkline and historical charts.
 * Uses the /aggs/ticker endpoint.
 * Returns empty array if data is unavailable — never generates fake data.
 */

export interface CandleData {
  time: number;   // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD';

// Cache candle data to reduce API calls
const candleCache = new Map<string, { data: CandleData[], timestamp: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const apiKey = import.meta.env.VITE_POLYGON_API_KEY;

// Simple rate limiter: max 1 request per 500ms
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 500;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * Returns Polygon parameters (multiplier, timespan, and from timestamp in milliseconds) for a given TimeRange.
 */
function getPolygonParams(range: TimeRange): { multiplier: number; timespan: string; fromMs: number } {
  const nowMs = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (range) {
    case '1D':
      return { multiplier: 5, timespan: 'minute', fromMs: nowMs - DAY_MS };         // 5-min bars
    case '1W':
      return { multiplier: 30, timespan: 'minute', fromMs: nowMs - 7 * DAY_MS };    // 30-min bars
    case '1M':
      return { multiplier: 1, timespan: 'hour', fromMs: nowMs - 30 * DAY_MS };      // 1-hour bars
    case '3M':
      return { multiplier: 1, timespan: 'day', fromMs: nowMs - 90 * DAY_MS };       // Daily bars
    case '1Y':
      return { multiplier: 1, timespan: 'day', fromMs: nowMs - 365 * DAY_MS };      // Daily bars
    case 'YTD': {
      const startOfYearMs = new Date(new Date().getFullYear(), 0, 1).getTime();
      return { multiplier: 1, timespan: 'day', fromMs: startOfYearMs };             // Daily bars from start of year
    }
    default:
      return { multiplier: 1, timespan: 'day', fromMs: nowMs - 90 * DAY_MS };
  }
}

/**
 * Fetch candle data for a ticker and time range using Polygon.io.
 * Returns empty array if data is unavailable — never generates fake data.
 */
export async function fetchCandleData(
  ticker: string,
  range: TimeRange,
  _currentPrice?: number
): Promise<CandleData[]> {
  if (!apiKey) {
    console.warn('⚠️ Polygon API key missing — no candle data available');
    return [];
  }

  const cacheKey = `${ticker.toUpperCase()}_${range}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const { multiplier, timespan, fromMs } = getPolygonParams(range);
  const toMs = Date.now();

  try {
    const response = await rateLimitedFetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${fromMs}/${toMs}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`
    );

    if (!response.ok) {
      console.warn(`Polygon candle API returned status ${response.status} for ${ticker}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`No candle data returned from Polygon for ${ticker} (${range}).`);
      return [];
    }

    const candles: CandleData[] = data.results.map((r: any) => ({
      time: Math.floor(r.t / 1000), // convert ms to seconds
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));

    candleCache.set(cacheKey, { data: candles, timestamp: Date.now() });
    return candles;
  } catch (error) {
    console.error(`Error fetching candles from Polygon for ${ticker}:`, error);
    return [];
  }
}

