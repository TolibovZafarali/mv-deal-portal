import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  createSellerProperty,
  createSellerPropertyPhotoFromUrl,
  deleteSellerProperty,
  deleteSellerPropertyPhotoUpload,
  getSellerProperties,
  getSellerPropertyById,
  submitSellerProperty,
  updateSellerProperty,
  uploadSellerPropertyPhoto,
} from "@/api/modules/sellerPropertyApi";
import { startSellerTimer, trackSellerEvent } from "@/features/seller/utils/sellerTelemetry";
import PropertyUpsertModal from "@/features/admin/modals/PropertyUpsertModal";
import "@/features/seller/pages/SellerListingsPage.css";

const PAGE_SIZE = 30;

function prettyEnum(value) {
  if (!value) return "—";
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "NEEDS_ACTION") return "Draft";
  return normalized
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fullAddress(property) {
  const line1 = [property?.street1, property?.street2].filter(Boolean).join(", ");
  const stateZip = [property?.state, property?.zip].filter(Boolean).join(" ");
  return [line1, property?.city, stateZip].filter(Boolean).join(", ");
}

function normalizeAddressToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sellerAddressKey(street1, city, state, zip) {
  const s1 = normalizeAddressToken(street1);
  const c = normalizeAddressToken(city);
  const st = normalizeAddressToken(state);
  const z = normalizeAddressToken(zip);
  if (!s1 || !c || !st || !z) return "";
  return `${s1}|${c}|${st}|${z}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function primaryPhoto(property) {
  const photos = Array.isArray(property?.photos) ? property.photos : [];
  const first = photos[0];
  return String(first?.thumbnailUrl ?? first?.url ?? "").trim();
}

function workflowValue(property) {
  return String(property?.sellerWorkflowStatus ?? "DRAFT").toUpperCase();
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function hasAtLeastOnePhoto(property) {
  const photos = Array.isArray(property?.photos) ? property.photos : [];
  return photos.some((photo) => {
    const url = String(photo?.url ?? photo?.thumbnailUrl ?? "").trim();
    return url.length > 0;
  });
}

function isPropertyReadyToPublish(property) {
  return [
    property?.street1,
    property?.city,
    property?.state,
    property?.zip,
    property?.beds,
    property?.baths,
    property?.livingAreaSqft,
    property?.yearBuilt,
    property?.roofAge,
    property?.hvac,
  ].every(hasValue) && hasAtLeastOnePhoto(property);
}

function statusLabel(property) {
  const workflow = workflowValue(property);
  const isReady = isPropertyReadyToPublish(property);

  if (workflow === "CHANGES_REQUESTED") {
    return isReady ? "Ready to Publish" : "Needs Details";
  }
  if (workflow === "DRAFT") {
    return isReady ? "Ready to Publish" : "Draft";
  }
  if (workflow === "SUBMITTED") {
    return "Under Review";
  }

  return prettyEnum(workflow);
}

function cleanStr(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : null;
}

function parseNum(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replaceAll(",", "").replaceAll("$", "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntNum(value) {
  const n = parseNum(value);
  if (n === null) return null;
  const i = Number.parseInt(String(n), 10);
  return Number.isFinite(i) ? i : null;
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

function formToSellerDraftDto(form) {
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
    occupancyStatus: cleanStr(form.occupancyStatus),
    currentRent: cleanStr(form.occupancyStatus) === "YES" ? parseNum(form.currentRent) : null,
    exitStrategy: cleanStr(form.exitStrategy),
    closingTerms: cleanStr(form.closingTerms),
    photos: mapPhotosForUpsert(form.photos),
    saleComps: mapSaleCompsForUpsert(form.saleComps),
  };
}

function sectionRows(rows) {
  const published = [];
  const notPublished = [];

  rows.forEach((row) => {
    if (workflowValue(row) === "PUBLISHED") {
      published.push(row);
    } else {
      notPublished.push(row);
    }
  });

  return { published, notPublished };
}

export default function SellerListingsPage() {
  const outlet = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitial, setEditInitial] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDeleting, setEditDeleting] = useState(false);
  const [editDeleteError, setEditDeleteError] = useState("");
  const [editLoadError, setEditLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [publishingIds, setPublishingIds] = useState({});
  const [publishHints, setPublishHints] = useState({});
  const [publishErrors, setPublishErrors] = useState({});

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerProperties({ page, size: PAGE_SIZE, sort: "updatedAt,desc" });
        if (!alive) return;

        setRows(Array.isArray(data?.content) ? data.content : []);
        setMeta({
          totalPages: Number(data?.totalPages ?? 0),
          totalElements: Number(data?.totalElements ?? 0),
        });
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(nextError?.message || "Failed to load properties.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [page, refreshKey]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setCreateError("");
    setCreateOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const { published, notPublished } = useMemo(() => sectionRows(rows), [rows]);
  const existingAddressKeys = useMemo(() => {
    const keys = new Set();
    rows.forEach((row) => {
      const key = sellerAddressKey(row?.street1, row?.city, row?.state, row?.zip);
      if (key) keys.add(key);
    });
    return keys;
  }, [rows]);

  async function openEditModal(id) {
    setEditLoadError("");
    setEditError("");
    setEditDeleteError("");

    try {
      const full = await getSellerPropertyById(id);
      setEditInitial(full);
      setEditOpen(true);
    } catch (e) {
      setEditLoadError(e?.message || "Failed to load property details.");
    }
  }

  async function handleEditSubmit(form) {
    if (!editInitial?.id) return;

    const stopTimer = startSellerTimer("seller.listing.modal.save", {
      propertyId: editInitial.id,
    });
    setEditSubmitting(true);
    setEditError("");

    try {
      const dto = formToSellerDraftDto(form);
      await updateSellerProperty(editInitial.id, dto);
      stopTimer("success");
      trackSellerEvent("seller.listing.modal.save.success", { propertyId: editInitial.id });
      setEditOpen(false);
      setEditInitial(null);
      setRefreshKey((value) => value + 1);
      outlet.refreshDashboardSummary?.();
    } catch (nextError) {
      stopTimer("error", { message: nextError?.message || "unknown" });
      setEditError(nextError?.message || "Failed to save listing.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleEditDelete() {
    if (!editInitial?.id || editDeleting || editSubmitting) return;

    setEditDeleteError("");
    setEditDeleting(true);
    try {
      await deleteSellerProperty(editInitial.id);
      setEditOpen(false);
      setEditInitial(null);
      setRefreshKey((value) => value + 1);
      outlet.refreshDashboardSummary?.();
    } catch (nextError) {
      setEditDeleteError(nextError?.message || "Failed to delete listing.");
    } finally {
      setEditDeleting(false);
    }
  }

  async function handlePhotoUpload(file) {
    return uploadSellerPropertyPhoto(file);
  }

  async function handlePhotoUploadDelete(uploadId) {
    if (!uploadId) return;
    try {
      await deleteSellerPropertyPhotoUpload(uploadId);
    } catch {
      // best-effort staged cleanup; save/update path handles bound photo lifecycle.
    }
  }

  async function handlePhotoUrlAdd(url) {
    return createSellerPropertyPhotoFromUrl(url);
  }

  async function handleCreateSubmit(form) {
    const stopTimer = startSellerTimer("seller.listing.modal.create", {
      mode: "create",
    });
    setCreateSubmitting(true);
    setCreateError("");

    try {
      const key = sellerAddressKey(form?.street1, form?.city, form?.state, form?.zip);
      if (key && existingAddressKeys.has(key)) {
        throw new Error("You already have a property with this address.");
      }

      const dto = formToSellerDraftDto(form);
      await createSellerProperty(dto);
      stopTimer("success");
      trackSellerEvent("seller.listing.modal.create.success");
      setCreateOpen(false);
      setRefreshKey((value) => value + 1);
      outlet.refreshDashboardSummary?.();
    } catch (nextError) {
      stopTimer("error", { message: nextError?.message || "unknown" });
      setCreateError(nextError?.message || "Failed to create listing.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handlePublish(propertyId) {
    if (!propertyId || publishingIds[propertyId]) return;

    setPublishErrors((prev) => ({ ...prev, [propertyId]: "" }));
    setPublishingIds((prev) => ({ ...prev, [propertyId]: true }));

    try {
      await submitSellerProperty(propertyId);
      setPublishHints((prev) => ({
        ...prev,
        [propertyId]: "Megna is reviewing this property now.",
      }));
      setRefreshKey((value) => value + 1);
      outlet.refreshDashboardSummary?.();
    } catch (nextError) {
      setPublishErrors((prev) => ({
        ...prev,
        [propertyId]: nextError?.message || "Failed to publish property.",
      }));
    } finally {
      setPublishingIds((prev) => ({ ...prev, [propertyId]: false }));
    }
  }

  function renderCard(property) {
    const photoUrl = primaryPhoto(property);
    const workflow = workflowValue(property);
    const readyToPublish = isPropertyReadyToPublish(property);
    const statusTone =
      readyToPublish && (workflow === "DRAFT" || workflow === "CHANGES_REQUESTED")
        ? "ready_to_publish"
        : workflow.toLowerCase();
    const publishing = Boolean(publishingIds[property.id]);
    const publishError = String(publishErrors[property.id] ?? "").trim();
    const publishHint = String(publishHints[property.id] ?? "").trim();
    const isUnderReview = workflow === "SUBMITTED" || publishHint.length > 0;

    return (
      <article key={property.id} className="sellerDashCard">
        <div
          role="button"
          tabIndex={0}
          className="sellerDashCard__focus"
          onClick={() => openEditModal(property.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openEditModal(property.id);
            }
          }}
        >
          <div className="sellerDashCard__mediaWrap">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullAddress(property) || `Property ${property.id}`}
                className="sellerDashCard__media"
              />
            ) : (
              <div className="sellerDashCard__mediaFallback">
                <span className="material-symbols-outlined" aria-hidden="true">home</span>
              </div>
            )}
            <span className={`sellerDashCard__status sellerDashCard__status--${statusTone}`}>
              {statusLabel(property)}
            </span>
          </div>

          <div className="sellerDashCard__body">
            <p className="sellerDashCard__address">{fullAddress(property) || "Address unavailable"}</p>

            <div className="sellerDashCard__meta">
              <span>{property?.beds ?? "—"} bd</span>
              <span>{property?.baths ?? "—"} ba</span>
              <span>{property?.livingAreaSqft?.toLocaleString?.("en-US") ?? property?.livingAreaSqft ?? "—"} sqft</span>
            </div>
            <p className="sellerDashCard__updated">Updated {formatDateTime(property?.updatedAt)}</p>

            <div
              className="sellerDashCard__actionRail"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {workflow === "CLOSED" ? (
                <div className="sellerDashCard__hint sellerDashCard__hint--review">
                  Listing is closed.
                </div>
              ) : workflow === "PUBLISHED" ? (
                <div className="sellerDashCard__hint sellerDashCard__hint--review">
                  Property is published on Megna.
                </div>
              ) : isUnderReview ? (
                <div className="sellerDashCard__hint sellerDashCard__hint--review">
                  {publishHint || "Megna is reviewing this property now."}
                </div>
              ) : readyToPublish ? (
                <button
                  type="button"
                  className="sellerDashCard__publishBtn"
                  onClick={() => handlePublish(property.id)}
                  disabled={publishing}
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              ) : (
                <div className="sellerDashCard__hint">
                  Fill out all property fields to publish.
                </div>
              )}

              {publishError ? (
                <div className="sellerDashCard__hint sellerDashCard__hint--error">{publishError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="sellerDashSplit">
      {loading ? <div className="sellerDashSplit__notice">Loading properties...</div> : null}
      {!loading && error ? <div className="sellerDashSplit__notice sellerDashSplit__notice--error">{error}</div> : null}
      {editLoadError ? <div className="sellerDashSplit__notice sellerDashSplit__notice--error">{editLoadError}</div> : null}

      {!loading && !error ? (
        <div className="sellerDashSplit__columns">
          <section className="sellerDashSplit__column">
            <header className="sellerDashSplit__heading">
              <h2>Unpublished</h2>
              <span>{notPublished.length}</span>
            </header>
            {notPublished.length ? (
              <div className="sellerDashSplit__cards">{notPublished.map((property) => renderCard(property))}</div>
            ) : (
              <div className="sellerDashSplit__empty">No unpublished properties.</div>
            )}
          </section>

          <section className="sellerDashSplit__column">
            <header className="sellerDashSplit__heading">
              <h2>Published</h2>
              <span>{published.length}</span>
            </header>
            {published.length ? (
              <div className="sellerDashSplit__cards">{published.map((property) => renderCard(property))}</div>
            ) : (
              <div className="sellerDashSplit__empty">No published properties.</div>
            )}
          </section>
        </div>
      ) : null}

      {meta.totalPages > 1 ? (
        <div className="sellerDashSplit__pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Prev</button>
          <span>Page {page + 1} / {meta.totalPages}</span>
          <button type="button" disabled={page >= meta.totalPages - 1} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      ) : null}

      <PropertyUpsertModal
        open={editOpen}
        mode="edit"
        variant="seller"
        initialValue={editInitial}
        onClose={() => {
          if (editSubmitting || editDeleting) return;
          setEditOpen(false);
          setEditInitial(null);
          setEditError("");
          setEditDeleteError("");
        }}
        onSubmit={handleEditSubmit}
        onDelete={handleEditDelete}
        onUploadPhoto={handlePhotoUpload}
        onAddPhotoByUrl={handlePhotoUrlAdd}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={editSubmitting}
        deleting={editDeleting}
        submitError={editError}
        deleteError={editDeleteError}
      />

      <PropertyUpsertModal
        open={createOpen}
        mode="add"
        variant="seller"
        onClose={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
          setCreateError("");
        }}
        onSubmit={handleCreateSubmit}
        onUploadPhoto={handlePhotoUpload}
        onAddPhotoByUrl={handlePhotoUrlAdd}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={createSubmitting}
        submitError={createError}
      />
    </section>
  );
}
