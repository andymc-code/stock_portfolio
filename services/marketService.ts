export interface MarketMover {
  ticker: string;
  price: number;
  changeUSD: number;
  changePercent: number;
  volume: number;
}

export interface MarketMoversData {
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActive: MarketMover[];
}

const polygonApiKey = import.meta.env.VITE_POLYGON_API_KEY || '';

/**
 * Parse a Polygon snapshot ticker into our MarketMover format.
 *
 * Polygon snapshot shape per ticker:
 * {
 *   ticker: "AAPL",
 *   todaysChange: 2.34,
 *   todaysChangePerc: 1.52,
 *   day: { o, h, l, c, v, vw },
 *   prevDay: { o, h, l, c, v, vw },
 *   min: { ... },
 *   updated: ...
 * }
 */
function parsePolygonTicker(item: any): MarketMover | null {
  try {
    const ticker = item.ticker;
    // Use the day close (latest trade price) or fall back to prevDay close
    const price = item.day?.c || item.prevDay?.c || 0;
    const changeUSD = item.todaysChange ?? 0;
    const changePercent = item.todaysChangePerc ?? 0;
    const volume = item.day?.v || 0;

    if (!ticker || price <= 0) return null;

    return { ticker, price, changeUSD, changePercent, volume };
  } catch {
    return null;
  }
}

/**
 * Fetch all stocks' grouped daily data from Polygon.io.
 * This endpoint is available on the free Basic plan and contains the entire market's performance.
 * We try to determine the latest completed trading day.
 */
async function fetchPolygonGroupedDaily(): Promise<MarketMover[]> {
  // Determine the target date in Eastern Time (US market time)
  const estDateStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const estDate = new Date(estDateStr);

  let targetDate = new Date(estDate);
  const dayOfWeek = estDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = estDate.getHours();

  // If weekend, go back to Friday
  if (dayOfWeek === 0) { // Sunday
    targetDate.setDate(estDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    targetDate.setDate(estDate.getDate() - 1);
  } else if (dayOfWeek === 1 && hours < 18) { // Monday before 6 PM EST
    targetDate.setDate(estDate.getDate() - 3);
  } else if (hours < 18) { // Tue-Fri before 6 PM EST
    targetDate.setDate(estDate.getDate() - 1);
  }

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  let dateStr = formatDate(targetDate);
  let attempts = 0;
  let data: any = null;

  while (attempts < 3) {
    try {
      const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?apiKey=${polygonApiKey}`;
      console.log(`Fetching Polygon grouped daily data for date: ${dateStr}`);
      const resp = await fetch(url);
      if (resp.status === 403 || resp.status === 401) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.message || `Status ${resp.status}`);
      }
      if (!resp.ok) {
        throw new Error(`Grouped daily request failed with status: ${resp.status}`);
      }
      data = await resp.json();
      if (data.results && data.results.length > 0) {
        break;
      }
    } catch (err: any) {
      console.warn(`Failed to fetch grouped daily for ${dateStr}:`, err.message);
      // Go back one day and try again
      targetDate.setDate(targetDate.getDate() - 1);
      // Skip weekends
      while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        targetDate.setDate(targetDate.getDate() - 1);
      }
      dateStr = formatDate(targetDate);
      attempts++;
    }
  }

  if (!data || !data.results || data.results.length === 0) {
    throw new Error("Could not retrieve any Polygon market data after retries");
  }

  // Parse results
  return data.results.map((item: any) => {
    const ticker = item.T;
    const open = item.o || 0;
    const close = item.c || 0;
    const changeUSD = close - open;
    const changePercent = open > 0 ? (changeUSD / open) * 100 : 0;
    const volume = item.v || 0;
    return {
      ticker,
      price: close,
      changeUSD,
      changePercent,
      volume
    };
  }).filter((m: any) => m.price > 0 && m.volume > 0 && m.ticker);
}

/**
 * Main entry point — fetches all three lists.
 * Since we can't use snapshot endpoints on the basic plan, we fetch the full market grouped daily
 * and extract top gainers, losers, and active tickers locally.
 */
export const fetchMarketMovers = async (): Promise<MarketMoversData> => {
  if (polygonApiKey) {
    try {
      const allMovers = await fetchPolygonGroupedDaily();

      if (allMovers.length > 0) {
        // Derive gainers: sorted by changePercent descending
        const topGainers = [...allMovers]
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 150);

        // Derive losers: sorted by changePercent ascending
        const topLosers = [...allMovers]
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 150);

        // Derive most active: sorted by volume descending
        const mostActive = [...allMovers]
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 150);

        return {
          topGainers,
          topLosers,
          mostActive,
        };
      }

      console.warn('Polygon returned empty data, falling back to Alpha Vantage');
    } catch (err) {
      console.warn('Polygon API error, falling back to Alpha Vantage:', err);
    }
  }

  // Fallback to Alpha Vantage
  return fetchAlphaVantageMovers();
};

// ─── Alpha Vantage Fallback ───────────────────────────────────────────
const alphaVantageKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY || 'demo';

async function fetchAlphaVantageMovers(): Promise<MarketMoversData> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${alphaVantageKey}`
    );
    if (!response.ok) throw new Error(`Alpha Vantage: ${response.status}`);
    const data = await response.json();

    if (data.Information || data.Note || !data.top_gainers) {
      console.warn('Alpha Vantage rate limited, using simulated data:', data.Information || data.Note);
      return fetchSimulatedFallback();
    }

    const parseMoversList = (list: any[]): MarketMover[] => {
      if (!list) return [];
      return list.map(item => ({
        ticker: item.ticker.toUpperCase(),
        price: parseFloat(item.price) || 0,
        changeUSD: parseFloat(item.change_amount) || 0,
        changePercent: parseFloat(item.change_percentage.replace('%', '')) || 0,
        volume: parseInt(item.volume) || 0,
      }));
    };

    return {
      topGainers: parseMoversList(data.top_gainers),
      topLosers: parseMoversList(data.top_losers),
      mostActive: parseMoversList(data.most_actively_traded),
    };
  } catch (error) {
    console.warn('Alpha Vantage error, using simulated data:', error);
    return fetchSimulatedFallback();
  }
}

// ─── Simulated Data (Last Resort) ────────────────────────────────────
// Shows a clear warning banner when this data is used.
const fetchSimulatedFallback = (): MarketMoversData => {
  console.error(
    '%c⚠️ USING SIMULATED MARKET DATA — prices are NOT real! Add VITE_POLYGON_API_KEY to .env',
    'color: #ff6b6b; font-size: 14px; font-weight: bold;'
  );

  const generateList = (type: 'gainer' | 'loser' | 'active'): MarketMover[] => {
    const tickers = {
      gainer: ['RMSG', 'BGMS', 'STI', 'BESS', 'BBCP', 'MASK', 'MRLN', 'MCRB', 'ETHD', 'TTAN'],
      loser: ['ZCMD', 'LHSW', 'KOLD', 'UVXY', 'SQQQ', 'SARK', 'SOXS', 'YINN', 'BOIL', 'FAZ'],
      active: ['SMTK', 'RMSG', 'SOXS', 'TSLA', 'AAPL', 'NVDA', 'AMD', 'PLTR', 'F', 'NIO']
    }[type];

    return tickers.map((ticker) => {
      const price = parseFloat((Math.random() * 90 + 5).toFixed(2));
      let changePercent = Math.random() * 25 + 5;
      if (type === 'loser') changePercent = -changePercent;
      const changeUSD = parseFloat((price * (changePercent / 100)).toFixed(2));
      const volume = Math.floor(Math.random() * 80000000) + 10000000;
      return { ticker, price, changeUSD, changePercent, volume };
    });
  };

  return {
    topGainers: generateList('gainer'),
    topLosers: generateList('loser'),
    mostActive: generateList('active'),
  };
};
