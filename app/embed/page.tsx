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

  const days = getNearestThreeDays(dataSets.flatMap((data) => data.days));

  return (
    <main className="min-h-screen bg-white">
      <EmbedAvailability storeName={firstData.store.name} days={days} />
    </main>
  );
}

function getNearestThreeDays(days: AvailabilityDay[]) {
  const uniqueDays = Array.from(new Map(days.map((day) => [day.date, day])).values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const firstAvailableIndex = uniqueDays.findIndex((day) => day.slots.some((slot) => slot.status === "available"));
  const startIndex = firstAvailableIndex >= 0 ? firstAvailableIndex : 0;

  return uniqueDays.slice(startIndex, startIndex + 3);
}
