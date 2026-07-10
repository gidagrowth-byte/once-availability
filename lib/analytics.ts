"use client";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    clarity?: ((method: "set", key: string, value: string) => void) &
      ((method: "event", eventName: string) => void);
  }
}

type ClarityEvent = {
  eventName: string;
  params: Record<string, unknown>;
};

const clarityQueue: ClarityEvent[] = [];
const clarityFlushIntervalMs = 500;
const clarityMaxWaitMs = 10_000;
let clarityFlushIntervalId: number | null = null;
let clarityFlushStartedAt = 0;

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

  queueOrSendClarityEvent(eventName, params);
}

function queueOrSendClarityEvent(eventName: string, params: Record<string, unknown>) {
  if (isClarityReady()) {
    sendClarityEvent({ eventName, params });
    return;
  }

  clarityQueue.push({ eventName, params });
  startClarityFlushInterval();
}

function startClarityFlushInterval() {
  if (clarityFlushIntervalId !== null) {
    return;
  }

  clarityFlushStartedAt = Date.now();
  clarityFlushIntervalId = window.setInterval(() => {
    if (isClarityReady()) {
      flushClarityQueue();
      stopClarityFlushInterval();
      return;
    }

    if (Date.now() - clarityFlushStartedAt >= clarityMaxWaitMs) {
      clarityQueue.length = 0;
      stopClarityFlushInterval();
    }
  }, clarityFlushIntervalMs);
}

function stopClarityFlushInterval() {
  if (clarityFlushIntervalId === null) {
    return;
  }

  window.clearInterval(clarityFlushIntervalId);
  clarityFlushIntervalId = null;
}

function flushClarityQueue() {
  const queuedEvents = clarityQueue.splice(0, clarityQueue.length);

  for (const clarityEvent of queuedEvents) {
    sendClarityEvent(clarityEvent);
  }
}

function sendClarityEvent({ eventName, params }: ClarityEvent) {
  if (!isClarityReady()) {
    return;
  }

  const clarity = window.clarity;

  if (typeof clarity !== "function") {
    return;
  }

  clarity("event", eventName);

  const tags = getClarityTags(eventName, params);

  for (const [key, value] of Object.entries(tags)) {
    clarity("set", key, String(value));
  }
}

function isClarityReady() {
  return typeof window !== "undefined" && typeof window.clarity === "function";
}

function getClarityTags(eventName: string, params: Record<string, unknown>) {
  if (eventName === "availability_view") {
    return pickDefined({
      event: eventName,
      last_event: eventName,
      store_id: params.store_id,
    });
  }

  if (eventName === "store_change") {
    return pickDefined({
      event: eventName,
      last_event: eventName,
      store_id: params.store_id,
    });
  }

  if (eventName === "slot_select") {
    return pickDefined({
      event: eventName,
      last_event: eventName,
      store_id: params.store_id,
      selected_date: params.date,
      selected_time: params.time,
      age_group: params.age_group,
    });
  }

  if (eventName === "confirm_modal_open" || eventName === "confirm_submit" || eventName === "line_send_click") {
    return pickDefined({
      event: eventName,
      last_event: eventName,
      store_id: params.store_id,
      selected_slots: params.selected_slots,
      selected_count: params.selected_count,
      age_group: params.age_group,
    });
  }

  if (eventName === "step1_view" || eventName === "step2_view" || eventName === "step3_view") {
    return pickDefined({
      event: eventName,
      last_event: eventName,
      store_id: params.store_id,
      selected_count: params.selected_count,
      age_group: params.age_group,
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
