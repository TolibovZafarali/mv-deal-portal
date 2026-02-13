import { apiClient } from "./apiClient";
import { buildPageParams } from "./params";

const BASE = "/api/inquiries";

export async function getInquiries(pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(BASE, { params });
    return data;
}

export async function createInquiry(inquiryCreateDto) {
    const { data } = await apiClient.post(BASE, inquiryCreateDto);
    return data;
}

export async function getInquiryById(id) {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
}

export async function deleteInquiry(id) {
    await apiClient.delete(`${BASE}/${id}`);
    return true;
}

export async function getInquiryByInvestor(investorId, pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/by-investor/${investorId}`, { params });
    return data;
}

export async function getInquiriesByProperty(propertyId, pageOpts = {}) {
    const params = buildPageParams(pageOpts);
    const { data } = await apiClient.get(`${BASE}/by-property/${propertyId}`, { params });
    return data;
}