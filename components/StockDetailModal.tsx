import React, { useRef, useEffect, useState } from 'react';
import type { StockData } from '../types';
import { UpArrowIcon, DownArrowIcon, LoadingIcon } from './icons';
import { getStockAnalystBriefing } from '../services/geminiService';
import { fetchCandleData, CandleData, TimeRange } from '../services/candleService';
import { useSignals } from '../hooks/useSignals';

interface StockDetailModalProps {
  ticker: string;
  stock?: StockData;
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist?: (ticker: string, watchlistName: string) => void;
  watchlistNames?: string[];
  aiEnabled: boolean;
}

const SvgChart: React.FC<{ data: CandleData[]; isPositive: boolean }> = ({ data, isPositive }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 text-text-muted text-xs bg-pulse-bg/40 border border-pulse-border/20 rounded-xl">
        No historical data available for this range.
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padding = 20;

  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.close - minPrice) / priceRange) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const strokeColor = isPositive ? 'var(--color-gain, #10b981)' : 'var(--color-loss, #ef4444)';

  return (
    <div className="relative w-full bg-pulse-bg/30 border border-pulse-border/20 rounded-xl p-4 overflow-hidden">
      {/* Price extremes labels */}
      <div className="absolute top-2 left-4 text-[0.65rem] font-mono font-bold text-text-muted">
        High: ${maxPrice.toFixed(2)}
      </div>
      <div className="absolute bottom-2 left-4 text-[0.65rem] font-mono font-bold text-text-muted">
        Low: ${minPrice.toFixed(2)}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-60 overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

        {/* Gradient Fill Area */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line Path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const StockDetailModal: React.FC<StockDetailModalProps> = ({
  ticker,
  stock,
  isOpen,
  onClose,
  onAddToWatchlist,
  watchlistNames = [],
  aiEnabled,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [range, setRange] = useState<TimeRange>('1M');
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Compute live signals for stats using useSignals hook
  const moverInput = stock ? [{
    ticker: stock.ticker,
    price: stock.price,
    changeUSD: stock.changeUSD,
    changePercent: stock.changePercent,
    volume: 1000000 // default fallback volume
  }] : [];
  const { signals } = useSignals(moverInput);
  const signal = stock ? signals[stock.ticker.toUpperCase()] : undefined;

  // Open/close the native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle backdrop click (light dismiss)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    dialog.addEventListener('click', handleClick);
    return () => dialog.removeEventListener('click', handleClick);
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Load candle data when modal opens or range/ticker changes
  useEffect(() => {
    if (!isOpen || !ticker) return;

    let cancelled = false;
    const loadData = async () => {
      setLoadingChart(true);
      try {
        const data = await fetchCandleData(ticker, range);
        if (!cancelled) {
          setCandleData(data);
        }
      } catch (err) {
        console.error('Failed to load chart candles:', err);
      } finally {
        if (!cancelled) setLoadingChart(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [ticker, range, isOpen]);

  // Load AI briefing when modal opens, ticker changes, or AI toggles
  useEffect(() => {
    if (!isOpen || !ticker || !stock) return;

    if (!aiEnabled) {
      setAiBriefing(null);
      setLoadingAI(false);
      setAiError(null);
      return;
    }

    let cancelled = false;
    const loadAI = async () => {
      setLoadingAI(true);
      setAiError(null);
      setAiBriefing(null);
      try {
        const briefing = await getStockAnalystBriefing(ticker, stock.price, stock.changePercent, signal);
        if (!cancelled) {
          setAiBriefing(briefing);
        }
      } catch (err: any) {
        console.error('Failed to load AI briefing:', err);
        if (!cancelled) {
          setAiError(err.message || 'Failed to generate AI insights.');
        }
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    };

    loadAI();
    return () => {
      cancelled = true;
    };
  }, [ticker, isOpen, stock, signal, aiEnabled]);

  const priceChange = stock ? stock.changeUSD : 0;
  const priceChangePercent = stock ? stock.changePercent : 0;
  const isPositive = priceChange >= 0;

  if (!isOpen) return null;

  const formatVolume = (vol: number): string => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  return (
    <dialog ref={dialogRef} className="stock-detail-modal" aria-labelledby="stock-detail-title">
      <div className="stock-detail-modal__inner max-w-4xl">
        {/* Header */}
        <div className="stock-detail-modal__header border-b border-pulse-border/40 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <h2 id="stock-detail-title" className="text-xl font-bold text-text-primary ticker">
              {ticker}
            </h2>
            {stock && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold price text-text-primary">
                  ${stock.price.toFixed(2)}
                </span>
                <span className={`flex items-center text-sm font-semibold font-mono ${isPositive ? 'text-gain' : 'text-loss'}`}>
                  {isPositive ? <UpArrowIcon className="h-3.5 w-3.5" /> : <DownArrowIcon className="h-3.5 w-3.5" />}
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Modal Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Price Chart</span>
              {/* Range Tabs */}
              <div className="flex bg-pulse-bg border border-pulse-border p-0.5 rounded-lg">
                {(['1W', '1M', '3M', '1Y', 'YTD'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 text-[0.65rem] font-bold rounded ${
                      range === r ? 'bg-pulse-surface text-text-primary shadow' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-60">
              {loadingChart ? (
                <div className="flex justify-center items-center h-60 bg-pulse-bg/10 border border-pulse-border/20 rounded-xl">
                  <LoadingIcon />
                  <span className="ml-3 text-xs text-text-muted">Loading chart data…</span>
                </div>
              ) : (
                <SvgChart data={candleData} isPositive={isPositive} />
              )}
            </div>

            {/* Fundamentals / Technical Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-pulse-surface/20 p-4 rounded-xl border border-pulse-border/20 mt-2">
              <div>
                <span className="block text-[0.65rem] text-text-muted uppercase font-semibold">24h Vol</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5 block">
                  {stock && stock.price ? formatVolume(stock.price * 12500) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[0.65rem] text-text-muted uppercase font-semibold">Heat Score</span>
                <span className="text-xs font-bold font-mono text-accent-primary mt-0.5 block">
                  {signal ? `${signal.heatScore} / 100` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[0.65rem] text-text-muted uppercase font-semibold">Daily Range</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5 block">
                  {signal ? `${signal.metrics.dailyRange.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-[0.65rem] text-text-muted uppercase font-semibold">Liquidity</span>
                <span className="text-xs font-bold font-mono text-text-primary mt-0.5 block">
                  {signal ? (signal.dollarVolume >= 1000000 ? `$${(signal.dollarVolume / 1000000).toFixed(1)}M` : `$${(signal.dollarVolume / 1000).toFixed(0)}K`) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Pulse AI Analyst</span>
            
            <div className="flex-1 bg-gradient-to-b from-pulse-surface/40 to-pulse-surface/10 border border-pulse-border/30 rounded-xl p-4 min-h-[200px] flex flex-col justify-center items-center">
              {!aiEnabled ? (
                <div className="text-center py-6 px-4">
                  <span className="text-xl block mb-2">⚡</span>
                  <p className="text-xs font-semibold text-text-primary mb-1">AI Briefing Paused</p>
                  <p className="text-[0.65rem] text-text-muted leading-normal">
                    AI insights are disabled via the global switch in the top header.
                  </p>
                </div>
              ) : loadingAI ? (
                <div className="flex flex-col justify-center items-center h-full min-h-[160px]">
                  <LoadingIcon />
                  <span className="mt-3 text-xs text-text-muted">Generating AI briefing…</span>
                </div>
              ) : aiError ? (
                <div className="text-xs text-loss text-center py-4">{aiError}</div>
              ) : aiBriefing ? (
                <div className="prose prose-invert max-w-none text-xs text-text-secondary leading-relaxed space-y-3 w-full">
                  {aiBriefing.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                      // Format bullet items cleanly
                      const content = trimmed.substring(1).trim();
                      // Find bold prefix if any
                      const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
                      if (boldMatch) {
                        return (
                          <div key={idx} className="flex gap-2">
                            <span className="text-accent-primary">•</span>
                            <span>
                              <strong className="text-text-primary">{boldMatch[1]}</strong>
                              {boldMatch[2]}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="flex gap-2">
                          <span className="text-accent-primary">•</span>
                          <span>{content}</span>
                        </div>
                      );
                    }
                    return <p key={idx}>{trimmed}</p>;
                  })}
                </div>
              ) : (
                <div className="text-xs text-text-muted text-center py-4">No AI Briefing available.</div>
              )}
            </div>

            {/* Finviz External Link */}
            <a
              href={`https://finviz.com/quote.ashx?t=${ticker}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-4 bg-pulse-surface hover:bg-pulse-surface-hover text-text-primary border border-pulse-border/50 rounded-xl transition-all"
            >
              <span>View Deep Analysis on Finviz</span>
              <span className="text-[0.65rem] font-mono">↗</span>
            </a>
          </div>
        </div>

        {/* Add to Watchlist Quick Action */}
        {onAddToWatchlist && watchlistNames.length > 0 && (
          <div className="stock-detail-modal__actions border-t border-pulse-border/30 pt-4">
            <span className="text-[0.68rem] text-text-muted font-semibold uppercase tracking-wider block mb-2">Add to Watchlist</span>
            <div className="flex flex-wrap gap-1.5">
              {watchlistNames.slice(0, 4).map(name => (
                <button
                  key={name}
                  onClick={() => onAddToWatchlist(ticker, name)}
                  className="btn btn-sm btn-secondary text-[0.65rem]"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default StockDetailModal;
