import axios from "axios";
import { getAccessToken } from "./tokenStorage";

// In dev, Vite proxy already forwards /api -> http://localhost:8080
// In prod, set VITE_API_BASE_URL to the backend domain
const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
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

        const message = 
            data?.message || 
            data?.error || 
            error?.message || 
            "Request failed";

        return Promise.reject({ status, message, data });
    }
);