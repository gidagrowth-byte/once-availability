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
  const initialData = await getCachedAvailability(
    resolvedSearchParams?.selectedMonth ?? resolvedSearchParams?.month,
    resolvedSearchParams?.store,
  );

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl pb-8 sm:px-5 sm:pt-6">
        <AvailabilityCalendar initialData={initialData} />
      </div>
    </main>
  );
}
