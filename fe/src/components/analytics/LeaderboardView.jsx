import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Award, Users, ChevronRight, CheckCircle2,
  Edit2, Target, Plus, X, Save, RefreshCw, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { formatMetricValue } from './TargetMeterView';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PERIOD_OPTIONS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'all', label: 'All Time' }
];

export default function LeaderboardView({
  data,
  configuration,
  onPeriodChange,
  onRefresh,
  isPreview = false
}) {
  const items = data?.items || [];
  const currentPeriod = data?.period || configuration?.period || 'monthly';
  const prefix = configuration?.prefix ?? data?.prefix ?? '₹';
  const suffix = configuration?.suffix ?? data?.suffix ?? '';
  const stageLabel = data?.stage_label;

  const [activeTab, setActiveTab] = useState(currentPeriod);

  // Bottom Space User Targets state
  const [userTargetsBottom, setUserTargetsBottom] = useState({});
  const [savingBottomId, setSavingBottomId] = useState(null);
  const [savingAllBottom, setSavingAllBottom] = useState(false);
  const [bottomExpanded, setBottomExpanded] = useState(true);

  // Single user modal state
  const [editingUserTarget, setEditingUserTarget] = useState(null);
  const [targetValInput, setTargetValInput] = useState('');
  const [targetPeriodInput, setTargetPeriodInput] = useState(currentPeriod === 'all' ? 'monthly' : currentPeriod);
  const [savingTarget, setSavingTarget] = useState(false);

  // Sync items targets to bottom panel input map
  useEffect(() => {
    const map = {};
    items.forEach(rep => {
      map[rep.user_id] = rep.target > 0 ? String(rep.target) : '';
    });
    setUserTargetsBottom(map);
  }, [items]);

  const handleTabClick = (pKey) => {
    setActiveTab(pKey);
    if (onPeriodChange) {
      onPeriodChange(pKey);
    }
  };

  const handleOpenEditTarget = (rep) => {
    setEditingUserTarget(rep);
    setTargetValInput(rep.target ? String(rep.target) : '');
    setTargetPeriodInput(activeTab === 'all' ? 'monthly' : activeTab);
  };

  const handleSaveUserTarget = async (e) => {
    e.preventDefault();
    if (!editingUserTarget) return;
    if (targetValInput === '' || isNaN(Number(targetValInput))) {
      toast.error('Please enter a valid target amount');
      return;
    }
    setSavingTarget(true);
    try {
      const period = targetPeriodInput;
      await analyticsAPI.upsertTarget({
        user_id: editingUserTarget.user_id,
        target_value: Number(targetValInput),
        target_period: period,
        metric: 'leads_estimated_value'
      });

      // Update bottom map as well
      setUserTargetsBottom(prev => ({ ...prev, [editingUserTarget.user_id]: targetValInput }));

      toast.success(`Target updated for ${editingUserTarget.user_name}`);
      setEditingUserTarget(null);
      if (onRefresh) onRefresh();
      else if (onPeriodChange) onPeriodChange(activeTab);
    } catch (err) {
      toast.error(err.message || 'Error updating target');
    } finally {
      setSavingTarget(false);
    }
  };

  const handleSaveIndividualTarget = async (userId, userName) => {
    const val = userTargetsBottom[userId];
    if (val === undefined || val === '' || isNaN(Number(val))) {
      toast.error('Please enter a valid target amount');
      return;
    }
    setSavingBottomId(userId);
    try {
      const period = activeTab === 'all' ? 'monthly' : activeTab;
      await analyticsAPI.upsertTarget({
        user_id: Number(userId),
        target_value: Number(val),
        target_period: period,
        metric: 'leads_estimated_value'
      });

      // Update overall target with sum of all targets
      const updatedMap = { ...userTargetsBottom, [userId]: val };
      const totalSum = Object.values(updatedMap).reduce((s, v) => s + (Number(v) || 0), 0);
      if (totalSum > 0) {
        await analyticsAPI.upsertTarget({
          user_id: null,
          target_value: totalSum,
          target_period: period,
          metric: 'leads_estimated_value'
        });
      }

      toast.success(`Target updated for ${userName} and synced everywhere`);
      if (onRefresh) onRefresh();
      else if (onPeriodChange) onPeriodChange(activeTab);
    } catch (err) {
      toast.error(err.message || 'Error updating target');
    } finally {
      setSavingBottomId(null);
    }
  };

  const handleSaveAllBottomTargets = async () => {
    setSavingAllBottom(true);
    try {
      const period = activeTab === 'all' ? 'monthly' : activeTab;
      const user_targets = Object.entries(userTargetsBottom).map(([uId, val]) => ({
        user_id: Number(uId),
        target_value: Number(val || 0),
        target_period: period
      }));

      const totalSum = user_targets.reduce((s, u) => s + (u.target_value || 0), 0);

      await analyticsAPI.saveTargetsBatch({
        overall_target: totalSum > 0 ? totalSum : null,
        metric: 'leads_estimated_value',
        target_period: period,
        user_targets
      });

      toast.success('All targets saved and applied across Target Meter, Leaderboard & everywhere');
      if (onRefresh) onRefresh();
      else if (onPeriodChange) onPeriodChange(activeTab);
    } catch (err) {
      toast.error(err.message || 'Error saving user targets');
    } finally {
      setSavingAllBottom(false);
    }
  };

  const top3 = items.slice(0, 3);
  const others = items.slice(3);
  const totalAllocated = Object.values(userTargetsBottom).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <div className="flex flex-col w-full h-full p-3.5 space-y-3.5">
      {/* 1. Header Toolbar with Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Trophy size={13} />
          </div>
          <span className="text-xs font-bold text-gray-800">Rankings</span>
          {stageLabel && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {stageLabel}
            </span>
          )}
        </div>

        {/* Time Filter Pills: Weekly, Monthly, Quarterly, Yearly, All Time */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {PERIOD_OPTIONS.map(opt => {
            const isSelected = activeTab === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleTabClick(opt.key)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs">
          <Users size={28} className="text-gray-300 mb-2" />
          <span>No sales performance records found for this period</span>
        </div>
      ) : (
        <>
          {/* 2. Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {top3.map((rep, idx) => {
                const rank = idx + 1;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;

                const borderClass = isFirst
                  ? 'border-amber-300 bg-gradient-to-b from-amber-50/70 to-white shadow-sm ring-1 ring-amber-400/20'
                  : isSecond
                  ? 'border-slate-300 bg-gradient-to-b from-slate-50/70 to-white'
                  : 'border-orange-200 bg-gradient-to-b from-orange-50/50 to-white';

                const badgeClass = isFirst
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : isSecond
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-orange-100 text-orange-800 border-orange-200';

                const initials = (rep.user_name || 'U')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={rep.user_id}
                    className={`rounded-xl border p-3 flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${borderClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeClass}`}>
                          {isFirst && <Trophy size={11} className="text-amber-600" />}
                          {isSecond && <Medal size={11} className="text-slate-600" />}
                          {isThird && <Award size={11} className="text-orange-600" />}
                          #{rank}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {rep.deals_won} {rep.deals_won === 1 ? 'deal' : 'deals'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-200">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{rep.user_name}</h4>
                          <p className="text-[10px] text-gray-400 truncate capitalize">{rep.role_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100/80">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase">Revenue Won</div>
                      <div className="text-sm font-extrabold text-gray-900 mt-0.5">
                        {formatMetricValue(rep.revenue, prefix, suffix)}
                      </div>
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                          <div className="flex items-center gap-1">
                            <span>Target: {rep.target > 0 ? formatMetricValue(rep.target, prefix, suffix) : 'Not Set'}</span>
                            {!isPreview && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTarget(rep)}
                                className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition"
                                title="Set / Edit Target"
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                          </div>
                          {rep.target > 0 && <span className="font-bold text-blue-600">{rep.progress}%</span>}
                        </div>
                        {rep.target > 0 ? (
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(rep.progress, 100)}%` }}
                              className={`h-full rounded-full ${
                                rep.progress >= 100 ? 'bg-emerald-500' : rep.progress >= 50 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        ) : (
                          !isPreview && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditTarget(rep)}
                              className="w-full mt-1 text-[10px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 py-0.5 rounded border border-blue-200 text-center transition"
                            >
                              + Set Target
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Full Leaderboard Table (Ranks 4+ and all) */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-2xs">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50/80 border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Sales Executive</th>
                  <th className="py-2 px-3 text-center">Deals Won</th>
                  <th className="py-2 px-3 text-right">Revenue Achieved</th>
                  <th className="py-2 px-3 text-right">Target & Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((rep) => {
                  const initials = (rep.user_name || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const rankBadgeClass =
                    rep.rank === 1
                      ? 'bg-amber-100 text-amber-800'
                      : rep.rank === 2
                      ? 'bg-slate-200 text-slate-700'
                      : rep.rank === 3
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-100 text-slate-600';

                  return (
                    <tr key={rep.user_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${rankBadgeClass}`}>
                          {rep.rank}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-bold text-[9px] flex items-center justify-center">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block leading-tight">{rep.user_name}</span>
                            <span className="text-[10px] text-gray-400 capitalize">{rep.role_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {rep.deals_won}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-gray-900">
                        {formatMetricValue(rep.revenue, prefix, suffix)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {rep.target > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                              <div
                                style={{ width: `${Math.min(rep.progress, 100)}%` }}
                                className={`h-full rounded-full ${
                                  rep.progress >= 100 ? 'bg-emerald-500' : rep.progress >= 50 ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${
                              rep.progress >= 100 ? 'text-emerald-600' : 'text-gray-700'
                            }`}>
                              {rep.progress}%
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              ({formatMetricValue(rep.target, prefix, suffix)})
                            </span>
                            {!isPreview && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTarget(rep)}
                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition"
                                title="Edit Target"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        ) : (
                          !isPreview ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditTarget(rep)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition"
                            >
                              <Plus size={10} /> Set Target
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. BOTTOM SPACE: Set Target Amount for Each User (Applied to All) */}
          {!isPreview && items.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-gray-200/90 bg-gradient-to-b from-slate-50/90 to-slate-100/50 -mx-3.5 -mb-3.5 p-3.5 rounded-b-xl border border-slate-200/60 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div
                  onClick={() => setBottomExpanded(!bottomExpanded)}
                  className="flex items-center gap-2 cursor-pointer select-none group"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Target size={13} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">
                        Set Target Amount for Each User
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-100 text-blue-700 capitalize">
                        {activeTab} Target
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Set target amounts below. Targets set here are saved and applied to Target Meter, Leaderboard, and reports for all.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {totalAllocated > 0 && (
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Allocated</span>
                      <span className="text-xs font-extrabold text-blue-700">
                        {formatMetricValue(totalAllocated, '₹')}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAllBottomTargets}
                    disabled={savingAllBottom}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
                    title="Save all user targets and use everywhere"
                  >
                    {savingAllBottom ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    <span>{savingAllBottom ? 'Saving...' : 'Save All Targets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBottomExpanded(!bottomExpanded)}
                    className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-200/60 flex items-center justify-center transition"
                  >
                    {bottomExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {bottomExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {items.map(rep => {
                    const initials = (rep.user_name || 'U')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const currentInput = userTargetsBottom[rep.user_id] ?? '';
                    const isSavingThis = savingBottomId === rep.user_id;

                    return (
                      <div
                        key={rep.user_id}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-blue-300 transition flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-900 truncate">{rep.user_name}</div>
                              <div className="text-[10px] text-gray-400 capitalize truncate">{rep.role_name}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            #{rep.rank}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                          <span>Won: <strong className="text-gray-900 font-semibold">{formatMetricValue(rep.revenue, prefix, suffix)}</strong></span>
                          <span>{rep.deals_won} {rep.deals_won === 1 ? 'deal' : 'deals'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400 pointer-events-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Set target amount"
                              value={currentInput}
                              onChange={e => setUserTargetsBottom({ ...userTargetsBottom, [rep.user_id]: e.target.value })}
                              className="w-full h-8 pl-6 pr-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 outline-none bg-slate-50/50 focus:bg-white transition"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualTarget(rep.user_id, rep.user_name)}
                            disabled={isSavingThis}
                            className="h-8 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-[11px] font-semibold transition inline-flex items-center gap-1 flex-shrink-0"
                            title="Save this user's target"
                          >
                            {isSavingThis ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 5. Single User Target Edit Modal */}
      {editingUserTarget && (
        <div className="modal-overlay">
          <div className="modal max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in">
            <div className="p-3.5 px-4.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-gray-900">
                  Set Target: {editingUserTarget.user_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserTarget(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveUserTarget} className="p-4 space-y-3.5">
              <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-xs">
                <div className="flex justify-between text-gray-500 mb-1">
                  <span>Current Revenue Won:</span>
                  <span className="font-bold text-gray-900">{formatMetricValue(editingUserTarget.revenue, prefix, suffix)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Current Deals Won:</span>
                  <span className="font-bold text-gray-900">{editingUserTarget.deals_won}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">
                  Target Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={targetValInput}
                  onChange={e => setTargetValInput(e.target.value)}
                  placeholder="e.g. 500000 (5 Lakhs)"
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">
                  Target Period
                </label>
                <select
                  value={targetPeriodInput}
                  onChange={e => setTargetPeriodInput(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUserTarget(null)}
                  disabled={savingTarget}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition inline-flex items-center gap-1.5"
                >
                  {savingTarget ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
