
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

export interface StockSignal {
  ticker: string;
  heatScore: number;          // 1-100
  isHighAttention: boolean;
  isStagnant: boolean;
  isWarrant: boolean;         // Ticker ends in W, +, or WS (warrants/units)
  dollarVolume: number;       // price × volume — raw liquidity measure
  liquidityAdjustedMove: number; // %change weighted by log10(dollarVol)
  priceBandPenalty: number;   // 0-1 multiplier (1 = no penalty, 0 = full penalty)
  triggers: {
    unusualVolume: boolean;    // Vol > 180% of 20d avg
    nearExtreme: boolean;      // Price within 3% of 52w High/Low
    volatilitySpike: boolean;  // High range movement
  };
  metrics: {
    volumeRatio: number;       // Current Vol / 20d avg
    distTo52wExtreme: number;  // min % distance to 52w High or Low
    dailyRange: number;        // (High - Low) / Close %
  };
}

export type ScreenerViewMode = 'table' | 'grid';