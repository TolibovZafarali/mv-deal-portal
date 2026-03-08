import { apiClient } from "@/api/core/apiClient";
import { clearAccessToken, setAccessToken } from "@/api/core/tokenStorage";

const AUTH_BASE = "/api/auth";
const AUTH_REQUEST_CONFIG = {
    withCredentials: true,
    mvSkipAuthHeader: true,
    mvSkipAuthRefresh: true,
    skipAuthRefresh: true,
    skipAuthToken: true,
};

export async function register(registerDto) {
    const { data } = await apiClient.post(`${AUTH_BASE}/register`, registerDto);
    return data;
}

export async function registerSeller(registerDto) {
    const { data } = await apiClient.post(`${AUTH_BASE}/register/seller`, registerDto);
    return data;
}

export async function login(credentials) {
    const { data } = await apiClient.post(`${AUTH_BASE}/login`, credentials, AUTH_REQUEST_CONFIG);

    if (data?.accessToken) setAccessToken(data.accessToken);

    return data;
}

export async function refreshSession() {
    const { data } = await apiClient.post(`${AUTH_BASE}/refresh`, null, AUTH_REQUEST_CONFIG);

    if (data?.accessToken) setAccessToken(data.accessToken);

    return data;
}

export async function refreshAccessToken() {
    return refreshSession();
}

export async function me(tokenOverride) {
    const config = tokenOverride
        ? { headers: { Authorization: `Bearer ${tokenOverride}` } }
        : undefined;

    const { data } = await apiClient.get(`${AUTH_BASE}/me`, config);
    return data;
}

export async function changePassword(payload) {
    await apiClient.post(`${AUTH_BASE}/password/change`, payload);
    return true;
}

export async function requestPasswordReset(payload) {
    await apiClient.post(`${AUTH_BASE}/password/forgot`, payload);
    return true;
}

export async function resetPassword(payload) {
    await apiClient.post(`${AUTH_BASE}/password/reset`, payload);
    return true;
}

export async function logout() {
    try {
        await apiClient.post(`${AUTH_BASE}/logout`, null, AUTH_REQUEST_CONFIG);
    } finally {
        clearAccessToken();
    }
}
