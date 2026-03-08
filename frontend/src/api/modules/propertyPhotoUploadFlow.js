import { apiClient } from "@/api/core/apiClient";

export async function initPhotoUpload(basePath, file) {
  const payload = {
    fileName: String(file?.name ?? "upload.jpg"),
    contentType: String(file?.type ?? "").trim().toLowerCase(),
    sizeBytes: Number(file?.size ?? 0),
  };

  const { data } = await apiClient.post(`${basePath}/photos/uploads/init`, payload, {
    timeout: 15000,
  });
  return data;
}

export async function uploadPhotoToSignedUrl(uploadUrl, file, requiredHeaders = {}) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: requiredHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return true;
}

export async function completePhotoUpload(basePath, uploadId, uploadToken) {
  const { data } = await apiClient.post(`${basePath}/photos/uploads/${uploadId}/complete`, {
    uploadToken,
  }, {
    timeout: 30000,
  });
  return data;
}

export async function createPhotoFromUrl(basePath, url) {
  const { data } = await apiClient.post(`${basePath}/photos/urls`, {
    url: String(url ?? "").trim(),
  });
  return data;
}

export async function uploadPhoto(basePath, file) {
  const init = await initPhotoUpload(basePath, file);
  await uploadPhotoToSignedUrl(
    init?.uploadUrl,
    file,
    init?.requiredHeaders ?? {},
  );
  const completed = await completePhotoUpload(basePath, init?.uploadId, init?.uploadToken);
  return {
    ...completed,
    uploadId: init?.uploadId,
  };
}

export async function deletePhotoUpload(basePath, uploadId) {
  if (!uploadId) return true;
  await apiClient.delete(`${basePath}/photos/uploads/${uploadId}`);
  return true;
}
