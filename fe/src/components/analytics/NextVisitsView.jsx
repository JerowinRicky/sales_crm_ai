import React, { useState } from 'react';
import {
  Calendar, Clock, User, Phone, Mail, Building,
  CheckCircle, ArrowUpRight, Sparkles, MapPin, Tag
} from 'lucide-react';
import { formatMetricValue } from './TargetMeterView';

export default function NextVisitsView({ data, configuration, onRefresh }) {
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'today', 'tomorrow'

  if (!data) return null;

  const {
    today_count = 0,
    tomorrow_count = 0,
    total_count = 0,
    items = []
  } = data;

  const filteredItems = items.filter(item => {
    if (filterTab === 'today') return item.visit_timing === 'today';
    if (filterTab === 'tomorrow') return item.visit_timing === 'tomorrow';
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div
          onClick={() => setFilterTab(filterTab === 'today' ? 'all' : 'today')}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            filterTab === 'today'
              ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400/50 shadow-xs'
              : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/70 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Today
            </span>
            <Calendar size={13} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 tracking-tight">
            {today_count}
          </div>
          <span className="text-[10px] text-emerald-700/80 font-medium">Scheduled Visits</span>
        </div>

        <div
          onClick={() => setFilterTab(filterTab === 'tomorrow' ? 'all' : 'tomorrow')}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            filterTab === 'tomorrow'
              ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/50 shadow-xs'
              : 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/70 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <Clock size={11} className="text-blue-500" />
              Tomorrow
            </span>
            <Clock size={13} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 tracking-tight">
            {tomorrow_count}
          </div>
          <span className="text-[10px] text-blue-700/80 font-medium">Upcoming Visits</span>
        </div>

        <div
          onClick={() => setFilterTab('all')}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            filterTab === 'all'
              ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400/50 shadow-xs'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Total
            </span>
            <Sparkles size={13} className="text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">
            {total_count}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Both Days</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 pt-0.5">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              filterTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All Visits ({total_count})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('today')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              filterTab === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Today ({today_count})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('tomorrow')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              filterTab === 'tomorrow'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            Tomorrow ({tomorrow_count})
          </button>
        </div>
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <Calendar size={28} className="text-gray-300 mb-2" />
            <span className="text-xs font-semibold text-gray-600">No scheduled visits found</span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {filterTab === 'today' ? 'No visits are scheduled for today.' : filterTab === 'tomorrow' ? 'No visits scheduled for tomorrow.' : 'No visits scheduled for today or tomorrow.'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isToday = item.visit_timing === 'today';
            const isTomorrow = item.visit_timing === 'tomorrow';

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:bg-slate-50/50 shadow-2xs hover:shadow-xs transition space-y-2"
              >
                {/* Title & Timing Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {item.company_name || 'Individual Prospect'}
                      </span>
                      {item.domain_name && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {item.domain_name}
                        </span>
                      )}
                      {item.stage_name && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${item.stage_color || '#3b82f6'}15`,
                            color: item.stage_color || '#3b82f6',
                            borderColor: `${item.stage_color || '#3b82f6'}30`,
                            borderWidth: '1px'
                          }}
                        >
                          {item.stage_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      {item.title}
                    </div>
                  </div>

                  {/* Visit Timing Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                      isToday
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isTomorrow
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <Clock size={11} />
                    {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(item.next_visit)}
                  </span>
                </div>

                {/* Details Footer */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    {item.assigned_to_name && (
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <User size={11} className="text-gray-400" />
                        {item.assigned_to_name}
                      </span>
                    )}
                    {item.contact_name && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-gray-500">
                        • {item.contact_name}
                      </span>
                    )}
                    {item.contact_phone && item.contact_phone !== 'N/A' && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-blue-600">
                        <Phone size={10} /> {item.contact_phone}
                      </span>
                    )}
                  </div>

                  {item.estimated_value > 0 && (
                    <span className="font-bold text-gray-900 text-xs">
                      {formatMetricValue(item.estimated_value, '₹')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

