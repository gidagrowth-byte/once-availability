"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AvailabilityDay, AvailabilitySlot } from "@/types/availability";

type StoreOption = {
  id: string;
  name: string;
};

type HpReservationFormProps = {
  storeId: string;
  storeName: string;
  storeArea: string;
  stores: StoreOption[];
  days: AvailabilityDay[];
};

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const ageGroupOptions = ["20代", "30代", "40代", "50代", "60代以上"];
const displayTimeRows = ["09:30", "10:40", "11:50", "13:00", "14:10", "15:20", "16:30", "17:40", "18:50", "20:00", "21:10"];

export function HpReservationForm({ storeId, storeName, storeArea, stores, days }: HpReservationFormProps) {
  const initialStartIndex = useMemo(() => getInitialStartIndex(days), [days]);
  const [startIndex, setStartIndex] = useState(initialStartIndex);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });
  const visibleDays = days.slice(startIndex, startIndex + 3);
  const timeRows = getTimeRows(visibleDays);
  const canShowPreviousGroup = startIndex > 0;
  const canShowNextGroup = startIndex + 3 < days.length;
  const canSubmit =
    selectedSlot !== null &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    ageGroup.trim().length > 0 &&
    submitState.status !== "submitting";

  function handleStoreChange(nextStoreId: string) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("mode", "form");
    nextUrl.searchParams.set("store", nextStoreId);
    window.location.href = `${nextUrl.pathname}${nextUrl.search}`;
  }

  function handleGroupMove(amount: number) {
    setStartIndex((currentIndex) => {
      const maxStartIndex = Math.max(days.length - 1, 0);
      return Math.min(Math.max(currentIndex + amount, 0), maxStartIndex);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !selectedSlot) {
      setSubmitState({ status: "error", message: "必須項目を入力し、希望日時を選択してください。" });
      return;
    }

    setSubmitState({ status: "submitting", message: "送信中です..." });

    const response = await fetch("/api/web-reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeId,
        slotId: selectedSlot.id,
        customerName,
        customerPhone,
        customerEmail,
        ageGroup,
        message,
      }),
    });
    const result = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !result.ok) {
      setSubmitState({ status: "error", message: result.error ?? "送信に失敗しました。" });
      return;
    }

    setSubmitState({
      status: "success",
      message: "送信が完了しました。店舗からの連絡をお待ちください。",
    });
  }

  if (submitState.status === "success") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-md border border-emerald-200 bg-white p-6 text-center shadow-soft">
          <p className="text-lg font-bold text-ink">送信完了</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{submitState.message}</p>
          <div className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-left text-sm font-bold leading-6 text-ink">
            <p>店舗：{storeName}</p>
            <p>希望日時：{selectedSlot?.dateLabel}〜</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl px-4 py-5">
      <div className="rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-xl font-bold text-ink">体験予約フォーム</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            空いている日時を選択し、お客様情報を入力してください。
          </p>
        </div>

        <div className="grid gap-4 px-4 py-4 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-500">希望店舗（必須）</span>
              <select
                value={storeId}
                onChange={(event) => handleStoreChange(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs font-semibold text-leaf">{storeArea}</p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">希望日時（必須）</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  <span className="mr-3 text-leaf">○ 選択可</span>
                  <span>× 満席</span>
                </p>
              </div>
              <p className="text-right text-xs font-bold text-slate-500">
                {selectedSlot ? `選択中：${selectedSlot.dateLabel}〜` : "未選択"}
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
              <p className="text-sm font-bold text-ink">
                {visibleDays[0]?.label}
                {visibleDays.length > 1 ? `〜${visibleDays[visibleDays.length - 1]?.label}` : ""}
              </p>
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

            <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr>
                    <th className="w-[58px] border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2 text-[11px] font-bold text-slate-500">
                      時間
                    </th>
                    {visibleDays.map((day) => (
                      <th key={day.date} className="border-b border-r border-slate-200 bg-slate-50 px-1.5 py-2 last:border-r-0">
                        <span className="block text-xs font-bold leading-4 text-slate-900">{day.label}</span>
                        <span className={`block text-[11px] font-bold leading-4 ${weekdayTextClass(day.weekday)}`}>
                          {day.weekday}
                        </span>
                      </th>
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
                        const isSelected = selectedSlot?.id === slot?.id;

                        return (
                          <td
                            key={`${day.date}-${time}`}
                            className={`border-b border-r border-slate-100 px-1.5 py-2 last:border-r-0 ${
                              isSelected ? "bg-leaf" : isAvailable ? "bg-emerald-50" : "bg-slate-50"
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!isAvailable || !slot}
                              onClick={() => slot && setSelectedSlot(slot)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-bold transition active:scale-95 disabled:cursor-not-allowed ${
                                isSelected
                                  ? "bg-white text-leaf"
                                  : isAvailable
                                    ? "bg-white text-emerald-700"
                                    : "text-slate-400"
                              }`}
                              aria-label={slot ? `${slot.dateLabel}を選択` : `${day.label} ${time}は満席`}
                            >
                              {isAvailable ? "○" : "×"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-100 px-4 py-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">お名前（必須）</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">電話番号（必須）</span>
            <input
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value.replace(/[^\d-]/g, ""))}
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">メールアドレス（任意）</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">年代（必須）</span>
            <select
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-bold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">選択してください</option>
              {ageGroupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-bold text-slate-500">ご質問・ご要望（任意）</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-base font-semibold text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        <div className="border-t border-slate-100 px-4 py-4">
          {submitState.message ? (
            <p
              className={`mb-3 rounded-md px-3 py-2 text-sm font-bold ${
                submitState.status === "error" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"
              }`}
            >
              {submitState.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex min-h-12 w-full items-center justify-center rounded-md bg-line px-4 py-3 text-base font-bold text-white transition active:scale-[0.99] disabled:bg-slate-300 disabled:text-slate-500"
          >
            {submitState.status === "submitting" ? "送信中..." : "この内容で送信する"}
          </button>
        </div>
      </div>
    </form>
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
