import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { HpReservationForm } from "@/components/HpReservationForm";
import { getCachedAvailability } from "@/lib/availabilityCache";
import { getHpReservationAvailability } from "@/lib/hpReservationAvailability";
import { resolveHpStoreId } from "@/lib/hpStoreAliases";
import { stores } from "@/lib/stores";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    store?: string;
    selectedMonth?: string;
    month?: string;
    mode?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;

  // Impact note: mode=form is a new HP-only branch. Existing LINE reservation URLs
  // such as /?store=xxx and mode-less access continue through the original
  // AvailabilityCalendar path below without changing its component or behavior.
  if (resolvedSearchParams?.mode === "form") {
    const formData = await getHpReservationAvailability(resolvedSearchParams.store);
    const resolvedStoreId = resolveHpStoreId(resolvedSearchParams.store) ?? formData.store.id;

    return (
      <main className="min-h-screen bg-slate-50">
        <HpReservationForm
          storeId={formData.store.id}
          storeName={formData.store.name}
          storeArea={formData.store.area}
          stores={stores.map((store) => ({
            id: store.id,
            name: store.name,
          }))}
          days={formData.days}
          key={resolvedStoreId}
        />
      </main>
    );
  }

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
