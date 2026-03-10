import { apiClient } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

const BASE = "/api/contact-requests";
const ADMIN_BASE = "/api/admin/contact-requests";

export async function createContactRequest(payload) {
  const { data } = await apiClient.post(BASE, {
    category: payload?.category,
    name: String(payload?.name ?? "").trim(),
    email: String(payload?.email ?? "").trim(),
    message: String(payload?.message ?? "").trim(),
  });
  return data;
}

export async function getAdminContactRequests(filters = {}, pageOpts = {}) {
  const params = cleanParams({
    ...filters,
    ...buildPageParams(pageOpts),
  });
  const { data } = await apiClient.get(ADMIN_BASE, { params });
  return data;
}

export async function updateContactRequestStatus(id, status) {
  const { data } = await apiClient.patch(`${ADMIN_BASE}/${id}/status`, { status });
  return data;
}
