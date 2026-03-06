import axios from "axios";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/api/core/tokenStorage";

// In dev, Vite proxy already forwards /api -> http://localhost:8080
// In prod, set VITE_API_BASE_URL to the backend domain
const baseURL = import.meta.env.VITE_API_BASE_URL || "";
let refreshPromise = null;

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

function toApiError(error) {
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

function dispatchAuthExpired() {
    clearAccessToken();
    window.dispatchEvent(new CustomEvent("mv:auth:expired"));
}

async function refreshAccessTokenInternal() {
    if (!refreshPromise) {
        refreshPromise = apiClient
            .post(
                "/api/auth/refresh",
                null,
                {
                    withCredentials: true,
                    skipAuthRefresh: true,
                    skipAuthToken: true,
                },
            )
            .then(({ data }) => {
                const accessToken = data?.accessToken;
                if (!accessToken) {
                    throw new Error("Refresh response did not include access token");
                }
                setAccessToken(accessToken);
                return accessToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

export const apiClient = axios.create({
    baseURL,
    timeout: 30000,
    paramsSerializer: {
        serialize: serializeParams,
    },
});

// Attach JWT automatically if it exists
apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    const hasAuthorizationHeader = Boolean(
        config?.headers?.Authorization || config?.headers?.authorization,
    );

    if (!config?.skipAuthToken && token && !hasAuthorizationHeader) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Error handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status ?? null;
        const originalConfig = error?.config ?? {};
        const hadAuthHeader = Boolean(
            originalConfig?.headers?.Authorization ||
            originalConfig?.headers?.authorization,
        );
        const shouldSkipRefresh = Boolean(originalConfig?.skipAuthRefresh);
        const alreadyRetried = Boolean(originalConfig?._retry);

        if (
            status === 401 &&
            hadAuthHeader &&
            !shouldSkipRefresh &&
            !alreadyRetried
        ) {
            try {
                await refreshAccessTokenInternal();

                const retryConfig = {
                    ...originalConfig,
                    _retry: true,
                    headers: {
                        ...(originalConfig?.headers || {}),
                    },
                };

                const token = getAccessToken();
                if (token) {
                    retryConfig.headers.Authorization = `Bearer ${token}`;
                }

                return apiClient.request(retryConfig);
            } catch {
                dispatchAuthExpired();
                return Promise.reject(toApiError(error));
            }
        }

        if (status === 401 && hadAuthHeader) {
            dispatchAuthExpired();
        }

        return Promise.reject(toApiError(error));
    },
);
