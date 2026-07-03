import { NextResponse } from "next/server";
import { getHpReservationAvailability } from "@/lib/hpReservationAvailability";
import { resolveHpStoreId } from "@/lib/hpStoreAliases";
import { getStoreById } from "@/lib/stores";
import { saveWebReservationSubmission } from "@/lib/webReservationSubmissions";

export const dynamic = "force-dynamic";

const ageGroups = new Set(["20代", "30代", "40代", "50代", "60代以上"]);

type RequestBody = {
  storeId?: string;
  slotId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  ageGroup?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const storeId = resolveHpStoreId(body.storeId);
    const store = getStoreById(storeId);
    const customerName = normalizeText(body.customerName);
    const customerPhone = normalizeText(body.customerPhone);
    const customerEmail = normalizeText(body.customerEmail);
    const ageGroup = normalizeText(body.ageGroup);
    const message = normalizeText(body.message);
    const slotId = normalizeText(body.slotId);

    if (!customerName || !customerPhone || !ageGroup || !slotId) {
      return NextResponse.json({ error: "必須項目を入力してください。" }, { status: 400 });
    }

    if (!ageGroups.has(ageGroup)) {
      return NextResponse.json({ error: "年代を選択してください。" }, { status: 400 });
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "メールアドレスの形式を確認してください。" }, { status: 400 });
    }

    const availability = await getHpReservationAvailability(store.id);
    const selectedSlot = availability.days
      .flatMap((day) => day.slots)
      .find((slot) => slot.id === slotId && slot.status === "available");

    if (!selectedSlot) {
      return NextResponse.json({ error: "選択した枠は現在受付できません。別の枠を選択してください。" }, { status: 409 });
    }

    const saved = await saveWebReservationSubmission({
      storeName: store.name,
      slotLabel: `${selectedSlot.dateLabel}〜`,
      customerName,
      customerPhone,
      customerEmail,
      ageGroup,
      message,
    });

    return NextResponse.json({
      ok: true,
      submittedAt: saved.submittedAt,
      sheetName: saved.sheetName,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "予約フォームの送信に失敗しました。",
      },
      { status: 500 },
    );
  }
}

function normalizeText(value?: string) {
  return String(value ?? "").trim();
}
