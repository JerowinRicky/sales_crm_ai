import React, { useState } from 'react';
import {
  Layers, Building2, BarChart2, Table, LayoutGrid,
  TrendingUp, CheckCircle, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { formatMetricValue } from './TargetMeterView';

const DOMAIN_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#64748B'
];

export default function DomainLeadsView({ data, configuration, onRefresh }) {
  const [viewMode, setViewMode] = useState(configuration?.display_type || 'cards'); // 'cards', 'bar', 'table'
  const [metricMode, setMetricMode] = useState(configuration?.metric === 'value' ? 'value' : 'count'); // 'count', 'value'

  if (!data) return null;

  const {
    items = [],
    total_leads = 0,
    total_pipeline_value = 0,
    total_won_value = 0,
    total_won_deals = 0,
    domains_count = 0,
    prefix = '₹'
  } = data;

  const chartData = items.map((item, idx) => ({
    name: item.domain_name,
    count: item.lead_count,
    value: item.total_value,
    color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length]
  }));

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
          <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
            Total Domains
          </div>
          <div className="text-xl font-black text-blue-950 mt-0.5">{domains_count}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
          <div className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
            Total Leads
          </div>
          <div className="text-xl font-black text-purple-950 mt-0.5">
            {total_leads.toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
          <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
            Pipeline Value
          </div>
          <div className="text-xl font-black text-emerald-950 mt-0.5">
            {formatMetricValue(total_pipeline_value, prefix)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
          <div className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
            Won Deals / Value
          </div>
          <div className="text-xl font-black text-amber-950 mt-0.5 truncate">
            {total_won_deals} <span className="text-xs font-semibold text-amber-700">({formatMetricValue(total_won_value, prefix)})</span>
          </div>
        </div>
      </div>

      {/* Mode Controls Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        {/* Metric Selector */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              metricMode === 'count'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            By Lead Count
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('value')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              metricMode === 'value'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            By Pipeline Value (₹)
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            title="Grid Cards View"
            className={`p-1.5 rounded-md transition ${
              viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bar')}
            title="Bar Chart View"
            className={`p-1.5 rounded-md transition ${
              viewMode === 'bar' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <BarChart2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Detailed Table View"
            className={`p-1.5 rounded-md transition ${
              viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Table size={14} />
          </button>
        </div>
      </div>

      {/* Content depending on viewMode */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
            <Layers size={28} className="text-gray-300 mb-2" />
            <span className="text-xs font-semibold text-gray-600">No domain leads found</span>
          </div>
        ) : viewMode === 'bar' ? (
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={v => metricMode === 'value' ? formatMetricValue(v, prefix) : v}
                />
                <Tooltip
                  formatter={(val) => [
                    metricMode === 'value' ? formatMetricValue(val, prefix) : `${val} Leads`,
                    metricMode === 'value' ? 'Pipeline Value' : 'Lead Count'
                  ]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey={metricMode === 'value' ? 'value' : 'count'}
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold sticky top-0 border-b border-gray-200">
              <tr>
                <th className="py-2 px-3">Domain</th>
                <th className="py-2 px-3 text-right">Leads</th>
                <th className="py-2 px-3 text-right">Share (%)</th>
                <th className="py-2 px-3 text-right">Pipeline Value</th>
                <th className="py-2 px-3 text-right">Won Deals</th>
                <th className="py-2 px-3 text-right">Won Value</th>
                <th className="py-2 px-3 text-right">Avg Deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={item.domain_id || idx} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-bold text-gray-900 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DOMAIN_COLORS[idx % DOMAIN_COLORS.length] }}
                    />
                    {item.domain_name}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-gray-800">
                    {item.lead_count}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-500">
                    {item.share_percent}%
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-gray-900">
                    {formatMetricValue(item.total_value, prefix)}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                    {item.won_count}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                    {formatMetricValue(item.won_value, prefix)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {formatMetricValue(item.avg_deal_size, prefix)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {items.map((item, idx) => {
              const color = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
              const share = metricMode === 'value' ? item.value_share_percent : item.share_percent;

              return (
                <div
                  key={item.domain_id || idx}
                  className="p-3 rounded-xl border border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-xs transition space-y-2 relative overflow-hidden group"
                >
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {item.domain_name}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {share}% share
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                    <div>
                      <div className="text-[10px] text-gray-400 font-medium">Lead Volume</div>
                      <div className="text-sm font-black text-gray-900 mt-0.5">
                        {item.lead_count} Leads
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-medium">Pipeline Value</div>
                      <div className="text-sm font-black text-blue-900 mt-0.5">
                        {formatMetricValue(item.total_value, prefix)}
                      </div>
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(share, 100)}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <span className="text-emerald-700 font-semibold">
                      Won: {item.won_count} ({formatMetricValue(item.won_value, prefix)})
                    </span>
                    <span>Avg Deal: {formatMetricValue(item.avg_deal_size, prefix)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

