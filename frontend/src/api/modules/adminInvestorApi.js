import { apiClient, getWithDedupe } from "@/api/core/apiClient";
import { buildPageParams } from "@/api/core/params";

const BASE = "/api/admin/investors";

export async function searchAdminInvestors(filters = {}, pageOpts = {}, requestConfig = {}) {
  const params = {
    ...buildPageParams(pageOpts),
    ...(filters?.q ? { q: filters.q } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.createdFrom ? { createdFrom: filters.createdFrom } : {}),
    ...(filters?.createdTo ? { createdTo: filters.createdTo } : {}),
    ...(filters?.updatedFrom ? { updatedFrom: filters.updatedFrom } : {}),
    ...(filters?.updatedTo ? { updatedTo: filters.updatedTo } : {}),
    ...(filters?.approvedFrom ? { approvedFrom: filters.approvedFrom } : {}),
    ...(filters?.approvedTo ? { approvedTo: filters.approvedTo } : {}),
  };

  const { data } = await getWithDedupe(`${BASE}/search`, { ...requestConfig, params });
  return data;
}

export async function getAdminInvestorById(id, requestConfig = {}) {
  const { data } = await getWithDedupe(`${BASE}/${id}`, requestConfig);
  return data;
}

export async function approveInvestor(id) {
  const { data } = await apiClient.patch(`${BASE}/${id}/approve`, null);
  return data;
}

export async function rejectInvestor(id, rejectionReason) {
  const body = { rejectionReason };
  const { data } = await apiClient.patch(`${BASE}/${id}/reject`, body);
  return data;
}

export async function updateInvestorRejectionReason(id, rejectionReason) {
  const body = { rejectionReason };
  const { data } = await apiClient.patch(`${BASE}/${id}/rejection-reason`, body);
  return data;
}


export async function getPendingInvestors(pageOpts = {}) {
  return searchAdminInvestors({ status: "PENDING" }, pageOpts);
}

export async function getApprovedInvestors(pageOpts = {}) {
  return searchAdminInvestors({ status: "APPROVED" }, pageOpts);
}

export async function getRejectedInvestors(pageOpts = {}) {
  return searchAdminInvestors({ status: "REJECTED" }, pageOpts);
}
