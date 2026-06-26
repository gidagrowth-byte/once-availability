import { NextResponse } from "next/server";
import { getCachedAvailability } from "@/lib/availabilityCache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await getCachedAvailability(
      searchParams.get("selectedMonth") ?? searchParams.get("month"),
      searchParams.get("store"),
      { bypassCache: searchParams.get("refresh") === "1" },
    ),
  );
}
