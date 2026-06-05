import React from 'react';
import type { StockData } from '../types';
import { UpArrowIcon, DownArrowIcon, RemoveIcon } from './icons';

interface StockCardProps {
  ticker: string;
  stock?: StockData;
  shares?: number;
  avgCost?: number;
  onRemove: (ticker: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ ticker, stock, shares, avgCost, onRemove }) => {
  if (!stock) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-pulse-surface/50 animate-pulse-soft">
        <div className="flex-1">
          <p className="ticker text-sm text-text-primary">{ticker}</p>
          {shares && <p className="text-[0.65rem] text-text-muted mt-0.5">{shares} shares</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-16 skeleton rounded" />
          <div className="h-4 w-20 skeleton rounded" />
        </div>
        <button className="ml-3 text-text-muted/30 cursor-not-allowed">
          <RemoveIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const { price, changeUSD, changePercent } = stock;
  const isUp = changeUSD >= 0;
  const totalValue = shares ? shares * price : null;

  // P&L calculation
  const totalPnL = shares && avgCost ? (price - avgCost) * shares : null;
  const pnlPercent = avgCost ? ((price - avgCost) / avgCost) * 100 : null;

  return (
    <div className="group flex items-center justify-between p-3 rounded-lg bg-pulse-surface/30 border border-transparent hover:border-pulse-border hover:bg-pulse-surface/60 transition-all duration-200">
      {/* Ticker & Shares */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="ticker text-sm text-text-primary">{ticker}</p>
          {totalPnL !== null && (
            <span className={`badge text-[0.6rem] ${totalPnL >= 0 ? 'badge-gain' : 'badge-loss'}`}>
              {totalPnL >= 0 ? '+' : ''}{pnlPercent?.toFixed(1)}%
            </span>
          )}
        </div>
        {shares && (
          <p className="text-[0.65rem] text-text-muted mt-0.5">
            {shares} shares
            {avgCost ? ` · Avg $${avgCost.toFixed(2)}` : ''}
          </p>
        )}
      </div>

      {/* Price & Value */}
      <div className="text-right mx-3 shrink-0">
        <p className="price text-sm text-text-primary">${price?.toFixed(2)}</p>
        {totalValue && (
          <p className="text-[0.65rem] text-text-muted mt-0.5">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Change */}
      <div className={`flex items-center text-xs font-medium shrink-0 font-mono tabular-nums ${isUp ? 'text-gain' : 'text-loss'}`}>
        {isUp ? <UpArrowIcon className="h-3 w-3 mr-0.5" /> : <DownArrowIcon className="h-3 w-3 mr-0.5" />}
        <span>{Math.abs(changeUSD).toFixed(2)}</span>
        <span className="ml-1 text-[0.65rem]">({Math.abs(changePercent).toFixed(2)}%)</span>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(ticker)}
        className="ml-3 text-text-muted/30 hover:text-loss transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${ticker}`}
      >
        <RemoveIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default StockCard;
