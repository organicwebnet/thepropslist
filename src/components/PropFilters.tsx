import React, { useState, useMemo } from 'react';
import { Filter, X, HelpCircle } from 'lucide-react';
import type { Filters } from '../types.ts';
import { lifecycleStatusLabels, PropLifecycleStatus, lifecycleStatusPriority } from '../types/lifecycle.ts';
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface PropFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function PropFilters({ filters, onChange, onReset }: PropFiltersProps) {
  const config = JSON.parse(localStorage.getItem('apiConfig') || '{"SHOW_ACTS": 1, "SHOW_SCENES": 1}');
  const hasActiveFilters = filters.act || filters.scene || filters.category || filters.status;
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Get all status options from lifecycleStatusLabels
  const statusOptions = Object.entries(lifecycleStatusLabels).map(([value, label]) => ({
    value,
    label
  }));

  // Help tooltip content for each filter
  const helpContent = {
    act: "Filter props by the act they appear in. This helps organize props that are used in specific segments of the show.",
    scene: "Filter props by the scene they appear in. This narrows down the prop list to only those needed for a particular scene.",
    status: "Filter props by their current lifecycle status. Statuses like 'Missing', 'Damaged', and 'Under Maintenance' help track props that need attention."
  };

  const renderTooltip = (id: string) => {
    if (activeTooltip !== id) return null;
    
    return (
      <div className="absolute z-50 w-64 p-2 mt-1 text-sm text-left text-[var(--text-primary)] bg-[var(--bg-secondary)] rounded-lg shadow-lg left-0 top-10 border border-[var(--border-color)]">
        <p>{helpContent[id as keyof typeof helpContent]}</p>
        {id === 'status' && (
          <div className="mt-2">
            <p className="font-semibold mb-1">Priority levels:</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Critical - requires immediate attention</span>
              </li>
              <li className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span>High - needs attention soon</span>
              </li>
              <li className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span>Medium - scheduled maintenance</span>
              </li>
              <li className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[var(--highlight-color)]"></span>
                <span>Low - non-urgent status</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
      <div className="flex items-center flex-shrink-0">
        <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--text-secondary)] mr-1.5 sm:mr-2" />
        <span className="text-sm sm:text-base text-[var(--text-secondary)] whitespace-nowrap">Filter by:</span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <div className="flex items-center">
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
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip('act')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="ml-1 text-[var(--text-secondary)] hover:text-[var(--highlight-color)]"
                aria-label="Help for acts filter"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            {renderTooltip('act')}
          </div>
          
          <div className="relative">
            <div className="flex items-center">
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
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip('scene')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="ml-1 text-[var(--text-secondary)] hover:text-[var(--highlight-color)]"
                aria-label="Help for scenes filter"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            {renderTooltip('scene')}
          </div>
          
          {/* Status filter dropdown */}
          <div className="relative">
            <div className="flex items-center">
              <select
                value={filters.status || ""}
                onChange={(e) => onChange({ ...filters, status: e.target.value ? e.target.value as PropLifecycleStatus : undefined })}
                className="px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--highlight-color)] min-w-[180px]"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip('status')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="ml-1 text-[var(--text-secondary)] hover:text-[var(--highlight-color)]"
                aria-label="Help for status filter"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            {renderTooltip('status')}
          </div>
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