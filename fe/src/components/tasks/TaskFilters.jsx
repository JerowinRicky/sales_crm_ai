import React from 'react';
import { Search, X } from 'lucide-react';

const STATUS_OPTIONS = [
  'Not Started',
  'Deferred',
  'In Progress',
  'Completed',
  'Waiting for Input'
];

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

export default function TaskFilters({ filters, setFilters }) {
  const updateFilter = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', priority: '' });
  };

  const hasFilters = filters.search || filters.status || filters.priority;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            placeholder="Search tasks..."
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={e => updateFilter('status', e.target.value)}
          className="w-44 h-10 px-3 border border-gray-300 rounded-md text-sm bg-white flex-shrink-0"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {/* Priority */}
        <select
          value={filters.priority}
          onChange={e => updateFilter('priority', e.target.value)}
          className="w-40 h-10 px-3 border border-gray-300 rounded-md text-sm bg-white flex-shrink-0"
        >
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map(priority => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        {/* Clear */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 px-3 inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0"
          >
            <X size={15} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}