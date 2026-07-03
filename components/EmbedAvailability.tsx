import type { AvailabilityDay } from "@/types/availability";

type EmbedAvailabilityProps = {
  storeName: string;
  days: AvailabilityDay[];
};

const displayTimeRows = ["09:30", "10:40", "11:50", "13:00", "14:10", "15:20", "16:30", "17:40", "18:50", "20:00", "21:10"];

export function EmbedAvailability({ storeName, days }: EmbedAvailabilityProps) {
  const timeRows = getTimeRows(days);
  const hasAnyAvailableSlot = days.some((day) => day.slots.some((slot) => slot.status === "available"));

  return (
    <section className="w-full overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="truncate text-xs font-bold text-slate-500">{storeName}</p>
        <h1 className="mt-0.5 text-sm font-bold text-slate-900">直近の空き状況</h1>
      </div>

      {days.length === 0 ? (
        <p className="px-3 py-5 text-center text-xs font-bold text-slate-500">表示できる日付がありません。</p>
      ) : (
        <>
          {!hasAnyAvailableSlot ? (
            <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-500">
              現在表示できる空き枠がありません
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-center">
              <thead>
                <tr>
                  <th className="w-[58px] border-b border-r border-slate-200 bg-white px-1.5 py-2 text-[11px] font-bold text-slate-500">
                    時間
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.date}
                      className="border-b border-r border-slate-200 bg-white px-1.5 py-2 last:border-r-0"
                    >
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
                    <th className="border-b border-r border-slate-100 bg-slate-50 px-1.5 py-2 text-[11px] font-bold text-slate-600">
                      {time}
                    </th>
                    {days.map((day) => {
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
