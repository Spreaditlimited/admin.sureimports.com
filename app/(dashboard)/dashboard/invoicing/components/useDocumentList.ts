'use client';

import { useEffect, useState } from 'react';
import { initialPagination, type Pagination } from './DocumentPagination';

export function useDocumentList<T>(endpoint: string, status = '') {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const setSearch = (value: string) => { setSearchValue(value); setPage(1); };
  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search, status, page: String(page), limit: '20' });
        const response = await fetch(`${endpoint}?${params}`, { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok || result.statusx !== 'SUCCESS') throw new Error(result.message || 'Could not load documents. Please try again.');
        if (controller.signal.aborted) return;
        if (page > Math.max(1, result.pagination.totalPages)) {
          setPage(Math.max(1, result.pagination.totalPages));
          return;
        }
        setItems(result.data || []);
        setPagination(result.pagination);
      } catch (error) {
        if (controller.signal.aborted) return;
        setItems([]);
        setPagination({ ...initialPagination, page });
        setError(error instanceof Error ? error.message : 'Could not load documents. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [endpoint, search, status, page, revision]);

  return { items, search, setSearch, page, setPage, pagination, loading, error, refresh };
}
