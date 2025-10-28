
import React from 'react';
import type { PortfolioHolding, StockDataMap } from '../types';
import StockCard from './StockCard';
import PortfolioTreemap from './PortfolioTreemap';

interface PortfolioProps {
  holdings: PortfolioHolding[];
  data: StockDataMap;
  onRemove: (ticker: string) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ holdings, data, onRemove }) => {
  const portfolioWithValue = holdings
    .map(h => {
        const stockData = data[h.ticker];
        return {
            ...h,
            name: h.ticker,
            currentPrice: stockData?.price || 0,
            value: stockData ? h.shares * stockData.price : 0,
        };
    })
    .filter(h => h.value > 0);

  const totalValue = portfolioWithValue.reduce((acc, h) => acc + h.value, 0);

  if (holdings.length === 0) {
    return (
        <div className="bg-black/30 p-4 md:p-6 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
            <h2 className="text-2xl font-bold text-matrix-green mb-4">My Portfolio</h2>
            <p className="text-matrix-green/70">Your portfolio is empty. Add some stocks to get started.</p>
        </div>
    );
  }

  return (
    <div className="bg-black/30 p-4 md:p-6 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-matrix-green">My Portfolio</h2>
        <div className="text-right">
            <span className="text-matrix-green/70 text-sm">Total Value</span>
            <p className="text-2xl font-bold text-matrix-green">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-64">
          <PortfolioTreemap portfolioData={portfolioWithValue} stockData={data} />
        </div>
        <div className="md:col-span-2 space-y-3 max-h-64 overflow-y-auto pr-2">
          {holdings.map(holding => (
            <StockCard
              key={holding.ticker}
              stock={data[holding.ticker]}
              shares={holding.shares}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;