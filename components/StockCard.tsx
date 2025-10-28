
import React from 'react';
import type { StockData } from '../types';
import { UpArrowIcon, DownArrowIcon, RemoveIcon } from './icons';

interface StockCardProps {
  stock?: StockData;
  shares?: number;
  onRemove: (ticker: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, shares, onRemove }) => {
  if (!stock) {
    return null; // Or a loading/error state for this specific card
  }

  const { ticker, price, changeUSD, changePercent } = stock;
  const isUp = changeUSD >= 0;
  const changeColor = isUp ? 'text-matrix-green' : 'text-matrix-red';
  const totalValue = shares ? shares * price : null;

  return (
    <div className="bg-black/50 p-4 rounded-none flex items-center justify-between transition-colors border border-transparent hover:border-matrix-green">
      <div className="flex-1">
        <div className="flex items-center">
            <p className="text-xl font-bold text-matrix-green">{ticker}</p>
        </div>
        {shares && (
            <p className="text-xs text-green-600 mt-1">{shares} shares</p>
        )}
      </div>
      <div className="text-right mx-4 flex-shrink-0">
        <p className="text-xl font-semibold text-matrix-green">${price?.toFixed(2)}</p>
        {totalValue && (
            <p className="text-xs text-green-700">Value: ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        )}
      </div>
      <div className={`flex items-center text-md font-medium w-32 justify-end ${changeColor}`}>
        {isUp ? <UpArrowIcon /> : <DownArrowIcon />}
        <span className="w-16 text-right">{changeUSD?.toFixed(2)}</span>
        <span className="w-16 text-right">({changePercent?.toFixed(2)}%)</span>
      </div>
      <button onClick={() => onRemove(ticker)} className="ml-4 text-green-900 hover:text-matrix-red transition-colors">
        <RemoveIcon />
      </button>
    </div>
  );
};

export default StockCard;