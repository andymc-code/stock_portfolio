import type { StockData } from '../types';

const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;

// Cache durations
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const stockDataCache = new Map<string, { data: StockData, timestamp: number }>();

export const validateTicker = async (ticker: string): Promise<boolean> => {
  const upper = ticker.toUpperCase().trim();
  if (!upper) return false;
  if (!apiKey) {
    throw new Error("Finnhub API key is missing. Please configure it in your .env or environment settings.");
  }
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${upper}&token=${apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Finnhub status ${response.status}`);
    }
    const data = await response.json();
    if (data.c === 0 && data.pc === 0) {
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Validation failed for ${upper}:`, error);
    return false;
  }
};

export const fetchStockData = async (
  tickers: string[],
  onDataChunk: (data: StockData) => void
): Promise<void> => {
  const uniqueTickers = [...new Set(tickers.map(t => t.toUpperCase()))];
  if (uniqueTickers.length === 0) return;

  if (!apiKey) {
    throw new Error("Finnhub API key is missing. Please configure it in your .env or environment settings.");
  }

  const now = Date.now();
  const tickersToFetch: string[] = [];

  // Check cache first
  uniqueTickers.forEach(ticker => {
    const cachedItem = stockDataCache.get(ticker);
    if (cachedItem && (now - cachedItem.timestamp < CACHE_DURATION_MS)) {
      onDataChunk(cachedItem.data);
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return;

  // Fetch from Finnhub in parallel
  await Promise.all(
    tickersToFetch.map(async (ticker) => {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`
        );
        if (!response.ok) {
          throw new Error(`Finnhub status ${response.status}`);
        }
        const data = await response.json();
        
        // Finnhub returns c=0 and pc=0 if a ticker is invalid or rate limit exceeded on free plan
        if (data.c === 0 && data.pc === 0) {
          throw new Error(`No data found for symbol "${ticker}" (possibly invalid ticker).`);
        }

        const price = data.c;
        const prevClose = data.pc;
        const changeUSD = data.d !== null ? data.d : (price - prevClose);
        const changePercent = data.dp !== null ? data.dp : (prevClose === 0 ? 0 : (changeUSD / prevClose) * 100);

        const stock: StockData = {
          ticker,
          price,
          changeUSD,
          changePercent,
        };

        onDataChunk(stock);
        stockDataCache.set(ticker, { data: stock, timestamp: Date.now() });
      } catch (error: any) {
        console.warn(`⚠️ Failed to fetch quote for ${ticker} from Finnhub:`, error.message || error);
      }
    })
  );
};
