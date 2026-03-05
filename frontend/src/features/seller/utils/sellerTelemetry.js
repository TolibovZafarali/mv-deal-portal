const CHANNEL = "mv:seller:event";

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function trackSellerEvent(name, payload = {}) {
  if (!name) return;

  const detail = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANNEL, { detail }));
  }

  if (import.meta.env?.DEV) {
    console.debug("[seller-event]", detail);
  }
}

export function startSellerTimer(name, payload = {}) {
  const startedAt = nowMs();
  trackSellerEvent(`${name}.start`, payload);

  return function stop(status = "success", extra = {}) {
    const durationMs = Math.round(nowMs() - startedAt);
    trackSellerEvent(`${name}.${status}`, {
      ...payload,
      ...extra,
      durationMs,
    });
  };
}

export const SELLER_EVENT_CHANNEL = CHANNEL;
