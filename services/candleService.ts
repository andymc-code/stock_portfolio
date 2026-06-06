/**
 * Fetches OHLCV (candle) data from Finnhub for charting.
 * Uses the /stock/candle endpoint.
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
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;

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
 */
export async function fetchCandleData(
  ticker: string,
  range: TimeRange
): Promise<CandleData[]> {
  if (!apiKey) {
    console.warn('⚠️ Finnhub API key missing — using simulated candle data');
    return generateSimulatedCandles(range);
  }

  const cacheKey = `${ticker.toUpperCase()}_${range}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  const { resolution, from } = getResolutionAndRange(range);
  const to = Math.floor(Date.now() / 1000);

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker.toUpperCase()}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub candle API returned ${response.status}`);
    }

    const data: FinnhubCandleResponse = await response.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
      console.warn(`No candle data for ${ticker} (${range}). Using simulated data.`);
      return generateSimulatedCandles(range);
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
    return generateSimulatedCandles(range);
  }
}

/**
 * Generate simulated candle data as fallback.
 */
function generateSimulatedCandles(range: TimeRange): CandleData[] {
  const { from } = getResolutionAndRange(range);
  const to = Math.floor(Date.now() / 1000);
  
  let interval: number;
  switch (range) {
    case '1D': interval = 300; break;      // 5 min
    case '1W': interval = 900; break;      // 15 min
    case '1M': interval = 3600; break;     // 1 hour
    default: interval = 86400; break;      // 1 day
  }

  const candles: CandleData[] = [];
  let price = 150 + Math.random() * 100;

  for (let t = from; t <= to; t += interval) {
    const change = (Math.random() - 0.48) * 3;
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(Math.random() * 5000000) + 500000;

    candles.push({ time: t, open, high, low, close, volume });
  }

  return candles;
}
