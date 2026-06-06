import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import type { PortfolioHoldingWithValue, StockDataMap } from '../types';

interface TreemapData {
  name: string;
  value: number;
  changePercent: number;
  shares: number;
  [key: string]: string | number;
}

interface PortfolioTreemapProps {
  portfolioData: PortfolioHoldingWithValue[];
  stockData: StockDataMap;
}

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, changePercent } = props;

  if (width < 20 || height < 20) return null;

  const colorScale = (percent: number) => {
    if (percent > 1.5) return 'hsl(160, 65%, 30%)';
    if (percent > 0) return 'hsl(160, 55%, 22%)';
    if (percent < -1.5) return 'hsl(0, 70%, 35%)';
    if (percent < 0) return 'hsl(0, 60%, 28%)';
    return 'rgba(100, 116, 139, 0.2)';
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colorScale(changePercent),
          stroke: '#0a0e17',
          strokeWidth: 2,
          rx: 4,
        }}
      />
      {width > 45 && height > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 2}
            textAnchor="middle"
            fill="#ffffff"
            stroke="none"
            fontSize={12}
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
          >
            {name}
          </text>
          {height > 50 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 14}
              textAnchor="middle"
              fill="#ffffff"
              stroke="none"
              fontSize={10}
              fontFamily="'JetBrains Mono', monospace"
              style={{ opacity: 0.85 }}
            >
              {changePercent >= 0 ? '+' : ''}{changePercent?.toFixed(1)}%
            </text>
          )}
        </>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.changePercent >= 0;
    return (
      <div className="bg-pulse-surface p-3 border border-pulse-border rounded-lg shadow-xl text-xs">
        <p className="font-bold text-text-primary text-sm mb-1">{data.name}</p>
        <p className="text-text-secondary">
          Value: <span className="price text-text-primary">${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
        <p className={isUp ? 'text-gain' : 'text-loss'}>
          Change: {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
        </p>
        <p className="text-text-muted">Shares: {data.shares}</p>
      </div>
    );
  }
  return null;
};

const PortfolioTreemap: React.FC<PortfolioTreemapProps> = ({ portfolioData, stockData }) => {
  const treemapData: TreemapData[] = portfolioData.map(holding => {
    const stockInfo = stockData[holding.ticker];
    return {
      name: holding.name,
      value: holding.value,
      shares: holding.shares,
      changePercent: stockInfo?.changePercent || 0,
    };
  });

  if (!treemapData || treemapData.length === 0) {
    return (
      <div className="text-center text-text-muted text-xs flex items-center justify-center h-full">
        Add holdings to see allocation.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treemapData}
        dataKey="value"
        nameKey="name"
        aspectRatio={4 / 3}
        stroke="#0a0e17"
        isAnimationActive={true}
        animationDuration={600}
        content={<CustomizedContent />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

export default PortfolioTreemap;