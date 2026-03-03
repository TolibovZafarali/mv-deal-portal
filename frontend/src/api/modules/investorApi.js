import { apiClient } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

const BASE = "/api/investors";

export async function getInvestors(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(BASE, { params });
    return data;
}

export async function getInvestorById(id) {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
}

export async function updateInvestor(id, investorUpdateDto) {
    const { data } = await apiClient.put(`${BASE}/${id}`, investorUpdateDto);
    return data;
}

export async function deleteInvestor(id) {
    await apiClient.delete(`${BASE}/${id}`);
    return true;
}

export async function getInvestorByEmail(email) {
    const params = cleanParams({ email });
    const { data } = await apiClient.get(`${BASE}/by-email`, { params });
    return data;
}

export async function searchInvestors(filters = {}, pageOpts = {}) {
    const params = cleanParams({
        ...filters,             // status, email, companyName, name
        ...buildPageParams(pageOpts),
    });

    const { data } = await apiClient.get(`${BASE}/search`, { params });
    return data;
}

export async function getInvestorFavoritePropertyIds(investorId) {
    const { data } = await apiClient.get(`${BASE}/${investorId}/favorites`);
    return Array.isArray(data) ? data : [];
}

export async function addInvestorFavoriteProperty(investorId, propertyId) {
    await apiClient.put(`${BASE}/${investorId}/favorites/${propertyId}`);
    return true;
}

export async function removeInvestorFavoriteProperty(investorId, propertyId) {
    await apiClient.delete(`${BASE}/${investorId}/favorites/${propertyId}`);
    return true;
}
