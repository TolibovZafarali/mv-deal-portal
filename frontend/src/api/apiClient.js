import axios from "axios";
import { clearAccessToken, getAccessToken } from "./tokenStorage";

// In dev, Vite proxy already forwards /api -> http://localhost:8080
// In prod, set VITE_API_BASE_URL to the backend domain
const baseURL = import.meta.env.VITE_API_BASE_URL || "";

function serializeParams(params) {
    const usp = new URLSearchParams();

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (Array.isArray(value)) {
            value.forEach((v) => {
                if (v === undefined || value === null || value === "") return;
                usp.append(key, String(v));
            });
        } else {
            usp.append(key, String(value));
        }
    });

    return usp.toString();
}

export const apiClient = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
    paramsSerializer: {
        serialize: serializeParams,
    },
});

// Attach JWT automatically if it exists
apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status ?? null;
        const data = error?.response?.data ?? null;

        // If token is bad/expired, force logout
        if (status === 401) {
            clearAccessToken();
            window.dispatchEvent(new CustomEvent("mv:auth:expired"));
        }

        const message = 
            data?.message || 
            data?.error || 
            error?.message || 
            "Request failed";

        return Promise.reject({ status, message, data });
    }
);