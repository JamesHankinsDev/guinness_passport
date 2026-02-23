'use client';

import { useState, useCallback } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Pint } from '@/types';
import { getPints } from '@/lib/firestore';

export function usePints(uid: string | undefined) {
  const [pints, setPints] = useState<Pint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const loadMore = useCallback(async () => {
    if (!uid || loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await getPints(uid, 10, lastDoc ?? undefined);
      setPints((prev) => [...prev, ...result.pints]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [uid, loading, hasMore, lastDoc]);

  const refresh = useCallback(async () => {
    if (!uid) return;
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
  }, [uid]);

  const addOptimistic = useCallback((pint: Pint) => {
    setPints((prev) => [pint, ...prev]);
  }, []);

  const updateOptimistic = useCallback((updated: Pint) => {
    setPints((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  return { pints, loading, hasMore, loadMore, refresh, addOptimistic, updateOptimistic };
}
