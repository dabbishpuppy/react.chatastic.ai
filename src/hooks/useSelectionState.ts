
import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionStateOptions {
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export const useSelectionState = (options: UseSelectionStateOptions = {}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options.onSelectionChange]);

  const deselectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options.onSelectionChange]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options.onSelectionChange]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.add(id));
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options.onSelectionChange]);

  const deselectAll = useCallback((ids?: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (ids) {
        ids.forEach(id => newSet.delete(id));
      } else {
        newSet.clear();
      }
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options.onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    options.onSelectionChange?.(new Set());
  }, [options.onSelectionChange]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedArray,
    selectedCount,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected
  };
};
