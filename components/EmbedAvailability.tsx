"use client";

import { useMemo, useState } from "react";
import type { AvailabilityDay } from "@/types/availability";

type EmbedAvailabilityProps = {
  storeName: string;
  storeArea: string;
  days: AvailabilityDay[];
  lastUpdatedAt: string | null;
};

const displayTimeRows = ["09:30", "10:40", "11:50", "13:00", "14:10", "15:20", "16:30", "17:40", "18:50", "20:00", "21:10"];

export function EmbedAvailability({ storeName, storeArea, days, lastUpdatedAt }: EmbedAvailabilityProps) {
  const initialStartIndex = useMemo(() => getInitialStartIndex(days), [days]);
  const [startIndex, setStartIndex] = useState(initialStartIndex);
  const visibleDays = days.slice(startIndex, startIndex + 3);
  const timeRows = getTimeRows(visibleDays);
  const hasAnyAvailableSlot = days.some((day) => day.slots.some((slot) => slot.status === "available"));
  const canShowPreviousGroup = startIndex > 0;
  const canShowNextGroup = startIndex + 3 < days.length;
  const monthLabel = getMonthLabel(visibleDays[0]?.date ?? days[0]?.date);

  function handleGroupMove(amount: number) {
    setStartIndex((currentIndex) => {
      const maxStartIndex = Math.max(days.length - 1, 0);
      return Math.min(Math.max(currentIndex + amount, 0), maxStartIndex);
    });
  }

  return (
    <section className="w-full overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-soft">
      <div className="border-b border-slate-100 px-3 py-3">
        <p className="truncate text-base font-bold leading-6 text-ink">{storeName}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-leaf">{storeArea}</p>
      </div>

      {days.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <p className="text-sm font-bold text-ink">空き状況</p>
          <p className="mt-2 text-xs font-bold text-slate-500">表示できる日付がありません。</p>
        </div>
      ) : (
        <>
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">空き状況</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  <span className="mr-3 text-leaf">○ 空きあり</span>
                  <span>× 満席</span>
                </p>
              </div>
              <p className="shrink-0 text-right text-[11px] font-semibold text-slate-500">
                最終更新：{formatUpdatedTime(lastUpdatedAt)}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleGroupMove(-3)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
                disabled={!canShowPreviousGroup}
                aria-label="前の3日を表示"
              >
                ＜
              </button>
              <div className="min-w-0 text-center">
                <p className="text-sm font-bold text-ink">{monthLabel}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500" aria-live="polite">
                  {visibleDays[0]?.label}
                  {visibleDays.length > 1 ? `〜${visibleDays[visibleDays.length - 1]?.label}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGroupMove(3)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40"
                disabled={!canShowNextGroup}
                aria-label="次の3日を表示"
              >
                ＞
              </button>
            </div>
          </div>

          {!hasAnyAvailableSlot ? (
            <p className="mx-3 mb-3 rounded-md bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-500">
              現在表示できる空き枠がありません
            </p>
          ) : null}

          <div className="mx-3 mb-3 overflow-hidden rounded-md border border-slate-200 bg-white">
            <table className="w-full table-fixed border-collapse text-center">
              <thead>
                <tr>
                  <th className="w-[58px] border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2 text-[11px] font-bold text-slate-500">
                    時間
                  </th>
                  {visibleDays.map((day) => (
                    <th
                      key={day.date}
                      className="border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2 last:border-r-0"
                    >
                      <span className="block text-xs font-bold leading-4 text-slate-900">{day.label}</span>
                      <span className={`block text-[11px] font-bold leading-4 ${weekdayTextClass(day.weekday)}`}>
                        {day.weekday}
                      </span>
                    </th>
                  ))}
                  {Array.from({ length: 3 - visibleDays.length }, (_, index) => (
                    <th key={`empty-heading-${index}`} className="border-b border-r border-slate-200 bg-slate-50 last:border-r-0" />
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeRows.map((time) => (
                  <tr key={time}>
                    <th className="border-b border-r border-slate-100 bg-white px-1.5 py-2 text-[11px] font-bold text-slate-600">
                      {time}
                    </th>
                    {visibleDays.map((day) => {
                      const slot = day.slots.find((item) => item.label === time);
                      const isAvailable = slot?.status === "available";

                      return (
                        <td
                          key={`${day.date}-${time}`}
                          className={`border-b border-r border-slate-100 px-1.5 py-2 last:border-r-0 ${
                            isAvailable ? "bg-emerald-50" : "bg-slate-50"
                          }`}
                        >
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-base font-bold ${
                              isAvailable ? "bg-white text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {isAvailable ? "○" : "×"}
                          </span>
                        </td>
                      );
                    })}
                    {Array.from({ length: 3 - visibleDays.length }, (_, index) => (
                      <td key={`empty-${time}-${index}`} className="border-b border-r border-slate-100 bg-slate-50 last:border-r-0" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function getInitialStartIndex(days: AvailabilityDay[]) {
  const firstAvailableIndex = days.findIndex((day) => day.slots.some((slot) => slot.status === "available"));
  return firstAvailableIndex >= 0 ? firstAvailableIndex : 0;
}

function getTimeRows(days: AvailabilityDay[]) {
  const slotLabels = new Set(days.flatMap((day) => day.slots.map((slot) => slot.label)));
  return displayTimeRows.filter((time) => slotLabels.has(time));
}

function weekdayTextClass(weekday: string) {
  if (weekday === "土") {
    return "text-blue-600";
  }

  if (weekday === "日") {
    return "text-rose-600";
  }

  return "text-slate-500";
}

function getMonthLabel(dateKey?: string) {
  if (!dateKey) {
    return "";
  }

  const [year, month] = dateKey.split("-");
  return `${year}年${Number(month)}月`;
}

function formatUpdatedTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
