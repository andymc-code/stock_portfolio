
import type { StockData } from '../types';

const API_BASE_URL = 'https://data.alpaca.markets';

interface AlpacaQuote {
  ap: number; // Ask Price
  bp: number; // Bid Price
}

interface AlpacaBar {
  c: number; // Close Price
  h: number; // High Price
  l: number; // Low Price
  o: number; // Open Price
}

interface AlpacaSnapshot {
  latestQuote: AlpacaQuote;
  dailyBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

interface AlpacaSnapshotResponse {
  [ticker: string]: AlpacaSnapshot | null;
}

export const fetchStockData = async (tickers: string[], apiKey: string, apiSecret: string): Promise<StockData[]> => {
  if (tickers.length === 0) return [];
  if (!apiKey || !apiSecret) throw new Error("Alpaca API Key and Secret are required.");

  const symbols = tickers.join(',');
  const url = `${API_BASE_URL}/v2/stocks/snapshots?symbols=${symbols}`;

  const response = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Alpaca API Error: ${errorData.message || response.statusText}`);
  }

  const data: AlpacaSnapshotResponse = await response.json();

  const stockData: StockData[] = Object.entries(data)
    .map(([ticker, snapshot]) => {
      if (!snapshot || !snapshot.latestQuote || !snapshot.prevDailyBar || !snapshot.dailyBar) {
        console.warn(`Incomplete data for ticker: ${ticker}`);
        return null;
      }

      const price = snapshot.latestQuote.ap;
      const prevClose = snapshot.prevDailyBar.c;
      const changeUSD = price - prevClose;
      const changePercent = prevClose === 0 ? 0 : (changeUSD / prevClose) * 100;
      
      return {
        ticker,
        price,
        changeUSD,
        changePercent,
      };
    })
    .filter((item): item is StockData => item !== null);

  return stockData;
};