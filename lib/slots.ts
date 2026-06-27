import type { ShiftLookup } from "@/lib/shiftSchedule";
import type { AvailabilityDay, AvailabilitySlot } from "@/types/availability";

export const slotMinutes = 60;
export const slotTimes = ["09:30", "10:40", "11:50", "13:00", "14:10", "15:20", "16:30", "17:40", "18:50", "20:00"] as const;

const jpDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
});

const jpWeekday = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type BusyRange = {
  start: string;
  end: string;
};

export type MonthWindow = {
  monthKey: string;
  label: string;
  start: Date;
  end: Date;
};

export function createMonthWindow(monthKey?: string | null): MonthWindow {
  const currentMonth = getTokyoMonthOffset(0);
  const nextMonth = getTokyoMonthOffset(1);
  const parsedMonth = parseMonthKey(monthKey);
  const requestedMonth = parsedMonth ?? currentMonth;
  const normalizedMonth = clampMonthToVisibleRange(requestedMonth, currentMonth, nextMonth);
  const year = normalizedMonth.year;
  const monthIndex = normalizedMonth.monthIndex;
  const start = new Date(year, monthIndex, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, monthIndex + 1, 0);
  end.setHours(23, 59, 59, 999);

  return {
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: `${year}年${monthIndex + 1}月`,
    start,
    end,
  };
}

export function createAvailabilityDays(
  busyRanges: BusyRange[],
  monthWindow: MonthWindow,
  options: { canUseCalendar: boolean; shiftLookup: ShiftLookup },
): AvailabilityDay[] {
  const startDate = getVisibleStartDate(monthWindow);

  if (startDate > monthWindow.end) {
    return [];
  }

  const daysToShow = monthWindow.end.getDate() - startDate.getDate() + 1;

  return Array.from({ length: daysToShow }, (_, dayIndex) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayIndex);

    const slots = createSlotsForDate(date, busyRanges, options.canUseCalendar, options.shiftLookup);

    return {
      date: toDateKey(date),
      weekday: jpWeekday.format(date),
      label: jpDate.format(date),
      slots,
    };
  });
}

export function getFreeBusyWindow(monthWindow: MonthWindow) {
  return {
    timeMin: `${toDateKey(monthWindow.start)}T00:00:00+09:00`,
    timeMax: `${toDateKey(monthWindow.end)}T23:59:59+09:00`,
  };
}

function createSlotsForDate(
  date: Date,
  busyRanges: BusyRange[],
  canUseCalendar: boolean,
  shiftLookup: ShiftLookup,
): AvailabilitySlot[] {
  const dateKey = toDateKey(date);

  return slotTimes.map((time) => {
    const startsAt = new Date(`${dateKey}T${time}:00+09:00`);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(startsAt.getMinutes() + slotMinutes);

    const hasShift = shiftLookup.hasShift(dateKey, time);
    const isBusy = !hasShift || !canUseCalendar || isOverlappingBusy(startsAt, endsAt, busyRanges);
    const status = isBusy ? "busy" : "available";

    return {
      id: `${dateKey}-${time}`,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      label: time,
      dateLabel: `${jpDate.format(startsAt)}(${jpWeekday.format(startsAt)}) ${timeFormatter.format(startsAt)}`,
      status,
    };
  });
}

function isOverlappingBusy(start: Date, end: Date, busyRanges: BusyRange[]) {
  return busyRanges.some((range) => {
    const busyStart = new Date(range.start);
    const busyEnd = new Date(range.end);
    return start < busyEnd && end > busyStart;
  });
}

function getVisibleStartDate(monthWindow: MonthWindow) {
  const today = getTokyoToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (tomorrow > monthWindow.end) {
    const afterMonthEnd = new Date(monthWindow.end);
    afterMonthEnd.setDate(afterMonthEnd.getDate() + 1);
    return afterMonthEnd;
  }

  if (today >= monthWindow.start && today <= monthWindow.end) {
    return tomorrow;
  }

  return monthWindow.start;
}

function getTokyoToday() {
  const todayParts = getTokyoDateParts(new Date());
  const today = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTokyoMonthOffset(offset: number) {
  const todayParts = getTokyoDateParts(new Date());
  const date = new Date(todayParts.year, todayParts.month - 1 + offset, 1);

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
  };
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

function clampMonthToVisibleRange(
  requestedMonth: { year: number; monthIndex: number },
  currentMonth: { year: number; monthIndex: number },
  nextMonth: { year: number; monthIndex: number },
) {
  if (compareMonth(requestedMonth, currentMonth) < 0) {
    return currentMonth;
  }

  if (compareMonth(requestedMonth, nextMonth) > 0) {
    return nextMonth;
  }

  return requestedMonth;
}

function compareMonth(
  left: { year: number; monthIndex: number },
  right: { year: number; monthIndex: number },
) {
  return left.year * 12 + left.monthIndex - (right.year * 12 + right.monthIndex);
}

function parseMonthKey(monthKey?: string | null) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return null;
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSlotTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}
