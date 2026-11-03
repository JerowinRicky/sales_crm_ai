import React, { useState } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';

export default function TargetMeterStyleModal({ isOpen, onClose, onSelectStyle, initialStyle = 'dial_gauge' }) {
  const [selected, setSelected] = useState(initialStyle);

  if (!isOpen) return null;

  const styles = [
    {
      id: 'dial_gauge',
      name: 'Dial Gauge',
      description: 'Display progress toward target using a radial gauge.',
      preview: (
        <div className="flex flex-col items-center justify-center h-28 w-full">
          <svg width="120" height="65" viewBox="0 0 120 65" className="overflow-visible">
            <path
              d="M 12 55 A 48 48 0 0 1 108 55"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 12 55 A 48 48 0 0 1 80 15"
              fill="none"
              stroke="#2563EB"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="60" cy="55" r="4.5" fill="#1E293B" />
            <circle cx="60" cy="55" r="2" fill="#FFFFFF" />
            <line x1="60" y1="55" x2="77" y2="23" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
            <polygon points="74,25 81,19 78,28" fill="#1E293B" />
          </svg>
          <div className="text-xs font-bold text-gray-800 mt-1">Target: 400</div>
        </div>
      )
    },
    {
      id: 'traffic_lights',
      name: 'Traffic Lights',
      description: 'Display achievement status using configurable thresholds.',
      preview: (
        <div className="flex flex-col items-center justify-center h-28 w-full px-2">
          <div className="flex items-center gap-1.5 bg-gray-900 p-1.5 px-3 rounded-full mb-3 shadow-sm">
            <span className="w-3.5 h-3.5 rounded-full bg-red-950/70" />
            <span className="w-3.5 h-3.5 rounded-full bg-amber-950/70" />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>
          <div className="w-full flex justify-between text-[10px] text-gray-400 font-medium px-1">
            <span>0k</span>
            <span>350k</span>
            <span>700k</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex border border-gray-200 mt-0.5">
            <div className="w-1/3 bg-red-200" />
            <div className="w-1/3 bg-amber-200" />
            <div className="w-1/3 bg-emerald-400" />
          </div>
        </div>
      )
    },
    {
      id: 'bar',
      name: 'Bar',
      description: 'Compare achieved value against target with a target marker.',
      preview: (
        <div className="flex flex-col justify-center h-28 w-full px-3">
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-gray-700">Achieved: 450k</span>
            <span className="text-blue-600">Target: 700k</span>
          </div>
          <div className="relative w-full h-4 rounded-md bg-slate-100 border border-slate-200 overflow-hidden">
            <div className="w-2/3 h-full bg-blue-600 rounded-sm" />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span>
            <span>Progress: 64.3%</span>
            <span>100%</span>
          </div>
        </div>
      )
    },
    {
      id: 'multiple_bar',
      name: 'Multiple Bar',
      description: 'Compare target achievement across multiple groups or reps.',
      preview: (
        <div className="flex flex-col justify-center h-28 w-full px-3">
          <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-sm" /> Achieved
            <span className="inline-block w-2 h-2 bg-slate-300 rounded-sm ml-1" /> Target
          </div>
          <div className="flex items-end justify-around h-14 border-b border-gray-200 pb-1">
            <div className="flex items-end gap-1">
              <div className="w-3 bg-blue-600 rounded-t h-8" />
              <div className="w-3 bg-slate-300 rounded-t h-12" />
            </div>
            <div className="flex items-end gap-1">
              <div className="w-3 bg-blue-600 rounded-t h-11" />
              <div className="w-3 bg-slate-300 rounded-t h-12" />
            </div>
            <div className="flex items-end gap-1">
              <div className="w-3 bg-blue-600 rounded-t h-6" />
              <div className="w-3 bg-slate-300 rounded-t h-12" />
            </div>
          </div>
          <div className="flex justify-around text-[9px] text-gray-400 mt-1">
            <span>Rep A</span>
            <span>Rep B</span>
            <span>Rep C</span>
          </div>
        </div>
      )
    }
  ];

  const handleConfirm = () => {
    onSelectStyle(selected);
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in">
        <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Choose Target Meter Style</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select a visualization style to represent actual vs target performance</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {styles.map(item => {
            const isSelected = selected === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                <div className="rounded-lg bg-gray-50/70 border border-gray-100 flex items-center justify-center overflow-hidden mb-3">
                  {item.preview}
                </div>

                <div>
                  <h3 className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200/60 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm inline-flex items-center gap-2 transition"
          >
            Continue with {styles.find(s => s.id === selected)?.name} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

