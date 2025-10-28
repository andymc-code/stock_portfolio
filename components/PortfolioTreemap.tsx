
import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import type { PortfolioHolding, StockDataMap } from '../types';

interface TreemapData {
    name: string;
    value: number;
    changePercent: number;
    shares: number;
}

interface PortfolioTreemapProps {
  portfolioData: (PortfolioHolding & { value: number; name: string; })[];
  stockData: StockDataMap;
}

// Custom content renderer for the treemap
const CustomizedContent = (props: any) => {
    const { depth, x, y, width, height, name, changePercent } = props;

    if (width < 20 || height < 20) {
        return null;
    }

    // Determine color based on performance
    const colorScale = (percent: number) => {
        if (percent > 1.5) return 'hsl(137, 100%, 35%)';
        if (percent > 0) return 'hsl(137, 100%, 25%)';
        if (percent < -1.5) return 'hsl(0, 100%, 40%)';
        if (percent < 0) return 'hsl(0, 100%, 30%)';
        return 'rgba(128, 128, 128, 0.2)'; // Neutral
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
                    stroke: '#0D0D0D',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 40 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                    className="font-mono"
                >
                    {name}
                </text>
            )}
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const changeColor = data.changePercent >= 0 ? 'text-matrix-green' : 'text-matrix-red';
      return (
        <div className="bg-black p-3 border border-matrix-border rounded-none shadow-lg text-sm">
          <p className="font-bold text-matrix-green text-base mb-1">{`${data.name}`}</p>
          <p className="text-matrix-green/80">Value: ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className={changeColor}>Change: {data.changePercent.toFixed(2)}%</p>
          <p className="text-matrix-green/80">Shares: {data.shares}</p>
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
        return <div className="text-center text-matrix-green/50 flex items-center justify-center h-full">Add holdings to see portfolio allocation.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <Treemap
                data={treemapData}
                dataKey="value"
                nameKey="name"
                aspectRatio={4 / 3}
                stroke="#0D0D0D"
                isAnimationActive={true}
                animationDuration={800}
                content={<CustomizedContent />}
            >
                <Tooltip content={<CustomTooltip />} />
            </Treemap>
        </ResponsiveContainer>
    );
};

export default PortfolioTreemap;