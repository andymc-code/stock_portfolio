
import React from 'react';
import type { StockDataMap } from '../types';
import StockCard from './StockCard';

interface WatchlistProps {
  name: string;
  tickers: string[];
  data: StockDataMap;
  onRemove: (ticker: string) => void;
  onRename: () => void;
  onDelete: () => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ name, tickers, data, onRemove, onRename, onDelete }) => {
  return (
    <div className="bg-black/30 p-4 md:p-6 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-matrix-green">{name}</h2>
        <div className="flex gap-4">
            <button onClick={onRename} className="text-sm text-matrix-green/70 hover:text-matrix-green underline">Rename</button>
            <button onClick={onDelete} className="text-sm text-matrix-red/70 hover:text-matrix-red underline">Delete</button>
        </div>
      </div>
      <div className="space-y-3">
        {tickers.length > 0 ? tickers.map(ticker => (
          <StockCard key={ticker} stock={data[ticker]} onRemove={onRemove} />
        )) : (
            <p className="text-matrix-green/50">This watchlist is empty. Add a ticker to start tracking.</p>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
