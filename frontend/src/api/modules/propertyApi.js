import { apiClient } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

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

export async function initPropertyPhotoUpload(file) {
    const payload = {
        fileName: String(file?.name ?? "upload.jpg"),
        contentType: String(file?.type ?? "").trim().toLowerCase(),
        sizeBytes: Number(file?.size ?? 0),
    };

    const { data } = await apiClient.post(`${BASE}/photos/uploads/init`, payload, {
        timeout: 15000,
    });
    return data;
}

export async function uploadPropertyPhotoToSignedUrl(uploadUrl, file, requiredHeaders = {}) {
    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: requiredHeaders,
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
    }

    return true;
}

export async function completePropertyPhotoUpload(uploadId, uploadToken) {
    const { data } = await apiClient.post(`${BASE}/photos/uploads/${uploadId}/complete`, {
        uploadToken,
    }, {
        timeout: 30000,
    });

    return data;
}

export async function createPropertyPhotoFromUrl(url) {
    const { data } = await apiClient.post(`${BASE}/photos/urls`, {
        url: String(url ?? "").trim(),
    });
    return data;
}

export async function uploadPropertyPhoto(file) {
    const init = await initPropertyPhotoUpload(file);

    await uploadPropertyPhotoToSignedUrl(
        init?.uploadUrl,
        file,
        init?.requiredHeaders ?? {},
    );

    const completed = await completePropertyPhotoUpload(init?.uploadId, init?.uploadToken);
    return {
        ...completed,
        uploadId: init?.uploadId,
    };
}

export async function deletePropertyPhotoUpload(uploadId) {
    if (!uploadId) return true;
    await apiClient.delete(`${BASE}/photos/uploads/${uploadId}`);
    return true;
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
    const params = cleanParams({
        zip: String(zip ?? "").trim(),
        beds: Number(beds),
    });
    const { data } = await apiClient.get(`${BASE}/fmr`, { params });
    return data;
}
