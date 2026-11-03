import React, { useState, useEffect } from 'react';
import { X, Layers, ChevronRight } from 'lucide-react';

const PRIMARY_MODULES = [
  { key: 'Lead', label: 'Lead', desc: 'Leads, deals, opportunities, and stages' },
  { key: 'Customer', label: 'Customer', desc: 'Accounts, companies, industries, and addresses' },
  { key: 'Contact', label: 'Contact', desc: 'People, phone numbers, emails, and roles' },
  { key: 'Product', label: 'Product', desc: 'Items, price lists, and catalogue' },
  { key: 'Meeting', label: 'Meeting', desc: 'Appointments, calendar events, and minutes' },
  { key: 'Task', label: 'Task', desc: 'Action items, to-dos, and due dates' },
  { key: 'Call', label: 'Call', desc: 'Call logs, outcomes, and durations' },
  { key: 'Visit', label: 'Visit', desc: 'Field check-ins, visits, and customer logs' },
];

const CHILD_MODULE_OPTIONS = {
  Lead: [
    { key: 'Product', label: 'Product' },
    { key: 'Meeting', label: 'Meeting' },
    { key: 'Task', label: 'Task' },
    { key: 'Call', label: 'Call' },
  ],
  Customer: [
    { key: 'Contact', label: 'Contact' },
    { key: 'Lead', label: 'Lead' },
    { key: 'Visit', label: 'Visit' },
    { key: 'Meeting', label: 'Meeting' },
    { key: 'Task', label: 'Task' },
  ],
  Contact: [
    { key: 'Lead', label: 'Lead' },
    { key: 'Meeting', label: 'Meeting' },
    { key: 'Task', label: 'Task' },
  ],
  Product: [
    { key: 'Lead', label: 'Lead' },
  ],
  Meeting: [],
  Task: [],
  Call: [],
  Visit: [],
};

export default function CreateReportModal({
  isOpen,
  onClose,
  onContinue,
  initialPrimary = '',
  initialChild = ''
}) {
  const [primaryModule, setPrimaryModule] = useState(initialPrimary || '');
  const [childModule, setChildModule] = useState(initialChild || '');

  useEffect(() => {
    if (isOpen) {
      setPrimaryModule(initialPrimary || '');
      setChildModule(initialChild || '');
    }
  }, [isOpen, initialPrimary, initialChild]);

  if (!isOpen) return null;

  const availableChildren = primaryModule ? CHILD_MODULE_OPTIONS[primaryModule] || [] : [];

  const handlePrimaryChange = (val) => {
    setPrimaryModule(val);
    setChildModule(''); // Reset child module when primary changes
  };

  const handleContinue = () => {
    if (!primaryModule) return;
    onContinue({
      primary_module: primaryModule,
      child_module: childModule || null,
      primaryModule,
      childModule: childModule || null
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-visible border border-gray-200 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create New Report</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select modules to build your report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-center gap-3 py-1 text-xs">
            <div className="flex items-center gap-2 font-semibold text-blue-600">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Module</span>
            </div>
            <div className="w-12 h-px bg-gray-200" />
            <div className="flex items-center gap-2 text-gray-400">
              <span className="w-6 h-6 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-xs">
                2
              </span>
              <span>Columns</span>
            </div>
            <div className="w-12 h-px bg-gray-200" />
            <div className="flex items-center gap-2 text-gray-400">
              <span className="w-6 h-6 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-xs">
                3
              </span>
              <span>Criteria</span>
            </div>
          </div>

          <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200 space-y-5">
            {/* Primary Module Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Select Primary Module <span className="text-red-500">*</span>
              </label>
              <select
                value={primaryModule}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs transition cursor-pointer"
              >
                <option value="">-- Select Primary Module --</option>
                {PRIMARY_MODULES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.desc})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                The core data module that your report pulls records from.
              </p>
            </div>

            {/* Child Module Dropdown (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Select Child Module <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <select
                value={childModule}
                onChange={(e) => setChildModule(e.target.value)}
                disabled={!primaryModule || availableChildren.length === 0}
                className="w-full h-11 px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs transition cursor-pointer"
              >
                <option value="">-- None (Only {primaryModule || 'Primary Module'}) --</option>
                {availableChildren.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Optional: Join related child records (e.g. Products under a Lead, Contacts under a Customer).
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!primaryModule}
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition cursor-pointer"
          >
            <span>Continue</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
