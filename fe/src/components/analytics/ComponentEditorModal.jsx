import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, BarChart2, Hash, Target, GitMerge, Trophy, Calendar, Layers, Users } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import TargetMeterView from './TargetMeterView';
import KpiView from './KpiView';
import ChartView from './ChartView';
import FunnelView from './FunnelView';
import LeaderboardView from './LeaderboardView';
import NextVisitsView from './NextVisitsView';
import DomainLeadsView from './DomainLeadsView';
import IndividualLptqcView from './IndividualLptqcView';
import TargetMeterStyleModal from './TargetMeterStyleModal';

export default function ComponentEditorModal({
  isOpen,
  onClose,
  onSaveComponent,
  initialComponent = null,
  schemaMeta = null
}) {
  const isEditing = Boolean(initialComponent?.id || initialComponent?._tempId);

  const [componentType, setComponentType] = useState('chart');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState({});

  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialComponent) {
      setComponentType(initialComponent.component_type || 'chart');
      setTitle(initialComponent.title || '');
      setDescription(initialComponent.description || '');
      setConfig(initialComponent.configuration || {});
    } else {
      setComponentType('chart');
      setTitle('New Analytical Component');
      setDescription('');
      setConfig({
        data_source: 'leads',
        metric: 'id',
        aggregation: 'COUNT',
        group_by: 'stage',
        chart_type: 'bar',
        date_field: 'created_at',
        date_range: 'all',
        prefix: ''
      });
    }
  }, [isOpen, initialComponent]);

  const handleTypeChange = (type) => {
    setComponentType(type);
    if (!isEditing) {
      if (type === 'target_meter') {
        setTitle('Monthly Target Performance');
        setConfig({
          style: 'dial_gauge',
          data_source: 'leads',
          metric: 'estimated_value',
          aggregation: 'SUM',
          target_type: 'static',
          target_value: 1000000,
          thresholds: { red: 50, amber: 80, green: 100 },
          date_field: 'created_at',
          date_range: 'all',
          prefix: '₹'
        });
      } else if (type === 'kpi') {
        setTitle('Total Pipeline Value');
        setConfig({
          data_source: 'leads',
          metric: 'estimated_value',
          aggregation: 'SUM',
          date_field: 'created_at',
          date_range: 'all',
          prefix: '₹'
        });
      } else if (type === 'stage_funnel') {
        setTitle('Deal Pipeline Funnel');
        setConfig({
          data_source: 'leads',
          metric: 'estimated_value',
          aggregation: 'SUM',
          date_field: 'created_at',
          date_range: 'all',
          prefix: '₹'
        });
      } else if (type === 'leaderboard') {
        setTitle('Executive Sales Leaderboard');
        setDescription('Rankings based on won revenue and deal volume');
        setConfig({
          data_source: 'leads',
          metric: 'estimated_value',
          aggregation: 'SUM',
          period: 'monthly',
          stage_id: 'won_po_receipt',
          date_field: 'created_at',
          date_range: 'all',
          prefix: '₹',
          limit: 10
        });
      } else if (type === 'next_visits') {
        setTitle('Next Visits (Today & Tomorrow)');
        setDescription('Leads with visits scheduled for today or tomorrow');
        setConfig({
          visit_range: 'today_and_tomorrow',
          limit: 10
        });
      } else if (type === 'domain_leads') {
        setTitle('Domain Leads Breakdown');
        setDescription('Leads volume and pipeline distribution across domains');
        setConfig({
          display_type: 'cards',
          metric: 'both',
          prefix: '₹'
        });
      } else if (type === 'individual_lptqc') {
        setTitle('Individual LPTQC Pipeline');
        setDescription('Individual sales executive pipeline across Lead, Prospect, Technical, Quote, and Closed stages');
        setConfig({
          default_metric: 'count',
          limit: 20,
          sort_by: 'total_value',
          prefix: '₹'
        });
      } else {
        setTitle('Leads by Stage');
        setConfig({
          chart_type: 'bar',
          data_source: 'leads',
          metric: 'id',
          aggregation: 'COUNT',
          group_by: 'stage',
          date_field: 'created_at',
          date_range: 'all',
          prefix: ''
        });
      }
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const currentSourceKey = config.data_source || 'leads';
  const sourceDef = schemaMeta?.sources?.find(s => s.key === currentSourceKey) || schemaMeta?.sources?.[0];

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setPreviewLoading(true);
    setPreviewError(null);

    const timer = setTimeout(() => {
      analyticsAPI.getComponentData({
        component_type: componentType,
        configuration: config
      })
        .then(res => {
          if (isMounted) {
            setPreviewData(res.data);
            setPreviewLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            setPreviewError(err.message || 'Error generating preview');
            setPreviewLoading(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, componentType, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Component title is required');
      return;
    }

    const payload = {
      ...(initialComponent || {}),
      title: title.trim(),
      description: description.trim(),
      component_type: componentType,
      configuration: config,
      layout: initialComponent?.layout || {
        x: 0,
        y: 0,
        width: componentType === 'kpi' ? 3 : componentType === 'individual_lptqc' ? 12 : (componentType === 'leaderboard' || componentType === 'domain_leads' ? 8 : 6),
        height: componentType === 'kpi' ? 3 : (componentType === 'individual_lptqc' ? 6 : (componentType === 'leaderboard' ? 5 : 4))
      }
    };

    onSaveComponent(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in my-auto">
        <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Configure Dashboard Component' : 'Add Component to Dashboard'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Customize metrics, leaderboard rankings, target benchmarks, and visualizations</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          <div className="lg:col-span-7 p-6 space-y-5 overflow-y-auto max-h-[74vh]">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider">
                Component Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'chart', name: 'Chart', icon: BarChart2, desc: 'Bar, line, donut' },
                  { id: 'kpi', name: 'KPI Card', icon: Hash, desc: 'Metric with trend' },
                  { id: 'target_meter', name: 'Target Meter', icon: Target, desc: 'Progress vs goal' },
                  { id: 'stage_funnel', name: 'Pipeline Funnel', icon: GitMerge, desc: 'Stage drop-off' },
                  { id: 'leaderboard', name: 'Leaderboard', icon: Trophy, desc: 'Rep rankings' },
                  { id: 'next_visits', name: 'Next Visits', icon: Calendar, desc: 'Today & tomorrow visits' },
                  { id: 'domain_leads', name: 'Domain Leads', icon: Layers, desc: 'Domain breakdown & value' },
                  { id: 'individual_lptqc', name: 'Individual LPTQC', icon: Users, desc: 'Rep pipeline by stage' },
                ].map(item => {
                  const isCur = componentType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTypeChange(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isCur
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={14} className={isCur ? 'text-blue-600' : 'text-gray-500'} />
                        <span className={`text-xs font-bold ${isCur ? 'text-blue-700' : 'text-gray-800'}`}>
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 line-clamp-1">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Revenue Target"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short note about this metric"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition"
                />
              </div>
            </div>

            {componentType === 'target_meter' && (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-900 block">Target Meter Style:</span>
                  <span className="text-sm font-bold text-blue-700 capitalize">
                    {config.style?.replace('_', ' ') || 'Dial Gauge'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStyleModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition shadow-sm"
                >
                  Change Style...
                </button>
              </div>
            )}

            {componentType === 'chart' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Chart Visualization Style</label>
                <select
                  value={config.chart_type || 'bar'}
                  onChange={e => updateConfig('chart_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                >
                  <option value="bar">Vertical Bar Chart</option>
                  <option value="horizontal_bar">Horizontal Bar Chart</option>
                  <option value="line">Line Trend Chart</option>
                  <option value="donut">Donut Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>
            )}

            {componentType === 'leaderboard' ? (
              <div className="p-4 bg-amber-50/40 border border-amber-200/60 rounded-xl space-y-3.5 pt-3">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Leaderboard Ranking Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Default Period Filter</label>
                    <select
                      value={config.period || 'monthly'}
                      onChange={e => updateConfig('period', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="weekly">Weekly (This Week)</option>
                      <option value="monthly">Monthly (This Month)</option>
                      <option value="quarterly">Quarterly (This Quarter)</option>
                      <option value="yearly">Yearly (This Year)</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Max Executives Shown</label>
                    <select
                      value={config.limit || 10}
                      onChange={e => updateConfig('limit', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value={5}>Top 5 Executives</option>
                      <option value={10}>Top 10 Executives</option>
                      <option value={15}>Top 15 Executives</option>
                      <option value={25}>Top 25 Executives</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Calculation Stage</label>
                    <select
                      value={config.stage_id ?? 'won_po_receipt'}
                      onChange={e => updateConfig('stage_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="won_po_receipt">Won - PO Receipt (Default)</option>
                      <option value="all">All Stages (Total Pipeline)</option>
                      {schemaMeta?.stages?.map(s => {
                        if (s.name?.toLowerCase().includes('won') && s.name?.toLowerCase().includes('po')) return null;
                        return <option key={s.id} value={s.id}>{s.name}</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Currency Symbol / Prefix</label>
                    <input
                      type="text"
                      value={config.prefix ?? '₹'}
                      onChange={e => updateConfig('prefix', e.target.value)}
                      placeholder="e.g. ₹"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>
                </div>
              </div>
            ) : componentType === 'next_visits' ? (
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/60 rounded-xl space-y-3.5 pt-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Next Visits Filter Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Scheduled Timing Filter</label>
                    <select
                      value={config.visit_range || 'today_and_tomorrow'}
                      onChange={e => updateConfig('visit_range', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="today_and_tomorrow">Today & Tomorrow (Recommended)</option>
                      <option value="today">Today Only</option>
                      <option value="tomorrow">Tomorrow Only</option>
                      <option value="upcoming_7_days">Upcoming Next 7 Days</option>
                      <option value="all_upcoming">All Upcoming Visits</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Max Visits to Display</label>
                    <select
                      value={config.limit || 10}
                      onChange={e => updateConfig('limit', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value={5}>Top 5 Visits</option>
                      <option value={10}>Top 10 Visits</option>
                      <option value={15}>Top 15 Visits</option>
                      <option value={20}>Top 20 Visits</option>
                      <option value={50}>Top 50 Visits</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : componentType === 'domain_leads' ? (
              <div className="p-4 bg-purple-50/40 border border-purple-200/60 rounded-xl space-y-3.5 pt-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-purple-600" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Domain Leads Configuration
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Default Display Mode</label>
                    <select
                      value={config.display_type || 'cards'}
                      onChange={e => updateConfig('display_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="cards">Cards Grid</option>
                      <option value="bar">Bar Chart</option>
                      <option value="table">Detailed Table</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Metric Priority</label>
                    <select
                      value={config.metric || 'both'}
                      onChange={e => updateConfig('metric', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="both">Both Volume & Pipeline (₹)</option>
                      <option value="count">Lead Count Only</option>
                      <option value="value">Pipeline Value (₹) Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Currency Prefix</label>
                    <input
                      type="text"
                      value={config.prefix ?? '₹'}
                      onChange={e => updateConfig('prefix', e.target.value)}
                      placeholder="e.g. ₹"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>
                </div>
              </div>
            ) : componentType === 'individual_lptqc' ? (
              <div className="p-4 bg-indigo-50/40 border border-indigo-200/60 rounded-xl space-y-3.5 pt-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Individual LPTQC Pipeline Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Default Matrix Metric</label>
                    <select
                      value={config.default_metric || 'count'}
                      onChange={e => updateConfig('default_metric', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="count">Leads Count (No. of Leads)</option>
                      <option value="value">Pipeline Value (₹ Amount)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Sort Executives By</label>
                    <select
                      value={config.sort_by || 'total_value'}
                      onChange={e => updateConfig('sort_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value="total_value">Total Pipeline Value</option>
                      <option value="c_value">Closed / Won Value (C)</option>
                      <option value="total_count">Total Lead Volume</option>
                      <option value="l_count">New Leads (L)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Max Executives Shown</label>
                    <select
                      value={config.limit || 20}
                      onChange={e => updateConfig('limit', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      <option value={10}>Top 10 Executives</option>
                      <option value={15}>Top 15 Executives</option>
                      <option value={20}>Top 20 Executives</option>
                      <option value={50}>Top 50 Executives</option>
                      <option value={100}>All Active Executives</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Data Source</label>
                    <select
                      value={config.data_source || 'leads'}
                      onChange={e => {
                        const nextDs = e.target.value;
                        const nextDef = schemaMeta?.sources?.find(s => s.key === nextDs);
                        const firstMetric = nextDef?.metrics?.[0]?.key || 'id';
                        const firstAgg = nextDef?.metrics?.[0]?.aggregations?.[0] || 'COUNT';
                        const firstDim = nextDef?.dimensions?.[0]?.key || 'stage';
                        const firstDate = nextDef?.date_fields?.[0]?.key || 'created_at';
                        setConfig(prev => ({
                          ...prev,
                          data_source: nextDs,
                          metric: firstMetric,
                          aggregation: firstAgg,
                          group_by: firstDim,
                          date_field: firstDate
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      {schemaMeta?.sources?.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Metric</label>
                    <select
                      value={config.metric || 'id'}
                      onChange={e => {
                        const mKey = e.target.value;
                        const mDef = sourceDef?.metrics?.find(m => m.key === mKey);
                        updateConfig('metric', mKey);
                        if (mDef?.aggregations?.length) {
                          updateConfig('aggregation', mDef.aggregations[0]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      {sourceDef?.metrics?.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Aggregation</label>
                    <select
                      value={config.aggregation || 'COUNT'}
                      onChange={e => updateConfig('aggregation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      {(sourceDef?.metrics?.find(m => m.key === config.metric)?.aggregations || ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']).map(agg => (
                        <option key={agg} value={agg}>{agg}</option>
                      ))}
                    </select>
                  </div>

                  {(componentType === 'chart' || (componentType === 'target_meter' && config.style === 'multiple_bar')) && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Group By Dimension</label>
                      <select
                        value={config.group_by || sourceDef?.dimensions?.[0]?.key || ''}
                        onChange={e => updateConfig('group_by', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                      >
                        {sourceDef?.dimensions?.map(dim => (
                          <option key={dim.key} value={dim.key}>{dim.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {componentType === 'target_meter' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
                      Target Benchmark Configuration
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Target Source</label>
                        <select
                          value={config.target_type || 'static'}
                          onChange={e => updateConfig('target_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                        >
                          <option value="static">Static Numeric Target</option>
                          <option value="database">From Database Targets Table</option>
                        </select>
                      </div>

                      {config.target_type === 'database' ? (
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Configured Target</label>
                          <select
                            value={config.target_id || ''}
                            onChange={e => updateConfig('target_id', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                          >
                            <option value="">Select target...</option>
                            {schemaMeta?.targets?.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.target_value} / {t.target_period})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Target Value</label>
                          <input
                            type="number"
                            value={config.target_value ?? 1000000}
                            onChange={e => updateConfig('target_value', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                          />
                        </div>
                      )}
                    </div>

                    {config.style === 'traffic_lights' && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                          Threshold Boundaries (%)
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-red-600 font-semibold block">Red Below (%)</label>
                            <input
                              type="number"
                              value={config.thresholds?.red ?? 50}
                              onChange={e =>
                                setConfig(prev => ({
                                  ...prev,
                                  thresholds: { ...(prev.thresholds || {}), red: Number(e.target.value) }
                                }))
                              }
                              className="px-2 py-1 border border-gray-200 rounded text-xs w-full outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-amber-600 font-semibold block">Amber Up To (%)</label>
                            <input
                              type="number"
                              value={config.thresholds?.amber ?? 80}
                              onChange={e =>
                                setConfig(prev => ({
                                  ...prev,
                                  thresholds: { ...(prev.thresholds || {}), amber: Number(e.target.value) }
                                }))
                              }
                              className="px-2 py-1 border border-gray-200 rounded text-xs w-full outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-600 font-semibold block">Green Above (%)</label>
                            <input
                              type="number"
                              value={config.thresholds?.green ?? 100}
                              onChange={e =>
                                setConfig(prev => ({
                                  ...prev,
                                  thresholds: { ...(prev.thresholds || {}), green: Number(e.target.value) }
                                }))
                              }
                              className="px-2 py-1 border border-gray-200 rounded text-xs w-full outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Date Field</label>
                    <select
                      value={config.date_field || sourceDef?.date_fields?.[0]?.key || ''}
                      onChange={e => updateConfig('date_field', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      {sourceDef?.date_fields?.map(d => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Date Range</label>
                    <select
                      value={config.date_range || 'all'}
                      onChange={e => updateConfig('date_range', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    >
                      {schemaMeta?.date_ranges?.map(r => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Prefix (Currency/Symbol)</label>
                    <input
                      type="text"
                      value={config.prefix || ''}
                      onChange={e => updateConfig('prefix', e.target.value)}
                      placeholder="e.g. ₹"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>

                  {currentSourceKey === 'leads' && componentType !== 'stage_funnel' && (
                    <div className="sm:col-span-3">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Default Calculation Stage (Applies to this component)
                      </label>
                      <select
                        value={config.stage_id ?? 'won_po_receipt'}
                        onChange={e => updateConfig('stage_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                      >
                        <option value="won_po_receipt">Won - PO Receipt (Default)</option>
                        <option value="all">All Stages (Total Pipeline)</option>
                        {schemaMeta?.stages?.map(s => {
                          if (s.name?.toLowerCase().includes('won') && s.name?.toLowerCase().includes('po')) return null;
                          return <option key={s.id} value={s.id}>{s.name}</option>;
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-5 p-6 bg-slate-50 flex flex-col justify-between overflow-y-auto max-h-[70vh]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> Live Data Preview
                </span>
                {previewLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <RefreshCw size={11} className="animate-spin text-blue-600" /> Computing...
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm min-h-[380px] flex flex-col overflow-hidden">
                <div className="mb-2 flex-shrink-0">
                  <h4 className="text-sm font-bold text-gray-900">{title || 'Untitled Component'}</h4>
                  {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                </div>

                <div className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto py-1 min-h-0">
                  {previewLoading && !previewData ? (
                    <div className="text-center py-10 my-auto">
                      <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                      <span className="text-xs text-gray-400 font-medium">Querying actual CRM tables...</span>
                    </div>
                  ) : previewError ? (
                    <div className="text-center py-8 text-xs text-red-500 my-auto">
                      {previewError}
                    </div>
                  ) : previewData ? (
                    <div className="w-full flex-1 flex flex-col items-center">
                      {componentType === 'target_meter' ? (
                        <div
                          className="w-full origin-top flex flex-col items-center transition-transform"
                          style={{
                            transform: 'scale(0.88)',
                            transformOrigin: 'top center',
                            width: '113.6%',
                            marginBottom: '-10%'
                          }}
                        >
                          <TargetMeterView data={previewData} configuration={config} isPreview={true} />
                        </div>
                      ) : (
                        <div className="w-full">
                          {componentType === 'kpi' && (
                            <KpiView data={previewData} configuration={config} />
                          )}
                          {componentType === 'chart' && (
                            <ChartView data={previewData} configuration={config} />
                          )}
                          {componentType === 'stage_funnel' && (
                            <FunnelView data={previewData} configuration={config} />
                          )}
                          {componentType === 'leaderboard' && (
                            <LeaderboardView
                              data={previewData}
                              configuration={config}
                              onPeriodChange={p => updateConfig('period', p)}
                              isPreview={true}
                            />
                          )}
                          {componentType === 'next_visits' && (
                            <NextVisitsView
                              data={previewData}
                              configuration={config}
                            />
                          )}
                          {componentType === 'domain_leads' && (
                            <DomainLeadsView
                              data={previewData}
                              configuration={config}
                            />
                          )}
                          {componentType === 'individual_lptqc' && (
                            <IndividualLptqcView
                              data={previewData}
                              configuration={config}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs my-auto">No preview available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 mt-4 leading-relaxed">
              * Live preview is executed directly on actual application tables using secure parameterized SQL aggregations.
            </div>
          </div>
        </div>

        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200/60 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            {isEditing ? 'Save Changes' : 'Add to Dashboard'}
          </button>
        </div>
      </div>

      <TargetMeterStyleModal
        isOpen={isStyleModalOpen}
        initialStyle={config.style || 'dial_gauge'}
        onClose={() => setIsStyleModalOpen(false)}
        onSelectStyle={(selectedStyle) => {
          updateConfig('style', selectedStyle);
          setIsStyleModalOpen(false);
        }}
      />
    </div>
  );
}

