import { apiClient } from "@/api/core/apiClient";
import { clearAccessToken, setAccessToken } from "@/api/core/tokenStorage";

const AUTH_BASE = "/api/auth";

export async function register(registerDto) {
    const { data } = await apiClient.post(`${AUTH_BASE}/register`, registerDto);
    return data;
}

export async function registerSeller(registerDto) {
    const { data } = await apiClient.post(`${AUTH_BASE}/register/seller`, registerDto);
    return data;
}

export async function login(credentials) {
    const { data } = await apiClient.post(`${AUTH_BASE}/login`, credentials);

    if (data?.accessToken) setAccessToken(data.accessToken);

    return data; // { accessToken, tokenType, expiresInSeconds }
}

export async function me(tokenOverride) {
    const config = tokenOverride
        ? { headers: { Authorization: `Bearer ${tokenOverride}` } }
        : undefined;
    
    const { data } = await apiClient.get(`${AUTH_BASE}/me`, config);
    return data; // { role, status, email, userId, investorId, sellerId }
}

export function logout() {
    clearAccessToken();
}
