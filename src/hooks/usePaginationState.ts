
import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationStateOptions {
  initialPage?: number;
  initialPageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const usePaginationState = (options: UsePaginationStateOptions = {}) => {
  const [page, setPage] = useState(options.initialPage || 1);
  const [pageSize, setPageSize] = useState(options.initialPageSize || 25);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
    options.onPageChange?.(newPage);
  }, [options.onPageChange]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(Math.max(1, page - 1));
  }, [goToPage, page]);

  const goToNextPage = useCallback((totalPages: number) => {
    goToPage(Math.min(totalPages, page + 1));
  }, [goToPage, page]);

  const goToLastPage = useCallback((totalPages: number) => {
    goToPage(totalPages);
  }, [goToPage]);

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
    options.onPageSizeChange?.(newPageSize);
  }, [options.onPageSizeChange]);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  return {
    page,
    pageSize,
    offset,
    goToPage,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    changePageSize
  };
};
