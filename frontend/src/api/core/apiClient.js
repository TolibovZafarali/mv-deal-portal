import axios from "axios";
import {
    AUTH_SYNC_EXPIRED,
    clearAccessToken,
    getAccessToken,
    publishAuthSync,
    setAccessToken,
} from "@/api/core/tokenStorage";

const baseURL = "";

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

function normalizeApiError(error) {
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? null;
    const message =
        error?.code === "ECONNABORTED"
            ? "Request timed out. Please try again."
            : data?.message ||
              data?.error ||
              error?.message ||
              "Request failed";

    return { status, message, data };
}

function notifyAuthExpired() {
    clearAccessToken();
    publishAuthSync(AUTH_SYNC_EXPIRED);

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mv:auth:expired"));
    }
}

const clientConfig = {
    baseURL,
    timeout: 30000,
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

apiClient.interceptors.request.use((config) => {
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
    (response) => response,
    async (error) => {
        const normalizedError = normalizeApiError(error);
        const status = normalizedError.status;
        const originalConfig = error?.config ?? {};
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
