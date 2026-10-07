/**
 * CyberSage - useScanHistory Hook
 *
 * Manages paginated scan history with search, filter, sort, and delete.
 *
 * Returns:
 *   { scans, pagination, isLoading, isError, error,
 *     params, setParams, refresh, deleteScan, isDeleting }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import scanService from '../services/scanService';

const DEFAULT_PARAMS = {
  page:    1,
  limit:   10,
  search:  '',
  status:  '',
  sortBy:  'createdAt',
  sortDir: 'desc'
};

const useScanHistory = () => {
  const [scans,      setScans]      = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isError,    setIsError]    = useState(false);
  const [error,      setError]      = useState(null);
  const [params,     setParams]     = useState(DEFAULT_PARAMS);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  const fetchHistory = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Strip empty params
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      const response = await scanService.getScanHistory(cleanParams);
      if (isMounted.current) {
        setScans(response.data.scans || []);
        setPagination(response.data.pagination || null);
      }
    } catch (err) {
      if (isMounted.current) {
        setIsError(true);
        setError(err.message || 'Failed to load scan history');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Update a single param and reset to page 1
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {})
    }));
  }, []);

  // Delete a scan
  const deleteScan = useCallback(async (scanId) => {
    setIsDeleting(true);
    try {
      await scanService.deleteScan(scanId);
      // Remove from local list immediately
      setScans(prev => prev.filter(s => s._id !== scanId));
      setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : prev);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return {
    scans, pagination, isLoading, isError, error,
    params, updateParam,
    refresh: fetchHistory,
    deleteScan, isDeleting
  };
};

export default useScanHistory;
