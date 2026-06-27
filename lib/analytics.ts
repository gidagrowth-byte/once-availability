"use client";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    clarity?: (method: "set", key: string, value: string) => void;
  }
}

export function trackEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  window.dataLayer.push({
    event: eventName,
    ...params,
  });

  setClarityTags(eventName, params);
}

function setClarityTags(eventName: string, params: Record<string, unknown>) {
  if (typeof window.clarity !== "function") {
    return;
  }

  const tags = getClarityTags(eventName, params);

  for (const [key, value] of Object.entries(tags)) {
    window.clarity("set", key, String(value));
  }
}

function getClarityTags(eventName: string, params: Record<string, unknown>) {
  if (eventName === "availability_view") {
    return pickDefined({
      event: eventName,
      store_id: params.store_id,
    });
  }

  if (eventName === "store_change") {
    return pickDefined({
      event: eventName,
      store_id: params.store_id,
    });
  }

  if (eventName === "slot_select") {
    return pickDefined({
      event: eventName,
      store_id: params.store_id,
      selected_date: params.date,
      selected_time: params.time,
    });
  }

  if (eventName === "line_send_click") {
    return pickDefined({
      event: eventName,
      store_id: params.store_id,
      selected_slots: params.selected_slots,
    });
  }

  return {};
}

function pickDefined(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  );
}
