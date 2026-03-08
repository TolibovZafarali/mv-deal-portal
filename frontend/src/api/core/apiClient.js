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
        data?.message ||
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
    timeout: 15000,
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
            })
            .then(({ data }) => {
                const nextToken = data?.accessToken;

                if (!nextToken) {
                    throw new Error("Refresh succeeded without an access token");
                }

                setAccessToken(nextToken);
                return nextToken;
            })
            .catch((error) => {
                notifyAuthExpired();
                throw normalizeApiError(error);
            })
            .finally(() => {
                refreshRequest = null;
            });
    }

    return refreshRequest;
}

apiClient.interceptors.request.use((config) => {
    if (config?.mvSkipAuthHeader) {
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
        const hadAuthHeader = Boolean(
            error?.config?.headers?.Authorization ||
            error?.config?.headers?.authorization
        );

        if (
            status === 401 &&
            hadAuthHeader &&
            !error?.config?.mvSkipAuthRefresh &&
            !error?.config?._mvRetriedAfterRefresh
        ) {
            try {
                const nextToken = await refreshAccessToken();

                return apiClient({
                    ...error.config,
                    headers: {
                        ...(error.config?.headers || {}),
                        Authorization: `Bearer ${nextToken}`,
                    },
                    _mvRetriedAfterRefresh: true,
                });
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        if (status === 401 && hadAuthHeader) {
            notifyAuthExpired();
        }

        return Promise.reject(normalizedError);
    }
);
