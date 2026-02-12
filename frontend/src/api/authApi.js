import { apiClient } from "./apiClient";
import { clearAccessToken, setAccessToken } from "./tokenStorage";

const AUTH_BASE = "/api/auth";

export async function register(registerDto) {
    const { data } = await apiClient.post(`${AUTH_BASE}/register`, registerDto);
    return data;
}

export async function login(credentials) {
    const { data } = await apiClient.post(`${AUTH_BASE}/login`, credentials);

    // Store token automatically after login
    if (data?.accessToken) {
        setAccessToken(data.accessToken);
    }

    return data;
}

export async function me() {
    const { data } = await apiClient.get(`${AUTH_BASE}/me`);
    return data;
}

export function logout() {
    clearAccessToken();
}