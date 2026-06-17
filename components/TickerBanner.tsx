import React from 'react';
import type { StockDataMap } from '../types';
import { UpArrowIcon, DownArrowIcon } from './icons';

interface TickerBannerProps {
  stockData: StockDataMap;
  onTickerClick: (ticker: string) => void;
}

const MARQUEE_TICKERS = ['SPY', 'QQQ', 'DIA', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN'];

const TickerBanner: React.FC<TickerBannerProps> = ({ stockData, onTickerClick }) => {
  // Duplicate list to achieve seamless infinite looping
  const displayItems = [...MARQUEE_TICKERS, ...MARQUEE_TICKERS, ...MARQUEE_TICKERS];

  return (
    <div className="w-full bg-pulse-bg/95 border-b border-pulse-border/40 py-1.5 overflow-hidden relative z-40">
      <div className="flex animate-marquee whitespace-nowrap">
        {displayItems.map((ticker, idx) => {
          const stock = stockData[ticker];
          const price = stock?.price;
          const changePercent = stock?.changePercent ?? 0;
          const isUp = changePercent >= 0;

          return (
            <div
              key={`${ticker}-${idx}`}
              onClick={() => onTickerClick(ticker)}
              className="inline-flex items-center mx-6 cursor-pointer hover:text-accent-primary transition-colors group"
            >
              <span className="font-mono font-bold text-xs text-text-primary group-hover:text-accent-primary transition-colors">
                {ticker}
              </span>
              {price !== undefined ? (
                <div className="flex items-center gap-1.5 ml-2 font-mono text-[0.7rem]">
                  <span className="text-text-secondary">${price.toFixed(2)}</span>
                  <span className={`flex items-center font-bold ${isUp ? 'text-gain' : 'text-loss'}`}>
                    {isUp ? (
                      <UpArrowIcon className="h-2.5 w-2.5 mr-0.5" />
                    ) : (
                      <DownArrowIcon className="h-2.5 w-2.5 mr-0.5" />
                    )}
                    {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-[0.62rem] text-text-muted font-mono ml-2">Loading...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TickerBanner;
