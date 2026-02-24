#!/usr/bin/env node

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DELAY_MS = 1100;

function normalizeString(value) {
  return String(value ?? "").trim();
}

function parseBoolean(value, fallback = false) {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;

  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;

  return fallback;
}

function parsePositiveInteger(value, fallback = null) {
  const normalized = normalizeString(value);
  if (!normalized) return fallback;

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return parsed;
}

function asNullableString(value) {
  const normalized = normalizeString(value);
  return normalized.length ? normalized : null;
}

function asNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNullableInteger(value) {
  const numeric = asNullableNumber(value);
  if (numeric === null) return null;

  const parsed = Number.parseInt(String(numeric), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(property) {
  const latitude = asNullableNumber(property?.latitude);
  const longitude = asNullableNumber(property?.longitude);

  return latitude !== null && longitude !== null;
}

function propertyLabel(property) {
  const parts = [property?.street1, property?.city, property?.state, property?.zip]
    .map((value) => normalizeString(value))
    .filter(Boolean);

  return parts.length ? parts.join(", ") : `Property ${property?.id ?? "unknown"}`;
}

function propertyToUpsertDto(property) {
  const title = asNullableString(property?.title);
  if (!title) {
    throw new Error(`Property ${property?.id ?? "unknown"} is missing required title.`);
  }

  const photos = (Array.isArray(property?.photos) ? property.photos : [])
    .map((photo, idx) => ({
      url: asNullableString(photo?.url),
      sortOrder: Number.isFinite(Number(photo?.sortOrder))
        ? Number(photo.sortOrder)
        : idx,
      caption: asNullableString(photo?.caption),
    }))
    .filter((photo) => photo.url !== null);

  const saleComps = (Array.isArray(property?.saleComps) ? property.saleComps : [])
    .map((comp, idx) => ({
      address: asNullableString(comp?.address),
      soldPrice: asNullableNumber(comp?.soldPrice),
      soldDate: asNullableString(comp?.soldDate),
      beds: asNullableInteger(comp?.beds),
      baths: asNullableNumber(comp?.baths),
      livingAreaSqft: asNullableInteger(comp?.livingAreaSqft),
      distanceMiles: asNullableNumber(comp?.distanceMiles),
      notes: asNullableString(comp?.notes),
      sortOrder: Number.isFinite(Number(comp?.sortOrder))
        ? Number(comp.sortOrder)
        : idx,
    }))
    .filter((comp) => comp.address !== null);

  return {
    status: property?.status,
    title,

    street1: asNullableString(property?.street1),
    street2: asNullableString(property?.street2),
    city: asNullableString(property?.city),
    state: asNullableString(property?.state),
    zip: asNullableString(property?.zip),

    askingPrice: asNullableNumber(property?.askingPrice),
    arv: asNullableNumber(property?.arv),
    estRepairs: asNullableNumber(property?.estRepairs),

    beds: asNullableInteger(property?.beds),
    baths: asNullableNumber(property?.baths),
    livingAreaSqft: asNullableInteger(property?.livingAreaSqft),
    yearBuilt: asNullableInteger(property?.yearBuilt),
    roofAge: asNullableInteger(property?.roofAge),
    hvac: asNullableInteger(property?.hvac),

    occupancyStatus: asNullableString(property?.occupancyStatus),
    exitStrategy: asNullableString(property?.exitStrategy),
    closingTerms: asNullableString(property?.closingTerms),

    photos,
    saleComps,
  };
}

function buildUrl(apiBaseUrl, path, query = {}) {
  const base = `${apiBaseUrl.replace(/\/+$/, "")}/`;
  const url = new URL(path.replace(/^\/+/, ""), base);

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function requestJson(apiBaseUrl, path, options = {}) {
  const { method = "GET", token = "", query = {}, body } = options;
  const url = buildUrl(apiBaseUrl, path, query);

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;

  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === "object" && data !== null && (data.message || data.error)) ||
      `${response.status} ${response.statusText}`;
    throw new Error(`${method} ${url.pathname} failed: ${message}`);
  }

  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiBaseUrl =
    normalizeString(process.env.BACKFILL_API_BASE_URL) || DEFAULT_API_BASE_URL;
  const adminEmail = normalizeString(process.env.BACKFILL_ADMIN_EMAIL);
  const adminPassword = normalizeString(process.env.BACKFILL_ADMIN_PASSWORD);
  const dryRun = parseBoolean(process.env.BACKFILL_DRY_RUN, false);
  const pageSize = parsePositiveInteger(
    process.env.BACKFILL_PAGE_SIZE,
    DEFAULT_PAGE_SIZE,
  );
  const maxUpdates = parsePositiveInteger(process.env.BACKFILL_MAX_UPDATES, null);
  const requestedDelayMs = parsePositiveInteger(
    process.env.BACKFILL_DELAY_MS,
    DEFAULT_DELAY_MS,
  );
  const delayMs = Math.max(requestedDelayMs, DEFAULT_DELAY_MS);

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "BACKFILL_ADMIN_EMAIL and BACKFILL_ADMIN_PASSWORD are required.",
    );
  }

  console.log(`API base URL: ${apiBaseUrl}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "live"}`);
  console.log(`Page size: ${pageSize}`);
  if (!dryRun) {
    console.log(`Delay between updates: ${delayMs}ms`);
  }
  if (maxUpdates !== null) {
    console.log(`Max updates: ${maxUpdates}`);
  }

  const authData = await requestJson(apiBaseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  const accessToken = normalizeString(authData?.accessToken);
  if (!accessToken) {
    throw new Error("Login succeeded but access token was not returned.");
  }

  const summary = {
    scanned: 0,
    missingCoordinates: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    wouldUpdate: 0,
  };

  let page = 0;
  let totalPages = null;

  while (totalPages === null || page < totalPages) {
    const pageData = await requestJson(apiBaseUrl, "/api/properties", {
      token: accessToken,
      query: {
        page,
        size: pageSize,
        sort: "id,asc",
      },
    });

    const content = Array.isArray(pageData?.content) ? pageData.content : [];
    const nextTotalPages = Number.parseInt(String(pageData?.totalPages ?? "0"), 10);
    totalPages = Number.isFinite(nextTotalPages) ? nextTotalPages : page + 1;

    if (content.length === 0) {
      page += 1;
      continue;
    }

    console.log(`Scanning page ${page + 1}/${Math.max(totalPages, page + 1)} (${content.length} items)`);

    for (const property of content) {
      summary.scanned += 1;

      if (hasCoordinates(property)) {
        summary.skipped += 1;
        continue;
      }

      summary.missingCoordinates += 1;

      const processedUpdates = dryRun ? summary.wouldUpdate : summary.updated;
      const reachedMaxUpdates = maxUpdates !== null && processedUpdates >= maxUpdates;
      if (reachedMaxUpdates) {
        summary.skipped += 1;
        continue;
      }

      const label = propertyLabel(property);
      const id = property?.id;

      if (!id) {
        summary.failed += 1;
        console.error(`Failed: property without id (${label})`);
        continue;
      }

      if (dryRun) {
        summary.wouldUpdate += 1;
        console.log(`[DRY RUN] Would update property ${id}: ${label}`);
        continue;
      }

      try {
        const dto = propertyToUpsertDto(property);

        await requestJson(apiBaseUrl, `/api/properties/${id}`, {
          method: "PUT",
          token: accessToken,
          body: dto,
        });

        summary.updated += 1;
        console.log(`Updated property ${id}: ${label}`);

        await sleep(delayMs);
      } catch (error) {
        summary.failed += 1;
        console.error(`Failed property ${id}: ${error.message}`);
      }
    }

    page += 1;
  }

  console.log("\nBackfill complete.");
  console.log(`Scanned: ${summary.scanned}`);
  console.log(`Missing coordinates: ${summary.missingCoordinates}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  if (dryRun) {
    console.log(`Would update: ${summary.wouldUpdate}`);
  }
}

main().catch((error) => {
  console.error(`Backfill failed: ${error.message}`);
  process.exitCode = 1;
});
