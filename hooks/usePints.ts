'use client';

import { useState, useCallback } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Pint } from '@/types';
import { getPints } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { DEMO_PINTS } from '@/lib/demoData';

export function usePints(uid: string | undefined) {
  const { isDemo } = useAuth();
  const [pints, setPints] = useState<Pint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const loadMore = useCallback(async () => {
    if (isDemo || !uid || loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await getPints(uid, 10, lastDoc ?? undefined);
      setPints((prev) => [...prev, ...result.pints]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [isDemo, uid, loading, hasMore, lastDoc]);

  const refresh = useCallback(async () => {
    if (isDemo || !uid) return;
    setLoading(true);
    setPints([]);
    setLastDoc(null);
    setHasMore(true);
    try {
      const result = await getPints(uid, 10);
      setPints(result.pints);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [isDemo, uid]);

  const addOptimistic = useCallback((pint: Pint) => {
    setPints((prev) => [pint, ...prev]);
  }, []);

  const updateOptimistic = useCallback((updated: Pint) => {
    setPints((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  if (isDemo) {
    return {
      pints: DEMO_PINTS,
      loading: false,
      hasMore: false,
      loadMore: async () => {},
      refresh: async () => {},
      addOptimistic: () => {},
      updateOptimistic: () => {},
    };
  }

  return { pints, loading, hasMore, loadMore, refresh, addOptimistic, updateOptimistic };
}
