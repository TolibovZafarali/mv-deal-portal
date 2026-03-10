import { apiClient } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";
import {
  completePhotoUpload,
  createPhotoFromUrl,
  deletePhotoUpload,
  initPhotoUpload,
  uploadPhoto,
  uploadPhotoToSignedUrl,
} from "@/api/modules/propertyPhotoUploadFlow";

const BASE = "/api/seller/properties";
const ADMIN_PROPERTIES_BASE = "/api/admin/properties";

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

export async function deleteSellerProperty(id) {
  await apiClient.delete(`${BASE}/${id}`);
  return true;
}

export async function submitSellerProperty(id) {
  const { data } = await apiClient.post(`${BASE}/${id}/submit`, null);
  return data;
}

export async function initSellerPropertyPhotoUpload(file) {
  return initPhotoUpload(BASE, file);
}

export async function uploadSellerPropertyPhotoToSignedUrl(uploadUrl, file, requiredHeaders = {}) {
  return uploadPhotoToSignedUrl(uploadUrl, file, requiredHeaders);
}

export async function completeSellerPropertyPhotoUpload(uploadId, uploadToken) {
  return completePhotoUpload(BASE, uploadId, uploadToken);
}

export async function createSellerPropertyPhotoFromUrl(url) {
  return createPhotoFromUrl(BASE, url);
}

export async function uploadSellerPropertyPhoto(file) {
  return uploadPhoto(BASE, file);
}

export async function deleteSellerPropertyPhotoUpload(uploadId) {
  return deletePhotoUpload(BASE, uploadId);
}

export async function assignPropertySeller(propertyId, sellerId) {
  const { data } = await apiClient.patch(`${ADMIN_PROPERTIES_BASE}/${propertyId}/seller-assignment`, { sellerId });
  return data;
}
