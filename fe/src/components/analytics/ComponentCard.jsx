import React, { useState, useEffect, useRef } from 'react';
import {
  MoreVertical, RefreshCw, Edit3, Copy, Trash2,
  AlertTriangle, Inbox
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import TargetMeterView from './TargetMeterView';
import KpiView from './KpiView';
import ChartView from './ChartView';
import FunnelView from './FunnelView';
import LeaderboardView from './LeaderboardView';
import NextVisitsView from './NextVisitsView';
import DomainLeadsView from './DomainLeadsView';
import IndividualLptqcView from './IndividualLptqcView';

export default function ComponentCard({
  component,
  dashboardFilters = {},
  onEdit,
  onDuplicate,
  onDelete,
  onResize,
  isEditMode = false
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localPeriod, setLocalPeriod] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const loadData = (periodOverride = null) => {
    setLoading(true);
    setError(null);

    const actualPeriod = typeof periodOverride === 'string' ? periodOverride : localPeriod;

    const mergedFilters = {
      ...dashboardFilters,
      ...(actualPeriod ? { period: actualPeriod } : {})
    };

    analyticsAPI.getComponentData({
      component_type: component.component_type,
      configuration: component.configuration || {},
      dashboard_filters: mergedFilters
    })
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load component data');
        setLoading(false);
      });
  };

  const handlePeriodChange = (newPeriod) => {
    setLocalPeriod(newPeriod);
    loadData(newPeriod);
  };

  const filtersKey = JSON.stringify(dashboardFilters);
  const configKey = JSON.stringify(component.configuration);

  useEffect(() => {
    loadData();
  }, [filtersKey, configKey]);

  const widthCols = component.layout?.width || 6;
  const colSpanClass =
    widthCols >= 12
      ? 'col-span-12'
      : widthCols >= 8
      ? 'col-span-12 lg:col-span-8'
      : widthCols >= 6
      ? 'col-span-12 lg:col-span-6'
      : widthCols >= 4
      ? 'col-span-12 sm:col-span-6 lg:col-span-4'
      : 'col-span-12 sm:col-span-6 lg:col-span-3';

  return (
    <div
      className={`${colSpanClass} bg-white rounded-xl border border-gray-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-[300px] overflow-hidden relative group`}
    >
      <div className="p-3.5 px-4.5 border-b border-gray-100/90 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-sm font-semibold text-gray-900 truncate tracking-tight">
            {component.title || 'Untitled Component'}
          </h3>
          {component.description ? (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{component.description}</p>
          ) : (
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {component.component_type?.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => loadData()}
            title="Refresh component"
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Component actions"
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 animate-in">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(component);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
              >
                <Edit3 size={13} /> Edit Component
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(component);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
              >
                <Copy size={13} /> Duplicate
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  loadData();
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
              >
                <RefreshCw size={13} /> Refresh
              </button>

              <div className="border-t border-gray-100 my-1 pt-1 px-3 text-[10px] font-bold text-gray-400 uppercase">
                Resize Width
              </div>
              <div className="grid grid-cols-4 gap-1 px-2.5 pb-1">
                {[
                  { label: '1/4', w: 3 },
                  { label: '1/3', w: 4 },
                  { label: '1/2', w: 6 },
                  { label: 'Full', w: 12 },
                ].map(opt => (
                  <button
                    key={opt.w}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onResize(component, opt.w);
                    }}
                    className={`py-1 text-center rounded text-[11px] font-semibold border ${
                      widthCols === opt.w
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(component);
                }}
                className="w-full px-3.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={13} /> Delete Component
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-3.5 flex flex-col justify-start min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-7 h-7 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-2" />
            <span className="text-xs">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <AlertTriangle size={26} className="text-amber-500 mb-2" />
            <div className="text-xs font-semibold text-gray-700">Unable to load analytics data</div>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="px-3 py-1 rounded-md text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
            >
              Retry
            </button>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <Inbox size={26} className="text-gray-300 mb-2" />
            <span className="text-xs">No data found</span>
          </div>
        ) : (
          <div className="w-full h-full flex-1">
            {component.component_type === 'target_meter' && (
              <TargetMeterView
                data={data}
                configuration={component.configuration}
                componentId={component.id}
                onRefresh={() => loadData()}
              />
            )}
            {component.component_type === 'kpi' && (
              <KpiView data={data} configuration={component.configuration} />
            )}
            {component.component_type === 'chart' && (
              <ChartView data={data} configuration={component.configuration} />
            )}
            {component.component_type === 'stage_funnel' && (
              <FunnelView data={data} configuration={component.configuration} />
            )}
            {component.component_type === 'leaderboard' && (
              <LeaderboardView
                data={data}
                configuration={component.configuration}
                onPeriodChange={handlePeriodChange}
                onRefresh={() => loadData()}
              />
            )}
            {component.component_type === 'next_visits' && (
              <NextVisitsView
                data={data}
                configuration={component.configuration}
                onRefresh={() => loadData()}
              />
            )}
            {component.component_type === 'domain_leads' && (
              <DomainLeadsView
                data={data}
                configuration={component.configuration}
                onRefresh={() => loadData()}
              />
            )}
            {component.component_type === 'individual_lptqc' && (
              <IndividualLptqcView
                data={data}
                configuration={component.configuration}
                onRefresh={() => loadData()}
              />
            )}
          </div>
        )}
      </div>

      {isEditMode && (
        <div className="bg-slate-50 border-t border-slate-100 px-3 py-1 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Width: {widthCols}/12 cols</span>
          <span>Click ⋮ for resize / actions</span>
        </div>
      )}
    </div>
  );
}

