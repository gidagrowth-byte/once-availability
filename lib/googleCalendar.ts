import { env } from "@/lib/config";
import { createGoogleAccessToken } from "@/lib/googleAuth";
import { getFreeBusyWindow, type BusyRange, type MonthWindow } from "@/lib/slots";
import type { Store } from "@/lib/stores";

const googleCalendarReadonlyScope = "https://www.googleapis.com/auth/calendar.readonly";

type GoogleCalendarEventDate = {
  date?: string;
  dateTime?: string;
};

type GoogleCalendarEvent = {
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  transparency?: string;
  start?: GoogleCalendarEventDate;
  end?: GoogleCalendarEventDate;
};

type GoogleEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

export type GoogleCalendarReadResult = {
  status: "success" | "skipped";
  busyRanges: BusyRange[];
  selectedMonth: string;
  timeMin: string;
  timeMax: string;
  eventCount: number;
  filteredEventCount: number;
  eventSummaries: string[];
  debugEvents: Array<{
    summary: string | null;
    start: string | null;
    end: string | null;
    location: string | null;
    description: string | null;
    matched: boolean;
  }>;
  matchedEvents: Array<{
    summary: string | null;
    start: string | null;
    end: string | null;
    location: string | null;
    description: string | null;
  }>;
  busyEventCount: number;
  uniqueBusyRangeCount: number;
  sampleEvents: Array<{
    summary: string | null;
    description: string | null;
    location: string | null;
    start: string | null;
    end: string | null;
    status: string | null;
    transparency: string | null;
  }>;
  errorMessage: string | null;
  fallbackReason: string | null;
};

export async function fetchGoogleCalendarBusyRanges(monthWindow: MonthWindow, store: Store): Promise<GoogleCalendarReadResult> {
  const { timeMin, timeMax } = getFreeBusyWindow(monthWindow);
  const missingCredentials = [
    env.googleCalendarId ? null : "GOOGLE_CALENDAR_ID",
    env.googleServiceAccountEmail ? null : "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    env.googleServiceAccountPrivateKey ? null : "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ].filter((value): value is string => Boolean(value));

  if (missingCredentials.length > 0) {
    return {
      status: "skipped",
      busyRanges: [],
      selectedMonth: monthWindow.monthKey,
      timeMin,
      timeMax,
      eventCount: 0,
      filteredEventCount: 0,
      eventSummaries: [],
      debugEvents: [],
      matchedEvents: [],
      busyEventCount: 0,
      uniqueBusyRangeCount: 0,
      sampleEvents: [],
      errorMessage: `Missing required Google Calendar environment variables: ${missingCredentials.join(", ")}`,
      fallbackReason: "google-auth-env-missing",
    };
  }

  const googleCalendarId = env.googleCalendarId ?? "";
  const accessToken = await createGoogleAccessToken(googleCalendarReadonlyScope);
  const calendarId = encodeURIComponent(googleCalendarId);
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    showDeleted: "false",
    maxResults: "2500",
    fields: "nextPageToken,items(summary,description,location,start,end,status,transparency)",
  });

  const calendarEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    if (pageToken) {
      params.set("pageToken", pageToken);
    } else {
      params.delete("pageToken");
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Calendar read-only events request failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as GoogleEventsResponse;
    calendarEvents.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const visibleEvents = calendarEvents
    .filter((event) => event.status !== "cancelled")
    .filter((event) => event.transparency !== "transparent");
  const debugEvents = visibleEvents.map((event) => ({
    summary: event.summary ?? null,
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    location: event.location ?? null,
    description: event.description ?? null,
    matched: isTargetStoreEvent(event, store),
  }));
  const targetStoreEvents = visibleEvents.filter((_, index) => debugEvents[index]?.matched);
  const rawBusyRanges = targetStoreEvents
    .map(toBusyRange)
    .filter((range): range is BusyRange => Boolean(range));
  const busyRanges = dedupeBusyRanges(rawBusyRanges);

  return {
    status: "success",
    busyRanges,
    selectedMonth: monthWindow.monthKey,
    timeMin,
    timeMax,
    eventCount: visibleEvents.length,
    filteredEventCount: targetStoreEvents.length,
    eventSummaries: visibleEvents.map((event) => event.summary ?? "タイトルなし"),
    debugEvents,
    matchedEvents: targetStoreEvents.map((event) => ({
      summary: event.summary ?? null,
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
      location: event.location ?? null,
      description: event.description ?? null,
    })),
    busyEventCount: rawBusyRanges.length,
    uniqueBusyRangeCount: busyRanges.length,
    sampleEvents: targetStoreEvents.slice(0, 3).map((event) => ({
      summary: event.summary ?? null,
      description: event.description ?? null,
      location: event.location ?? null,
      start: event.start?.dateTime ?? event.start?.date ?? null,
      end: event.end?.dateTime ?? event.end?.date ?? null,
      status: event.status ?? null,
      transparency: event.transparency ?? null,
    })),
    errorMessage: null,
    fallbackReason: null,
  };
}

function isTargetStoreEvent(event: GoogleCalendarEvent, store: Store) {
  const location = event.location ?? "";
  return store.keywords.some((keyword) => location.includes(keyword));
}

function dedupeBusyRanges(ranges: BusyRange[]) {
  const seen = new Set<string>();

  return ranges.filter((range) => {
    const key = `${range.start}__${range.end}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toBusyRange(event: GoogleCalendarEvent): BusyRange | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;

  if (!start || !end) {
    return null;
  }

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}
