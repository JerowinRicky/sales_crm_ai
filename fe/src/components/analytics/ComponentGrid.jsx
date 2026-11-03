import React, { useState } from 'react';
import ComponentCard from './ComponentCard';
import { Plus } from 'lucide-react';

export default function ComponentGrid({
  components = [],
  dashboardFilters = {},
  isEditMode = false,
  onEditComponent,
  onDuplicateComponent,
  onDeleteComponent,
  onResizeComponent,
  onReorderComponents,
  onAddNewComponent
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...components];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const reordered = updated.map((item, idx) => ({
      ...item,
      order_position: idx,
      layout: { ...(item.layout || {}), order_position: idx }
    }));

    setDraggedIndex(null);
    onReorderComponents(reordered);
  };

  if (!components || components.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center my-6 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <Plus size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Your Dashboard is Empty</h3>
        <p className="text-xs text-gray-500 max-w-sm mb-5">
          Start assembling your dashboard with Target Meters, KPIs, Stage Funnels, and interactive Charts.
        </p>
        <button
          type="button"
          onClick={onAddNewComponent}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition inline-flex items-center gap-2"
        >
          <Plus size={15} /> Add Component
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 my-2">
      {components.map((comp, idx) => {
        const itemKey = comp.id || comp._tempId || idx;
        return (
          <div
            key={itemKey}
            draggable={isEditMode}
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={e => handleDrop(e, idx)}
            className={`contents ${draggedIndex === idx ? 'opacity-40' : ''}`}
          >
            <div className={`contents relative`}>
              <ComponentCard
                component={comp}
                dashboardFilters={dashboardFilters}
                onEdit={onEditComponent}
                onDuplicate={onDuplicateComponent}
                onDelete={onDeleteComponent}
                onResize={onResizeComponent}
                isEditMode={isEditMode}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

