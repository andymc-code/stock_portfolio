import React, { useRef, useEffect, useState } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { fetchCandleData } from '../services/candleService';

interface SparklineChartProps {
  ticker: string;
  isPositive: boolean;
  currentPrice?: number;
  width?: number;
  height?: number;
}

/**
 * Tiny inline area chart for stock cards.
 * Shows last 5 trading days of price data.
 */
const SparklineChart: React.FC<SparklineChartProps> = ({
  ticker,
  isPositive,
  currentPrice,
  width = 80,
  height = 32,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [hasData, setHasData] = useState(false);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const positiveColor = '#10b981';
    const negativeColor = '#ef4444';
    const lineColor = isPositive ? positiveColor : negativeColor;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false,
        borderVisible: false,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      bottomColor: isPositive ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    seriesRef.current = areaSeries;
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isPositive, width, height]);

  // Load candle data
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const candles = await fetchCandleData(ticker, '1W', currentPrice);
        if (cancelled || !seriesRef.current) return;

        if (candles.length > 0) {
          const lineData = candles.map(c => ({
            time: c.time as any,
            value: c.close,
          }));
          seriesRef.current.setData(lineData);
          chartRef.current?.timeScale().fitContent();
          setHasData(true);
        }
      } catch {
        // Silent fail for sparklines
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [ticker, currentPrice]);

  return (
    <div
      ref={containerRef}
      className="sparkline-container"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        opacity: hasData ? 1 : 0,
        visibility: hasData ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};

export default SparklineChart;
