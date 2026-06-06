import React, { useRef, useEffect, useState } from 'react';
import { createChart, ColorType, CrosshairMode, AreaSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { fetchCandleData, type TimeRange, type CandleData } from '../services/candleService';
import type { StockData } from '../types';
import { UpArrowIcon, DownArrowIcon, LoadingIcon } from './icons';

interface StockDetailModalProps {
  ticker: string;
  stock?: StockData;
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist?: (ticker: string, watchlistName: string) => void;
  watchlistNames?: string[];
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'YTD'];

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
  const chartRef = useRef<IChartApi | null>(null);

  const [selectedRange, setSelectedRange] = useState<TimeRange>('3M');
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');

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

  // Fetch candle data when ticker or range changes
  useEffect(() => {
    if (!isOpen || !ticker) return;
    let cancelled = false;

    const loadCandles = async () => {
      setIsLoading(true);
      try {
        const data = await fetchCandleData(ticker, selectedRange);
        if (!cancelled) {
          setCandleData(data);
        }
      } catch (err) {
        console.error('Failed to load candle data:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCandles();
    return () => { cancelled = true; };
  }, [ticker, selectedRange, isOpen]);

  // Create/update chart when data or chart type changes
  useEffect(() => {
    if (!chartContainerRef.current || candleData.length === 0 || !isOpen) return;

    // Remove previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const isPositive = candleData.length > 1 
      ? candleData[candleData.length - 1].close >= candleData[0].open 
      : true;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(55, 65, 81, 0.15)' },
        horzLines: { color: 'rgba(55, 65, 81, 0.15)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(55, 65, 81, 0.3)',
        scaleMargins: { top: 0.1, bottom: 0.15 },
      },
      timeScale: {
        borderColor: 'rgba(55, 65, 81, 0.3)',
        timeVisible: selectedRange === '1D' || selectedRange === '1W',
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    if (chartType === 'candlestick') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      candleSeries.setData(
        candleData.map(c => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: isPositive ? '#10b981' : '#ef4444',
        topColor: isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
        bottomColor: isPositive ? 'rgba(16, 185, 129, 0.01)' : 'rgba(239, 68, 68, 0.01)',
        lineWidth: 2,
        priceLineVisible: true,
        priceLineColor: isPositive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: isPositive ? '#10b981' : '#ef4444',
      });

      areaSeries.setData(
        candleData.map(c => ({
          time: c.time as any,
          value: c.close,
        }))
      );
    }

    // Add volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(99, 102, 241, 0.2)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(
      candleData.map(c => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }))
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // Handle resize
    const observer = new ResizeObserver(() => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candleData, chartType, isOpen, selectedRange]);

  // Calculate stats
  const priceChange = stock ? stock.changeUSD : 0;
  const priceChangePercent = stock ? stock.changePercent : 0;
  const isPositive = priceChange >= 0;

  const rangeHigh = candleData.length > 0 ? Math.max(...candleData.map(c => c.high)) : 0;
  const rangeLow = candleData.length > 0 ? Math.min(...candleData.map(c => c.low)) : 0;
  const avgVolume = candleData.length > 0
    ? candleData.reduce((sum, c) => sum + c.volume, 0) / candleData.length
    : 0;

  const formatVolume = (vol: number): string => {
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

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

        {/* Chart Controls */}
        <div className="stock-detail-modal__controls">
          {/* Time range selector */}
          <div className="flex bg-pulse-bg/85 border border-pulse-border p-0.5 rounded-lg">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2.5 py-1 text-[0.65rem] font-bold rounded-md transition-all ${
                  selectedRange === range
                    ? 'bg-accent-primary text-white shadow-md'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex bg-pulse-bg/85 border border-pulse-border p-0.5 rounded-lg">
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-[0.65rem] font-bold rounded-md transition-all ${
                chartType === 'area'
                  ? 'bg-accent-primary text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2.5 py-1 text-[0.65rem] font-bold rounded-md transition-all ${
                chartType === 'candlestick'
                  ? 'bg-accent-primary text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Candle
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="stock-detail-modal__chart">
          {isLoading ? (
            <div className="flex items-center justify-center h-[360px]">
              <LoadingIcon />
              <span className="ml-2 text-xs text-text-muted">Loading chart data…</span>
            </div>
          ) : (
            <div ref={chartContainerRef} className="w-full" />
          )}
        </div>

        {/* Stats Grid */}
        <div className="stock-detail-modal__stats">
          <div className="stat-item">
            <span className="stat-label">Range High</span>
            <span className="stat-value">${rangeHigh.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Range Low</span>
            <span className="stat-value">${rangeLow.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Volume</span>
            <span className="stat-value">{formatVolume(avgVolume)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Daily Change</span>
            <span className={`stat-value ${isPositive ? 'text-gain' : 'text-loss'}`}>
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
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
