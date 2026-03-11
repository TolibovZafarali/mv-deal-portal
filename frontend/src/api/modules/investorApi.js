import { apiClient, getWithDedupe } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

const BASE = "/api/investors";

export async function getInvestors(pageOpts = {}, requestConfig = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await getWithDedupe(BASE, { ...requestConfig, params });
    return data;
}

export async function getInvestorById(id, requestConfig = {}) {
    const { data } = await getWithDedupe(`${BASE}/${id}`, requestConfig);
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

export async function getInvestorByEmail(email, requestConfig = {}) {
    const params = cleanParams({ email });
    const { data } = await getWithDedupe(`${BASE}/by-email`, { ...requestConfig, params });
    return data;
}

export async function searchInvestors(filters = {}, pageOpts = {}, requestConfig = {}) {
    const params = cleanParams({
        ...filters,             // status, email, companyName, name
        ...buildPageParams(pageOpts),
    });

    const { data } = await getWithDedupe(`${BASE}/search`, { ...requestConfig, params });
    return data;
}

export async function getInvestorFavoritePropertyIds(investorId, requestConfig = {}) {
    const { data } = await getWithDedupe(`${BASE}/${investorId}/favorites`, requestConfig);
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
