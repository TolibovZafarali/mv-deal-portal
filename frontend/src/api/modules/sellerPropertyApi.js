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
