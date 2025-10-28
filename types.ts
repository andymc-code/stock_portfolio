
export interface StockData {
  ticker: string;
  price: number;
  changeUSD: number;
  changePercent: number;
}

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgCost?: number; // Optional average cost per share
}

export interface StockDataMap {
  [ticker: string]: StockData;
}