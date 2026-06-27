import { fetchGoogleCalendarBusyRanges } from "@/lib/googleCalendar";
import { env } from "@/lib/config";
import { fetchShiftLookup } from "@/lib/shiftSchedule";
import { createAvailabilityDays, createMonthWindow, getFreeBusyWindow, type BusyRange } from "@/lib/slots";
import { getStoreById } from "@/lib/stores";
import type { AvailabilityResponse } from "@/types/availability";

export async function getAvailability(monthKey?: string | null, storeId?: string | null): Promise<AvailabilityResponse> {
  const store = getStoreById(storeId);
  const requestedMonthWindow = createMonthWindow(monthKey);
  const shiftLookup = await fetchShiftLookup(requestedMonthWindow, store);
  const resolvedMonthKey = resolveAvailableMonthKey(requestedMonthWindow.monthKey, shiftLookup.availableMonthKeys);
  const monthWindow = createMonthWindow(resolvedMonthKey);
  const initialWindow = getFreeBusyWindow(monthWindow);
  let source: AvailabilityResponse["source"] = "google-calendar";
  let busyRanges: BusyRange[] = [];
  let canUseCalendar = false;
  let selectedMonth = monthWindow.monthKey;
  let timeMin = initialWindow.timeMin;
  let timeMax = initialWindow.timeMax;
  let eventCount = 0;
  let filteredEventCount = 0;
  let busyEventCount = 0;
  let uniqueBusyRangeCount = 0;
  let connectionTest: AvailabilityResponse["diagnostics"]["connectionTest"] = "not-run";
  let fallbackReason: string | null = null;
  let errorMessage: string | null = null;
  let eventSummaries: AvailabilityResponse["diagnostics"]["eventSummaries"] = [];
  let debugEvents: AvailabilityResponse["diagnostics"]["debugEvents"] = [];
  let matchedEvents: AvailabilityResponse["diagnostics"]["matchedEvents"] = [];
  let sampleEvents: AvailabilityResponse["diagnostics"]["sampleEvents"] = [];

  try {
    const googleResult = await fetchGoogleCalendarBusyRanges(monthWindow, store);

    if (googleResult.status === "skipped") {
      connectionTest = "not-run";
      fallbackReason = googleResult.fallbackReason;
      errorMessage = googleResult.errorMessage;
    } else {
      connectionTest = "success";
      canUseCalendar = true;
      busyRanges = googleResult.busyRanges;
      selectedMonth = googleResult.selectedMonth;
      timeMin = googleResult.timeMin;
      timeMax = googleResult.timeMax;
      eventCount = googleResult.eventCount;
      filteredEventCount = googleResult.filteredEventCount;
      eventSummaries = googleResult.eventSummaries;
      debugEvents = googleResult.debugEvents;
      matchedEvents = googleResult.matchedEvents;
      busyEventCount = googleResult.busyEventCount;
      uniqueBusyRangeCount = googleResult.uniqueBusyRangeCount;
      sampleEvents = googleResult.sampleEvents;
    }
  } catch (error) {
    console.error(error);
    connectionTest = "failed";
    fallbackReason = "google-calendar-read-failed";
    errorMessage = error instanceof Error ? error.message : "Unknown Google Calendar read error";
  }

  const days = shiftLookup.hasMonthData(monthWindow.monthKey)
    ? createAvailabilityDays(busyRanges, monthWindow, { canUseCalendar, shiftLookup })
    : [];
  const busySlots = collectCalendarBusySlots(days, busyRanges);

  return {
    store: {
      id: store.id,
      name: store.name,
      type: store.type,
      area: store.area,
      address: store.address,
      nearestStation: store.nearestStation,
      lineUrl: store.lineUrl,
      lineOaId: store.lineOaId,
    },
    month: {
      key: monthWindow.monthKey,
      label: monthWindow.label,
    },
    availableMonths: shiftLookup.availableMonthKeys,
    days,
    source,
    calendarId: env.googleCalendarId ?? null,
    eventCount,
    filteredEventCount,
    diagnostics: {
      authMethod: "service-account",
      connectionTest,
      fallbackReason,
      errorMessage,
      busyDecisionRule:
        "シフト表の該当セルが空欄なら ×。スタッフ名ありの場合、選択店舗の keywords を含む Google Calendar イベントと固定時間枠が event.start < slot.end AND event.end > slot.start で1分でも重なれば ×。対象店舗イベントがなければ ○。",
      cacheStatus: "miss",
      cachedAt: null,
      cacheExpiresAt: null,
      selectedMonth,
      timeMin,
      timeMax,
      shiftSheetName: store.id,
      sheetSource: shiftLookup.sheetSource,
      shiftErrorMessage: shiftLookup.errorMessage,
      shiftRows: shiftLookup.rows,
      fetchedAt: shiftLookup.fetchedAt,
      filteredEventCount,
      eventSummaries,
      debugEvents,
      matchedEvents,
      busySlots,
      busyEventCount,
      uniqueBusyRangeCount,
      sampleEvents,
      configured: {
        calendarId: Boolean(env.googleCalendarId),
        serviceAccountEmail: Boolean(env.googleServiceAccountEmail),
        serviceAccountPrivateKey: Boolean(env.googleServiceAccountPrivateKey),
        sheetsSpreadsheetId: Boolean(env.googleSheetsSpreadsheetId),
      },
    },
  };
}

function resolveAvailableMonthKey(requestedMonthKey: string, availableMonthKeys: string[]) {
  if (availableMonthKeys.includes(requestedMonthKey)) {
    return requestedMonthKey;
  }

  return availableMonthKeys.find((availableMonthKey) => availableMonthKey >= requestedMonthKey)
    ?? availableMonthKeys[0]
    ?? requestedMonthKey;
}

function collectCalendarBusySlots(
  days: AvailabilityResponse["days"],
  busyRanges: BusyRange[],
): AvailabilityResponse["diagnostics"]["busySlots"] {
  return days
    .flatMap((day) => day.slots)
    .filter((slot) => {
      if (slot.status !== "busy") {
        return false;
      }

      return busyRanges.some((range) => {
        const slotStart = new Date(slot.startsAt);
        const slotEnd = new Date(slot.endsAt);
        const busyStart = new Date(range.start);
        const busyEnd = new Date(range.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    })
    .map((slot) => ({
      id: slot.id,
      dateLabel: slot.dateLabel,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: "busy",
    }));
}
