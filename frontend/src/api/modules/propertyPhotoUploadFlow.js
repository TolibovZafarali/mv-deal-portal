import { apiClient } from "@/api/core/apiClient";

const COMPLETE_TIMEOUT_MS = 15000;
const STATUS_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 60;

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
    timeout: COMPLETE_TIMEOUT_MS,
  });
  return data;
}

export async function getPhotoUploadStatus(basePath, uploadId) {
  const { data } = await apiClient.get(`${basePath}/photos/uploads/${uploadId}`, {
    timeout: STATUS_TIMEOUT_MS,
  });
  return data;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollPhotoUploadUntilReady(basePath, uploadId) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const status = await getPhotoUploadStatus(basePath, uploadId);
    const normalizedStatus = String(status?.status ?? "").toUpperCase();

    if (normalizedStatus === "READY" && status?.url) {
      return status;
    }
    if (normalizedStatus === "FAILED") {
      const reason = String(status?.errorMessage ?? "").trim() || "Photo processing failed";
      throw new Error(reason);
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error("Photo processing timed out");
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
  await completePhotoUpload(basePath, init?.uploadId, init?.uploadToken);
  const completed = await pollPhotoUploadUntilReady(basePath, init?.uploadId);
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
