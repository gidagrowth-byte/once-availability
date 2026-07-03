import { EmbedAvailability } from "@/components/EmbedAvailability";
import { getCachedAvailability } from "@/lib/availabilityCache";
import type { AvailabilityDay } from "@/types/availability";

export const dynamic = "force-dynamic";

type EmbedProps = {
  searchParams?: Promise<{
    store?: string;
    selectedMonth?: string;
    month?: string;
  }>;
};

export default async function EmbedPage({ searchParams }: EmbedProps) {
  const resolvedSearchParams = await searchParams;
  const requestedMonth = resolvedSearchParams?.selectedMonth ?? resolvedSearchParams?.month;
  const firstData = await getCachedAvailability(requestedMonth, resolvedSearchParams?.store);
  const dataSets = [firstData];

  if (!requestedMonth) {
    const nextMonthKey = firstData.availableMonths.find((monthKey) => monthKey > firstData.month.key);

    if (nextMonthKey) {
      dataSets.push(await getCachedAvailability(nextMonthKey, resolvedSearchParams?.store));
    }
  }

  const days = getUniqueSortedDays(dataSets.flatMap((data) => data.days));
  const lastUpdatedAt = getLatestUpdatedAt(dataSets);

  return (
    <main className="min-h-screen bg-slate-50 p-2">
      <EmbedAvailability
        storeName={firstData.store.name}
        storeArea={firstData.store.area}
        days={days}
        lastUpdatedAt={lastUpdatedAt}
      />
    </main>
  );
}

function getUniqueSortedDays(days: AvailabilityDay[]) {
  return Array.from(new Map(days.map((day) => [day.date, day])).values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function getLatestUpdatedAt(dataSets: Array<Awaited<ReturnType<typeof getCachedAvailability>>>) {
  const timestamps = dataSets
    .map((data) => data.diagnostics.cachedAt ?? data.diagnostics.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps[timestamps.length - 1] ?? null;
}
