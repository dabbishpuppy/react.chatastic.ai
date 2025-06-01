
import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionStateOptions {
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export const useSelectionState = (availableIds?: string[], options: UseSelectionStateOptions = {}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options]);

  const deselectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options]);

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
  }, [options]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.add(id));
      options.onSelectionChange?.(newSet);
      return newSet;
    });
  }, [options]);

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
  }, [options]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    options.onSelectionChange?.(new Set());
  }, [options]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Legacy interface support
  const selectedItems = selectedArray;
  const isAllSelected = useMemo(() => {
    if (!availableIds || availableIds.length === 0) return false;
    return selectedCount > 0 && selectedCount === availableIds.length;
  }, [selectedCount, availableIds]);

  const toggleSelection = toggleItem;
  const toggleSelectAll = useCallback(() => {
    if (!availableIds) return;
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll(availableIds);
    }
  }, [isAllSelected, availableIds, selectAll, deselectAll]);

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
    isSelected,
    // Legacy interface
    selectedItems,
    isAllSelected,
    toggleSelection,
    toggleSelectAll
  };
};
