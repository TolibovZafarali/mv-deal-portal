const CHANNEL = "mv:admin:event";
const QUEUE_REFRESH_CHANNEL = "mv:admin:queue:refresh";

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function trackAdminEvent(name, payload = {}) {
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
    console.debug("[admin-event]", detail);
  }
}

export function signalAdminQueueRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUEUE_REFRESH_CHANNEL));
}

export function startAdminTimer(name, payload = {}) {
  const startedAt = nowMs();
  trackAdminEvent(`${name}.start`, payload);

  return function stop(status = "success", extra = {}) {
    const durationMs = Math.round(nowMs() - startedAt);
    trackAdminEvent(`${name}.${status}`, {
      ...payload,
      ...extra,
      durationMs,
    });
  };
}

export const ADMIN_EVENT_CHANNEL = CHANNEL;
export const ADMIN_QUEUE_REFRESH_CHANNEL = QUEUE_REFRESH_CHANNEL;
