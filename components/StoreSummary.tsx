import type { AvailabilityResponse } from "@/types/availability";

type StoreSummaryProps = {
  store: AvailabilityResponse["store"];
};

export function StoreSummary({ store }: StoreSummaryProps) {
  return (
    <section className="bg-white px-5 py-5 shadow-soft sm:rounded-lg">
      <p className="text-sm font-semibold text-leaf">{store.area}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink">
        {store.name}
      </h1>
      <div className="mt-4 grid gap-3 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-leaf" aria-hidden>MAP</span>
          <span>{store.nearestStation}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-leaf" aria-hidden>CAL</span>
          <span>○の枠を選ぶと、希望日時をLINEで送信できます。</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-line" aria-hidden>LINE</span>
          <span>予約確定ではありません。店舗からの返信後に確定します。</span>
        </div>
      </div>
    </section>
  );
}
