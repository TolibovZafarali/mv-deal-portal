import { apiClient } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";
import {
    completePhotoUpload,
    createPhotoFromUrl,
    deletePhotoUpload,
    initPhotoUpload,
    uploadPhoto,
    uploadPhotoToSignedUrl,
} from "@/api/modules/propertyPhotoUploadFlow";

const BASE = "/api/properties";

export async function getProperties(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(BASE, { params });
    return data;
}

export async function getPropertyById(id) {
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

export async function initPropertyPhotoUpload(file) {
    return initPhotoUpload(BASE, file);
}

export async function uploadPropertyPhotoToSignedUrl(uploadUrl, file, requiredHeaders = {}) {
    return uploadPhotoToSignedUrl(uploadUrl, file, requiredHeaders);
}

export async function completePropertyPhotoUpload(uploadId, uploadToken) {
    return completePhotoUpload(BASE, uploadId, uploadToken);
}

export async function createPropertyPhotoFromUrl(url) {
    return createPhotoFromUrl(BASE, url);
}

export async function uploadPropertyPhoto(file) {
    return uploadPhoto(BASE, file);
}

export async function deletePropertyPhotoUpload(uploadId) {
    return deletePhotoUpload(BASE, uploadId);
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

export async function getClosedPropertyPreviews(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/preview`, { params });
    return data;
}

export async function getAddressSuggestions(query, opts = {}) {
    const { limit = 6 } = opts;
    const params = cleanParams({
        q: String(query ?? "").trim(),
        limit,
    });

    const { data } = await apiClient.get(`${BASE}/address-suggestions`, { params });
    return Array.isArray(data) ? data : [];
}

export async function lookupPropertyFmr(zip, beds) {
    const parsedBeds = Number.parseInt(String(beds ?? "").trim(), 10);
    const params = cleanParams({
        zip: String(zip ?? "").trim(),
        beds: Number.isFinite(parsedBeds) ? parsedBeds : undefined,
    });
    const { data } = await apiClient.get(`${BASE}/fmr`, { params });
    return data;
}
