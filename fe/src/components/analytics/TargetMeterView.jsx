import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CheckCircle2, User, Users, ChevronDown, ChevronUp, Edit2, Target, X } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export function formatMetricValue(val, prefix = '', suffix = '') {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  let formatted = '';
  if (Math.abs(num) >= 10000000) {
    formatted = `${(num / 10000000).toFixed(2)}Cr`;
  } else if (Math.abs(num) >= 100000) {
    formatted = `${(num / 100000).toFixed(2)}L`;
  } else if (Math.abs(num) >= 1000) {
    formatted = `${(num / 1000).toFixed(1)}k`;
  } else {
    formatted = Number.isInteger(num) ? String(num) : num.toFixed(1);
  }
  return `${prefix ? prefix + ' ' : ''}${formatted}${suffix ? ' ' + suffix : ''}`;
}

export default function TargetMeterView({ data, configuration, onRefresh, isPreview = false, componentId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  if (!data) return null;

  const style = configuration?.style || data?.style || 'dial_gauge';
  const prefix = configuration?.prefix ?? data?.prefix ?? '';
  const suffix = configuration?.suffix ?? data?.suffix ?? '';

  const handleOpenModal = (user = null) => {
    if (isPreview) return;
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <>
      {style === 'multiple_bar' && (
        <MultipleBarMeter
          data={data}
          prefix={prefix}
          suffix={suffix}
          isPreview={isPreview}
          onOpenModal={handleOpenModal}
        />
      )}
      {style === 'traffic_lights' && (
        <TrafficLightsMeter
          data={data}
          prefix={prefix}
          suffix={suffix}
          isPreview={isPreview}
          onOpenModal={handleOpenModal}
        />
      )}
      {style === 'bar' && (
        <BarMeter
          data={data}
          prefix={prefix}
          suffix={suffix}
          isPreview={isPreview}
          onOpenModal={handleOpenModal}
        />
      )}
      {style === 'dial_gauge' && (
        <DialGaugeMeter
          data={data}
          prefix={prefix}
          suffix={suffix}
          isPreview={isPreview}
          onOpenModal={handleOpenModal}
        />
      )}

      {isModalOpen && (
        <TargetConfigModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          configuration={configuration}
          componentId={componentId}
          initialUser={selectedUser}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}

function DialGaugeMeter({ data, prefix, suffix, isPreview = false, onOpenModal }) {
  const actual = Number(data?.actual || 0);
  const target = Number(data?.target || 0);
  const progress = Number(data?.progress || 0);
  const thresholds = data?.thresholds || { red: 50, amber: 80, green: 100 };
  const targetPeriod = data?.target_period || 'monthly';
  const isSingleUser = data?.is_single_user;
  const userName = data?.user_name;
  const userBreakdown = data?.user_breakdown || [];

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const rotationDeg = -90 + (clampedProgress / 100) * 180;

  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  let color = '#10B981';
  let statusBadge = { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'On Track' };
  if (progress < (thresholds.red || 50)) {
    color = '#EF4444';
    statusBadge = { bg: 'bg-red-50 text-red-700 border-red-200', text: 'Needs Attention' };
  } else if (progress < (thresholds.amber || 80)) {
    color = '#F59E0B';
    statusBadge = { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'In Progress' };
  }

  const isAchieved = progress >= 100;
  if (isAchieved) {
    statusBadge = { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Target Met' };
  }

  return (
    <div className="flex flex-col items-center w-full p-2.5 sm:p-3.5 flex-shrink-0">
      {/* Target Scope & Duration Header */}
      <div className="w-full flex items-center justify-between mb-1.5 px-0.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {isSingleUser ? (
              <>
                <User size={12} className="text-blue-600" />
                <span>Rep: {userName}</span>
              </>
            ) : (
              <>
                <Users size={12} className="text-blue-600" />
                <span>All Users (Team)</span>
              </>
            )}
          </span>
          {!isPreview && (
            <button
              type="button"
              onClick={() => onOpenModal && onOpenModal(null)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition shadow-2xs"
              title="Set overall and user targets"
            >
              <Target size={11} />
              <span>Set Targets</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {data?.stage_label && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {data.stage_label}
            </span>
          )}
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            {targetPeriod} Target
          </span>
        </div>
      </div>

      {/* Dial Gauge SVG Container */}
      <div className="relative flex flex-col items-center justify-center pt-1 flex-shrink-0 w-full max-w-[210px]">
        <svg
          width={size}
          height={size / 2 + 16}
          viewBox={`0 0 ${size} ${size / 2 + 16}`}
          className="overflow-visible w-full max-w-[210px] h-auto flex-shrink-0"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* Background Track Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />

          {/* Dial Center Hub / Pivot */}
          <circle cx={size / 2} cy={size / 2} r="8" fill="#1E293B" />
          <circle cx={size / 2} cy={size / 2} r="3" fill="#FFFFFF" />

          {/* Rotating Needle / Arrow Pointer */}
          <g
            transform={`rotate(${rotationDeg} ${size / 2} ${size / 2})`}
            style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Arrow Shaft */}
            <line
              x1={size / 2}
              y1={size / 2}
              x2={size / 2}
              y2={size / 2 - radius + 14}
              stroke="#1E293B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Arrow Tip / Pointer */}
            <polygon
              points={`${size / 2 - 4.5},${size / 2 - radius + 16} ${size / 2 + 4.5},${size / 2 - radius + 16} ${size / 2},${size / 2 - radius + 5}`}
              fill="#1E293B"
            />
          </g>

          {/* Range Labels: 0% and 100% */}
          <text
            x={strokeWidth / 2}
            y={size / 2 + 14}
            textAnchor="start"
            fontSize="10"
            fontWeight="600"
            fill="#94A3B8"
          >
            0%
          </text>
          <text
            x={size - strokeWidth / 2}
            y={size / 2 + 14}
            textAnchor="end"
            fontSize="10"
            fontWeight="600"
            fill="#94A3B8"
          >
            100%
          </text>
        </svg>

        {/* Value Display */}
        <div className="text-center mt-3 flex flex-col items-center flex-shrink-0">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-gray-900 leading-none">
              {progress.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">achieved</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full mt-1.5 border ${statusBadge.bg}`}
          >
            {isAchieved && <CheckCircle2 size={12} />}
            {statusBadge.text}
          </span>
        </div>
      </div>

      {/* Target & Achieved Metrics Summary Cards */}
      <div className="w-full grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-center flex-shrink-0">
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-gray-500">Achieved</div>
          <div className="text-sm font-bold text-gray-900 mt-0.5">
            {formatMetricValue(actual, prefix, suffix)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 relative group">
          <div className="text-[10px] uppercase font-bold text-gray-500 flex items-center justify-center gap-1">
            <span>Target</span>
            {!isPreview && (
              <button
                type="button"
                onClick={() => onOpenModal && onOpenModal(null)}
                className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition"
                title="Set Target"
              >
                <Edit2 size={10} />
              </button>
            )}
          </div>
          <div className="text-sm font-bold text-blue-600 mt-0.5">
            {target > 0 ? formatMetricValue(target, prefix, suffix) : 'Not Set'}
          </div>
        </div>
      </div>

      {/* When viewing All Users, show User-wise Target & Progress breakdown */}
      {!isSingleUser && userBreakdown.length > 0 && (
        <UserBreakdownSection
          breakdown={userBreakdown}
          prefix={prefix}
          suffix={suffix}
          targetPeriod={targetPeriod}
          stageLabel={data?.stage_label}
          initialExpanded={!isPreview}
          onEditUser={onOpenModal}
        />
      )}
    </div>
  );
}

function TrafficLightsMeter({ data, prefix, suffix, isPreview = false, onOpenModal }) {
  const actual = Number(data?.actual || 0);
  const target = Number(data?.target || 0);
  const progress = Number(data?.progress || 0);
  const thresholds = data?.thresholds || { red: 50, amber: 80, green: 100 };

  const isRed = progress < (thresholds.red || 50);
  const isAmber = progress >= (thresholds.red || 50) && progress < (thresholds.amber || 80);
  const isGreen = progress >= (thresholds.amber || 80);

  return (
    <div className="flex flex-col justify-between p-3.5 w-full flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Achievement Status</span>
          <div className="text-2xl font-bold text-gray-900 mt-0.5 flex items-baseline gap-2">
            <span>{progress.toFixed(1)}%</span>
            <span className="text-xs font-normal text-gray-500">of target</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-900 p-1.5 px-2.5 rounded-full shadow-inner border border-gray-800">
          <div
            title={`Below ${thresholds.red || 50}%`}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isRed ? 'bg-red-500 shadow-[0_0_10px_#ef4444] scale-110' : 'bg-red-950/60 opacity-40'
            }`}
          />
          <div
            title={`${thresholds.red || 50}% - ${thresholds.amber || 80}%`}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isAmber ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-110' : 'bg-amber-950/60 opacity-40'
            }`}
          />
          <div
            title={`Above ${thresholds.amber || 80}%`}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isGreen ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] scale-110' : 'bg-emerald-950/60 opacity-40'
            }`}
          />
        </div>
      </div>

      <div className="my-3">
        <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1">
          <span>0</span>
          <span>{thresholds.red || 50}%</span>
          <span>{thresholds.amber || 80}%</span>
          <span>{formatMetricValue(target, prefix, suffix)}</span>
        </div>

        <div className="relative h-4 rounded-full bg-gray-100 overflow-hidden flex border border-gray-200">
          <div style={{ width: `${thresholds.red || 50}%` }} className="h-full bg-red-100 border-r border-red-200" />
          <div style={{ width: `${(thresholds.amber || 80) - (thresholds.red || 50)}%` }} className="h-full bg-amber-100 border-r border-amber-200" />
          <div className="h-full flex-1 bg-emerald-100" />
          <div
            style={{ width: `${Math.min(progress, 100)}%` }}
            className={`absolute top-0 left-0 h-full transition-all duration-500 rounded-full opacity-85 ${
              isRed ? 'bg-red-500' : isAmber ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-500">Current Actual</div>
          <div className="text-base font-bold text-gray-900 mt-0.5">
            {formatMetricValue(actual, prefix, suffix)}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 relative">
          <div className="text-[10px] uppercase font-bold text-gray-500 flex items-center justify-between">
            <span>Designated Target</span>
            {!isPreview && (
              <button
                type="button"
                onClick={() => onOpenModal && onOpenModal(null)}
                className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50"
                title="Set Target"
              >
                <Edit2 size={11} />
              </button>
            )}
          </div>
          <div className="text-base font-bold text-blue-600 mt-0.5">
            {target > 0 ? formatMetricValue(target, prefix, suffix) : 'Not Set'}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarMeter({ data, prefix, suffix, isPreview = false, onOpenModal }) {
  const actual = Number(data?.actual || 0);
  const target = Number(data?.target || 0);
  const progress = Number(data?.progress || 0);
  const isAchieved = progress >= 100;
  const clampedWidth = Math.min(progress, 100);
  const targetPeriod = data?.target_period || 'monthly';
  const isSingleUser = data?.is_single_user;
  const userName = data?.user_name;
  const userBreakdown = data?.user_breakdown || [];
  const remaining = Math.max(target - actual, 0);

  return (
    <div className="flex flex-col p-3.5 w-full">
      {/* Target Scope & Duration Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {isSingleUser ? (
              <>
                <User size={12} className="text-blue-600" />
                <span>Rep: {userName}</span>
              </>
            ) : (
              <>
                <Users size={12} className="text-blue-600" />
                <span>All Users ({userBreakdown.length || 'Team'} Reps)</span>
              </>
            )}
          </span>
          {!isPreview && (
            <button
              type="button"
              onClick={() => onOpenModal && onOpenModal(null)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition shadow-2xs"
            >
              <Target size={11} />
              <span>Set Targets</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {data?.stage_label && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {data.stage_label}
            </span>
          )}
          <span className="text-[10px] uppercase font-bold text-gray-400">
            {targetPeriod} Target
          </span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Progress</span>
          <div className="text-2xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <span>{progress.toFixed(1)}%</span>
            {isAchieved && (
              <span className="text-xs px-2 py-0.5 font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Achieved
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Target</span>
            {!isPreview && (
              <button
                type="button"
                onClick={() => onOpenModal && onOpenModal(null)}
                className="text-blue-500 hover:text-blue-700 p-0.5 rounded"
                title="Set Target"
              >
                <Edit2 size={10} />
              </button>
            )}
          </div>
          <div className="text-sm font-bold text-blue-600 mt-0.5">
            {target > 0 ? formatMetricValue(target, prefix, suffix) : 'Not Set'}
          </div>
        </div>
      </div>

      <div className="my-2.5 relative">
        <div className="w-full h-5 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative">
          <div
            style={{ width: `${clampedWidth}%` }}
            className={`h-full rounded-md transition-all duration-700 ease-out ${
              isAchieved
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-gradient-to-r from-blue-600 to-indigo-500'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-gray-100 text-xs">
        <div className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-gray-400 font-semibold uppercase">Achieved</span>
          <span className="font-bold text-gray-900 text-sm mt-0.5">{formatMetricValue(actual, prefix, suffix)}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-gray-400 font-semibold uppercase">Target</span>
          <span className="font-bold text-blue-600 text-sm mt-0.5">{formatMetricValue(target, prefix, suffix)}</span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-gray-400 font-semibold uppercase">Remaining</span>
          <span className="font-bold text-amber-600 text-sm mt-0.5">{formatMetricValue(remaining, prefix, suffix)}</span>
        </div>
      </div>

      {/* When viewing All Users, show User-wise Target & Progress breakdown */}
      {!isSingleUser && userBreakdown.length > 0 && (
        <UserBreakdownSection
          breakdown={userBreakdown}
          prefix={prefix}
          suffix={suffix}
          targetPeriod={targetPeriod}
          stageLabel={data?.stage_label}
          initialExpanded={!isPreview}
          onEditUser={onOpenModal}
        />
      )}
    </div>
  );
}

function MultipleBarMeter({ data, prefix, suffix, isPreview = false, onOpenModal }) {
  const items = data?.items || [];
  const target = Number(data?.target || 0);
  const targetPeriod = data?.target_period || 'Monthly';

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-xs">
        No group comparative data available
      </div>
    );
  }

  const chartData = items.map(item => ({
    name: item.label,
    actual: item.actual,
    target: item.target || target,
    progress: item.progress,
    user_id: item.user_id
  }));

  return (
    <div className="flex flex-col p-3.5 w-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600" />
            <span className="font-semibold text-gray-700">Achieved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300" />
            <span className="font-semibold text-gray-700">Target</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPreview && (
            <button
              type="button"
              onClick={() => onOpenModal && onOpenModal(null)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition shadow-2xs"
            >
              <Target size={11} />
              <span>Set Targets</span>
            </button>
          )}
          <span className="text-[11px] font-bold text-gray-400 uppercase">
            {targetPeriod} Comparison
          </span>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748B' }}
              interval={0}
              angle={-25}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const act = payload.find(p => p.dataKey === 'actual')?.value || 0;
                const tgt = payload.find(p => p.dataKey === 'target')?.value || 0;
                const pct = tgt > 0 ? ((act / tgt) * 100).toFixed(1) : 0;
                return (
                  <div className="bg-white p-2.5 rounded-lg shadow-lg border border-gray-100 text-xs">
                    <div className="font-bold text-gray-900 mb-1">{label}</div>
                    <div className="text-blue-600">Achieved: {formatMetricValue(act, prefix, suffix)}</div>
                    <div className="text-slate-500">Target: {formatMetricValue(tgt, prefix, suffix)}</div>
                    <div className="font-semibold text-gray-800 mt-1 border-t border-gray-100 pt-1">
                      Progress: {pct}%
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="actual" name="Achieved" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="target" name="Target" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* User Comparison Breakdown Table */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 max-h-56 overflow-y-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-white">
            <tr className="text-gray-400 font-semibold border-b border-gray-100">
              <th className="pb-1.5">User / Rep</th>
              <th className="pb-1.5 text-right">Achieved</th>
              <th className="pb-1.5 text-right">Target</th>
              <th className="pb-1.5 text-right">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="py-1.5 font-bold text-gray-800 flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[8px] flex items-center justify-center">
                    {(item.label || 'U')[0].toUpperCase()}
                  </div>
                  <span>{item.label}</span>
                </td>
                <td className="py-1.5 text-right text-gray-900 font-semibold">
                  {formatMetricValue(item.actual, prefix, suffix)}
                </td>
                <td className="py-1.5 text-right text-blue-600 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    {formatMetricValue(item.target, prefix, suffix)}
                    {!isPreview && (
                      <button
                        type="button"
                        onClick={() => onOpenModal && onOpenModal({ user_id: item.user_id, user_name: item.label, target: item.target })}
                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                      >
                        <Edit2 size={10} />
                      </button>
                    )}
                  </span>
                </td>
                <td className="py-1.5 text-right font-bold">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    item.progress >= 100
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.progress >= 50
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {item.progress.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserBreakdownSection({ breakdown, prefix, suffix, targetPeriod = 'Monthly', stageLabel, initialExpanded = true, onEditUser }) {
  const [expanded, setExpanded] = useState(initialExpanded);

  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="w-full mt-3.5 pt-3 border-t border-gray-100">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between cursor-pointer py-1 text-xs font-bold text-gray-700 hover:text-blue-600 transition select-none"
      >
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-gray-500">
          <Users size={13} className="text-blue-600" />
          User-Wise Targets ({targetPeriod})
          {stageLabel && (
            <span className="text-[9px] font-normal normal-case px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {stageLabel}
            </span>
          )}
        </span>
        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
          {expanded ? (
            <><span>Hide</span> <ChevronUp size={12} /></>
          ) : (
            <><span>Show ({breakdown.length} users)</span> <ChevronDown size={12} /></>
          )}
        </span>
      </div>

      {expanded && (
        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
          {breakdown.map(u => {
            const initials = (u.user_name || 'U')
              .split(' ')
              .map(n => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            let barColor = 'bg-emerald-500';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let badgeText = 'Target Met';
            if (u.progress < 50) {
              barColor = 'bg-red-500';
              badgeBg = 'bg-red-50 text-red-700 border-red-200';
              badgeText = 'Needs Attn';
            } else if (u.progress < 80) {
              barColor = 'bg-amber-500';
              badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              badgeText = 'In Progress';
            }

            return (
              <div
                key={u.user_id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="text-xs font-bold text-gray-900">{u.user_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-gray-900">
                      {u.progress.toFixed(1)}%
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${badgeBg}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    style={{ width: `${Math.min(u.progress, 100)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>
                    Achieved: <strong className="text-gray-900 font-semibold">{formatMetricValue(u.actual, prefix, suffix)}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    Target: <strong className="text-blue-600 font-semibold">{formatMetricValue(u.target, prefix, suffix)}</strong>
                    {onEditUser && (
                      <button
                        type="button"
                        onClick={() => onEditUser(u)}
                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-200 transition inline-flex items-center"
                        title="Edit this user's target"
                      >
                        <Edit2 size={10} />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TargetConfigModal({
  isOpen,
  onClose,
  data,
  configuration,
  componentId,
  initialUser = null,
  onRefresh
}) {
  const isSingleUser = data?.is_single_user || Boolean(initialUser);
  const targetPeriod = data?.target_period || 'monthly';
  const userBreakdown = data?.user_breakdown || [];

  const [period, setPeriod] = useState(targetPeriod);
  const [overallTarget, setOverallTarget] = useState(data?.target ? String(data?.target) : '');
  const [userTargets, setUserTargets] = useState(() => {
    const map = {};
    userBreakdown.forEach(u => {
      map[u.user_id] = u.target ? String(u.target) : '';
    });
    return map;
  });
  const [singleUserTarget, setSingleUserTarget] = useState(() => {
    if (initialUser) return initialUser.target ? String(initialUser.target) : '';
    return data?.target ? String(data?.target) : '';
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleDistributeEqually = () => {
    const num = Number(overallTarget);
    if (!num || userBreakdown.length === 0) return;
    const each = Math.round(num / userBreakdown.length);
    const updated = {};
    userBreakdown.forEach(u => {
      updated[u.user_id] = String(each);
    });
    setUserTargets(updated);
    toast.success(`Distributed ${formatMetricValue(each, '₹')} equally to each of ${userBreakdown.length} reps`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initialUser) {
        // Saving a single specific user from breakdown
        await analyticsAPI.upsertTarget({
          user_id: initialUser.user_id,
          target_value: Number(singleUserTarget || 0),
          target_period: period,
          metric: 'leads_estimated_value'
        });
        toast.success(`Target updated for ${initialUser.user_name}`);
      } else if (isSingleUser) {
        // Single user mode (salesperson or filtered user)
        await analyticsAPI.upsertTarget({
          user_id: data.user_id,
          target_value: Number(singleUserTarget || 0),
          target_period: period,
          metric: 'leads_estimated_value'
        });
        toast.success(`Target updated for ${data.user_name}`);
      } else {
        // Overall team target + separate user targets
        const user_targets = Object.entries(userTargets).map(([uId, val]) => ({
          user_id: Number(uId),
          target_value: Number(val || 0),
          target_period: period
        }));

        const compMetric = configuration?.metric
          ? `${configuration.data_source || 'leads'}_${configuration.metric}`
          : 'leads_estimated_value';

        await analyticsAPI.saveTargetsBatch({
          overall_target: overallTarget !== '' ? Number(overallTarget) : null,
          target_period: period,
          metric: compMetric,
          component_id: componentId,
          user_targets
        });
        toast.success('Overall and user targets saved successfully');
      }

      onClose();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Error saving targets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in">
        <div className="p-3.5 px-4.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-gray-900">
              {initialUser
                ? `Set Target: ${initialUser.user_name}`
                : isSingleUser
                ? `Set Target: ${data?.user_name}`
                : 'Configure Overall & User Targets'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          {/* Target Period Selector */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-gray-700">Target Duration:</span>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="monthly">Monthly Target</option>
              <option value="weekly">Weekly Target</option>
              <option value="quarterly">Quarterly Target</option>
              <option value="yearly">Yearly Target</option>
            </select>
          </div>

          {/* Single User Mode */}
          {(initialUser || isSingleUser) ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">
                  Target Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={singleUserTarget}
                  onChange={e => setSingleUserTarget(e.target.value)}
                  placeholder="e.g. 500000"
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          ) : (
            /* All Users (Team) Mode */
            <div className="space-y-3.5">
              {/* Overall Target Input */}
              <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-800">
                    Overall Team Target (₹)
                  </label>
                  {userBreakdown.length > 0 && overallTarget && (
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline transition"
                    >
                      Split Equally to {userBreakdown.length} Reps
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={overallTarget}
                  onChange={e => setOverallTarget(e.target.value)}
                  placeholder="e.g. 10000000 (1 Crore)"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-blue-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Separate User Targets */}
              {userBreakdown.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-800">
                      Separate Target For Each User ({userBreakdown.length} Reps)
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Total Allocated: ₹ {Object.values(userTargets).reduce((s, v) => s + (Number(v) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {userBreakdown.map(u => (
                      <div
                        key={u.user_id}
                        className="p-2 px-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-900 block truncate">{u.user_name}</span>
                          <span className="text-[10px] text-gray-400">
                            Achieved: {formatMetricValue(u.actual, '₹')} ({u.progress}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-400 font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="User target"
                            value={userTargets[u.user_id] ?? ''}
                            onChange={e => setUserTargets({ ...userTargets, [u.user_id]: e.target.value })}
                            className="w-32 px-2.5 py-1 text-xs border border-gray-300 rounded font-semibold text-gray-900 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition inline-flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
