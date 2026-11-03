import React from 'react';
import { formatMetricValue } from './TargetMeterView';

export default function FunnelView({ data, configuration }) {
  const items = data?.items || [];
  const totalValue = data?.total_value || 0;
  const maxCount = data?.max_count || 1;
  const prefix = configuration?.prefix || '₹';

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-400 text-xs">
        No pipeline stages available
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2 h-full">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3 px-1">
        <span>Pipeline Stages ({items.length})</span>
        <span>
          Total Value:{' '}
          <strong className="text-gray-900">{formatMetricValue(totalValue, prefix)}</strong>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        {items.map((stage, idx) => {
          const widthPercent = Math.max(Math.round((stage.count / maxCount) * 100), 12);
          return (
            <div key={stage.id} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-medium text-gray-800">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color || '#2563EB' }}
                  />
                  <span>{stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{stage.count} leads</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-emerald-600 font-semibold">
                    {formatMetricValue(stage.value, prefix)}
                  </span>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="h-5 bg-slate-100 rounded-md overflow-hidden flex items-center p-1">
                <div
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: stage.color || '#2563EB'
                  }}
                  className="h-full rounded transition-all duration-500 opacity-90 group-hover:opacity-100"
                />
              </div>

              {/* Conversion indicator */}
              {idx > 0 && (
                <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 pl-1">
                  <span>↓ {stage.conversion_rate}% conversion from previous stage</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

