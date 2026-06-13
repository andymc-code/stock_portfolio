import React, { useRef, useEffect, useState } from 'react';
import type { StockData } from '../types';
import { UpArrowIcon, DownArrowIcon } from './icons';

interface StockDetailModalProps {
  ticker: string;
  stock?: StockData;
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist?: (ticker: string, watchlistName: string) => void;
  watchlistNames?: string[];
}

declare global {
  interface Window {
    TradingView: any;
  }
}

// Singleton script loader
let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (tvScriptPromise) return tvScriptPromise;
  if (window.TradingView) return Promise.resolve();

  tvScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TradingView script'));
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({
  ticker,
  stock,
  isOpen,
  onClose,
  onAddToWatchlist,
  watchlistNames = [],
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetInstanceRef = useRef<any>(null);
  const [chartError, setChartError] = useState(false);

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

  // Load TradingView widget when modal opens
  useEffect(() => {
    if (!isOpen || !ticker) return;

    let cancelled = false;
    setChartError(false);

    const initChart = async () => {
      try {
        await loadTradingViewScript();
        if (cancelled || !chartContainerRef.current) return;

        // Clear previous widget content
        chartContainerRef.current.innerHTML = '';
        widgetInstanceRef.current = null;

        // Create a unique container for this widget instance
        const containerId = `tv_chart_${Date.now()}`;
        const widgetDiv = document.createElement('div');
        widgetDiv.id = containerId;
        widgetDiv.style.height = '100%';
        widgetDiv.style.width = '100%';
        chartContainerRef.current.appendChild(widgetDiv);

        // Small delay to ensure DOM is ready
        await new Promise(r => setTimeout(r, 50));
        if (cancelled || !document.getElementById(containerId)) return;

        // Determine exchange prefix (NASDAQ vs NYSE) to ensure TradingView loads extended hours data correctly
        const getTradingViewSymbol = (symbolStr: string): string => {
          if (symbolStr.includes(':')) return symbolStr.toUpperCase();
          const upper = symbolStr.toUpperCase();
          const nyseTickers = new Set([
            'BRK.A', 'BRK.B', 'JPM', 'XOM', 'V', 'JNJ', 'LLY', 'TSM', 'WMT', 'UNH',
            'MA', 'PG', 'HD', 'ORCL', 'BAC', 'ABBV', 'CVX', 'MRK', 'CRM', 'TMO',
            'DIS', 'MCD', 'CSCO', 'ABT', 'VZ', 'NKE', 'PM', 'ADBE', 'IBM', 'AXP',
            'UNP', 'T', 'GE', 'PFE', 'LOW', 'RTX', 'WFC', 'C', 'CAT', 'UPS',
            'HON', 'GS', 'MS', 'BA', 'BMY', 'SBUX', 'DE', 'LMT', 'MMM'
          ]);
          return nyseTickers.has(upper) ? `NYSE:${upper}` : `NASDAQ:${upper}`;
        };

        widgetInstanceRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: getTradingViewSymbol(ticker),
          interval: '15',
          extended_hours: 'true',
          timezone: 'America/New_York',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          save_image: false,
          withdateranges: true,
          details: true,
          calendar: false,
          container_id: containerId,
          backgroundColor: 'rgba(10, 14, 23, 1)',
          gridColor: 'rgba(55, 65, 81, 0.15)',
          toolbar_bg: '#0a0e17',
          loading_screen: { backgroundColor: '#0a0e17', foregroundColor: '#6366f1' },
          enabled_features: ["pre_post_market_sessions"],
          overrides: {
            'paneProperties.background': '#0a0e17',
            'paneProperties.backgroundType': 'solid',
            'mainSeriesProperties.sessionId': 'extended',
            'mainSeriesProperties.candleStyle.upColor': '#10b981',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
          },
        });
      } catch (err) {
        console.error('Failed to load TradingView chart:', err);
        if (!cancelled) setChartError(true);
      }
    };

    initChart();

    return () => {
      cancelled = true;
      widgetInstanceRef.current = null;
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, [ticker, isOpen]);

  const priceChange = stock ? stock.changeUSD : 0;
  const priceChangePercent = stock ? stock.changePercent : 0;
  const isPositive = priceChange >= 0;

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="stock-detail-modal" aria-labelledby="stock-detail-title">
      <div className="stock-detail-modal__inner">
        {/* Header */}
        <div className="stock-detail-modal__header">
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

        {/* TradingView Chart */}
        <div className="stock-detail-modal__chart" style={{ minHeight: '480px' }}>
          {chartError ? (
            <div className="flex items-center justify-center h-[480px] text-text-muted text-sm">
              <span>Unable to load chart. Please try again later.</span>
            </div>
          ) : (
            <div
              ref={chartContainerRef}
              style={{ width: '100%', height: '480px' }}
            />
          )}
        </div>

        {/* Add to Watchlist Quick Action */}
        {onAddToWatchlist && watchlistNames.length > 0 && (
          <div className="stock-detail-modal__actions">
            <span className="text-xs text-text-muted">Quick add to:</span>
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
