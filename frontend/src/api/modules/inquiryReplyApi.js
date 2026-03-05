import { apiClient } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const ADMIN_BASE = "/api/admin/inquiry-replies";
const BASE = "/api/inquiry-replies";

export async function getAdminInquiryReplies(pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(ADMIN_BASE, { params });
  return data;
}

export async function createAdminInquiryReply(payload) {
  const { data } = await apiClient.post(ADMIN_BASE, {
    investorId: payload?.investorId,
    propertyId: payload?.propertyId,
    body: String(payload?.body ?? "").trim(),
  });
  return data;
}

export async function getInquiryRepliesByInvestor(investorId, pageOpts = {}) {
  const params = buildPageParams(pageOpts);
  const { data } = await apiClient.get(`${BASE}/by-investor/${investorId}`, { params });
  return data;
}
