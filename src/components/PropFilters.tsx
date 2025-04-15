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
    <div className="flex items-center space-x-4">
      <div className="flex items-center">
        <Filter className="h-5 w-5 text-gray-400 mr-2" />
        <span className="text-gray-400">Filter by:</span>
      </div>
      
      <select
        value={filters.act || ''}
        onChange={(e) => onChange({ ...filters, act: e.target.value ? Number(e.target.value) : undefined })}
        className="bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">All Acts</option>
        {Array.from({ length: config.SHOW_ACTS }, (_, i) => i + 1).map(num => (
          <option key={num} value={num}>Act {num}</option>
        ))}
      </select>
      
      <select
        value={filters.scene || ''}
        onChange={(e) => onChange({ ...filters, scene: e.target.value ? Number(e.target.value) : undefined })}
        className="bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">All Scenes</option>
        {Array.from({ length: config.SHOW_SCENES }, (_, i) => i + 1).map(num => (
          <option key={num} value={num}>Scene {num}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center px-2 py-1 text-sm text-gray-400 hover:text-white transition-colors"
          title="Reset filters"
        >
          <X className="h-4 w-4 mr-1" />
          Reset
        </button>
      )}
    </div>
  );
}