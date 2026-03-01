import { apiClient } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const BASE = "/api/admin/queue";

export async function getAdminQueueSummary() {
  const { data } = await apiClient.get(`${BASE}/summary`);
  return data;
}

export async function getAdminQueueItems(filters = {}, pageOpts = {}) {
  const params = {
    ...buildPageParams(pageOpts),
    ...(Array.isArray(filters?.types) && filters.types.length > 0 ? { types: filters.types } : {}),
  };

  const { data } = await apiClient.get(`${BASE}/items`, { params });
  return data;
}
