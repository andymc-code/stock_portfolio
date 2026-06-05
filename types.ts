
export interface StockData {
  ticker: string;
  price: number;
  changeUSD: number;
  changePercent: number;
}

export interface PortfolioHolding {
  ticker: string;
  shares: number;
  avgCost?: number; // Average cost per share for P&L calculation
}

export interface StockDataMap {
  [ticker: string]: StockData;
}

// Computed portfolio data with enriched values
export interface PortfolioHoldingWithValue extends PortfolioHolding {
  name: string;
  currentPrice: number;
  value: number;
  totalPnL?: number;
  totalPnLPercent?: number;
}

export type SortField = 'ticker' | 'value' | 'changePercent' | 'pnl';
export type SortDirection = 'asc' | 'desc';