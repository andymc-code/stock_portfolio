import React, { useState, useEffect } from 'react';
import { fetchMarketMovers, MarketMover } from '../services/marketService';
import { LoadingIcon, PlusIcon, SparklesIcon } from './icons';
import Modal from './Modal';

interface MarketScreenerProps {
  watchlistNames: string[];
  onAddToWatchlist: (ticker: string, watchlistName: string) => Promise<any>;
  onTickerClick?: (ticker: string) => void;
}

const MarketScreener: React.FC<MarketScreenerProps> = ({ watchlistNames, onAddToWatchlist, onTickerClick }) => {
  const [moversData, setMoversData] = useState<{
    topGainers: MarketMover[];
    topLosers: MarketMover[];
    mostActive: MarketMover[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'gainers' | 'losers'>('active');
  const [error, setError] = useState<string | null>(null);

  // Add to Watchlist modal state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [targetWatchlist, setTargetWatchlist] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const loadMovers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketMovers();
      setMoversData(data);
    } catch (err) {
      setError('Failed to fetch market movers data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovers();
  }, []);

  useEffect(() => {
    if (watchlistNames.length > 0 && !targetWatchlist) {
      setTargetWatchlist(watchlistNames[0]);
    }
  }, [watchlistNames, targetWatchlist]);

  const handleOpenAddModal = (ticker: string) => {
    setSelectedTicker(ticker);
    setAddFeedback(null);
    if (watchlistNames.length > 0) {
      setTargetWatchlist(watchlistNames[0]);
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedTicker || !targetWatchlist) return;
    setIsAdding(true);
    setAddFeedback(null);
    try {
      await onAddToWatchlist(selectedTicker, targetWatchlist);
      setAddFeedback(`Successfully added ${selectedTicker} to ${targetWatchlist}!`);
      setTimeout(() => {
        setSelectedTicker(null);
      }, 1500);
    } catch (err) {
      setAddFeedback('Failed to add ticker to watchlist.');
    } finally {
      setIsAdding(false);
    }
  };

  const formatVolume = (vol: number): string => {
    if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)} M`;
    }
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(0)} K`;
    }
    return vol.toString();
  };

  const getActiveList = (): MarketMover[] => {
    if (!moversData) return [];
    if (activeTab === 'gainers') return moversData.topGainers;
    if (activeTab === 'losers') return moversData.topLosers;
    return moversData.mostActive;
  };

  return (
    <div className="card w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-pulse-border/40">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4.5 w-4.5 text-accent-primary animate-pulse" />
            <h2 className="text-base font-bold text-text-primary">Market Movers Alpha</h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Spot breakout movers, high-volume plays, and daily gainers.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-pulse-bg/85 border border-pulse-border p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'active' ? 'bg-accent-primary text-white shadow-md' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Most Active
          </button>
          <button
            onClick={() => setActiveTab('gainers')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'gainers' ? 'bg-accent-primary text-white shadow-md' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Gainers
          </button>
          <button
            onClick={() => setActiveTab('losers')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'losers' ? 'bg-accent-primary text-white shadow-md' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Losers
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingIcon />
          <span className="ml-3 text-xs text-text-muted">Analyzing market volume…</span>
        </div>
      ) : error ? (
        <div className="text-xs text-loss py-4 text-center">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pulse-border/30 text-[0.65rem] font-bold text-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-right">Chg</th>
                <th className="py-2.5 px-3 text-right">% Chg</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-center">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pulse-border/20 text-xs">
              {getActiveList().map((mover) => {
                const isUp = mover.changePercent >= 0;
                return (
                  <tr key={mover.ticker} className="hover:bg-pulse-surface/20 transition-all">
                    <td className="py-2.5 px-3 font-semibold text-text-primary flex items-center gap-1.5">
                      <span
                        className="font-mono cursor-pointer hover:text-accent-primary transition-colors"
                        onClick={() => onTickerClick?.(mover.ticker)}
                      >
                        {mover.ticker}
                      </span>
                      <button
                        onClick={() => handleOpenAddModal(mover.ticker)}
                        className="p-1 rounded bg-gain-bg/20 text-gain hover:bg-gain/20 transition-colors"
                        title="Add to Watchlist"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                      ${mover.price.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{mover.changeUSD.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{mover.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                      {formatVolume(mover.volume)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-text-muted/50">
                      {mover.volume > 50000000 ? '🔥' : 'N'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add To Watchlist Modal */}
      <Modal
        isOpen={selectedTicker !== null}
        onClose={() => setSelectedTicker(null)}
        title={`Add ${selectedTicker} to Watchlist`}
        actions={
          <>
            <button className="btn btn-secondary text-xs" onClick={() => setSelectedTicker(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary text-xs"
              onClick={handleConfirmAdd}
              disabled={isAdding || watchlistNames.length === 0}
            >
              Confirm Add
            </button>
          </>
        }
      >
        <div className="space-y-3.5 py-1">
          {addFeedback ? (
            <p className="text-xs text-gain font-medium text-center bg-gain-bg/20 border border-gain/20 p-2.5 rounded-lg">
              {addFeedback}
            </p>
          ) : watchlistNames.length > 0 ? (
            <div>
              <label htmlFor="screener-watchlist-select" className="label mb-1.5 text-xs text-text-muted">Select Target Watchlist</label>
              <select
                id="screener-watchlist-select"
                value={targetWatchlist}
                onChange={(e) => setTargetWatchlist(e.target.value)}
                className="select text-xs w-full"
              >
                {watchlistNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-2">
              No watchlists available. Create one in the sidebar first!
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MarketScreener;
