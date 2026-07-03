import { getCachedAvailability } from "@/lib/availabilityCache";
import { resolveHpStoreId } from "@/lib/hpStoreAliases";
import type { AvailabilityDay } from "@/types/availability";

export async function getHpReservationAvailability(storeId?: string | null) {
  const resolvedStoreId = resolveHpStoreId(storeId);
  const firstData = await getCachedAvailability(null, resolvedStoreId);
  const dataSets = [firstData];
  const nextMonthKey = firstData.availableMonths.find((monthKey) => monthKey > firstData.month.key);

  if (nextMonthKey) {
    dataSets.push(await getCachedAvailability(nextMonthKey, resolvedStoreId));
  }

  return {
    store: firstData.store,
    days: getUniqueSortedDays(dataSets.flatMap((data) => data.days)),
  };
}

function getUniqueSortedDays(days: AvailabilityDay[]) {
  return Array.from(new Map(days.map((day) => [day.date, day])).values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
