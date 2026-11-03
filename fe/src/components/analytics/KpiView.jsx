import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMetricValue } from './TargetMeterView';

export default function KpiView({ data, configuration }) {
  if (!data) return null;

  const value = data.value !== undefined ? data.value : 0;
  const previousValue = data.previous_value;
  const trendPercent = data.trend_percent;
  const trendDirection = data.trend_direction || 'neutral';
  const prefix = configuration?.prefix ?? data.prefix ?? '';
  const suffix = configuration?.suffix ?? data.suffix ?? '';

  const isUp = trendDirection === 'up';
  const isDown = trendDirection === 'down';

  return (
    <div className="flex flex-col justify-between p-4 h-full">
      <div>
        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {formatMetricValue(value, prefix, suffix)}
        </div>
      </div>

      {previousValue !== null && previousValue !== undefined ? (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isUp
                ? 'bg-emerald-50 text-emerald-700'
                : isDown
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isUp ? (
              <TrendingUp size={13} />
            ) : isDown ? (
              <TrendingDown size={13} />
            ) : (
              <Minus size={13} />
            )}
            {trendPercent !== null ? `${Math.abs(trendPercent)}%` : '0%'}
          </span>
          <span className="text-xs text-gray-400">
            vs previous period ({formatMetricValue(previousValue, prefix, suffix)})
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
          Live metric aggregation
        </div>
      )}
    </div>
  );
}

