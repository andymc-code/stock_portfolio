import React, { useMemo } from 'react';
import type { StockDataMap } from '../types';

interface SentimentGaugeProps {
  stockData: StockDataMap;
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ stockData }) => {
  const sentiment = useMemo(() => {
    const stocks = Object.values(stockData);
    if (stocks.length === 0) return { score: 50, label: 'Neutral' };

    let advancing = 0;
    let totalChange = 0;

    stocks.forEach(s => {
      if (s.changePercent > 0) advancing++;
      totalChange += s.changePercent;
    });

    const advancingRatio = advancing / stocks.length; // 0 to 1
    const avgChange = totalChange / stocks.length; // e.g. -5 to +5

    // Map average change to a 0-1 score, capped at -4% and +4%
    const changeScore = Math.max(0, Math.min((avgChange + 4) / 8, 1));

    // Combine advancing ratio and change score (50/50 weighting)
    const rawScore = (advancingRatio * 0.5 + changeScore * 0.5) * 100;
    const score = Math.max(1, Math.min(Math.round(rawScore), 100));

    let label = 'Neutral';
    let colorClass = 'text-text-muted';
    let colorHSL = 'hsl(270, 70%, 50%)'; // Neutral purple

    if (score >= 85) {
      label = 'Extreme Greed';
      colorClass = 'text-gain font-extrabold';
      colorHSL = 'hsl(5, 95%, 50%)'; // Bright Red/Greed
    } else if (score >= 65) {
      label = 'Greed';
      colorClass = 'text-gain font-bold';
      colorHSL = 'hsl(30, 90%, 50%)'; // Orange
    } else if (score >= 35) {
      label = 'Neutral';
      colorClass = 'text-text-primary';
      colorHSL = 'hsl(190, 70%, 45%)'; // Teal
    } else if (score >= 15) {
      label = 'Fear';
      colorClass = 'text-loss';
      colorHSL = 'hsl(230, 60%, 45%)'; // Blue/Fear
    } else {
      label = 'Extreme Fear';
      colorClass = 'text-loss font-extrabold';
      colorHSL = 'hsl(250, 60%, 35%)'; // Indigo/Deep Fear
    }

    return { score, label, colorClass, colorHSL, advancing, declining: stocks.length - advancing };
  }, [stockData]);

  // Compute needle rotation angle (semi-circle goes from -90deg to +90deg)
  const angle = -90 + (sentiment.score / 100) * 180;

  return (
    <div className="card w-full flex flex-col items-center p-4">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 self-start">
        Market Pulse Sentiment
      </h3>

      <div className="relative w-44 h-22 flex items-end justify-center overflow-hidden">
        {/* Semi-circle dial background */}
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(250, 60%, 35%)" /> {/* Indigo / Extreme Fear */}
              <stop offset="25%" stopColor="hsl(230, 60%, 45%)" /> {/* Blue / Fear */}
              <stop offset="50%" stopColor="hsl(190, 70%, 45%)" /> {/* Teal / Neutral */}
              <stop offset="75%" stopColor="hsl(30, 90%, 50%)" /> {/* Orange / Greed */}
              <stop offset="100%" stopColor="hsl(5, 95%, 50%)" /> {/* Red / Extreme Greed */}
            </linearGradient>
          </defs>
          
          {/* Dial Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Dial Needle */}
          <g transform="translate(50, 50)">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-38"
              stroke="var(--color-text-primary, #ffffff)"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${angle})`}
              className="transition-transform duration-1000 ease-out"
            />
            <circle cx="0" cy="0" r="4.5" fill="var(--color-text-primary, #ffffff)" />
          </g>
        </svg>
      </div>

      {/* Text displaying the Sentiment Score */}
      <div className="text-center mt-2">
        <span className="text-2xl font-black font-mono tracking-tight text-text-primary block leading-none">
          {sentiment.score}
        </span>
        <span className={`text-[0.68rem] uppercase tracking-wider font-extrabold block mt-1 ${sentiment.colorClass}`}>
          {sentiment.label}
        </span>
      </div>

      {/* Mini Breadth Info Stats */}
      <div className="w-full flex justify-between mt-3 text-[0.62rem] text-text-muted font-mono border-t border-pulse-border/20 pt-2.5">
        <span>Advancing: <span className="text-gain font-semibold">{sentiment.advancing}</span></span>
        <span>Declining: <span className="text-loss font-semibold">{sentiment.declining}</span></span>
      </div>
    </div>
  );
};

export default SentimentGauge;
