import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatMetricValue } from './TargetMeterView';

const PALETTE = [
  '#2563EB', '#7C3AED', '#0891B2', '#059669', '#D97706',
  '#DC2626', '#6366F1', '#F97316', '#14B8A6', '#EC4899'
];

export default function ChartView({ data, configuration }) {
  const chartType = configuration?.chart_type || 'bar';
  const prefix = configuration?.prefix || '';
  const suffix = configuration?.suffix || '';

  const chartData = Array.isArray(data) ? data : (data?.data || []);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-xs">
        No chart data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs">
        <div className="font-bold text-gray-900 mb-1">{label || payload[0]?.name}</div>
        <div className="text-blue-600 font-semibold">
          {formatMetricValue(payload[0]?.value, prefix, suffix)}
        </div>
      </div>
    );
  };

  // Horizontal Bar Chart
  if (chartType === 'horizontal_bar') {
    return (
      <div className="w-full h-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => formatMetricValue(v, prefix, suffix)}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 11 }}
              width={100}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
            <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Line Chart
  if (chartType === 'line') {
    return (
      <div className="w-full h-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              angle={chartData.length > 5 ? -20 : 0}
              textAnchor={chartData.length > 5 ? 'end' : 'middle'}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => formatMetricValue(v, prefix, suffix)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563EB' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Donut Chart
  if (chartType === 'donut' || chartType === 'pie') {
    const isDonut = chartType === 'donut';
    return (
      <div className="w-full h-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 50 : 0}
              outerRadius={75}
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 4 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Standard Vertical Bar Chart (Default)
  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: chartData.length > 5 ? 25 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748B', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            angle={chartData.length > 5 ? -25 : 0}
            textAnchor={chartData.length > 5 ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => formatMetricValue(v, prefix, suffix)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
          <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={26}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

