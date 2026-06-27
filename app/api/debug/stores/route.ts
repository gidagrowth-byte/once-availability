import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { shiftTimeColumns } from "@/lib/shiftSchedule";
import { stores } from "@/lib/stores";
import type { AvailabilityResponse } from "@/types/availability";

export const dynamic = "force-dynamic";

type DebugStoreSummary = {
  storeId: string;
  storeName: string;
  month: string;
  resolvedMonth: string;
  shiftSheetName: string;
  sheetSource: AvailabilityResponse["diagnostics"]["sheetSource"];
  shiftError: string | null;
  shiftRowsCount: number;
  targetMonthDateRowsCount: number;
  shiftedCellsCount: number;
  blankCellsCount: number;
  googleCalendarTargetEventCount: number;
  availableSlotsCount: number;
  busySlotsCount: number;
  closedSlotsCount: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const months = getRequestedMonths(searchParams);
  const results: DebugStoreSummary[] = [];

  for (const month of months) {
    const monthResults = await Promise.all(
      stores.map(async (store) => {
        try {
          const availability = await getAvailability(month, store.id, { resolveToAvailableMonth: false });
          return createDebugSummary(month, availability);
        } catch (error) {
          return createErrorSummary(month, store.id, store.name, error);
        }
      }),
    );

    results.push(...monthResults);
  }

  return NextResponse.json({
    months,
    generatedAt: new Date().toISOString(),
    results,
  });
}

function getRequestedMonths(searchParams: URLSearchParams) {
  const monthsParam = searchParams.get("months");
  const monthParam = searchParams.get("month");
  const rawMonths = monthsParam?.split(",") ?? (monthParam ? [monthParam] : ["2026-07", "2026-08"]);

  return rawMonths.map((month) => month.trim()).filter((month) => /^\d{4}-\d{2}$/.test(month));
}

function createDebugSummary(month: string, availability: AvailabilityResponse): DebugStoreSummary {
  const canUseSheetRows = availability.diagnostics.sheetSource === "google-sheets";
  const shiftRows = canUseSheetRows ? availability.diagnostics.shiftRows : [];
  const targetMonthRows = shiftRows.filter((row) => {
    return toMonthKeyFromSheetDate(row.日付) === month;
  });
  const shiftedCellsCount = countShiftCells(targetMonthRows, "shifted");
  const blankCellsCount = countShiftCells(targetMonthRows, "blank");
  const availableSlotsCount = canUseSheetRows ? availability.days.reduce(
    (count, day) => count + day.slots.filter((slot) => slot.status === "available").length,
    0,
  ) : 0;
  const totalVisibleSlotsCount = canUseSheetRows
    ? availability.days.reduce((count, day) => count + day.slots.length, 0)
    : 0;
  const busySlotsCount = canUseSheetRows ? availability.diagnostics.busySlots.length : 0;

  return {
    storeId: availability.store.id,
    storeName: availability.store.name,
    month,
    resolvedMonth: availability.month.key,
    shiftSheetName: availability.diagnostics.shiftSheetName,
    sheetSource: availability.diagnostics.sheetSource,
    shiftError: availability.diagnostics.shiftErrorMessage,
    shiftRowsCount: shiftRows.length,
    targetMonthDateRowsCount: targetMonthRows.length,
    shiftedCellsCount,
    blankCellsCount,
    googleCalendarTargetEventCount: availability.filteredEventCount,
    availableSlotsCount,
    busySlotsCount,
    closedSlotsCount: Math.max(totalVisibleSlotsCount - availableSlotsCount - busySlotsCount, 0),
  };
}

function createErrorSummary(month: string, storeId: string, storeName: string, error: unknown): DebugStoreSummary {
  return {
    storeId,
    storeName,
    month,
    resolvedMonth: month,
    shiftSheetName: storeId,
    sheetSource: "dummy-fallback",
    shiftError: error instanceof Error ? error.message : "Unknown debug read error",
    shiftRowsCount: 0,
    targetMonthDateRowsCount: 0,
    shiftedCellsCount: 0,
    blankCellsCount: 0,
    googleCalendarTargetEventCount: 0,
    availableSlotsCount: 0,
    busySlotsCount: 0,
    closedSlotsCount: 0,
  };
}

function countShiftCells(
  rows: AvailabilityResponse["diagnostics"]["shiftRows"],
  mode: "shifted" | "blank",
) {
  return rows.reduce((count, row) => {
    const matchingCells = shiftTimeColumns.filter(({ column }) => {
      const hasValue = String(row[column] ?? "").trim() !== "";
      return mode === "shifted" ? hasValue : !hasValue;
    });

    return count + matchingCells.length;
  }, 0);
}

function toMonthKeyFromSheetDate(sheetDate: string) {
  const match = sheetDate.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (!match) {
    return null;
  }

  const [, year, month] = match;
  return `${year}-${month.padStart(2, "0")}`;
}
