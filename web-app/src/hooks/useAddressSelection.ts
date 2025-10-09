import { useState, useEffect, useMemo, useCallback } from 'react';

export const useAddressSelection = (
  selectedIds: string[], 
  allowMultiple: boolean,
  onChange: (ids: string[]) => void
) => {
  const [optimisticIds, setOptimisticIds] = useState<string[]>([]);

  // Clean the selected IDs to remove empty or invalid values
  const cleanSelectedIds = useMemo(() => 
    selectedIds.filter(id => id && id.trim() !== '' && typeof id === 'string'),
    [selectedIds]
  );

  // Update optimistic state when selectedIds change
  useEffect(() => {
    setOptimisticIds(cleanSelectedIds);
  }, [cleanSelectedIds]);

  const toggleSelection = useCallback((id: string) => {
    if (!id || id.trim() === '') {
      return;
    }

    let newIds: string[];

    if (allowMultiple) {
      if (optimisticIds.includes(id)) {
        newIds = optimisticIds.filter(i => i !== id);
      } else {
        newIds = [...optimisticIds, id];
      }
    } else {
      // Single selection mode - allow deselection
      if (optimisticIds.includes(id)) {
        newIds = [];
      } else {
        newIds = [id];
      }
    }

    setOptimisticIds(newIds);
    onChange(newIds);
  }, [optimisticIds, allowMultiple, onChange]);

  const clearSelection = useCallback(() => {
    setOptimisticIds([]);
    onChange([]);
  }, [onChange]);

  const isSelected = useCallback((id: string) => {
    return optimisticIds.includes(id);
  }, [optimisticIds]);

  return {
    selectedIds: optimisticIds,
    toggleSelection,
    clearSelection,
    isSelected,
    hasSelection: optimisticIds.length > 0
  };
};
