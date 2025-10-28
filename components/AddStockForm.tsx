
import React, { useState, useEffect } from 'react';
import { PlusIcon } from './icons';

interface AddStockFormProps {
  onAddStock: (ticker: string, shares: number | null, watchlistName?: string) => void;
  watchlistNames: string[];
}

const AddStockForm: React.FC<AddStockFormProps> = ({ onAddStock, watchlistNames }) => {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState('');

  useEffect(() => {
    if (!selectedWatchlist && watchlistNames.length > 0) {
      setSelectedWatchlist(watchlistNames[0]);
    }
  }, [watchlistNames, selectedWatchlist]);

  const handleAddToPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    const sharesNum = parseFloat(shares);
    if (!sharesNum || sharesNum <= 0) {
        alert("Please enter a valid number of shares to add to your portfolio.");
        return;
    }

    onAddStock(ticker, sharesNum);
    setTicker('');
    setShares('');
  };
  
  const handleAddToWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    if (!selectedWatchlist) {
        alert("Please create a watchlist first.");
        return;
    }
    onAddStock(ticker, null, selectedWatchlist);
    setTicker('');
  };

  return (
    <div className="bg-black/30 p-4 border border-matrix-border shadow-lg shadow-matrix-green/10 rounded-none">
      <h2 className="text-xl font-semibold mb-3 text-matrix-green">Add New Asset</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add to Portfolio Form */}
        <form onSubmit={handleAddToPortfolio} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <label htmlFor="ticker-portfolio" className="block text-sm font-medium text-matrix-green/70 mb-1">Ticker Symbol</label>
            <input
              id="ticker-portfolio"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g., AAPL"
              className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
            />
          </div>
          <div className="sm:col-span-1">
             <label htmlFor="shares" className="block text-sm font-medium text-matrix-green/70 mb-1">Shares</label>
             <input
                id="shares"
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green placeholder:text-green-900"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-3 flex items-center justify-center bg-transparent hover:bg-matrix-green border border-matrix-green text-matrix-green hover:text-black font-bold py-2 px-4 rounded-none transition duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add to Portfolio
          </button>
        </form>

        {/* Add to Watchlist Form */}
        <form onSubmit={handleAddToWatchlist} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-3">
              <label htmlFor="watchlist-select" className="block text-sm font-medium text-matrix-green/70 mb-1">Select Watchlist</label>
              <select 
                id="watchlist-select"
                value={selectedWatchlist}
                onChange={(e) => setSelectedWatchlist(e.target.value)}
                disabled={watchlistNames.length === 0}
                className="w-full bg-black border border-matrix-border rounded-none py-2 px-3 text-matrix-green focus:outline-none focus:ring-2 focus:ring-matrix-green disabled:bg-gray-800 disabled:text-gray-500"
              >
                {watchlistNames.length > 0 ? (
                  watchlistNames.map(name => <option key={name} value={name}>{name}</option>)
                ) : (
                  <option>No watchlists available</option>
                )}
              </select>
            </div>
            <button
              type="submit"
              disabled={watchlistNames.length === 0}
              className="sm:col-span-3 flex items-center justify-center bg-transparent hover:bg-matrix-green-dark border border-matrix-green-dark text-green-400 hover:text-matrix-green font-bold py-2 px-4 rounded-none transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add to Watchlist
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddStockForm;
