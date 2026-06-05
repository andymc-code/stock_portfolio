import React, { useState, useEffect } from 'react';
import { PlusIcon } from './icons';

interface AddStockFormProps {
  onAddStock: (ticker: string, shares: number | null, avgCost: number | null, watchlistName?: string) => void;
  watchlistNames: string[];
}

const AddStockForm: React.FC<AddStockFormProps> = ({ onAddStock, watchlistNames }) => {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('');
  const [addToWatchlist, setAddToWatchlist] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (watchlistNames.length > 0 && !selectedWatchlist) {
      setSelectedWatchlist(watchlistNames[0]);
    }
    if (watchlistNames.length === 0) {
      setAddToWatchlist(false);
    }
  }, [watchlistNames, selectedWatchlist]);

  // Auto-clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    const sharesNum = parseFloat(shares);
    const hasShares = !isNaN(sharesNum) && sharesNum > 0;
    const costNum = parseFloat(avgCost);
    const hasCost = !isNaN(costNum) && costNum > 0;
    const watchlistTarget = addToWatchlist && selectedWatchlist ? selectedWatchlist : undefined;

    if (!hasShares && !watchlistTarget) {
      setFeedback({ type: 'error', message: 'Enter shares for portfolio or select a watchlist.' });
      return;
    }

    onAddStock(
      ticker.trim(),
      hasShares ? sharesNum : null,
      hasCost ? costNum : null,
      watchlistTarget
    );

    setFeedback({ type: 'success', message: `${ticker.toUpperCase()} added successfully!` });
    setTicker('');
    setShares('');
    setAvgCost('');
  };

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Add Asset</h2>

      {/* Feedback */}
      {feedback && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-3 animate-slide-down ${
          feedback.type === 'success' ? 'bg-gain-bg text-gain border border-gain-border' : 'bg-loss-bg text-loss border border-loss-border'
        }`}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: Ticker, Shares, Avg Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="ticker-input" className="label">Ticker</label>
            <input
              id="ticker-input"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="input input-mono"
              required
            />
          </div>
          <div>
            <label htmlFor="shares-input" className="label">Shares</label>
            <input
              id="shares-input"
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="10"
              min="0"
              step="any"
              className="input input-mono"
            />
          </div>
          <div>
            <label htmlFor="avgcost-input" className="label">Avg Cost</label>
            <input
              id="avgcost-input"
              type="number"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="150.00"
              min="0"
              step="any"
              className="input input-mono"
            />
          </div>
        </div>

        {/* Row 2: Watchlist + Submit */}
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex items-center gap-3 flex-grow w-full">
            <input
              type="checkbox"
              id="add-to-watchlist-checkbox"
              checked={addToWatchlist}
              onChange={(e) => setAddToWatchlist(e.target.checked)}
              disabled={watchlistNames.length === 0}
            />
            <label htmlFor="add-to-watchlist-checkbox" className="text-xs text-text-muted whitespace-nowrap">
              Add to watchlist
            </label>
            <select
              id="watchlist-select"
              value={selectedWatchlist}
              onChange={(e) => setSelectedWatchlist(e.target.value)}
              disabled={!addToWatchlist || watchlistNames.length === 0}
              className="select text-xs flex-grow"
            >
              {watchlistNames.length > 0 ? (
                watchlistNames.map(name => <option key={name} value={name}>{name}</option>)
              ) : (
                <option>No watchlists</option>
              )}
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full sm:w-auto whitespace-nowrap">
            <PlusIcon className="h-4 w-4" />
            Add Asset
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStockForm;
