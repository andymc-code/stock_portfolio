
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface PortfolioChartProps {
  data: ChartData[];
}

const COLORS = ['#00FF41', '#39FF14', '#008F11', '#7FFF00', '#ADFF2F', '#00C49F'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-black p-2 border border-matrix-border rounded-none shadow-lg">
          <p className="font-bold text-matrix-green">{`${data.name}: $${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
          <p className="text-sm text-green-400">{`(${(data.payload.percent * 100).toFixed(2)}%)`}</p>
        </div>
      );
    }
    return null;
  };

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
            wrapperStyle={{fontSize: '12px', color: '#00FF41'}} 
            layout="vertical" 
            align="right" 
            verticalAlign="middle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PortfolioChart;