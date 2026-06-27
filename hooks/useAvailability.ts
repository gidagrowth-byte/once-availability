"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AvailabilityResponse, AvailabilitySlot } from "@/types/availability";

type UseAvailabilityOptions = {
  initialData: AvailabilityResponse;
  monthKey: string;
  storeId: string;
  selectedSlots: AvailabilitySlot[];
  onSelectedSlotsChange: (slots: AvailabilitySlot[]) => void;
};

type RefreshAvailabilityOptions = {
  bypassCache?: boolean;
};

export function useAvailability({
  initialData,
  monthKey,
  storeId,
  selectedSlots,
  onSelectedSlotsChange,
}: UseAvailabilityOptions) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const isRefreshingRef = useRef(false);
  const selectedSlotsRef = useRef(selectedSlots);

  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

  const refreshAvailability = useCallback(async (options: RefreshAvailabilityOptions = {}) => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        selectedMonth: monthKey,
        store: storeId,
      });

      if (options.bypassCache) {
        params.set("refresh", "1");
      }

      const response = await fetch(`/api/availability?${params.toString()}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("空き枠を取得できませんでした。");
      }

      const nextData = (await response.json()) as AvailabilityResponse;
      setData(nextData);
      setLastUpdatedAt(new Date());

      if (selectedSlotsRef.current.length > 0) {
        const refreshedSlots = nextData.days.flatMap((day) => day.slots);
        const nextSelectedSlots = selectedSlotsRef.current
          .map((selectedSlot) => refreshedSlots.find((slot) => slot.id === selectedSlot.id))
          .filter((slot): slot is AvailabilitySlot => {
            return Boolean(slot) && slot?.status === "available";
          });

        onSelectedSlotsChange(nextSelectedSlots);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "空き枠を取得できませんでした。");
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, [monthKey, storeId, onSelectedSlotsChange]);

  useEffect(() => {
    void refreshAvailability();
  }, [refreshAvailability]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshAvailability();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [refreshAvailability]);

  return {
    data,
    isLoading,
    error,
    lastUpdatedAt,
    refreshAvailability,
  };
}
