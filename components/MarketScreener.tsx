import React, { useState, useEffect } from 'react';
import { fetchMarketMovers, MarketMover } from '../services/marketService';
import { LoadingIcon, PlusIcon, SparklesIcon } from './icons';
import Modal from './Modal';
import { useSignals } from '../hooks/useSignals';
import SignalBadge from './SignalBadge';
import SparklineChart from './SparklineChart';
import type { ScreenerViewMode } from '../types';

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
  const [viewMode, setViewMode] = useState<ScreenerViewMode>('table');
  const [error, setError] = useState<string | null>(null);

  // Add to Watchlist modal state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [targetWatchlist, setTargetWatchlist] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const timeoutRef = React.useRef<any>(null);

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
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (watchlistNames.length > 0 && !targetWatchlist) {
      setTargetWatchlist(watchlistNames[0]);
    }
  }, [watchlistNames, targetWatchlist]);

  const handleOpenAddModal = (ticker: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSelectedTicker(ticker);
    setAddFeedback(null);
    if (watchlistNames.length > 0) {
      setTargetWatchlist(watchlistNames[0]);
    }
  };

  const handleCloseAddModal = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSelectedTicker(null);
    setAddFeedback(null);
  };

  const handleConfirmAdd = async () => {
    if (!selectedTicker || !targetWatchlist) return;
    setIsAdding(true);
    setAddFeedback(null);
    try {
      await onAddToWatchlist(selectedTicker, targetWatchlist);
      setAddFeedback(`Successfully added ${selectedTicker} to ${targetWatchlist}!`);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setSelectedTicker(null);
        setAddFeedback(null);
        timeoutRef.current = null;
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

  const formatDollarVolume = (dolVol: number): string => {
    if (dolVol >= 1_000_000_000) return `${(dolVol / 1_000_000_000).toFixed(1)}B`;
    if (dolVol >= 1_000_000) return `${(dolVol / 1_000_000).toFixed(1)}M`;
    if (dolVol >= 1_000) return `${(dolVol / 1_000).toFixed(0)}K`;
    return `${dolVol.toFixed(0)}`;
  };

  const getRawActiveList = (): MarketMover[] => {
    if (!moversData) return [];
    if (activeTab === 'gainers') return moversData.topGainers;
    if (activeTab === 'losers') return moversData.topLosers;
    return moversData.mostActive;
  };

  // Get active signals
  const activeList = getRawActiveList();
  const { signals } = useSignals(activeList);

  // Dollar volume floor for filtering
  const DISPLAY_DOLLAR_VOL_FLOOR = 500_000;

  // Smart sort:
  // Tier 1: High-attention real stocks (pinned to top, sorted by heat)
  // Tier 2: Regular stocks above dollar volume floor (sorted by heat)
  // Tier 3: Warrants (sorted by heat, visually tagged)
  // Tier 4: Ghost movers below dollar volume floor (dimmed)
  const sortedList = [...activeList].sort((a, b) => {
    const sigA = signals[a.ticker.toUpperCase()];
    const sigB = signals[b.ticker.toUpperCase()];
    if (!sigA && !sigB) return 0;
    if (!sigA) return 1;
    if (!sigB) return -1;

    // Tier assignment
    const tierOf = (sig: typeof sigA) => {
      if (!sig) return 4;
      if (sig.dollarVolume < DISPLAY_DOLLAR_VOL_FLOOR) return 4; // Ghost
      if (sig.isWarrant) return 3;                                 // Warrant
      if (sig.isHighAttention) return 1;                           // High attention
      return 2;                                                     // Normal
    };

    const tierA = tierOf(sigA);
    const tierB = tierOf(sigB);

    if (tierA !== tierB) return tierA - tierB;
    return sigB.heatScore - sigA.heatScore;
  });

  const displayedList = sortedList.slice(0, 30);

  return (
    <div className="card w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-pulse-border/40">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4.5 w-4.5 text-accent-primary animate-pulse" />
            <h2 className="text-base font-bold text-text-primary">Market Movers Alpha</h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Spot breakout movers, high-volume plays, and real-time alerts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-pulse-bg/85 border border-pulse-border p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-0.5 rounded text-[0.68rem] font-semibold transition-all ${
                viewMode === 'table' ? 'bg-pulse-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-0.5 rounded text-[0.68rem] font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-pulse-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Grid Cards
            </button>
          </div>

          {/* Tab Buttons */}
          <div className="flex bg-pulse-bg/85 border border-pulse-border p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'active' ? 'bg-accent-primary text-white shadow-md' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Active
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
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingIcon />
          <span className="ml-3 text-xs text-text-muted">Analyzing market volume…</span>
        </div>
      ) : error ? (
        <div className="text-xs text-loss py-4 text-center">{error}</div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pulse-border/30 text-[0.65rem] font-bold text-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-right">Chg</th>
                <th className="py-2.5 px-3 text-right">% Chg</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-center" style={{ minWidth: '160px' }}>Signal / Heat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pulse-border/20 text-xs">
              {displayedList.map((mover) => {
                const ticker = mover.ticker.toUpperCase();
                const signal = signals[ticker];
                const displayPrice = signal?.price ?? mover.price;
                const displayChangeUSD = signal?.changeUSD ?? mover.changeUSD;
                const displayChangePercent = signal?.changePercent ?? mover.changePercent;
                const isUp = displayChangePercent >= 0;
                const isStagnant = signal?.isStagnant;
                const isHigh = signal?.isHighAttention;
                const isGhost = signal ? signal.dollarVolume < DISPLAY_DOLLAR_VOL_FLOOR : false;
                const isWarrant = signal?.isWarrant ?? false;

                return (
                  <tr
                    key={mover.ticker}
                    className={`transition-all duration-500 hover:bg-pulse-surface/30 ${
                      isGhost ? 'opacity-20 hover:opacity-60' : ''
                    } ${isStagnant && !isGhost ? 'opacity-35 hover:opacity-90' : ''}`}
                    style={isHigh ? {
                      background: `linear-gradient(90deg, transparent 0%, hsla(${signal!.heatScore > 70 ? 25 : 270}, 80%, 50%, 0.06) 50%, transparent 100%)`,
                    } : undefined}
                  >
                    <td className="py-2.5 px-3 font-semibold text-text-primary flex items-center gap-1.5">
                      <span
                        className="font-mono cursor-pointer hover:text-accent-primary transition-colors"
                        onClick={() => onTickerClick?.(mover.ticker)}
                      >
                        {mover.ticker}
                      </span>
                      {/* Warrant Badge */}
                      {isWarrant && (
                        <span className="text-[0.55rem] font-bold px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" title="Warrant / Special Security">
                          W
                        </span>
                      )}
                      {/* Ghost / Low Liquidity Badge */}
                      {isGhost && (
                        <span className="text-[0.5rem] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/15" title={`Dollar Volume: $${signal ? formatDollarVolume(signal.dollarVolume) : '?'}`}>
                          LOW LIQ
                        </span>
                      )}
                      {!isGhost && (
                        <button
                          onClick={() => handleOpenAddModal(mover.ticker)}
                          className="p-1 rounded bg-gain-bg/20 text-gain hover:bg-gain/20 transition-colors"
                          title="Add to Watchlist"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                      ${displayPrice.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{displayChangeUSD.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-semibold ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{displayChangePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                      {formatVolume(mover.volume)}
                    </td>
                    <td className="py-2.5 px-3">
                      {signal ? (
                        <div className="flex items-center justify-center gap-2">
                          {/* Mini heat bar */}
                          <div className="hidden sm:block w-12 h-1.5 rounded-full bg-pulse-surface overflow-hidden" title={`Heat: ${signal.heatScore}/100 | $Vol: $${formatDollarVolume(signal.dollarVolume)}`}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${signal.heatScore}%`,
                                background: `linear-gradient(90deg, hsl(220, 60%, 40%), hsl(${Math.max(5, 220 - signal.heatScore * 2.15)}, ${60 + signal.heatScore * 0.35}%, ${35 + signal.heatScore * 0.2}%))`,
                              }}
                            />
                          </div>
                          <SignalBadge
                            heatScore={signal.heatScore}
                            isHighAttention={signal.isHighAttention}
                            triggers={signal.triggers}
                          />
                        </div>
                      ) : (
                        <span className="text-[0.65rem] text-text-muted font-mono">CALC...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayedList.map((mover) => {
            const ticker = mover.ticker.toUpperCase();
            const signal = signals[ticker];
            const displayPrice = signal?.price ?? mover.price;
            const displayChangePercent = signal?.changePercent ?? mover.changePercent;
            const isUp = displayChangePercent >= 0;
            const isStagnant = signal?.isStagnant;
            const isHigh = signal?.isHighAttention;
            const isGhost = signal ? signal.dollarVolume < DISPLAY_DOLLAR_VOL_FLOOR : false;
            const isWarrant = signal?.isWarrant ?? false;

            return (
              <div
                key={mover.ticker}
                onClick={() => !isGhost && onTickerClick?.(mover.ticker)}
                className={`card p-4 flex flex-col justify-between border relative overflow-hidden transition-all duration-300 ${
                  isGhost ? 'opacity-25 hover:opacity-50 cursor-default' : 'cursor-pointer hover:-translate-y-0.5'
                } ${isStagnant && !isGhost ? 'opacity-40 hover:opacity-100' : ''} ${
                  isHigh 
                    ? 'border-orange-500/50 bg-gradient-to-br from-pulse-surface to-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
                    : 'border-pulse-border hover:border-pulse-border-focus'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-text-primary hover:text-accent-primary transition-colors">
                        {mover.ticker}
                      </span>
                      {isWarrant && (
                        <span className="text-[0.5rem] font-bold px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">W</span>
                      )}
                      {isGhost && (
                        <span className="text-[0.45rem] font-bold px-0.5 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/15">LOW LIQ</span>
                      )}
                    </div>
                    <p className="text-[0.65rem] text-text-muted uppercase font-mono mt-0.5">
                      Vol: {formatVolume(mover.volume)} {signal ? `· $${formatDollarVolume(signal.dollarVolume)}` : ''}
                    </p>
                  </div>
                  {signal ? (
                    <SignalBadge
                      heatScore={signal.heatScore}
                      isHighAttention={signal.isHighAttention}
                      triggers={signal.triggers}
                    />
                  ) : (
                    <span className="text-[0.65rem] text-text-muted font-mono">...</span>
                  )}
                </div>

                {/* Price and Sparkline Row */}
                <div className="flex items-center justify-between mt-3 mb-2">
                  <div>
                    <span className="text-base font-bold font-mono text-text-secondary">
                      ${displayPrice.toFixed(2)}
                    </span>
                    <span className={`block text-[0.68rem] font-bold font-mono ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {isUp ? '+' : ''}{displayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SparklineChart
                      ticker={mover.ticker}
                      isPositive={isUp}
                      currentPrice={displayPrice}
                      width={90}
                      height={30}
                    />
                  </div>
                </div>

                {/* Footer Quick Action */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-pulse-border/20">
                  {!isGhost ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddModal(mover.ticker);
                      }}
                      className="text-[0.68rem] font-semibold text-gain bg-gain-bg/20 hover:bg-gain/20 px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Watchlist
                    </button>
                  ) : (
                    <span className="text-[0.55rem] text-red-400/50 font-mono">ILLIQUID</span>
                  )}
                  {isHigh && (
                    <span className="text-[0.6rem] font-bold text-orange-400 font-mono animate-pulse uppercase tracking-wider">
                      ⚠️ Spike Alert
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add To Watchlist Modal */}
      <Modal
        isOpen={selectedTicker !== null}
        onClose={handleCloseAddModal}
        title={`Add ${selectedTicker} to Watchlist`}
        actions={
          <>
            <button className="btn btn-secondary text-xs" onClick={handleCloseAddModal}>
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
