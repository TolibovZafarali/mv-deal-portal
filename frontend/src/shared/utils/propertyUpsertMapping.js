function cleanStr(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : null;
}

function parseNum(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replaceAll(",", "").replaceAll("$", "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseIntNum(value) {
  const numeric = parseNum(value);
  if (numeric === null) return null;
  const parsed = Number.parseInt(String(numeric), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPhotosForUpsert(photos) {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo) => ({
      photoAssetId: cleanStr(photo?.photoAssetId),
      caption: cleanStr(photo?.caption),
    }))
    .filter((photo) => Boolean(photo.photoAssetId))
    .map((photo, idx) => ({
      photoAssetId: photo.photoAssetId,
      sortOrder: idx,
      caption: photo.caption,
    }));
}

function mapSaleCompsForUpsert(saleComps) {
  if (!Array.isArray(saleComps)) return [];

  return saleComps
    .map((comp, idx) => ({
      address: cleanStr(comp?.address),
      soldPrice: parseNum(comp?.soldPrice),
      soldDate: cleanStr(comp?.soldDate),
      beds: parseIntNum(comp?.beds),
      baths: parseNum(comp?.baths),
      livingAreaSqft: parseIntNum(comp?.livingAreaSqft),
      distanceMiles: parseNum(comp?.distanceMiles),
      notes: cleanStr(comp?.notes),
      sortOrder: idx,
    }))
    .filter((comp) => Boolean(comp.address));
}

function buildPropertyUpsertPayload(form) {
  const occupancyStatus = cleanStr(form.occupancyStatus);

  return {
    street1: cleanStr(form.street1),
    street2: cleanStr(form.street2),
    city: cleanStr(form.city),
    state: cleanStr(form.state),
    zip: cleanStr(form.zip),
    askingPrice: parseNum(form.askingPrice),
    arv: parseNum(form.arv),
    estRepairs: parseNum(form.estRepairs),
    beds: parseIntNum(form.beds),
    baths: parseNum(form.baths),
    livingAreaSqft: parseIntNum(form.livingAreaSqft),
    yearBuilt: parseIntNum(form.yearBuilt),
    roofAge: parseIntNum(form.roofAge),
    hvac: parseIntNum(form.hvac),
    occupancyStatus,
    currentRent: occupancyStatus === "YES" ? parseNum(form.currentRent) : null,
    exitStrategy: cleanStr(form.exitStrategy),
    closingTerms: cleanStr(form.closingTerms),
    occupancyCertificate: cleanStr(form.occupancyCertificate),
    photos: mapPhotosForUpsert(form.photos),
    saleComps: mapSaleCompsForUpsert(form.saleComps),
  };
}

export function buildPropertyUpsertPayloadWithStatus(form) {
  return {
    status: form.status,
    ...buildPropertyUpsertPayload(form),
  };
}

export function buildSellerPropertyDraftPayload(form) {
  return buildPropertyUpsertPayload(form);
}
