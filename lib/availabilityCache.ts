import { getAvailability } from "@/lib/availability";
import { createMonthWindow } from "@/lib/slots";
import { getStoreById } from "@/lib/stores";
import type { AvailabilityResponse } from "@/types/availability";

const availabilityCacheTtlMs = 60_000;

type AvailabilityCacheEntry = {
  response: AvailabilityResponse;
  cachedAt: string;
  expiresAt: string;
  expiresAtMs: number;
};

const availabilityCache = new Map<string, AvailabilityCacheEntry>();

export async function getCachedAvailability(
  monthKey?: string | null,
  storeId?: string | null,
  options: { bypassCache?: boolean } = {},
): Promise<AvailabilityResponse> {
  const monthWindow = createMonthWindow(monthKey);
  const store = getStoreById(storeId);
  const cacheKey = createAvailabilityCacheKey(store.id, monthWindow.monthKey);
  const now = Date.now();
  const cachedEntry = availabilityCache.get(cacheKey);

  if (!options.bypassCache && cachedEntry && cachedEntry.expiresAtMs > now) {
    return withCacheDiagnostics(cachedEntry.response, {
      cacheStatus: "hit",
      cachedAt: cachedEntry.cachedAt,
      cacheExpiresAt: cachedEntry.expiresAt,
    });
  }

  const response = await getAvailability(monthWindow.monthKey, store.id);
  const cachedAt = new Date(now).toISOString();
  const expiresAtMs = now + availabilityCacheTtlMs;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const cacheStatus = options.bypassCache ? "bypass" : "miss";
  const responseWithCache = withCacheDiagnostics(response, {
    cacheStatus,
    cachedAt,
    cacheExpiresAt: expiresAt,
  });

  availabilityCache.set(cacheKey, {
    response: responseWithCache,
    cachedAt,
    expiresAt,
    expiresAtMs,
  });

  return responseWithCache;
}

function createAvailabilityCacheKey(storeId: string, selectedMonth: string) {
  return `${storeId}__${selectedMonth}`;
}

function withCacheDiagnostics(
  response: AvailabilityResponse,
  cacheDiagnostics: Pick<AvailabilityResponse["diagnostics"], "cacheStatus" | "cachedAt" | "cacheExpiresAt">,
): AvailabilityResponse {
  return {
    ...response,
    diagnostics: {
      ...response.diagnostics,
      ...cacheDiagnostics,
    },
  };
}
