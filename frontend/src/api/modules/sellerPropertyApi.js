import { apiClient } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const BASE = "/api/seller/properties";
const ADMIN_PROPERTIES_BASE = "/api/admin/properties";
const ADMIN_CHANGE_REQUESTS_BASE = "/api/admin/property-change-requests";

export async function getSellerProperties(pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(BASE, { params });
  return data;
}

export async function getSellerPropertyById(id) {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function createSellerProperty(propertyUpsertDto) {
  const { data } = await apiClient.post(BASE, propertyUpsertDto);
  return data;
}

export async function updateSellerProperty(id, propertyUpsertDto) {
  const { data } = await apiClient.put(`${BASE}/${id}`, propertyUpsertDto);
  return data;
}

export async function submitSellerProperty(id) {
  const { data } = await apiClient.post(`${BASE}/${id}/submit`, null);
  return data;
}

export async function requestSellerPropertyChange(id, requestedChanges) {
  const { data } = await apiClient.post(`${BASE}/${id}/change-requests`, { requestedChanges });
  return data;
}

export async function getSellerPropertyChangeRequests(pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(`${BASE}/change-requests`, { params });
  return data;
}

export async function initSellerPropertyPhotoUpload(file) {
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

export async function uploadSellerPropertyPhotoToSignedUrl(uploadUrl, file, requiredHeaders = {}) {
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

export async function completeSellerPropertyPhotoUpload(uploadId, uploadToken) {
  const { data } = await apiClient.post(`${BASE}/photos/uploads/${uploadId}/complete`, {
    uploadToken,
  }, {
    timeout: 30000,
  });
  return data;
}

export async function createSellerPropertyPhotoFromUrl(url) {
  const { data } = await apiClient.post(`${BASE}/photos/urls`, {
    url: String(url ?? "").trim(),
  });
  return data;
}

export async function uploadSellerPropertyPhoto(file) {
  const init = await initSellerPropertyPhotoUpload(file);
  await uploadSellerPropertyPhotoToSignedUrl(
    init?.uploadUrl,
    file,
    init?.requiredHeaders ?? {},
  );
  const completed = await completeSellerPropertyPhotoUpload(init?.uploadId, init?.uploadToken);
  return {
    ...completed,
    uploadId: init?.uploadId,
  };
}

export async function deleteSellerPropertyPhotoUpload(uploadId) {
  if (!uploadId) return true;
  await apiClient.delete(`${BASE}/photos/uploads/${uploadId}`);
  return true;
}

export async function assignPropertySeller(propertyId, sellerId) {
  const { data } = await apiClient.patch(`${ADMIN_PROPERTIES_BASE}/${propertyId}/seller-assignment`, { sellerId });
  return data;
}

export async function reviewSellerProperty(propertyId, action, reviewNote) {
  const { data } = await apiClient.patch(`${ADMIN_PROPERTIES_BASE}/${propertyId}/seller-review`, {
    action,
    reviewNote,
  });
  return data;
}

export async function getAdminPropertyChangeRequests(filters = {}, pageOpts = {}) {
  const params = {
    ...buildPageParams(pageOpts),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const { data } = await apiClient.get(ADMIN_CHANGE_REQUESTS_BASE, { params });
  return data;
}

export async function moderatePropertyChangeRequest(id, action, adminNote) {
  const { data } = await apiClient.patch(`${ADMIN_CHANGE_REQUESTS_BASE}/${id}`, {
    action,
    adminNote,
  });
  return data;
}
