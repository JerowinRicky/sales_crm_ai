import React, { useState } from 'react';
import {
  Users, User, Search, Filter, ArrowRight,
  TrendingUp, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatMetricValue } from './TargetMeterView';

export default function IndividualLptqcView({ data, configuration, onRefresh }) {
  const [metricMode, setMetricMode] = useState(configuration?.default_metric === 'value' ? 'value' : 'count'); // 'count' or 'value'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  if (!data) return null;

  const {
    items = [],
    stage_totals = {},
    stages_legend = [
      { code: 'L', label: 'Lead', fullName: 'New Lead', color: '#6366f1' },
      { code: 'P', label: 'Prospect', fullName: 'Prospect', color: '#0ea5e9' },
      { code: 'T', label: 'Technical', fullName: 'Demo - POC', color: '#f59e0b' },
      { code: 'Q', label: 'Quotation', fullName: 'Proposal', color: '#f97316' },
      { code: 'C', label: 'Closed', fullName: 'Won / PO Scheduled', color: '#16a34a' }
    ],
    is_single_user = false,
    prefix = '₹'
  } = data;

  const filteredItems = items.filter(u =>
    u.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* Header Legend: L - P - T - Q - C Explanation */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-gray-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
            Funnel:
          </span>
          {stages_legend.map(stg => (
            <div
              key={stg.code}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
              style={{
                backgroundColor: `${stg.color}15`,
                color: stg.color,
                borderColor: `${stg.color}35`
              }}
              title={stg.fullName}
            >
              <span>{stg.code}</span>
              <span className="text-[10px] font-medium opacity-80 hidden sm:inline">
                ({stg.label})
              </span>
            </div>
          ))}
        </div>

        {/* Metric Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs shrink-0">
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              metricMode === 'count'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Leads Count
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
            Pipeline Value (₹)
          </button>
        </div>
      </div>

      {/* If single user mode, show focused cards */}
      {is_single_user && items.length === 1 ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {items[0].user_name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">{items[0].user_name}</h4>
                <p className="text-[10px] text-gray-500">{items[0].email} • {items[0].role_name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-medium block">Total Pipeline</span>
              <span className="text-sm font-black text-gray-900">
                {formatMetricValue(items[0].total_value, prefix)} ({items[0].total_count} Leads)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stages_legend.map(stg => {
              const stageData = items[0][stg.code] || { count: 0, value: 0 };
              return (
                <div
                  key={stg.code}
                  className="p-3 rounded-xl border text-center space-y-1 relative overflow-hidden"
                  style={{
                    backgroundColor: `${stg.color}08`,
                    borderColor: `${stg.color}30`
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md mx-auto font-black text-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: stg.color }}
                  >
                    {stg.code}
                  </div>
                  <div className="text-[11px] font-bold text-gray-700">{stg.label}</div>
                  <div className="text-lg font-black text-gray-900">
                    {stageData.count}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500">
                    {formatMetricValue(stageData.value, prefix)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Team Matrix Table */
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search executive by name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-blue-400 transition"
            />
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto max-h-[380px] border border-gray-100 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  <th className="py-2 px-3">Sales Executive</th>
                  <th className="py-2 px-2 text-center text-indigo-700 bg-indigo-50/40">
                    L (Lead)
                  </th>
                  <th className="py-2 px-2 text-center text-sky-700 bg-sky-50/40">
                    P (Prospect)
                  </th>
                  <th className="py-2 px-2 text-center text-amber-700 bg-amber-50/40">
                    T (Technical)
                  </th>
                  <th className="py-2 px-2 text-center text-orange-700 bg-orange-50/40">
                    Q (Quote)
                  </th>
                  <th className="py-2 px-2 text-center text-emerald-700 bg-emerald-50/40">
                    C (Closed)
                  </th>
                  <th className="py-2 px-3 text-right">Total Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      No sales representatives match your search
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.user_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.user_name.charAt(0)}
                          </div>
                          <div className="truncate max-w-[120px]">
                            <span className="block truncate">{item.user_name}</span>
                            <span className="text-[9px] text-gray-400 font-normal block truncate">
                              {item.role_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* L */}
                      <td className="py-2 px-2 text-center font-bold text-indigo-900 bg-indigo-50/20">
                        {metricMode === 'value' ? formatMetricValue(item.L.value, prefix) : item.L.count}
                      </td>

                      {/* P */}
                      <td className="py-2 px-2 text-center font-bold text-sky-900 bg-sky-50/20">
                        {metricMode === 'value' ? formatMetricValue(item.P.value, prefix) : item.P.count}
                      </td>

                      {/* T */}
                      <td className="py-2 px-2 text-center font-bold text-amber-900 bg-amber-50/20">
                        {metricMode === 'value' ? formatMetricValue(item.T.value, prefix) : item.T.count}
                      </td>

                      {/* Q */}
                      <td className="py-2 px-2 text-center font-bold text-orange-900 bg-orange-50/20">
                        {metricMode === 'value' ? formatMetricValue(item.Q.value, prefix) : item.Q.count}
                      </td>

                      {/* C */}
                      <td className="py-2 px-2 text-center font-black text-emerald-800 bg-emerald-50/40">
                        {metricMode === 'value' ? formatMetricValue(item.C.value, prefix) : item.C.count}
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right font-black text-gray-900">
                        {metricMode === 'value'
                          ? formatMetricValue(item.total_value, prefix)
                          : `${item.total_count} Deals`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Summary Totals Footer */}
              {stage_totals && filteredItems.length > 0 && (
                <tfoot className="bg-slate-100 font-black text-gray-900 text-[11px] border-t-2 border-slate-300 sticky bottom-0">
                  <tr>
                    <td className="py-2 px-3 uppercase tracking-wider text-[10px]">Team Total</td>
                    <td className="py-2 px-2 text-center text-indigo-900">
                      {metricMode === 'value' ? formatMetricValue(stage_totals.L?.value, prefix) : stage_totals.L?.count}
                    </td>
                    <td className="py-2 px-2 text-center text-sky-900">
                      {metricMode === 'value' ? formatMetricValue(stage_totals.P?.value, prefix) : stage_totals.P?.count}
                    </td>
                    <td className="py-2 px-2 text-center text-amber-900">
                      {metricMode === 'value' ? formatMetricValue(stage_totals.T?.value, prefix) : stage_totals.T?.count}
                    </td>
                    <td className="py-2 px-2 text-center text-orange-900">
                      {metricMode === 'value' ? formatMetricValue(stage_totals.Q?.value, prefix) : stage_totals.Q?.count}
                    </td>
                    <td className="py-2 px-2 text-center text-emerald-900">
                      {metricMode === 'value' ? formatMetricValue(stage_totals.C?.value, prefix) : stage_totals.C?.count}
                    </td>
                    <td className="py-2 px-3 text-right text-blue-900">
                      {metricMode === 'value'
                        ? formatMetricValue(stage_totals.total_value, prefix)
                        : `${stage_totals.total_count} Deals`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

