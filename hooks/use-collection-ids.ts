"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { getCollectionTcgIds } from "@/lib/collection-ids";

export function useCollectionIds() {
  const { isAuthenticated } = useAuthMode();
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => getCollectionTcgIds());

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setOwnedIds(getCollectionTcgIds());
      return;
    }

    try {
      const res = await fetch("/api/collection");
      if (!res.ok) return;
      const data = await res.json();
      const ids = new Set<string>(
        (data.items ?? []).map((item: { tcgCardId: string }) => item.tcgCardId),
      );
      setOwnedIds(ids);
    } catch {
      // Demo-Fallback beibehalten
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOwnedId = useCallback((tcgCardId: string) => {
    setOwnedIds((current) => new Set([...current, tcgCardId]));
  }, []);

  return { ownedIds, refresh, addOwnedId };
}