import { getWithDedupe } from "@/api/core/apiClient";

const BASE = "/api/seller/dashboard";

export async function getSellerDashboardSummary(requestConfig = {}) {
  const { data } = await getWithDedupe(`${BASE}/summary`, requestConfig);
  return data;
}
