export type SlotStatus = "available" | "busy";

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  dateLabel: string;
  status: SlotStatus;
};

export type AvailabilityDay = {
  date: string;
  weekday: string;
  label: string;
  slots: AvailabilitySlot[];
};

export type AvailabilityResponse = {
  store: {
    id: string;
    name: string;
    type: "direct" | "fc";
    area: string;
    address: string;
    nearestStation: string;
    lineUrl: string;
    lineOaId: string;
  };
  month: {
    key: string;
    label: string;
  };
  availableMonths: string[];
  days: AvailabilityDay[];
  source: "google-calendar";
  calendarId: string | null;
  eventCount: number;
  filteredEventCount: number;
  diagnostics: {
    authMethod: "service-account";
    connectionTest: "success" | "failed" | "not-run";
    fallbackReason: string | null;
    errorMessage: string | null;
    busyDecisionRule: string;
    cacheStatus: "hit" | "miss" | "bypass";
    cachedAt: string | null;
    cacheExpiresAt: string | null;
    selectedMonth: string;
    timeMin: string;
    timeMax: string;
    shiftSheetName: string;
    sheetSource: "google-sheets" | "dummy-fallback";
    shiftErrorMessage: string | null;
    shiftRows: Array<{
      店舗: string;
      日付: string;
      [column: string]: string;
    }>;
    fetchedAt: string;
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
    busySlots: Array<{
      id: string;
      dateLabel: string;
      startsAt: string;
      endsAt: string;
      status: "busy";
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
    configured: {
      calendarId: boolean;
      serviceAccountEmail: boolean;
      serviceAccountPrivateKey: boolean;
      sheetsSpreadsheetId: boolean;
    };
  };
};
