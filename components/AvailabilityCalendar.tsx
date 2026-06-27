"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import { trackEvent } from "@/lib/analytics";
import { stores } from "@/lib/stores";
import type { AvailabilityResponse, AvailabilitySlot } from "@/types/availability";

type AvailabilityCalendarProps = {
  initialData: AvailabilityResponse;
};

type LineNavigationMode = "anchor" | "location.href";

const LINE_NAVIGATION_MODE: LineNavigationMode = "anchor";

export function AvailabilityCalendar({ initialData }: AvailabilityCalendarProps) {
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lineConfirmation, setLineConfirmation] = useState<LineConfirmation | null>(null);
  const [selectedDate, setSelectedDate] = useState(getInitialMobileStartDate(initialData.days));
  const [monthKey, setMonthKey] = useState(initialData.month.key);
  const [storeId, setStoreId] = useState(initialData.store.id);
  const mobileInitialScopeRef = useRef(`${initialData.store.id}__${initialData.month.key}`);
  const availabilityViewScopeRef = useRef("");
  const { data, isLoading, error, lastUpdatedAt, refreshAvailability } = useAvailability({
    initialData,
    monthKey,
    storeId,
    selectedSlots,
    onSelectedSlotsChange: setSelectedSlots,
  });

  function handleSlotClick(slot: AvailabilitySlot) {
    setSelectedSlots((currentSlots) => {
      const selectedIndex = currentSlots.findIndex((selectedSlot) => selectedSlot.id === slot.id);

      if (selectedIndex >= 0) {
        return currentSlots.filter((selectedSlot) => selectedSlot.id !== slot.id);
      }

      if (currentSlots.length >= 3) {
        return currentSlots;
      }

      return [...currentSlots, slot];
    });
    trackEvent("slot_select", {
      store_id: data.store.id,
      date: getSlotDate(slot),
      time: slot.label,
    });
  }

  function handleLineClick(event: MouseEvent<HTMLAnchorElement>, generatedMessage: string, destinationUrl: string) {
    event.preventDefault();

    if (selectedSlots.length === 0) {
      return;
    }

    const href = destinationUrl;

    console.log({
      storeId: data.store.id,
      storeName: data.store.name,
      lineOaId: data.store.lineOaId,
      generatedMessage,
      lineUrl: href,
    });

    if (!data.store.lineOaId) {
      alert("この店舗のLINE設定が未完了です");
      return;
    }

    trackEvent("confirm_modal_open", {
      store_id: data.store.id,
      store_name: data.store.name,
      selected_count: selectedSlots.length,
      selected_slots: selectedSlots.map((slot) => slot.dateLabel).join(", "),
    });

    setLineConfirmation({
      generatedMessage,
      destinationUrl: href,
    });
  }

  function handleConfirmSubmit() {
    if (!lineConfirmation) {
      return;
    }

    console.log({
      userAgent: window.navigator.userAgent,
      href: lineConfirmation.destinationUrl,
      currentUrl: window.location.href,
      selectedSlots,
    });

    trackEvent("confirm_submit", {
      store_id: data.store.id,
      store_name: data.store.name,
      selected_count: selectedSlots.length,
      selected_slots: selectedSlots.map((slot) => slot.dateLabel).join(", "),
    });

    trackEvent("line_send_click", {
      store_id: data.store.id,
      store_name: data.store.name,
      selected_count: selectedSlots.length,
      selected_slots: selectedSlots.map((slot) => slot.dateLabel).join(", "),
    });

    if (LINE_NAVIGATION_MODE === "location.href") {
      window.location.href = lineConfirmation.destinationUrl;
      return;
    }

    window.open(lineConfirmation.destinationUrl, "_blank", "noopener,noreferrer");
  }

  function handleStoreChange(nextStoreId: string) {
    setStoreId(nextStoreId);
    setSelectedSlots([]);
    trackEvent("store_change", {
      store_id: nextStoreId,
    });

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("store", nextStoreId);
    window.history.pushState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
  }

  const julyElevenFilteredEvents = data.diagnostics.matchedEvents.filter((event) => {
    return event.start?.startsWith("2026-07-11");
  });
  const julyElevenBusySlots = data.diagnostics.busySlots.filter((slot) => {
    return slot.dateLabel.startsWith("7/11");
  });
  const availableMonths = data.availableMonths;
  const activeMonthKey = data.month.key;
  const activeMonthIndex = availableMonths.indexOf(activeMonthKey);
  const previousAvailableMonthKey = activeMonthIndex > 0 ? availableMonths[activeMonthIndex - 1] : null;
  const nextAvailableMonthKey =
    activeMonthIndex >= 0 && activeMonthIndex < availableMonths.length - 1 ? availableMonths[activeMonthIndex + 1] : null;

  function handleMonthChange(nextMonthKey: string | null) {
    if (!nextMonthKey) {
      return;
    }

    setMonthKey(nextMonthKey);
  }

  useEffect(() => {
    if (data.month.key !== monthKey) {
      setMonthKey(data.month.key);
    }
  }, [data.month.key, monthKey]);

  useEffect(() => {
    const availabilityViewScope = `${data.store.id}__${data.month.key}`;

    if (availabilityViewScopeRef.current === availabilityViewScope) {
      return;
    }

    availabilityViewScopeRef.current = availabilityViewScope;
    trackEvent("availability_view", {
      store_id: data.store.id,
      store_name: data.store.name,
      selected_month: data.month.key,
    });
  }, [data.store.id, data.store.name, data.month.key]);

  useEffect(() => {
    const mobileInitialScope = `${data.store.id}__${data.month.key}`;

    if (mobileInitialScopeRef.current !== mobileInitialScope) {
      mobileInitialScopeRef.current = mobileInitialScope;
      setSelectedDate(getInitialMobileStartDate(data.days));
    }
  }, [data.store.id, data.month.key, data.days]);

  useEffect(() => {
    if (selectedDate && !data.days.some((day) => day.date === selectedDate)) {
      setSelectedDate(getInitialMobileStartDate(data.days));
    }
  }, [data.days, selectedDate]);

  return (
    <section className={`px-4 pt-5 sm:px-0 ${selectedSlots.length > 0 ? "pb-[25rem]" : "pb-28"}`}>
      <div className="mx-auto mb-5 max-w-4xl">
        <label className="block max-w-sm">
          <span className="mb-2 block text-sm font-bold text-slate-700">店舗</span>
          <select
            value={storeId}
            onChange={(event) => handleStoreChange(event.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-ink shadow-sm outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            disabled={isLoading}
            aria-label="店舗を選択"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 truncate text-xs font-semibold text-leaf md:text-sm">{data.store.area}</p>
        <h1 className="mt-2 hidden text-2xl font-bold tracking-normal text-ink md:block">
          {data.store.name}
        </h1>
        <p className="mt-2 hidden text-sm leading-6 text-slate-600 md:block">
          ○の枠を選ぶと、希望日時をLINEで送信できます。予約は店舗からの返信後に確定します。
        </p>
      </div>

      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => handleMonthChange(previousAvailableMonthKey)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-60 md:h-10 md:w-10 md:text-xl"
          disabled={isLoading || !previousAvailableMonthKey}
          aria-label="前月を表示"
          title="前月を表示"
        >
          ＜
        </button>
        <p className="min-w-[9em] text-center text-xl font-bold text-ink" aria-live="polite">
          {formatMonthLabel(activeMonthKey)}
        </p>
        <button
          type="button"
          onClick={() => handleMonthChange(nextAvailableMonthKey)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-60 md:h-10 md:w-10 md:text-xl"
          disabled={isLoading || !nextAvailableMonthKey}
          aria-label="翌月を表示"
          title="翌月を表示"
        >
          ＞
        </button>
      </div>

      <div className="mx-auto mb-4 flex max-w-4xl items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-ink">空き状況</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-leaf">○ 空きあり</span>
            <span className="font-bold text-slate-500">× 満席</span>
          </div>
          <div className="mt-4 md:mt-3">
            <p className="text-[15px] font-semibold leading-6 text-ink md:text-sm">
              希望の日時を3つまでご選択ください
            </p>
            <p className="mt-0.5 text-sm leading-5 text-gray-500">
              （第1〜第3希望）
            </p>
          </div>
          <p className="mt-2 hidden text-xs font-semibold text-slate-500 md:block">
            横にスライドすると、他の日付も確認できます。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => refreshAvailability({ bypassCache: true })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-60"
            disabled={isLoading}
            aria-label="空き枠を更新"
            title="空き枠を更新"
          >
            <span className={`text-base ${isLoading ? "animate-spin" : ""}`} aria-hidden>
              ↻
            </span>
          </button>
          <p className="whitespace-nowrap text-xs font-semibold text-slate-500" aria-live="polite">
            最終更新：{lastUpdatedAt ? formatLastUpdatedTime(lastUpdatedAt) : "--:--"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mx-auto mb-4 max-w-4xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <MobileAvailabilityView
        days={data.days}
        selectedDate={selectedDate}
        selectedSlots={selectedSlots}
        onSelectedDateChange={setSelectedDate}
        onSlotClick={handleSlotClick}
      />

      <div className="mx-auto hidden max-w-4xl overflow-x-auto rounded-md border border-slate-200 bg-white shadow-soft [scrollbar-gutter:stable] md:block">
        <table className="min-w-[650px] border-collapse text-center sm:min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[76px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 shadow-[4px_0_10px_rgba(15,23,42,0.06)]">
                時間
              </th>
              {data.days.map((day) => (
                <th
                  key={day.date}
                  className="min-w-[82px] border-b border-r border-slate-200 bg-slate-50 px-2 py-3 last:border-r-0"
                >
                  <span className={`block text-[15px] font-bold leading-5 ${weekdayTextClass(day.weekday)}`}>
                    {day.label}
                  </span>
                  <span className={`mt-0.5 block text-sm font-bold leading-5 ${weekdayTextClass(day.weekday)}`}>
                    {day.weekday}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((time) => (
              <tr key={time}>
                <th className="sticky left-0 z-10 min-w-[76px] border-b border-r border-slate-200 bg-white px-3 py-3 text-[15px] font-bold text-slate-700 shadow-[4px_0_10px_rgba(15,23,42,0.05)]">
                  {time}
                </th>
                {data.days.map((day) => {
                  const slot = day.slots.find((item) => item.label === time);

                  if (!slot) {
                    return (
                      <td
                        key={`${day.date}-${time}`}
                        className="h-14 min-w-[82px] border-b border-r border-slate-200 bg-slate-50 px-2 py-2 last:border-r-0"
                      >
                        <span className="text-lg font-bold text-slate-400">×</span>
                      </td>
                    );
                  }

                  return (
                    <SlotCell
                      key={slot.id}
                      slot={slot}
                      selectionNumber={getSelectionNumber(selectedSlots, slot.id)}
                      onClick={() => handleSlotClick(slot)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mx-auto mt-4 max-w-4xl px-1 text-xs leading-5 text-slate-500">
        シフトとGoogleカレンダーの予定をもとに自動判定しています。過去日は表示されません。
      </p>

      <div className="mx-auto mt-3 hidden max-w-4xl rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600 md:block">
        <p className="font-bold text-slate-700">デバッグ</p>
        <p className="mt-1">表示中 selectedMonth: {monthKey}</p>
        <p>API selectedMonth: {data.diagnostics.selectedMonth}</p>
        <p>timeMin: {data.diagnostics.timeMin}</p>
        <p>timeMax: {data.diagnostics.timeMax}</p>
        <p>storeId: {data.store.id}</p>
        <p>cacheStatus: {data.diagnostics.cacheStatus}</p>
        <p>cachedAt: {data.diagnostics.cachedAt ? formatDebugDate(data.diagnostics.cachedAt) : "-"}</p>
        <p>cacheExpiresAt: {data.diagnostics.cacheExpiresAt ? formatDebugDate(data.diagnostics.cacheExpiresAt) : "-"}</p>
        <div className="mt-3">
          <p className="font-bold text-slate-700">7/11 filtered events</p>
          <p>filteredEventCount: {data.filteredEventCount}件</p>
          {julyElevenFilteredEvents.length > 0 ? (
            <ol className="mt-2 max-h-44 list-decimal space-y-2 overflow-y-auto pl-5">
              {julyElevenFilteredEvents.map((event, index) => (
                <li key={`${event.start}-${index}`}>
                  <p>summary: {event.summary ?? "-"}</p>
                  <p>location: {event.location ?? "-"}</p>
                  <p>start: {event.start ?? "-"} / end: {event.end ?? "-"}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">7/11 の対象店舗イベントはありません。</p>
          )}
        </div>
        <div className="mt-3">
          <p className="font-bold text-slate-700">7/11 busySlots</p>
          {julyElevenBusySlots.length > 0 ? (
            <ol className="mt-2 max-h-44 list-decimal space-y-1 overflow-y-auto pl-5">
              {julyElevenBusySlots.map((slot) => (
                <li key={slot.id}>{formatBusySlotLabel(slot.dateLabel)} → {slot.status}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">7/11 に busy 反映されたスロットはありません。</p>
          )}
        </div>
        <p>sheetSource: {data.diagnostics.sheetSource}</p>
        <p>shiftError: {data.diagnostics.shiftErrorMessage ?? "-"}</p>
        <p>shiftSheet: {data.diagnostics.shiftSheetName}</p>
        <p>shiftRows: {data.diagnostics.shiftRows.length}件</p>
        <p>fetchedAt: {formatDebugDate(data.diagnostics.fetchedAt)}</p>
        <p className="mt-1">
          Googleカレンダー全体: {data.eventCount}件 / 対象店舗: {data.filteredEventCount}件
        </p>
        <p className="mt-1">
          busy反映スロット: {data.diagnostics.busySlots.length}件
        </p>
        {data.diagnostics.sampleEvents.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {data.diagnostics.sampleEvents.map((event, index) => (
              <li key={`${event.start}-${index}`}>
                {event.summary ?? "タイトルなし"} {event.start ? `(${formatDebugDate(event.start)})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">対象店舗イベントのサンプルはありません。</p>
        )}
        <div className="mt-3">
          <p className="font-bold text-slate-700">matched=true イベント一覧</p>
          {data.diagnostics.matchedEvents.length > 0 ? (
            <ol className="mt-2 max-h-44 list-decimal space-y-2 overflow-y-auto pl-5">
              {data.diagnostics.matchedEvents.map((event, index) => (
                <li key={`${event.start}-${index}`}>
                  <p>{event.summary ?? "-"}</p>
                  <p>location: {event.location ?? "-"}</p>
                  <p>start: {event.start ?? "-"} / end: {event.end ?? "-"}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">matched=true のイベントはありません。</p>
          )}
        </div>
        <div className="mt-3">
          <p className="font-bold text-slate-700">busy slot 反映一覧</p>
          {data.diagnostics.busySlots.length > 0 ? (
            <ol className="mt-2 max-h-44 list-decimal space-y-1 overflow-y-auto pl-5">
              {data.diagnostics.busySlots.map((slot) => (
                <li key={slot.id}>{formatBusySlotLabel(slot.dateLabel)} → {slot.status}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">busy に反映されたスロットはありません。</p>
          )}
        </div>
        <div className="mt-3">
          <p className="font-bold text-slate-700">取得イベント詳細 全件</p>
          {data.diagnostics.debugEvents.length > 0 ? (
            <ol className="mt-2 max-h-64 list-decimal space-y-3 overflow-y-auto pl-5">
              {data.diagnostics.debugEvents.map((event, index) => (
                <li key={`${event.start}-${index}`}>
                  <div className="space-y-1">
                    <p>
                      <span className="font-semibold text-slate-700">summary:</span>{" "}
                      {event.summary ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">start:</span> {event.start ?? "-"} /{" "}
                      <span className="font-semibold text-slate-700">end:</span> {event.end ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">location:</span>{" "}
                      {event.location ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">matched:</span>{" "}
                      {event.matched ? "true" : "false"}
                    </p>
                    <p className="whitespace-pre-wrap">
                      <span className="font-semibold text-slate-700">description:</span>{" "}
                      {event.description ?? "-"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">取得イベントはありません。</p>
          )}
        </div>
      </div>

      <LineFixedBar
        selectedSlots={selectedSlots}
        customerName={customerName}
        customerPhone={customerPhone}
        lineOaId={data.store.lineOaId}
        storeName={data.store.name}
        onCustomerNameChange={setCustomerName}
        onCustomerPhoneChange={setCustomerPhone}
        onLineClick={handleLineClick}
      />

      <LineConfirmModal
        isOpen={lineConfirmation !== null}
        customerName={customerName.trim()}
        customerPhone={customerPhone.trim()}
        selectedSlots={selectedSlots}
        onClose={() => setLineConfirmation(null)}
        onSubmit={handleConfirmSubmit}
      />
    </section>
  );
}

type LineConfirmation = {
  generatedMessage: string;
  destinationUrl: string;
};

const timeRows = ["09:30", "10:40", "11:50", "13:00", "14:10", "15:20", "16:30", "17:40", "18:50", "20:00"];

function getInitialMobileStartDate(days: AvailabilityResponse["days"]) {
  const firstAvailableDay = days.find((day) => day.slots.some((slot) => slot.status === "available"));
  return firstAvailableDay?.date ?? days[0]?.date ?? "";
}

function getSlotDate(slot: AvailabilitySlot) {
  return slot.id.slice(0, 10);
}

type MobileAvailabilityViewProps = {
  days: AvailabilityResponse["days"];
  selectedDate: string;
  selectedSlots: AvailabilitySlot[];
  onSelectedDateChange: (date: string) => void;
  onSlotClick: (slot: AvailabilitySlot) => void;
};

function MobileAvailabilityView({
  days,
  selectedDate,
  selectedSlots,
  onSelectedDateChange,
  onSlotClick,
}: MobileAvailabilityViewProps) {
  if (days.length === 0) {
    return (
      <div className="mx-auto max-w-4xl rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm font-bold text-slate-500 md:hidden">
        表示できる日付がありません。
      </div>
    );
  }

  const selectedIndex = Math.max(0, days.findIndex((day) => day.date === selectedDate));
  const groupStartIndex = selectedIndex;
  const visibleDays = days.slice(groupStartIndex, groupStartIndex + 3);
  const hasAnyAvailableSlot = days.some((day) => day.slots.some((slot) => slot.status === "available"));
  const canShowPreviousGroup = groupStartIndex > 0;
  const canShowNextGroup = groupStartIndex + 3 < days.length;

  function handleGroupMove(amount: number) {
    const nextStartIndex = Math.min(Math.max(groupStartIndex + amount, 0), Math.max(days.length - 1, 0));
    const nextDay = days[nextStartIndex];

    if (nextDay) {
      onSelectedDateChange(nextDay.date);
    }
  }

  return (
    <div className="mx-auto max-w-4xl md:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleGroupMove(-3)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-50"
          disabled={!canShowPreviousGroup}
          aria-label="前の3日を表示"
        >
          ＜
        </button>
        <p className="text-sm font-bold text-ink" aria-live="polite">
          {visibleDays[0]?.label}
          {visibleDays.length > 1 ? `〜${visibleDays[visibleDays.length - 1]?.label}` : ""}
        </p>
        <button
          type="button"
          onClick={() => handleGroupMove(3)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-bold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-50"
          disabled={!canShowNextGroup}
          aria-label="次の3日を表示"
        >
          ＞
        </button>
      </div>

      {!hasAnyAvailableSlot ? (
        <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-500">
          現在表示できる空き枠がありません
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="grid grid-cols-[58px_repeat(3,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
          <div className="border-r border-slate-200 px-2 py-3 text-center text-xs font-bold text-slate-500">
            時間
          </div>
          {visibleDays.map((day) => (
            <div key={day.date} className="border-r border-slate-200 px-1 py-3 text-center last:border-r-0">
              <span className={`block text-sm font-bold leading-5 ${weekdayTextClass(day.weekday)}`}>
                {day.label}
              </span>
              <span className={`block text-xs font-bold leading-4 ${weekdayTextClass(day.weekday)}`}>
                {day.weekday}
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - visibleDays.length }, (_, index) => (
            <div key={`empty-heading-${index}`} className="border-r border-slate-200 last:border-r-0" />
          ))}
        </div>
        {timeRows.map((time) => (
          <div key={time} className="grid grid-cols-[58px_repeat(3,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
            <div className="flex min-h-14 items-center justify-center border-r border-slate-200 bg-white px-1 text-xs font-bold text-slate-600">
              {time}
            </div>
            {visibleDays.map((day) => {
              const slot = day.slots.find((item) => item.label === time);
              const selectionNumber = slot ? getSelectionNumber(selectedSlots, slot.id) : null;

              if (!slot || slot.status !== "available") {
                return (
                  <div
                    key={`${day.date}-${time}`}
                    className="flex min-h-14 items-center justify-center border-r border-slate-100 bg-slate-50 px-1 last:border-r-0"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-400">
                      ×
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onSlotClick(slot)}
                  className={`flex min-h-14 items-center justify-center border-r border-slate-100 px-1 transition active:scale-[0.98] last:border-r-0 ${
                    selectionNumber ? "bg-emerald-600" : "bg-white"
                  }`}
                  aria-label={`${slot.dateLabel}を選択`}
                  aria-pressed={selectionNumber !== null}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
                      selectionNumber ? "bg-white text-leaf" : "bg-emerald-50 text-leaf"
                    }`}
                  >
                    {selectionNumber ? toCircledNumber(selectionNumber) : "○"}
                  </span>
                </button>
              );
            })}
            {Array.from({ length: 3 - visibleDays.length }, (_, index) => (
              <div key={`empty-${time}-${index}`} className="min-h-14 border-r border-slate-100 bg-slate-50 last:border-r-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type SlotCellProps = {
  slot: AvailabilitySlot;
  selectionNumber: number | null;
  onClick: () => void;
};

function SlotCell({ slot, selectionNumber, onClick }: SlotCellProps) {
  const isAvailable = slot.status === "available";
  const isSelected = selectionNumber !== null;

  if (!isAvailable) {
    return (
      <td className="h-14 min-w-[82px] border-b border-r border-slate-200 bg-slate-50 px-2 py-2 last:border-r-0">
        <span className="text-lg font-bold text-slate-400">×</span>
      </td>
    );
  }

  return (
    <td
      className={`h-14 min-w-[82px] border-b border-r border-slate-200 px-2 py-2 last:border-r-0 ${
        isSelected ? "bg-leaf" : "bg-emerald-50"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold transition active:scale-95 ${
          isSelected ? "bg-leaf text-white" : "text-leaf hover:bg-emerald-100"
        }`}
        aria-label={`${slot.dateLabel}を選択`}
        aria-pressed={isSelected}
        title={`${slot.dateLabel}を選択`}
      >
        {isSelected ? toCircledNumber(selectionNumber) : "○"}
      </button>
    </td>
  );
}

type LineConfirmModalProps = {
  isOpen: boolean;
  customerName: string;
  customerPhone: string;
  selectedSlots: AvailabilitySlot[];
  onClose: () => void;
  onSubmit: () => void;
};

function LineConfirmModal({
  isOpen,
  customerName,
  customerPhone,
  selectedSlots,
  onClose,
  onSubmit,
}: LineConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-confirm-title"
      onClick={onClose}
    >
      <div
        className="w-full rounded-md bg-white p-5 shadow-2xl sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="line-confirm-title" className="text-lg font-bold text-ink">
              送信内容の確認
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              内容を確認してからLINEへ進んでください。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 transition hover:bg-slate-50 active:scale-95"
            aria-label="確認モーダルを閉じる"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-slate-500">お名前</p>
              <p className="mt-1 min-h-6 text-base font-bold text-ink">{customerName || "未入力"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">電話番号</p>
              <p className="mt-1 min-h-6 text-base font-bold text-ink">{customerPhone || "未入力"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500">希望日時</p>
            <ol className="mt-2 space-y-2 text-sm font-bold leading-6 text-ink sm:text-base">
              {selectedSlots.map((slot, index) => (
                <li key={slot.id}>
                  第{index + 1}希望：{slot.dateLabel}〜
                </li>
              ))}
            </ol>
            {getConfirmationSelectionGuide(selectedSlots.length) ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {getConfirmationSelectionGuide(selectedSlots.length)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            修正する
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="min-h-12 rounded-md bg-line px-4 py-3 text-base font-bold text-white transition active:scale-[0.99]"
          >
            この内容でLINE送信する
          </button>
        </div>
      </div>
    </div>
  );
}

type LineFixedBarProps = {
  selectedSlots: AvailabilitySlot[];
  customerName: string;
  customerPhone: string;
  lineOaId: string;
  storeName: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onLineClick: (event: MouseEvent<HTMLAnchorElement>, generatedMessage: string, destinationUrl: string) => void;
};

function LineFixedBar({
  selectedSlots,
  customerName,
  customerPhone,
  lineOaId,
  storeName,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onLineClick,
}: LineFixedBarProps) {
  const trimmedCustomerName = customerName.trim();
  const trimmedCustomerPhone = customerPhone.trim();
  const selectedCount = selectedSlots.length;
  const canSubmit = selectedCount > 0;
  const ctaLabel = getLineCtaLabel(selectedCount);
  const ctaSubText = getLineCtaSubText(selectedCount);
  const generatedMessage = createLineMessage(storeName, selectedSlots, trimmedCustomerName, trimmedCustomerPhone);
  const destinationUrl = createLineUrl(lineOaId, generatedMessage);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-y-auto border-t border-slate-200 bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(24,33,47,0.14)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {selectedCount > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">お名前</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => onCustomerNameChange(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">電話番号</span>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => onCustomerPhoneChange(event.target.value.replace(/[^\d-]/g, ""))}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
                  inputMode="tel"
                  pattern="[0-9-]*"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="w-full text-left">
              <p className="text-xs font-bold text-slate-500">選択中の希望日時</p>
              <ol className="mt-1 space-y-1 text-sm font-bold leading-6 text-ink sm:text-base">
                {selectedSlots.map((slot, index) => (
                  <li key={slot.id}>
                    第{index + 1}希望：{slot.dateLabel}〜
                  </li>
                ))}
              </ol>
              {selectedCount === 1 ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  （第2・第3希望も追加できます）
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        <a
          href={destinationUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canSubmit}
          onClick={(event) => {
            if (!canSubmit) {
              event.preventDefault();
              return;
            }

            onLineClick(event, generatedMessage, destinationUrl);
          }}
          className={`flex min-h-14 w-full flex-col items-center justify-center rounded-md px-5 py-4 text-center text-base font-bold text-white transition active:scale-[0.99] ${
            canSubmit ? "bg-line" : "pointer-events-none bg-slate-300 opacity-70"
          }`}
        >
          <span>{ctaLabel}</span>
          {ctaSubText ? (
            <span className="mt-0.5 text-xs font-bold text-white/90">{ctaSubText}</span>
          ) : null}
        </a>
      </div>
    </div>
  );
}

function createLineMessage(
  storeName: string,
  selectedSlots: AvailabilitySlot[],
  customerName: string,
  customerPhone: string,
) {
  const requestLines = selectedSlots.map((slot, index) => `第${index + 1}希望：${slot.dateLabel}〜`);

  return [
    "以下をそのままご送信ください！",
    "",
    "体験予約希望です。",
    "",
    `店舗：${storeName}`,
    "",
    `お名前：${customerName}`,
    `電話番号：${customerPhone}`,
    "",
    ...requestLines,
    "",
    "※空き状況は変動するため、スタッフからの返信をもって予約確定となります。",
  ].join("\n");
}

function getLineCtaLabel(selectedCount: number) {
  if (selectedCount === 0) {
    return "希望日時を選択してください";
  }

  if (selectedCount === 1) {
    return "この日時でLINE送信する";
  }

  return `${selectedCount}候補をLINE送信する`;
}

function getLineCtaSubText(selectedCount: number) {
  if (selectedCount === 1) {
    return "（別候補も追加できます）";
  }

  if (selectedCount === 2) {
    return "（あと1つ追加できます）";
  }

  return "";
}

function getConfirmationSelectionGuide(selectedCount: number) {
  if (selectedCount === 1) {
    return "あと2件まで追加できます（任意）";
  }

  if (selectedCount === 2) {
    return "あと1件追加できます（任意）";
  }

  return "";
}

function createLineUrl(lineOaId: string, message: string) {
  const trimmedLineOaId = lineOaId.trim();
  const encodedMessage = encodeURIComponent(message);

  if (trimmedLineOaId) {
    return `https://line.me/R/oaMessage/${encodeURIComponent(trimmedLineOaId)}/?${encodedMessage}`;
  }

  return "";
}

function getSelectionNumber(selectedSlots: AvailabilitySlot[], slotId: string) {
  const selectedIndex = selectedSlots.findIndex((slot) => slot.id === slotId);
  return selectedIndex >= 0 ? selectedIndex + 1 : null;
}

function toCircledNumber(value: number) {
  if (value === 1) {
    return "①";
  }

  if (value === 2) {
    return "②";
  }

  return "③";
}

function weekdayTextClass(weekday: string) {
  if (weekday === "土") {
    return "text-blue-600";
  }

  if (weekday === "日") {
    return "text-red-600";
  }

  return "text-ink";
}

function formatMonthLabel(monthKey: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return `${year}年${monthIndex + 1}月`;
}

function parseMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const today = new Date();
    return {
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
    };
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

function formatDebugDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatBusySlotLabel(dateLabel: string) {
  return dateLabel.replace(/\([^)]*\)/, "");
}

function formatLastUpdatedTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
