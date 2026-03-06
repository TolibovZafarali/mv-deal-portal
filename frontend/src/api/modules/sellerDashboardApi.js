import { apiClient } from "@/api/core/apiClient";

const BASE = "/api/seller/dashboard";

export async function getSellerDashboardSummary() {
  const { data } = await apiClient.get(`${BASE}/summary`);
  return data;
}
