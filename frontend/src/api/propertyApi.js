import { apiClient } from "./apiClient";
import { buildPageParams, cleanParams } from "./params";

const BASE = "/api/properties";

export async function getProperties(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(BASE, { params });
    return data;
}

export async function getPropertyId(id) {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
}

export async function createProperty(propertyUpsertDto) {
    const { data } = await apiClient.post(BASE, propertyUpsertDto);
    return data;
}

export async function updateProperty(id, propertyUpsertDto) {
    const { data } = await apiClient.put(`${BASE}/${id}`, propertyUpsertDto);
    return data;
}

export async function deleteProperty(id) {
    await apiClient.delete(`${BASE}/${id}`);
    return true;
}

export async function searchProperties(filters = {}, pageOpts = {}) {
    const params = cleanParams({
        ...filters,
        ...buildPageParams(pageOpts),
    });

    const { data } = await apiClient.get(`${BASE}/search`, { params });
    return data;
}