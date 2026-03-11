import { apiClient, getWithDedupe } from "@/api/core/apiClient";
import { buildPageParams, cleanParams } from "@/api/core/params";

const BASE = "/api/sellers";
const ADMIN_BASE = "/api/admin/sellers";

export async function getSellerById(id, requestConfig = {}) {
  const { data } = await getWithDedupe(`${BASE}/${id}`, requestConfig);
  return data;
}

export async function updateSeller(id, sellerUpdateDto) {
  const { data } = await apiClient.put(`${BASE}/${id}`, sellerUpdateDto);
  return data;
}

export async function searchAdminSellers(filters = {}, pageOpts = {}, requestConfig = {}) {
  const params = cleanParams({
    q: filters?.q,
    ...buildPageParams(pageOpts),
  });

  const { data } = await getWithDedupe(`${ADMIN_BASE}/search`, { ...requestConfig, params });
  return data;
}
