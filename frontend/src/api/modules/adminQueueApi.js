import { getWithDedupe } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const BASE = "/api/admin/queue";

export async function getAdminQueueSummary(requestConfig = {}) {
  const { data } = await getWithDedupe(`${BASE}/summary`, requestConfig);
  return data;
}

export async function getAdminQueueItems(filters = {}, pageOpts = {}, requestConfig = {}) {
  const params = {
    ...buildPageParams(pageOpts),
    ...(Array.isArray(filters?.types) && filters.types.length > 0 ? { types: filters.types } : {}),
  };

  const { data } = await getWithDedupe(`${BASE}/items`, { ...requestConfig, params });
  return data;
}
