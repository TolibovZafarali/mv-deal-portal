import { useEffect, useMemo, useState } from "react";
import {
  createProperty,
  deletePropertyPhotoUpload,
  deleteProperty,
  getPropertyId,
  searchProperties,
  uploadPropertyPhoto,
  updateProperty,
} from "@/api/modules/propertyApi";
import { searchAdminSellers } from "@/api/modules/sellerApi";
import {
  assignPropertySeller,
  getAdminPropertyChangeRequests,
  moderatePropertyChangeRequest,
  reviewSellerProperty,
} from "@/api/modules/sellerPropertyApi";
import "@/features/admin/pages/AdminPropertiesPage.css";
import PropertyUpsertModal from "@/features/admin/modals/PropertyUpsertModal";
import { formatPriceInput } from "@/shared/utils/priceFormatting";

const PAGE_SIZE = 20;

const OCCUPANCY = [
  { label: "All", value: "" },
  { label: "Vacant", value: "VACANT" },
  { label: "Tenant", value: "TENANT" },
];

const EXIT_STRATEGIES = [
  { label: "All", value: "" },
  { label: "Flip", value: "FLIP" },
  { label: "Rental", value: "RENTAL" },
  { label: "Wholesale", value: "WHOLESALE" },
];

const STATUSES = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Closed", value: "CLOSED" },
];

const SELLER_WORKFLOWS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Changes Requested", value: "CHANGES_REQUESTED" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Closed", value: "CLOSED" },
];

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fullAddress(p) {
  const line1 = [p.street1, p.street2].filter(Boolean).join(", ");
  return `${line1}, ${p.city}, ${p.state} ${p.zip}`;
}

function prettyEnum(v) {
  if (!v) return "—";
  return String(v)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages = new Set([
    0,
    1,
    total - 2,
    total - 1,
    current - 1,
    current,
    current + 1,
  ]);
  const sorted = [...pages]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && p - prev > 1) out.push("…");
    out.push(p);
  }
  return out;
}

function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const items = buildPages(page, totalPages);

  return (
    <div className="adminProps__pagination">
      <button
        className="adminProps__pageBtn"
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>

      <div className="adminProps__pageNums">
        {items.map((it, idx) =>
          it === "…" ? (
            <span key={`dots-${idx}`} className="adminProps__dots">
              …
            </span>
          ) : (
            <button
              key={it}
              className={`adminProps__pageBtn adminProps__pageBtn--num ${
                it === page ? "adminProps__pageBtn--active" : ""
              }`}
              type="button"
              onClick={() => onPageChange(it)}
            >
              {it + 1}
            </button>
          ),
        )}
      </div>

      <button
        className="adminProps__pageBtn"
        type="button"
        disabled={page === totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>

      <div className="adminProps__pageMeta">
        Page <span className="adminProps__pageMetaNum">{page + 1}</span> /{" "}
        <span className="adminProps__pageMetaNum">{totalPages}</span>
      </div>
    </div>
  );
}

export default function AdminPropertiesPage() {
  const [filters, setFilters] = useState({
    q: "",
    minAskingPrice: "",
    maxAskingPrice: "",
    minBeds: "",
    minBaths: "",
    occupancyStatus: "",
    exitStrategy: "",
    status: "",
    sellerWorkflowStatus: "",
  });

  const [page, setPage] = useState(0);

  const [rows, setRows] = useState([]);
  const [pageMeta, setPageMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoadError, setEditLoadError] = useState("");

  const [editDeleting, setEditDeleting] = useState(false);
  const [editDeleteError, setEditDeleteError] = useState("");
  const [reviewNoteModal, setReviewNoteModal] = useState({ open: false, note: "" });
  const [changeRequests, setChangeRequests] = useState([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [changeRequestsError, setChangeRequestsError] = useState("");

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function updatePriceFilter(key, value) {
    updateFilter(key, formatPriceInput(value));
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await searchProperties(filters, { page, size: PAGE_SIZE });

        if (!alive) return;

        setRows(data?.content ?? []);
        setPageMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (e) {
        if (!alive) return;

        setRows([]);
        setPageMeta({ totalPages: 0, totalElements: 0 });
        setError(e?.message || "Failed to load properties.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [filters, page, refreshKey]);

  useEffect(() => {
    let alive = true;

    async function loadChangeRequests() {
      setChangeRequestsLoading(true);
      setChangeRequestsError("");

      try {
        const data = await getAdminPropertyChangeRequests({ status: "OPEN" }, { page: 0, size: 25, sort: "createdAt,desc" });
        if (!alive) return;
        setChangeRequests(data?.content ?? []);
      } catch (e) {
        if (!alive) return;
        setChangeRequests([]);
        setChangeRequestsError(e?.message || "Failed to load open change requests.");
      } finally {
        if (alive) setChangeRequestsLoading(false);
      }
    }

    loadChangeRequests();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const hasRows = rows.length > 0;

  const tableCaption = useMemo(() => {
    if (loading) return "Loading properties…";
    if (error) return error;
    if (!hasRows) return "No properties found.";
    return `${pageMeta.totalElements.toLocaleString("en-US")} total properties`;
  }, [loading, error, hasRows, pageMeta.totalElements]);

  const hasMoreFiltersSelected = useMemo(() => {
    return [
      filters.minBeds,
      filters.minBaths,
      filters.occupancyStatus,
      filters.exitStrategy,
      filters.sellerWorkflowStatus,
    ].some((value) => String(value ?? "").trim().length > 0);
  }, [
    filters.minBeds,
    filters.minBaths,
    filters.occupancyStatus,
    filters.exitStrategy,
    filters.sellerWorkflowStatus,
  ]);
  
  function cleanStr(v) {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
  }

  function parseNum(v) {
    const raw = String(v ?? "").trim();
    if (!raw) return null;
    const normalized = raw.replaceAll(",", "").replaceAll("$", "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  function parseIntNum(v) {
    const n = parseNum(v);
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

  async function handlePhotoUpload(file) {
    return uploadPropertyPhoto(file);
  }

  async function handlePhotoUploadDelete(uploadId) {
    if (!uploadId) return;
    try {
      await deletePropertyPhotoUpload(uploadId);
    } catch {
      // best-effort staged cleanup; save/update path handles bound photo lifecycle.
    }
  }

  async function handleAddSubmit(form) {
    setAddSubmitting(true);
    setAddError("");

    try {
      const dto = {
        status: form.status,
        title: cleanStr(form.title), // required
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
        exitStrategy: cleanStr(form.exitStrategy),
        closingTerms: cleanStr(form.closingTerms),

        photos: mapPhotosForUpsert(form.photos),
        saleComps: mapSaleCompsForUpsert(form.saleComps),
      };

      await createProperty(dto);

      setAddOpen(false);
      setPage(0);
      setRefreshKey((k) => k + 1); // forces reload even if already on page 0
    } catch (e) {
      setAddError(e?.message || "Failed to create property.");
    } finally {
      setAddSubmitting(false);
    }
  }

  function formToUpsertDto(form) {
    return {
      status: form.status,
      title: cleanStr(form.title), // required
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
      exitStrategy: cleanStr(form.exitStrategy),
      closingTerms: cleanStr(form.closingTerms),

      photos: mapPhotosForUpsert(form.photos),
      saleComps: mapSaleCompsForUpsert(form.saleComps),
    };
  }

  async function openEditModal(id) {
    setEditLoadError("");
    setEditError("");
    setEditSubmitting(false);

    try {
      const full = await getPropertyId(id);
      setEditId(id);
      setEditInitial(full);
      setEditOpen(true);
    } catch (e) {
      setEditLoadError(e?.message || "Failed to load property details.");
    }
  }

  async function handleAssignSeller(property) {
    const query = window.prompt(
      "Enter seller email/name to assign. Leave blank to unassign this listing.",
    );
    if (query === null) return;

    try {
      if (!query.trim()) {
        await assignPropertySeller(property.id, null);
        setRefreshKey((k) => k + 1);
        return;
      }

      const sellers = await searchAdminSellers({ q: query.trim() }, { page: 0, size: 10, sort: "createdAt,desc" });
      const rows = sellers?.content ?? [];

      if (!rows.length) {
        window.alert("No seller matched the query.");
        return;
      }

      let targetSellerId = rows[0].id;

      if (rows.length > 1) {
        const pick = window.prompt(
          `Multiple sellers found. Enter seller ID:\n${rows
            .map((s) => `${s.id}: ${s.firstName} ${s.lastName} (${s.email})`)
            .join("\n")}`,
        );

        if (pick === null) return;
        const parsed = Number(pick);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          window.alert("Invalid seller ID.");
          return;
        }
        targetSellerId = parsed;
      }

      await assignPropertySeller(property.id, targetSellerId);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e?.message || "Failed to assign seller.");
    }
  }

  async function handleReviewSeller(property) {
    const actionInput = window.prompt("Type action: PUBLISH or REQUEST_CHANGES");
    if (!actionInput) return;
    const action = actionInput.trim().toUpperCase();

    if (action !== "PUBLISH" && action !== "REQUEST_CHANGES") {
      window.alert("Invalid action. Use PUBLISH or REQUEST_CHANGES.");
      return;
    }

    const reviewNote = window.prompt(
      action === "REQUEST_CHANGES"
        ? "Enter review note (required for REQUEST_CHANGES):"
        : "Enter review note (optional):",
    );

    try {
      await reviewSellerProperty(property.id, action, reviewNote ?? "");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e?.message || "Failed to review seller listing.");
    }
  }

  async function handleModerateChangeRequest(request, action) {
    const adminNote = window.prompt(
      `Add admin note for ${action === "APPLIED" ? "apply" : "reject"} (optional):`,
    );

    try {
      await moderatePropertyChangeRequest(request.id, action, adminNote ?? "");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e?.message || "Failed to update change request.");
    }
  }

  async function handleEditSubmit(form) {
    if (!editId) return;

    setEditSubmitting(true);
    setEditError("");

    try {
      const dto = formToUpsertDto(form);
      await updateProperty(editId, dto);

      setEditOpen(false);
      setEditId(null);
      setEditInitial(null);

      setRefreshKey((k) => k + 1); // refresh list, keep same page
    } catch (e) {
      setEditError(e?.message || "Failed to update property.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleEditDelete() {
    if (!editId) return;

    setEditDeleting(true);
    setEditDeleteError("");

    try {
      await deleteProperty(editId);

      setEditOpen(false);
      setEditId(null);
      setEditInitial(null);
      setEditError("");
      setEditLoadError("");

      setPage(0);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setEditDeleteError(e?.message || "Failed to delete property.");
    } finally {
      setEditDeleting(false);
    }
  }

  return (
    <section className="adminProps">
      <form
        className="adminProps__filters"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="adminProps__filterRow">
          <label className="adminProps__filter">
            <span className="adminProps__label">Search</span>
            <input
              className="adminProps__input adminProps__input--text"
              type="search"
              placeholder="Address or title"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
            />
          </label>

          <label className="adminProps__filter">
            <span className="adminProps__label">Status</span>
            <select
              className="adminProps__input"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              {STATUSES.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="adminProps__filter">
            <span className="adminProps__label">Asking Price</span>
            <div className="adminProps__rangeInputs">
            <div className="adminProps__moneyWrap">
                <span className="adminProps__moneyPrefix">$</span>
                <input
                  className="adminProps__input adminProps__input--text adminProps__input--money"
                  type="text"
                  inputMode="numeric"
                  placeholder="Min"
                  value={filters.minAskingPrice}
                  onChange={(e) =>
                    updatePriceFilter("minAskingPrice", e.target.value)
                  }
                />
              </div>
              <div className="adminProps__moneyWrap">
                <span className="adminProps__moneyPrefix">$</span>
                <input
                  className="adminProps__input adminProps__input--text adminProps__input--money"
                  type="text"
                  inputMode="numeric"
                  placeholder="Max"
                  value={filters.maxAskingPrice}
                  onChange={(e) =>
                    updatePriceFilter("maxAskingPrice", e.target.value)
                  }
                />
              </div>
            </div>
          </label>

          <details className="adminProps__moreMenu">
            <summary
              className={`adminProps__moreSummary ${hasMoreFiltersSelected ? "adminProps__moreSummary--active" : ""}`}
            >
              More
            </summary>

            <div className="adminProps__moreBody">
              <label className="adminProps__filter">
                <span className="adminProps__label">Beds (Min)</span>
                <input
                  className="adminProps__input adminProps__input--text"
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={filters.minBeds}
                  onChange={(e) => updateFilter("minBeds", e.target.value)}
                />
              </label>

              <label className="adminProps__filter">
                <span className="adminProps__label">Baths (Min)</span>
                <input
                  className="adminProps__input adminProps__input--text"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Any"
                  value={filters.minBaths}
                  onChange={(e) => updateFilter("minBaths", e.target.value)}
                />
              </label>

              <label className="adminProps__filter">
                <span className="adminProps__label">Occupancy Status</span>
                <select
                  className="adminProps__input"
                  value={filters.occupancyStatus}
                  onChange={(e) =>
                    updateFilter("occupancyStatus", e.target.value)
                  }
                >
                  {OCCUPANCY.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="adminProps__filter">
                <span className="adminProps__label">Exit Strategy</span>
                <select
                  className="adminProps__input"
                  value={filters.exitStrategy}
                  onChange={(e) => updateFilter("exitStrategy", e.target.value)}
                >
                  {EXIT_STRATEGIES.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="adminProps__filter">
                <span className="adminProps__label">Seller Workflow</span>
                <select
                  className="adminProps__input"
                  value={filters.sellerWorkflowStatus}
                  onChange={(e) => updateFilter("sellerWorkflowStatus", e.target.value)}
                >
                  {SELLER_WORKFLOWS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <button
            className="adminProps__iconBtn"
            type="button"
            title="Add Property"
            aria-label="Add Property"
            onClick={() => {
              setAddOpen(true);
            }}
          >
            <span className="material-symbols-outlined">add_home</span>
          </button>
        </div>
      </form>

      <div className="adminProps__tableSection">
        <div className="adminProps__below">
          {!hasRows ? (
            <div
              className={`adminProps__notice ${error ? "adminProps__notice--error" : ""}`}
            >
              {tableCaption}
            </div>
          ) : (
            <>
              <div className="adminProps__tableWrap">
                <table className="adminProps__table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th className="adminProps__thRight">Asking</th>
                      <th className="adminProps__thRight">ARV</th>
                      <th className="adminProps__thRight">Repairs</th>
                      <th className="adminProps__thRight">FMR</th>
                      <th className="adminProps__thCenter">Exit</th>
                      <th className="adminProps__thRight">SqFt</th>
                      <th className="adminProps__thCenter">Bed</th>
                      <th className="adminProps__thCenter">Bath</th>
                      <th className="adminProps__thCenter">Year</th>
                      <th className="adminProps__thCenter">Seller Owner</th>
                      <th className="adminProps__thCenter">Seller Workflow</th>
                      <th className="adminProps__thCenter">Review Note</th>
                      <th className="adminProps__thCenter">Status</th>
                      <th className="adminProps__thIcon"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td className="adminProps__tdAddress">
                          <div className="adminProps__addrMain">
                            {fullAddress(p)}
                          </div>
                          <div className="adminProps__addrSub">
                            {p.title}
                          </div>
                        </td>

                        <td className="adminProps__tdRight">
                          {money(p.askingPrice)}
                        </td>
                        <td className="adminProps__tdRight">{money(p.arv)}</td>
                        <td className="adminProps__tdRight">
                          {money(p.estRepairs)}
                        </td>
                        <td className="adminProps__tdRight">{money(p.fmr)}</td>
                        <td className="adminProps__tdCenter">
                          {prettyEnum(p.exitStrategy)}
                        </td>
                        <td className="adminProps__tdRight">
                          {p.livingAreaSqft?.toLocaleString("en-US") ?? "—"}
                        </td>
                        <td className="adminProps__tdCenter">
                          {p.beds ?? "—"}
                        </td>
                        <td className="adminProps__tdCenter">
                          {p.baths ?? "—"}
                        </td>
                        <td className="adminProps__tdCenter">
                          {p.yearBuilt ?? "—"}
                        </td>
                        <td className="adminProps__tdCenter">
                          {p.sellerId ?? "—"}
                        </td>
                        <td className="adminProps__tdCenter">
                          {prettyEnum(p.sellerWorkflowStatus)}
                        </td>
                        <td className="adminProps__tdCenter">
                          {p.sellerReviewNote ? (
                            <button
                              className="adminProps__textBtn"
                              type="button"
                              onClick={() => setReviewNoteModal({ open: true, note: p.sellerReviewNote })}
                            >
                              View
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="adminProps__tdCenter">
                          {prettyEnum(p.status)}
                        </td>

                        <td className="adminProps__tdIcon">
                          <div className="adminProps__actionsCol">
                            <button
                              className="adminProps__editBtn"
                              type="button"
                              title="Edit"
                              aria-label={`Edit property ${p.id}`}
                              onClick={() => openEditModal(p.id)}
                            >
                              <span className="material-symbols-outlined">
                                edit
                              </span>
                            </button>

                            <button
                              className="adminProps__textBtn"
                              type="button"
                              onClick={() => handleAssignSeller(p)}
                            >
                              Assign
                            </button>

                            {p.sellerWorkflowStatus === "SUBMITTED" ? (
                              <button
                                className="adminProps__textBtn"
                                type="button"
                                onClick={() => handleReviewSeller(p)}
                              >
                                Review
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={pageMeta.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      <PropertyUpsertModal
        open={addOpen}
        mode="add"
        onClose={() => {
          if (!addSubmitting) setAddOpen(false);
        }}
        onSubmit={handleAddSubmit}
        onUploadPhoto={handlePhotoUpload}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={addSubmitting}
        submitError={addError}
      />

      {editLoadError ? (
        <div className="adminProps__notice adminProps__notice--error">
          {editLoadError}
        </div>
      ) : null}

      <section className="adminProps__changeReqSection">
        <h3>Open Seller Change Requests</h3>

        {changeRequestsLoading ? (
          <div className="adminProps__notice">Loading change requests...</div>
        ) : null}

        {changeRequestsError ? (
          <div className="adminProps__notice adminProps__notice--error">{changeRequestsError}</div>
        ) : null}

        {!changeRequestsLoading && !changeRequestsError && changeRequests.length === 0 ? (
          <div className="adminProps__notice">No open change requests.</div>
        ) : null}

        {!changeRequestsLoading && !changeRequestsError && changeRequests.length > 0 ? (
          <div className="adminProps__changeReqList">
            {changeRequests.map((request) => (
              <article className="adminProps__changeReqItem" key={request.id}>
                <div>
                  <strong>Request #{request.id}</strong> • Property #{request.propertyId} • Seller #{request.sellerId}
                </div>
                <div className="adminProps__changeReqBody">{request.requestedChanges}</div>
                <div className="adminProps__changeReqActions">
                  <button type="button" className="adminProps__textBtn" onClick={() => handleModerateChangeRequest(request, "APPLIED")}>
                    Apply
                  </button>
                  <button type="button" className="adminProps__textBtn" onClick={() => handleModerateChangeRequest(request, "REJECTED")}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <PropertyUpsertModal
        open={editOpen}
        mode="edit"
        initialValue={editInitial}
        onClose={() => {
          if (editSubmitting || editDeleting) return;
          setEditOpen(false);
          setEditId(null);
          setEditInitial(null);
          setEditError("");
          setEditDeleteError("");
        }}
        onSubmit={handleEditSubmit}
        onUploadPhoto={handlePhotoUpload}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={editSubmitting}
        submitError={editError}
        onDelete={handleEditDelete}
        deleting={editDeleting}
        deleteError={editDeleteError}
      />

      {reviewNoteModal.open ? (
        <div
          className="adminProps__noteOverlay"
          role="presentation"
          onMouseDown={() => setReviewNoteModal({ open: false, note: "" })}
        >
          <div className="adminProps__noteModal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Seller Review Note</h3>
            <p>{reviewNoteModal.note}</p>
            <div className="adminProps__noteActions">
              <button type="button" onClick={() => setReviewNoteModal({ open: false, note: "" })}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
