import { apiClient } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

const BASE = "/api/sellers";
const ADMIN_BASE = "/api/admin/sellers";

export async function getSellerById(id) {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function updateSeller(id, sellerUpdateDto) {
  const { data } = await apiClient.put(`${BASE}/${id}`, sellerUpdateDto);
  return data;
}

export async function searchAdminSellers(filters = {}, pageOpts = {}) {
  const params = cleanParams({
    q: filters?.q,
    ...buildPageParams(pageOpts),
  });

  const { data } = await apiClient.get(`${ADMIN_BASE}/search`, { params });
  return data;
}
