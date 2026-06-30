import { env } from "@/lib/config";
import { createGoogleAccessToken } from "@/lib/googleAuth";
import type { MonthWindow } from "@/lib/slots";
import type { Store } from "@/lib/stores";

const googleSheetsReadonlyScope = "https://www.googleapis.com/auth/spreadsheets.readonly";

export const shiftTimeColumns = [
  { time: "09:30", column: "9:30" },
  { time: "10:40", column: "10:40" },
  { time: "11:50", column: "11:50" },
  { time: "13:00", column: "13:00" },
  { time: "14:10", column: "14:10" },
  { time: "15:20", column: "15:20" },
  { time: "16:30", column: "16:30" },
  { time: "17:40", column: "17:40" },
  { time: "18:50", column: "18:50" },
  { time: "20:00", column: "20:00" },
  { time: "21:10", column: "21:10" },
] as const;

type ShiftTimeColumn = (typeof shiftTimeColumns)[number]["column"];

export type ShiftRow = {
  店舗: string;
  日付: string;
} & Record<ShiftTimeColumn, string>;

export type ShiftLookup = {
  rows: ShiftRow[];
  availableMonthKeys: string[];
  sheetSource: "google-sheets" | "dummy-fallback";
  fetchedAt: string;
  errorMessage: string | null;
  hasMonthData: (monthKey: string) => boolean;
  hasDateData: (dateKey: string) => boolean;
  hasShift: (dateKey: string, time: string) => boolean;
};

type GoogleSheetsValuesResponse = {
  values?: string[][];
};

type GoogleSheetsMetadataResponse = {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
};

export async function fetchShiftLookup(monthWindow: MonthWindow, store: Store): Promise<ShiftLookup> {
  const fetchedAt = new Date().toISOString();

  try {
    const rows = await fetchGoogleSheetsShiftRows(store);
    return createShiftLookup(rows, store, "google-sheets", fetchedAt, null);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Google Sheets read error";
    if (errorMessage.startsWith("Missing required Google Sheets environment variables")) {
      console.warn(errorMessage);
    } else {
      console.error(error);
    }

    return createShiftLookup(createDummyShiftRows(monthWindow, store), store, "dummy-fallback", fetchedAt, errorMessage);
  }
}

async function fetchGoogleSheetsShiftRows(store: Store) {
  const spreadsheetId = extractSpreadsheetId(env.googleSheetsSpreadsheetId);
  const missingCredentials = [
    env.googleServiceAccountEmail ? null : "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    env.googleServiceAccountPrivateKey ? null : "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    spreadsheetId ? null : "GOOGLE_SHEETS_SPREADSHEET_ID",
  ].filter((value): value is string => Boolean(value));

  if (missingCredentials.length > 0) {
    throw new Error(`Missing required Google Sheets environment variables: ${missingCredentials.join(", ")}`);
  }

  const accessToken = await createGoogleAccessToken(googleSheetsReadonlyScope);
  const params = new URLSearchParams({
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
    majorDimension: "ROWS",
  });
  const range = `${quoteSheetName(getShiftSheetName(store))}!A:M`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const sheetTitles = await fetchSheetTitles(spreadsheetId, accessToken);
    throw new Error(
      `Google Sheets values request failed: ${response.status} ${errorBody} Available sheets: ${sheetTitles.join(", ") || "-"}`,
    );
  }

  const data = (await response.json()) as GoogleSheetsValuesResponse;
  return parseShiftRows(data.values ?? []);
}

async function fetchSheetTitles(spreadsheetId: string, accessToken: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as GoogleSheetsMetadataResponse;
  return (data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));
}

function parseShiftRows(values: string[][]): ShiftRow[] {
  const dataRows = hasHeaderRow(values) ? values.slice(1) : values;

  return dataRows
    .map((row) => ({
      店舗: normalizeCell(row[0]),
      日付: normalizeCell(row[1]),
      "9:30": normalizeCell(row[2]),
      "10:40": normalizeCell(row[3]),
      "11:50": normalizeCell(row[4]),
      "13:00": normalizeCell(row[5]),
      "14:10": normalizeCell(row[6]),
      "15:20": normalizeCell(row[7]),
      "16:30": normalizeCell(row[8]),
      "17:40": normalizeCell(row[9]),
      "18:50": normalizeCell(row[10]),
      "20:00": normalizeCell(row[11]),
      "21:10": normalizeCell(row[12]),
    }))
    .filter((row) => row.店舗.length > 0 && row.日付.length > 0);
}

function createShiftLookup(
  rows: ShiftRow[],
  store: Store,
  sheetSource: ShiftLookup["sheetSource"],
  fetchedAt: string,
  errorMessage: string | null,
): ShiftLookup {
  const shiftMap = new Map<string, string>();
  const dateKeys = new Set<string>();
  const availableMonthKeys = new Set<string>();
  const tomorrowDateKey = getTokyoTomorrowDateKey();
  const maxMonthKey = getTokyoMonthKeyOffset(1);

  for (const row of rows) {
    const dateKey = toDateKeyFromSheetDate(row.日付);

    if (!dateKey) {
      continue;
    }

    dateKeys.add(dateKey);

    if (dateKey >= tomorrowDateKey && dateKey.slice(0, 7) <= maxMonthKey) {
      availableMonthKeys.add(dateKey.slice(0, 7));
    }

    for (const { time, column } of shiftTimeColumns) {
      shiftMap.set(createShiftKey(store.id, dateKey, time), row[column].trim());
    }
  }

  const sortedAvailableMonthKeys = Array.from(availableMonthKeys).sort();

  return {
    rows,
    availableMonthKeys: sortedAvailableMonthKeys,
    sheetSource,
    fetchedAt,
    errorMessage,
    hasMonthData: (monthKey) => sortedAvailableMonthKeys.includes(monthKey),
    hasDateData: (dateKey) => dateKeys.has(dateKey),
    hasShift: (dateKey, time) => {
      const cellValue = shiftMap.get(createShiftKey(store.id, dateKey, time)) ?? "";
      return cellValue.trim() !== "";
    },
  };
}

function createDummyShiftRows(monthWindow: MonthWindow, store: Store): ShiftRow[] {
  const rows: ShiftRow[] = [];

  for (let day = 1; day <= monthWindow.end.getDate(); day += 1) {
    const date = new Date(monthWindow.start);
    date.setDate(day);
    const sheetDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

    rows.push({
      店舗: store.name,
      日付: sheetDate,
      "9:30": staffFor(date, "09:30"),
      "10:40": staffFor(date, "10:40"),
      "11:50": staffFor(date, "11:50"),
      "13:00": staffFor(date, "13:00"),
      "14:10": staffFor(date, "14:10"),
      "15:20": staffFor(date, "15:20"),
      "16:30": staffFor(date, "16:30"),
      "17:40": staffFor(date, "17:40"),
      "18:50": staffFor(date, "18:50"),
      "20:00": staffFor(date, "20:00"),
      "21:10": staffFor(date, "21:10"),
    });
  }

  return rows;
}

function staffFor(date: Date, time: string) {
  const day = date.getDate();
  const weekday = date.getDay();

  if (time === "20:00" && weekday === 0) {
    return "";
  }

  if ((time === "13:00" || time === "18:50") && day % 2 === 1) {
    return "";
  }

  if (time === "09:30" || time === "10:40" || time === "11:50") {
    return "山田";
  }

  if (time === "14:10" || time === "15:20" || time === "16:30") {
    return "佐藤";
  }

  return "山田・佐藤";
}

function hasHeaderRow(values: string[][]) {
  const firstRow = values[0];
  return firstRow?.[0] === "店舗" && firstRow?.[1] === "日付";
}

function normalizeCell(value?: string) {
  return String(value ?? "").trim();
}

function createShiftKey(store: string, dateKey: string, time: string) {
  return `${store}__${dateKey}__${time}`;
}

function toDateKeyFromSheetDate(sheetDate: string) {
  const match = sheetDate.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getTokyoTomorrowDateKey() {
  const todayParts = getTokyoDateParts(new Date());
  const tomorrow = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
}

function getTokyoMonthKeyOffset(offset: number) {
  const todayParts = getTokyoDateParts(new Date());
  const date = new Date(todayParts.year, todayParts.month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTokyoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partValue = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: partValue("year"),
    month: partValue("month"),
    day: partValue("day"),
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractSpreadsheetId(value?: string) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();
  const match = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? trimmedValue;
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function getShiftSheetName(store: Store) {
  return store.shiftSheetName ?? store.id;
}
