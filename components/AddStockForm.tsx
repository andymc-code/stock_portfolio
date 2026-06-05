
import React, { useState, useEffect } from 'react';
import { PlusIcon } from './icons';

interface AddStockFormProps {
  onAddStock: (ticker: string, shares: number | null, watchlistName?: string) => void;
  watchlistNames: string[];
}

const AddStockForm: React.FC<AddStockFormProps> = ({ onAddStock, watchlistNames }) => {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('');
  const [addToWatchlist, setAddToWatchlist] = useState<boolean>(true);

  useEffect(() => {
    // Set a default watchlist if available
    if (watchlistNames.length > 0 && !selectedWatchlist) {
      setSelectedWatchlist(watchlistNames[0]);
    }
    // If no watchlists exist, uncheck the box
    if (watchlistNames.length === 0) {
      setAddToWatchlist(false);
    }
  }, [watchlistNames, selectedWatchlist]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    const sharesNum = parseFloat(shares);
    const hasShares = !isNaN(sharesNum) && sharesNum > 0;
    
    // Determine if we should add to watchlist
    const watchlistTarget = addToWatchlist && selectedWatchlist ? selectedWatchlist : undefined;

    if (!hasShares && !watchlistTarget) {
      alert("Please enter a number of shares to add to your portfolio, or select a watchlist to add the ticker to.");
      return;
    }
    
    onAddStock(ticker, hasShares ? sharesNum : null, watchlistTarget);
    
    // Reset form fields
    setTicker('');
    setShares('');
  };

  return (
    <div className="bg-black/30 p-4 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
      <h2 className="text-xl font-semibold mb-4 text-matrix-green">Add New Asset</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        
        {/* Ticker Input */}
        <div className="md:col-span-2">
          <label htmlFor="ticker-input" className="block text-sm font-medium text-matrix-green/70 mb-1">Ticker Symbol</label>
          <input
            id="ticker-input"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
            required
          />
        </div>

        {/* Shares Input */}
        <div>
          <label htmlFor="shares-input" className="block text-sm font-medium text-matrix-green/70 mb-1">Shares (for Portfolio)</label>
          <input
            id="shares-input"
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="e.g., 10 (optional)"
            min="0"
            step="any"
            className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="flex items-center justify-center bg-transparent hover:bg-matrix-green border border-matrix-green text-matrix-green hover:text-black font-bold py-2 px-4 rounded-none transition duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Asset
        </button>

        {/* Watchlist Selection */}
        <div className="md:col-span-4 flex items-center gap-4 mt-2">
            <input 
                type="checkbox"
                id="add-to-watchlist-checkbox"
                checked={addToWatchlist}
                onChange={(e) => setAddToWatchlist(e.target.checked)}
                disabled={watchlistNames.length === 0}
                className="h-4 w-4 bg-black border-matrix-border text-matrix-green focus:ring-matrix-green"
            />
            <label htmlFor="add-to-watchlist-checkbox" className="text-sm text-matrix-green/70">
              Add to Watchlist:
            </label>
            <select
              id="watchlist-select"
              value={selectedWatchlist}
              onChange={(e) => setSelectedWatchlist(e.target.value)}
              disabled={!addToWatchlist || watchlistNames.length === 0}
              className="flex-grow bg-black border border-matrix-border rounded-none py-1 px-2 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green disabled:bg-gray-800/50 disabled:text-gray-500"
            >
              {watchlistNames.length > 0 ? (
                watchlistNames.map(name => <option key={name} value={name}>{name}</option>)
              ) : (
                <option>No watchlists available</option>
              )}
            </select>
        </div>

      </form>
    </div>
  );
};

export default AddStockForm;
