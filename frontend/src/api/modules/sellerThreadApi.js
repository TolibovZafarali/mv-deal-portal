import { apiClient } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const SELLER_BASE = "/api/seller/threads";
const ADMIN_BASE = "/api/admin/seller-threads";

export async function getSellerThreads(pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(SELLER_BASE, { params });
  return data;
}

export async function getSellerThreadMessages(threadId, pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(`${SELLER_BASE}/${threadId}/messages`, { params });
  return data;
}

export async function createSellerThreadMessage(threadId, body) {
  const { data } = await apiClient.post(`${SELLER_BASE}/${threadId}/messages`, {
    body: String(body ?? "").trim(),
  });
  return data;
}

export async function markSellerThreadRead(threadId, lastReadMessageId = null) {
  await apiClient.post(`${SELLER_BASE}/${threadId}/read`, {
    lastReadMessageId,
  });
  return true;
}

export async function getAdminSellerThreads(pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(ADMIN_BASE, { params });
  return data;
}

export async function getAdminSellerThreadMessages(threadId, pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(`${ADMIN_BASE}/${threadId}/messages`, { params });
  return data;
}

export async function createAdminSellerThreadMessage(threadId, body) {
  const { data } = await apiClient.post(`${ADMIN_BASE}/${threadId}/messages`, {
    body: String(body ?? "").trim(),
  });
  return data;
}

export async function markAdminSellerThreadRead(threadId, lastReadMessageId = null) {
  await apiClient.post(`${ADMIN_BASE}/${threadId}/read`, {
    lastReadMessageId,
  });
  return true;
}
