import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Search,
  Star,
  Clock,
  User,
  Layers,
  Edit2
} from 'lucide-react';

export default function FolderSidebar({
  folders = [],
  counts = {},
  activeFolderId = 'all',
  onSelectFolder,
  onEditFolders
}) {
  const [search, setSearch] = useState('');

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const smartViews = [
    { id: 'all', label: 'All Reports', count: counts.all || 0, icon: Layers },
    { id: 'recent', label: 'Recent Reports', count: counts.recent || 0, icon: Clock },
    { id: 'created_by_me', label: 'Created by Me Reports', count: counts.created_by_me || 0, icon: User },
    { id: 'favorites', label: 'Favourite Reports', count: counts.favorites || 0, icon: Star, star: true },
  ];

  return (
    <aside className="w-full md:w-72 lg:w-80 bg-gray-50/60 border-r border-gray-200 flex flex-col shrink-0 min-h-[640px]">
      {/* Header */}
      <div className="p-4 px-5 border-b border-gray-200 flex items-center justify-between bg-white">
        <span className="text-xs font-bold tracking-wider text-gray-600 uppercase">
          Folders
        </span>
        <button
          type="button"
          onClick={onEditFolders}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-md hover:bg-blue-50"
          title="Manage Folders"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3.5 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* System Smart Views */}
        <div className="space-y-1 mb-3">
          {smartViews.map((view) => {
            const Icon = view.icon;
            const isSelected = activeFolderId === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onSelectFolder(view.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-800 font-semibold shadow-2xs border border-blue-200/80'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    size={16}
                    className={`shrink-0 ${
                      view.star
                        ? 'text-amber-500 fill-amber-500'
                        : isSelected
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <span className="text-sm truncate">{view.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {view.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Divider */}
        <div className="pt-2.5 pb-2 border-t border-gray-200 px-2 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
            Custom Folders ({filteredFolders.length})
          </span>
          <button
            type="button"
            onClick={onEditFolders}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-blue-50"
            title="Create or manage folders"
          >
            <span>+ Add / Manage</span>
          </button>
        </div>

        {/* Custom Folders */}
        <div className="space-y-1">
          {filteredFolders.map((f) => {
            const isSelected = String(activeFolderId) === String(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFolder(f.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-800 font-semibold shadow-2xs border border-blue-200/80'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                }`}
                title={f.name}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {isSelected ? (
                    <FolderOpen size={16} className="text-blue-600 shrink-0" />
                  ) : (
                    <Folder size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="text-sm truncate">{f.name}</span>
                </div>
                {f.report_count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {f.report_count}
                  </span>
                )}
              </button>
            );
          })}

          {filteredFolders.length === 0 && (
            <div className="py-6 text-center text-gray-400 text-xs">
              {search ? `No folders matching "${search}"` : 'No custom folders'}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
