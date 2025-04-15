import React from 'react';
import { Filter, X } from 'lucide-react';
import type { Filters } from '../types';

interface PropFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function PropFilters({ filters, onChange, onReset }: PropFiltersProps) {
  const config = JSON.parse(localStorage.getItem('apiConfig') || '{"SHOW_ACTS": 1, "SHOW_SCENES": 1}');
  const hasActiveFilters = filters.act || filters.scene || filters.category;

  return (
    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
      <div className="flex items-center flex-shrink-0">
        <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--text-secondary)] mr-1.5 sm:mr-2" />
        <span className="text-sm sm:text-base text-[var(--text-secondary)] whitespace-nowrap">Filter by:</span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={filters.act || ""}
            onChange={(e) => onChange({ ...filters, act: e.target.value ? Number(e.target.value) : undefined })}
            className="px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] min-w-[100px]"
          >
            <option value="">All Acts</option>
            {Array.from({ length: config.SHOW_ACTS }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Act {num}</option>
            ))}
          </select>
          <select
            value={filters.scene || ""}
            onChange={(e) => onChange({ ...filters, scene: e.target.value ? Number(e.target.value) : undefined })}
            className="px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] min-w-[100px]"
          >
            <option value="">All Scenes</option>
            {Array.from({ length: config.SHOW_SCENES }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Scene {num}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
            title="Reset filters"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}