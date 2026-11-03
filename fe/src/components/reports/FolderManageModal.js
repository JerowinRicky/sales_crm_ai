import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Folder } from 'lucide-react';
import { reportsAPI } from '../../services/api';

export default function FolderManageModal({ isOpen, onClose, folders = [], onFolderChanged }) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reportsAPI.createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
      });
      setNewFolderName('');
      setNewFolderDesc('');
      if (onFolderChanged) onFolderChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (folder) => {
    setEditingId(folder.id);
    setEditingName(folder.name);
  };

  const handleSaveEdit = async (folderId) => {
    if (!editingName.trim()) return;
    try {
      await reportsAPI.updateFolder(folderId, { name: editingName.trim() });
      setEditingId(null);
      if (onFolderChanged) onFolderChanged();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update folder');
    }
  };

  const handleDelete = async (folder) => {
    if (folder.is_system) {
      alert('System folders cannot be deleted');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete folder "${folder.name}"? Reports inside will be unassigned.`)) {
      return;
    }
    try {
      await reportsAPI.deleteFolder(folder.id);
      if (onFolderChanged) onFolderChanged();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete folder');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Manage Report Folders</h3>
            <p className="text-xs text-gray-500">Add, rename, or remove report folders</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Add Folder Form */}
          <form onSubmit={handleCreate} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Add New Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Folder name (e.g. Q4 Performance)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newFolderName.trim()}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          {/* Folders List */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Existing Folders ({folders.length})</label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {folders.map((folder) => {
                const isEditing = editingId === folder.id;
                return (
                  <div key={folder.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <Folder className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(folder.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="flex-1 px-2 py-0.5 border border-blue-400 rounded text-xs focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-gray-800 truncate">{folder.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded-full font-mono">
                            {folder.report_count || 0}
                          </span>
                          {folder.is_system && (
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 bg-gray-100 px-1 rounded">System</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveEdit(folder.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(folder)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!folder.is_system && (
                        <button
                          onClick={() => handleDelete(folder)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

