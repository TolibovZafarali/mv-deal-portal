import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  createSellerProperty,
  deleteSellerPropertyPhotoUpload,
  getSellerPropertyById,
  submitSellerProperty,
  updateSellerProperty,
  uploadSellerPropertyPhoto,
} from "@/api/modules/sellerPropertyApi";
import { startSellerTimer, trackSellerEvent } from "@/features/seller/utils/sellerTelemetry";
import "@/features/seller/pages/SellerListingEditorPage.css";

const OCCUPANCY_OPTIONS = ["", "YES", "NO"];
const EXIT_STRATEGY_OPTIONS = ["", "FLIP", "RENTAL", "WHOLESALE"];
const CLOSING_TERMS_OPTIONS = ["", "CASH_ONLY", "HARD_MONEY", "CONVENTIONAL", "SELLER_FINANCE"];

const EMPTY_COMP = {
  address: "",
  soldPrice: "",
  soldDate: "",
  beds: "",
  baths: "",
  livingAreaSqft: "",
  distanceMiles: "",
  notes: "",
};

const EMPTY_FORM = {
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  askingPrice: "",
  arv: "",
  estRepairs: "",
  beds: "",
  baths: "",
  livingAreaSqft: "",
  yearBuilt: "",
  roofAge: "",
  hvac: "",
  occupancyStatus: "",
  currentRent: "",
  exitStrategy: "",
  closingTerms: "",
  photos: [],
  saleComps: [],
};

function prettyEnum(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDecimal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replaceAll(",", "").replaceAll("$", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const parsed = parseDecimal(value);
  if (parsed === null) return null;
  const intVal = Number.parseInt(String(parsed), 10);
  return Number.isFinite(intVal) ? intVal : null;
}

function missingPublishFields(form) {
  const missing = [];
  if (!String(form.street1 ?? "").trim()) missing.push("Street 1");
  if (!String(form.city ?? "").trim()) missing.push("City");
  if (!String(form.state ?? "").trim()) missing.push("State");
  if (!String(form.zip ?? "").trim()) missing.push("ZIP");
  if (parseDecimal(form.askingPrice) === null) missing.push("Asking Price");
  if (parseDecimal(form.arv) === null) missing.push("ARV");
  if (parseDecimal(form.estRepairs) === null) missing.push("Estimated Repairs");
  if (parseInteger(form.beds) === null) missing.push("Beds");
  if (parseDecimal(form.baths) === null) missing.push("Baths");
  if (parseInteger(form.livingAreaSqft) === null) missing.push("Living Area (Sqft)");
  if (parseInteger(form.yearBuilt) === null) missing.push("Year Built");
  if (!String(form.occupancyStatus ?? "").trim()) missing.push("Occupancy");
  if (String(form.occupancyStatus ?? "").toUpperCase() === "YES" && parseDecimal(form.currentRent) === null) {
    missing.push("Current Rent");
  }
  if (!String(form.exitStrategy ?? "").trim()) missing.push("Exit Strategy");
  if (!String(form.closingTerms ?? "").trim()) missing.push("Closing Terms");
  if (!Array.isArray(form.photos) || form.photos.length === 0) missing.push("At least one photo");
  return missing;
}

function fromProperty(property) {
  if (!property) return { ...EMPTY_FORM };
  return {
    street1: property.street1 ?? "",
    street2: property.street2 ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zip: property.zip ?? "",
    askingPrice: property.askingPrice ?? "",
    arv: property.arv ?? "",
    estRepairs: property.estRepairs ?? "",
    beds: property.beds ?? "",
    baths: property.baths ?? "",
    livingAreaSqft: property.livingAreaSqft ?? "",
    yearBuilt: property.yearBuilt ?? "",
    roofAge: property.roofAge ?? "",
    hvac: property.hvac ?? "",
    occupancyStatus: property.occupancyStatus ?? "",
    currentRent: property.currentRent ?? "",
    exitStrategy: property.exitStrategy ?? "",
    closingTerms: property.closingTerms ?? "",
    photos: Array.isArray(property.photos)
      ? property.photos.map((photo, index) => ({
          photoAssetId: photo.photoAssetId,
          url: photo.url,
          thumbnailUrl: photo.url || photo.thumbnailUrl,
          caption: photo.caption ?? "",
          sortOrder: photo.sortOrder ?? index,
          uploadId: null,
        }))
      : [],
    saleComps: Array.isArray(property.saleComps)
      ? property.saleComps.map((comp) => ({
          address: comp.address ?? "",
          soldPrice: comp.soldPrice ?? "",
          soldDate: comp.soldDate ?? "",
          beds: comp.beds ?? "",
          baths: comp.baths ?? "",
          livingAreaSqft: comp.livingAreaSqft ?? "",
          distanceMiles: comp.distanceMiles ?? "",
          notes: comp.notes ?? "",
        }))
      : [],
  };
}

function toPayload(form) {
  return {
    street1: String(form.street1 ?? "").trim() || null,
    street2: String(form.street2 ?? "").trim() || null,
    city: String(form.city ?? "").trim() || null,
    state: String(form.state ?? "").trim() || null,
    zip: String(form.zip ?? "").trim() || null,
    askingPrice: parseDecimal(form.askingPrice),
    arv: parseDecimal(form.arv),
    estRepairs: parseDecimal(form.estRepairs),
    beds: parseInteger(form.beds),
    baths: parseDecimal(form.baths),
    livingAreaSqft: parseInteger(form.livingAreaSqft),
    yearBuilt: parseInteger(form.yearBuilt),
    roofAge: parseInteger(form.roofAge),
    hvac: parseInteger(form.hvac),
    occupancyStatus: form.occupancyStatus || null,
    currentRent: form.occupancyStatus === "YES" ? parseDecimal(form.currentRent) : null,
    exitStrategy: form.exitStrategy || null,
    closingTerms: form.closingTerms || null,
    photos: Array.isArray(form.photos)
      ? form.photos.map((photo, index) => ({
          photoAssetId: photo.photoAssetId,
          sortOrder: index,
          caption: String(photo.caption ?? "").trim() || null,
        }))
      : [],
    saleComps: Array.isArray(form.saleComps)
      ? form.saleComps
          .filter((comp) => String(comp.address ?? "").trim().length > 0)
          .map((comp, index) => ({
            address: String(comp.address ?? "").trim(),
            soldPrice: parseDecimal(comp.soldPrice),
            soldDate: String(comp.soldDate ?? "").trim() || null,
            beds: parseInteger(comp.beds),
            baths: parseDecimal(comp.baths),
            livingAreaSqft: parseInteger(comp.livingAreaSqft),
            distanceMiles: parseDecimal(comp.distanceMiles),
            notes: String(comp.notes ?? "").trim() || null,
            sortOrder: index,
          }))
      : [],
  };
}

export default function SellerListingEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const outlet = useOutletContext();
  const refreshDashboardSummary = outlet?.refreshDashboardSummary;

  const isEditing = Boolean(id);
  const [listingId, setListingId] = useState(id ? Number(id) : null);
  const isAddressLocked = Boolean(listingId);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    if (!id) return undefined;

    let alive = true;
    async function loadListing() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerPropertyById(id);
        if (!alive) return;
        setForm(fromProperty(data));
        setListingId(Number(data?.id ?? id));
        setDirty(false);
      } catch (nextError) {
        if (!alive) return;
        setError(nextError?.message || "Failed to load listing.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadListing();
    return () => {
      alive = false;
    };
  }, [id]);

  const missingFields = useMemo(() => missingPublishFields(form), [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function updateComp(index, key, value) {
    setForm((prev) => {
      const nextComps = [...prev.saleComps];
      nextComps[index] = { ...nextComps[index], [key]: value };
      return { ...prev, saleComps: nextComps };
    });
    setDirty(true);
  }

  const persistDraft = useCallback(async ({ silent = false } = {}) => {
    const payload = toPayload(form);

    if (!silent) {
      setSaving(true);
      setSaveError("");
    }

    const stopTimer = startSellerTimer("seller.draft.save", {
      propertyId: listingId,
      mode: listingId ? "update" : "create",
    });

    try {
      let saved;
      if (listingId) {
        saved = await updateSellerProperty(listingId, payload);
      } else {
        saved = await createSellerProperty(payload);
      }

      const resolvedId = Number(saved?.id ?? listingId);
      if (!listingId && Number.isFinite(resolvedId)) {
        setListingId(resolvedId);
        navigate(`/seller/listings/${resolvedId}/edit`, { replace: true });
      }

      setDirty(false);
      setLastSavedAt(new Date().toISOString());
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((photo, index) => ({
          ...photo,
          sortOrder: index,
          uploadId: null,
        })),
      }));
      setSaveError("");
      refreshDashboardSummary?.();
      stopTimer("success", { propertyId: resolvedId });
      trackSellerEvent("seller.draft.save.success", { propertyId: resolvedId });
      return resolvedId;
    } catch (nextError) {
      const message = nextError?.message || "Failed to save draft.";
      setSaveError(message);
      stopTimer("error", { message });
      if (!silent) {
        throw nextError;
      }
      return null;
    } finally {
      if (!silent) {
        setSaving(false);
      }
    }
  }, [form, listingId, navigate, refreshDashboardSummary]);

  useEffect(() => {
    if (!listingId || !dirty || saving) return undefined;

    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await persistDraft({ silent: true });
      } catch {
        // autosave errors are surfaced via saveError state
      }
    }, 2400);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [dirty, listingId, persistDraft, saving]);

  async function handleSaveClick() {
    setSaving(true);
    try {
      await persistDraft({ silent: false });
    } catch {
      // no-op, error is already in state
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    setSaving(true);
    setSaveError("");
    try {
      const resolvedId = await persistDraft({ silent: false });
      if (!resolvedId) return;

      const stopTimer = startSellerTimer("seller.draft.submit", {
        propertyId: resolvedId,
      });

      await submitSellerProperty(resolvedId);
      stopTimer("success");
      trackSellerEvent("seller.draft.submit.success", { propertyId: resolvedId });
      refreshDashboardSummary?.();
      navigate("/seller/listings", { replace: true });
    } catch (nextError) {
      setSaveError(nextError?.message || "Failed to submit listing.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(event) {
    const files = Array.from(event?.target?.files || []);
    if (!files.length) return;

    setUploadingCount((value) => value + files.length);

    for (const file of files) {
      try {
        const uploaded = await uploadSellerPropertyPhoto(file);
        setForm((prev) => ({
          ...prev,
          photos: [
            ...prev.photos,
            {
              photoAssetId: uploaded?.photoAssetId,
              url: uploaded?.url,
              thumbnailUrl: uploaded?.url || uploaded?.thumbnailUrl,
              caption: "",
              sortOrder: prev.photos.length,
              uploadId: uploaded?.uploadId || null,
            },
          ],
        }));
        setDirty(true);
      } catch (nextError) {
        setSaveError(nextError?.message || "Failed to upload one or more photos.");
      } finally {
        setUploadingCount((value) => Math.max(0, value - 1));
      }
    }

    event.target.value = "";
  }

  async function removePhoto(index) {
    const target = form.photos[index];
    if (!target) return;

    if (target.uploadId) {
      try {
        await deleteSellerPropertyPhotoUpload(target.uploadId);
      } catch {
        // continue with local removal
      }
    }

    setForm((prev) => {
      const nextPhotos = [...prev.photos];
      nextPhotos.splice(index, 1);
      return {
        ...prev,
        photos: nextPhotos,
      };
    });
    setDirty(true);
  }

  if (loading) {
    return <section className="sellerEditor"><div className="sellerEditor__notice">Loading listing editor...</div></section>;
  }

  if (error) {
    return <section className="sellerEditor"><div className="sellerEditor__error">{error}</div></section>;
  }

  return (
    <section className="sellerEditor">
      <header className="sellerEditor__header">
        <div>
          <h2>{isEditing ? "Edit Listing" : "New Listing Draft"}</h2>
          <p>
            {dirty ? "Unsaved changes" : "All changes saved"}
            {lastSavedAt ? ` • Last saved ${new Date(lastSavedAt).toLocaleTimeString("en-US")}` : ""}
          </p>
        </div>
        <button type="button" className="sellerEditor__backBtn" onClick={() => navigate("/seller/listings")}>Back to Listings</button>
      </header>

      <div className="sellerEditor__hintCard">
        <div className="sellerEditor__hintTitle">Submission Checklist</div>
        {missingFields.length ? (
          <div className="sellerEditor__hintList">Missing: {missingFields.join(", ")}</div>
        ) : (
          <div className="sellerEditor__hintList">Ready to submit for review.</div>
        )}
      </div>

      <section className="sellerEditor__section">
        <h3>Address</h3>
        {isAddressLocked ? (
          <div className="sellerEditor__hintList">Address is locked after first save.</div>
        ) : null}
        <div className="sellerEditor__grid sellerEditor__grid--address">
          <label>
            Street 1
            <input
              value={form.street1}
              onChange={(event) => updateField("street1", event.target.value)}
              disabled={isAddressLocked}
            />
          </label>
          <label>
            Street 2
            <input
              value={form.street2}
              onChange={(event) => updateField("street2", event.target.value)}
              disabled={isAddressLocked}
            />
          </label>
          <label>
            City
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              disabled={isAddressLocked}
            />
          </label>
          <label>
            State
            <input
              value={form.state}
              onChange={(event) => updateField("state", event.target.value)}
              disabled={isAddressLocked}
            />
          </label>
          <label>
            ZIP
            <input
              value={form.zip}
              onChange={(event) => updateField("zip", event.target.value)}
              disabled={isAddressLocked}
            />
          </label>
        </div>
      </section>

      <section className="sellerEditor__section">
        <h3>Financials</h3>
        <div className="sellerEditor__grid sellerEditor__grid--financials">
          <label>
            Asking Price
            <input value={form.askingPrice} onChange={(event) => updateField("askingPrice", event.target.value)} />
          </label>
          <label>
            ARV
            <input value={form.arv} onChange={(event) => updateField("arv", event.target.value)} />
          </label>
          <label>
            Estimated Repairs
            <input value={form.estRepairs} onChange={(event) => updateField("estRepairs", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="sellerEditor__section">
        <h3>Property Specs</h3>
        <div className="sellerEditor__grid sellerEditor__grid--specs">
          <label>
            Beds
            <input value={form.beds} onChange={(event) => updateField("beds", event.target.value)} />
          </label>
          <label>
            Baths
            <input value={form.baths} onChange={(event) => updateField("baths", event.target.value)} />
          </label>
          <label>
            Living Area (sqft)
            <input value={form.livingAreaSqft} onChange={(event) => updateField("livingAreaSqft", event.target.value)} />
          </label>
          <label>
            Year Built
            <input value={form.yearBuilt} onChange={(event) => updateField("yearBuilt", event.target.value)} />
          </label>
          <label>
            Roof Age
            <input value={form.roofAge} onChange={(event) => updateField("roofAge", event.target.value)} />
          </label>
          <label>
            HVAC Age
            <input value={form.hvac} onChange={(event) => updateField("hvac", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="sellerEditor__section">
        <h3>Occupancy & Strategy</h3>
        <div className="sellerEditor__grid sellerEditor__grid--strategy">
          <label>
            Occupancy
            <select
              value={form.occupancyStatus}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateField("occupancyStatus", nextValue);
                if (nextValue !== "YES") {
                  updateField("currentRent", "");
                }
              }}
            >
              {OCCUPANCY_OPTIONS.map((value) => (
                <option key={`occupancy-${value || "blank"}`} value={value}>
                  {prettyEnum(value) || "Select"}
                </option>
              ))}
            </select>
          </label>

          {form.occupancyStatus === "YES" ? (
            <label>
              Current Rent
              <input value={form.currentRent} onChange={(event) => updateField("currentRent", event.target.value)} />
            </label>
          ) : null}

          <label>
            Exit Strategy
            <select value={form.exitStrategy} onChange={(event) => updateField("exitStrategy", event.target.value)}>
              {EXIT_STRATEGY_OPTIONS.map((value) => (
                <option key={`exit-${value || "blank"}`} value={value}>
                  {prettyEnum(value) || "Select"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Closing Terms
            <select value={form.closingTerms} onChange={(event) => updateField("closingTerms", event.target.value)}>
              {CLOSING_TERMS_OPTIONS.map((value) => (
                <option key={`closing-${value || "blank"}`} value={value}>
                  {prettyEnum(value) || "Select"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="sellerEditor__section">
        <h3>Media</h3>
        <div className="sellerEditorMedia__toolbar">
          <label className="sellerEditorMedia__uploadBtn">
            {uploadingCount > 0 ? `Uploading ${uploadingCount}...` : "Upload Photos"}
            <input type="file" accept="image/*" multiple onChange={handleFilesSelected} disabled={uploadingCount > 0} />
          </label>
        </div>

        {form.photos.length === 0 ? <div className="sellerEditorMedia__empty">No photos uploaded yet.</div> : null}

        <div className="sellerEditorMedia__grid">
          {form.photos.map((photo, index) => (
            <article key={`photo-${photo.photoAssetId}-${index}`} className="sellerEditorMedia__card">
              <img src={photo.url || photo.thumbnailUrl} alt={`Listing photo ${index + 1}`} />
              <label>
                Caption
                <input
                  value={photo.caption || ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((prev) => {
                      const nextPhotos = [...prev.photos];
                      nextPhotos[index] = {
                        ...nextPhotos[index],
                        caption: value,
                      };
                      return { ...prev, photos: nextPhotos };
                    });
                    setDirty(true);
                  }}
                />
              </label>
              <button type="button" onClick={() => removePhoto(index)}>Remove</button>
            </article>
          ))}
        </div>
      </section>

      <section className="sellerEditor__section">
        <h3>Sale Comps</h3>
        <div className="sellerEditorComp__rows">
          {form.saleComps.map((comp, index) => (
            <div key={`comp-${index}`} className="sellerEditorComp__row">
              <div className="sellerEditor__grid sellerEditor__grid--comps">
                <label>
                  Address
                  <input value={comp.address} onChange={(event) => updateComp(index, "address", event.target.value)} />
                </label>
                <label>
                  Sold Price
                  <input value={comp.soldPrice} onChange={(event) => updateComp(index, "soldPrice", event.target.value)} />
                </label>
                <label>
                  Sold Date
                  <input type="date" value={comp.soldDate} onChange={(event) => updateComp(index, "soldDate", event.target.value)} />
                </label>
                <label>
                  Beds
                  <input value={comp.beds} onChange={(event) => updateComp(index, "beds", event.target.value)} />
                </label>
                <label>
                  Baths
                  <input value={comp.baths} onChange={(event) => updateComp(index, "baths", event.target.value)} />
                </label>
                <label>
                  Sqft
                  <input value={comp.livingAreaSqft} onChange={(event) => updateComp(index, "livingAreaSqft", event.target.value)} />
                </label>
                <label>
                  Distance (Miles)
                  <input value={comp.distanceMiles} onChange={(event) => updateComp(index, "distanceMiles", event.target.value)} />
                </label>
                <label>
                  Notes
                  <input value={comp.notes} onChange={(event) => updateComp(index, "notes", event.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="sellerEditorComp__removeBtn"
                onClick={() => {
                  setForm((prev) => {
                    const nextComps = [...prev.saleComps];
                    nextComps.splice(index, 1);
                    return { ...prev, saleComps: nextComps };
                  });
                  setDirty(true);
                }}
              >
                Remove Comp
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="sellerEditorComp__addBtn"
          onClick={() => {
            setForm((prev) => ({ ...prev, saleComps: [...prev.saleComps, { ...EMPTY_COMP }] }));
            setDirty(true);
          }}
        >
          Add Comparable
        </button>
      </section>

      {saveError ? <div className="sellerEditor__error">{saveError}</div> : null}

      <footer className="sellerEditor__footer">
        <div className="sellerEditor__footerInfo">
          {dirty ? "Changes pending" : "Draft synced"}
          {lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString("en-US")}` : ""}
        </div>
        <div className="sellerEditor__footerActions">
          <button type="button" onClick={handleSaveClick} disabled={saving || uploadingCount > 0}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="sellerEditor__submitBtn"
            onClick={handleSubmitForReview}
            disabled={saving || uploadingCount > 0}
          >
            Submit for Review
          </button>
        </div>
      </footer>
    </section>
  );
}
