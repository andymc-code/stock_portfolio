import React, { useState, useMemo } from 'react';
import type { PortfolioHolding, StockDataMap, SortField, SortDirection, PortfolioHoldingWithValue } from '../types';
import StockCard from './StockCard';
import PortfolioTreemap from './PortfolioTreemap';
import { SortIcon } from './icons';

interface PortfolioProps {
  holdings: PortfolioHolding[];
  data: StockDataMap;
  onRemove: (ticker: string) => void;
  onTickerClick?: (ticker: string) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ holdings, data, onRemove, onTickerClick }) => {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [searchFilter, setSearchFilter] = useState('');

  const portfolioWithValue: PortfolioHoldingWithValue[] = useMemo(() => {
    return holdings
      .map(h => {
        const stockData = data[h.ticker];
        const value = stockData ? h.shares * stockData.price : 0;
        const totalPnL = h.avgCost ? (stockData?.price || 0 - h.avgCost) * h.shares : undefined;
        const totalPnLPercent = h.avgCost && h.avgCost > 0
          ? (((stockData?.price || 0) - h.avgCost) / h.avgCost) * 100
          : undefined;

        return {
          ...h,
          name: h.ticker,
          currentPrice: stockData?.price || 0,
          value,
          totalPnL,
          totalPnLPercent,
        };
      })
      .filter(h => h.value > 0);
  }, [holdings, data]);

  const totalValue = useMemo(() =>
    portfolioWithValue.reduce((acc, h) => acc + h.value, 0),
    [portfolioWithValue]
  );

  const dayChange = useMemo(() => {
    return holdings.reduce((acc, h) => {
      const stock = data[h.ticker];
      return acc + (stock ? stock.changeUSD * h.shares : 0);
    }, 0);
  }, [holdings, data]);

  const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

  // Filter and sort
  const filteredHoldings = useMemo(() => {
    let filtered = holdings.filter(h =>
      h.ticker.toLowerCase().includes(searchFilter.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aData = data[a.ticker];
      const bData = data[b.ticker];
      let aVal = 0, bVal = 0;

      switch (sortField) {
        case 'ticker':
          return sortDir === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        case 'value':
          aVal = aData ? a.shares * aData.price : 0;
          bVal = bData ? b.shares * bData.price : 0;
          break;
        case 'changePercent':
          aVal = aData?.changePercent || 0;
          bVal = bData?.changePercent || 0;
          break;
        case 'pnl':
          aVal = a.avgCost ? ((aData?.price || 0) - a.avgCost) / a.avgCost : 0;
          bVal = b.avgCost ? ((bData?.price || 0) - b.avgCost) / b.avgCost : 0;
          break;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [holdings, data, searchFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-3xl mb-3">📈</p>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Your portfolio is empty</h2>
        <p className="text-sm text-text-muted">Add your first stock above to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Portfolio</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="price text-2xl text-text-primary">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`badge text-xs ${dayChange >= 0 ? 'badge-gain' : 'badge-loss'}`}>
              {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)} ({dayChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Search */}
        {holdings.length > 3 && (
          <input
            type="text"
            placeholder="Filter tickers…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="input input-mono w-full sm:w-40 text-xs py-1.5"
          />
        )}
      </div>

      {/* Treemap */}
      <div className="h-48 md:h-56 mb-5 rounded-lg overflow-hidden border border-pulse-border">
        <PortfolioTreemap portfolioData={portfolioWithValue} stockData={data} />
      </div>

      {/* Sort Controls */}
      <div className="flex gap-1 mb-3 text-[0.65rem] text-text-muted">
        <span className="mr-1 self-center">Sort:</span>
        {(['value', 'ticker', 'changePercent'] as SortField[]).map(field => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`btn btn-ghost btn-sm text-[0.65rem] px-2 py-0.5 ${sortField === field ? 'text-accent-primary' : ''}`}
          >
            <SortIcon className="h-2.5 w-2.5" />
            {field === 'changePercent' ? 'Change' : field.charAt(0).toUpperCase() + field.slice(1)}
          </button>
        ))}
      </div>

      {/* Holdings List */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {filteredHoldings.map(holding => (
          <StockCard
            key={holding.ticker}
            ticker={holding.ticker}
            stock={data[holding.ticker]}
            shares={holding.shares}
            avgCost={holding.avgCost}
            onRemove={onRemove}
            onClick={onTickerClick}
          />
        ))}
      </div>
    </div>
  );
};

export default Portfolio;
