import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { getCachedAvailability } from "@/lib/availabilityCache";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    store?: string;
    selectedMonth?: string;
    month?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const requestedMonth = resolvedSearchParams?.selectedMonth ?? resolvedSearchParams?.month;
  let initialData = await getCachedAvailability(
    requestedMonth,
    resolvedSearchParams?.store,
  );

  if (!requestedMonth && !hasAvailableSlot(initialData)) {
    const nextAvailableMonthKey = initialData.availableMonths.find((monthKey) => monthKey > initialData.month.key);

    if (nextAvailableMonthKey) {
      const nextMonthData = await getCachedAvailability(
        nextAvailableMonthKey,
        resolvedSearchParams?.store,
      );

      if (hasAvailableSlot(nextMonthData)) {
        initialData = nextMonthData;
      }
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl pb-8 sm:px-5 sm:pt-6">
        <AvailabilityCalendar initialData={initialData} />
      </div>
    </main>
  );
}

function hasAvailableSlot(data: Awaited<ReturnType<typeof getCachedAvailability>>) {
  return data.days.some((day) => day.slots.some((slot) => slot.status === "available"));
}
