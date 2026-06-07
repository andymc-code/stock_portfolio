/**
 * Fetches OHLCV (candle) data from Finnhub for sparkline charts.
 * Uses the /stock/candle endpoint.
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

interface FinnhubCandleResponse {
  s: string;    // status: "ok" or "no_data"
  c: number[];  // close prices
  h: number[];  // high prices
  l: number[];  // low prices
  o: number[];  // open prices
  t: number[];  // timestamps
  v: number[];  // volume
}

// Cache candle data to reduce API calls
const candleCache = new Map<string, { data: CandleData[], timestamp: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes (longer cache to reduce rate-limit hits)

const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;

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
 * Returns Finnhub resolution and from-timestamp for a given TimeRange.
 */
function getResolutionAndRange(range: TimeRange): { resolution: string; from: number } {
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;

  switch (range) {
    case '1D':
      return { resolution: '5', from: now - DAY };         // 5-min bars
    case '1W':
      return { resolution: '15', from: now - 7 * DAY };    // 15-min bars
    case '1M':
      return { resolution: '60', from: now - 30 * DAY };   // 1-hour bars
    case '3M':
      return { resolution: 'D', from: now - 90 * DAY };    // Daily bars
    case '1Y':
      return { resolution: 'D', from: now - 365 * DAY };   // Daily bars
    case 'YTD': {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
      return { resolution: 'D', from: startOfYear };       // Daily bars
    }
    default:
      return { resolution: 'D', from: now - 90 * DAY };
  }
}

/**
 * Fetch candle data for a ticker and time range.
 * Returns empty array if data is unavailable — never generates fake data.
 */
export async function fetchCandleData(
  ticker: string,
  range: TimeRange,
  _currentPrice?: number
): Promise<CandleData[]> {
  if (!apiKey) {
    console.warn('⚠️ Finnhub API key missing — no candle data available');
    return [];
  }

  const cacheKey = `${ticker.toUpperCase()}_${range}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const { resolution, from } = getResolutionAndRange(range);
  const to = Math.floor(Date.now() / 1000);

  try {
    const response = await rateLimitedFetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
    );

    if (!response.ok) {
      console.warn(`Finnhub candle API returned ${response.status} for ${ticker}`);
      return [];
    }

    const data: FinnhubCandleResponse = await response.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      console.warn(`No candle data for ${ticker} (${range}).`);
      return [];
    }

    const candles: CandleData[] = data.t.map((timestamp, i) => ({
      time: timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));

    candleCache.set(cacheKey, { data: candles, timestamp: Date.now() });
    return candles;
  } catch (error) {
    console.error(`Error fetching candles for ${ticker}:`, error);
    return [];
  }
}
