import axios from "axios";
import {
    AUTH_SYNC_EXPIRED,
    clearAccessToken,
    getAccessToken,
    publishAuthSync,
    setAccessToken,
} from "@/api/core/tokenStorage";

function resolveBaseUrl() {
    if (typeof import.meta === "undefined" || !import.meta?.env?.VITE_API_BASE_URL) {
        return "";
    }

    const configured = String(import.meta.env.VITE_API_BASE_URL).trim();
    if (!configured) {
        return "";
    }

    return configured.replace(/\/+$/, "");
}

const baseURL = resolveBaseUrl();
const DEFAULT_TIMEOUT_MS = 15000;
const SLOW_REQUEST_THRESHOLD_MS = 1200;
const inFlightGetRequests = new Map();

function resolveDefaultTimeoutMs() {
    if (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_TIMEOUT_MS) {
        const parsed = Number.parseInt(String(import.meta.env.VITE_API_TIMEOUT_MS).trim(), 10);
        if (Number.isFinite(parsed) && parsed >= 1000) {
            return parsed;
        }
    }
    return DEFAULT_TIMEOUT_MS;
}

function serializeParams(params) {
    const usp = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (Array.isArray(value)) {
            value.forEach((v) => {
                if (v === undefined || v === null || v === "") return;
                usp.append(key, String(v));
            });
        } else {
            usp.append(key, String(value));
        }
    });

    return usp.toString();
}

function requestPath(config = {}) {
    const targetUrl = config?.url ?? "";
    if (!targetUrl) return "";
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
        return targetUrl;
    }
    const prefix = config?.baseURL ?? baseURL;
    return `${prefix || ""}${targetUrl}`;
}

function dedupeParamsKey(params) {
    if (!params || typeof params !== "object") return "";
    return serializeParams(params);
}

function dedupeHeadersKey(headers = {}) {
    const authorization = headers?.Authorization || headers?.authorization || "";
    return String(authorization);
}

function buildGetRequestKey(url, config = {}) {
    const method = String(config?.method ?? "get").toUpperCase();
    const paramsKey = dedupeParamsKey(config?.params);
    const headersKey = dedupeHeadersKey(config?.headers);
    return [method, requestPath({ ...config, url }), paramsKey, headersKey].join("|");
}

function normalizeApiError(error) {
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? null;
    const message =
        error?.code === "ERR_CANCELED"
            ? "Request was canceled."
            : error?.code === "ECONNABORTED"
              ? "Request timed out. Please try again."
              : data?.message ||
                data?.error ||
                error?.message ||
                "Request failed";

    return { status, message, data, code: error?.code };
}

function notifyAuthExpired() {
    clearAccessToken();
    publishAuthSync(AUTH_SYNC_EXPIRED);

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mv:auth:expired"));
    }
}

function logSlowRequest(config, statusCode = null, wasError = false) {
    const startedAt = Number(config?.mvRequestStartedAt ?? 0);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return;

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < SLOW_REQUEST_THRESHOLD_MS) return;

    if (typeof console === "undefined" || typeof console.warn !== "function") return;

    const method = String(config?.method ?? "get").toUpperCase();
    const path = requestPath(config);
    const statusSuffix = statusCode == null ? "" : ` status=${statusCode}`;
    const errorSuffix = wasError ? " error=true" : "";
    console.warn(`[api] slow request ${method} ${path}${statusSuffix} durationMs=${elapsedMs}${errorSuffix}`);
}

export function getWithDedupe(url, config = {}) {
    if (config?.signal) {
        return apiClient.get(url, config);
    }
    const requestConfig = { ...config, method: "get" };
    const requestKey = buildGetRequestKey(url, requestConfig);
    const existingRequest = inFlightGetRequests.get(requestKey);
    if (existingRequest) {
        return existingRequest;
    }

    const requestPromise = apiClient.get(url, config).finally(() => {
        if (inFlightGetRequests.get(requestKey) === requestPromise) {
            inFlightGetRequests.delete(requestKey);
        }
    });

    inFlightGetRequests.set(requestKey, requestPromise);
    return requestPromise;
}

function withTimeoutConfig(config = {}) {
    const timeout = Number(config?.timeout);
    if (Number.isFinite(timeout) && timeout > 0) {
        return config;
    }
    return {
        ...config,
        timeout: resolveDefaultTimeoutMs(),
    };
}

function normalizeRequestConfig(config = {}) {
    const next = withTimeoutConfig(config);
    return {
        ...next,
        mvRequestStartedAt: Date.now(),
    };
}

const clientConfig = {
    baseURL,
    timeout: resolveDefaultTimeoutMs(),
    withCredentials: true,
    paramsSerializer: {
        serialize: serializeParams,
    },
};

const refreshClient = axios.create(clientConfig);
export const apiClient = axios.create(clientConfig);

let refreshRequest = null;

async function refreshAccessToken() {
    if (!refreshRequest) {
        refreshRequest = refreshClient
            .post("/api/auth/refresh", null, {
                mvSkipAuthHeader: true,
                mvSkipAuthRefresh: true,
                skipAuthRefresh: true,
                skipAuthToken: true,
            })
            .then(({ data }) => {
                const nextToken = data?.accessToken;

                if (!nextToken) {
                    throw new Error("Refresh response did not include access token");
                }

                setAccessToken(nextToken);
                return nextToken;
            })
            .catch((error) => {
                const normalizedError = normalizeApiError(error);

                if (normalizedError.status === 401) {
                    notifyAuthExpired();
                }

                throw normalizedError;
            })
            .finally(() => {
                refreshRequest = null;
            });
    }

    return refreshRequest;
}

apiClient.interceptors.request.use((rawConfig) => {
    const config = normalizeRequestConfig(rawConfig || {});

    if (config?.mvSkipAuthHeader || config?.skipAuthToken) {
        return config;
    }

    const token = getAccessToken();

    if (token) {
        if (!config.headers) {
            config.headers = {};
        }

        if (!config.headers.Authorization && !config.headers.authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        logSlowRequest(response?.config, response?.status, false);
        return response;
    },
    async (error) => {
        const normalizedError = normalizeApiError(error);
        const status = normalizedError.status;
        const originalConfig = error?.config ?? {};
        logSlowRequest(originalConfig, status, true);
        const hadAuthHeader = Boolean(
            originalConfig?.headers?.Authorization ||
            originalConfig?.headers?.authorization,
        );
        const shouldSkipRefresh = Boolean(
            originalConfig?.mvSkipAuthRefresh || originalConfig?.skipAuthRefresh,
        );
        const alreadyRetried = Boolean(
            originalConfig?._mvRetriedAfterRefresh || originalConfig?._retry,
        );

        if (
            status === 401 &&
            hadAuthHeader &&
            !shouldSkipRefresh &&
            !alreadyRetried
        ) {
            try {
                const nextToken = await refreshAccessToken();

                return apiClient({
                    ...originalConfig,
                    headers: {
                        ...(originalConfig?.headers || {}),
                        Authorization: `Bearer ${nextToken}`,
                    },
                    _mvRetriedAfterRefresh: true,
                    _retry: true,
                });
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        if (status === 401 && hadAuthHeader) {
            notifyAuthExpired();
        }

        return Promise.reject(normalizedError);
    },
);
