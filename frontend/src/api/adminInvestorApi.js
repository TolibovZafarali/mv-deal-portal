import { apiClient } from "./apiClient";
import { buildPageParams } from "./params";

const BASE = "/api/admin/investors";

export async function getPendingInvestors(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/pending`, { params });
    return data;
}

export async function getApprovedInvestors(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/approved`, { params });
    return data;
}

export async function getRejectedInvestors(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/rejected`, { params });
    return data;
}

export async function getAdminInvestorById(id) {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
}

export async function approveInvestor(id) {
    const { data } = await apiClient.patch(`${BASE}/${id}/approve`, null);
    return data;
}

export async function rejectInvestor(id, rejectionReason) {
    const body = { rejectionReason };
    const { data } = await apiClient.patch(`${BASE}/${id}/reject`, body);
    return data;
}