import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  createPropertyPhotoFromUrl,
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
import AdminFilterBar, { AdminFilterMore } from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import SellerAssignmentModal from "@/features/admin/modals/SellerAssignmentModal";
import SellerReviewModal from "@/features/admin/modals/SellerReviewModal";
import ChangeRequestDecisionModal from "@/features/admin/modals/ChangeRequestDecisionModal";
import PropertyUpsertModal from "@/features/admin/modals/PropertyUpsertModal";
import {
  signalAdminQueueRefresh,
  startAdminTimer,
} from "@/features/admin/utils/adminTelemetry";
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

export default function AdminPropertiesPage() {
  const outletContext = useOutletContext();
  const sidebarCollapsed = Boolean(outletContext?.sidebarCollapsed);
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
  const [searchInput, setSearchInput] = useState("");

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

  const [assignmentModal, setAssignmentModal] = useState({ open: false, property: null });
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentSearching, setAssignmentSearching] = useState(false);
  const [assignmentSearchError, setAssignmentSearchError] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentSaveError, setAssignmentSaveError] = useState("");

  const [sellerReviewModal, setSellerReviewModal] = useState({ open: false, property: null });
  const [sellerReviewSubmitting, setSellerReviewSubmitting] = useState(false);
  const [sellerReviewError, setSellerReviewError] = useState("");

  const [changeDecisionModal, setChangeDecisionModal] = useState({ open: false, request: null });
  const [changeDecisionSubmitting, setChangeDecisionSubmitting] = useState(false);
  const [changeDecisionError, setChangeDecisionError] = useState("");

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

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput }));
    setPage(0);
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await searchProperties(
          {
            q: cleanStr(filters.q),
            minAskingPrice: parseNum(filters.minAskingPrice),
            maxAskingPrice: parseNum(filters.maxAskingPrice),
            minBeds: parseIntNum(filters.minBeds),
            minBaths: parseNum(filters.minBaths),
            occupancyStatus: cleanStr(filters.occupancyStatus),
            exitStrategy: cleanStr(filters.exitStrategy),
            status: cleanStr(filters.status),
            sellerWorkflowStatus: cleanStr(filters.sellerWorkflowStatus),
          },
          { page, size: PAGE_SIZE },
        );

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
        const data = await getAdminPropertyChangeRequests({ status: "OPEN" }, { page: 0, size: 6, sort: "createdAt,desc" });
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

  const advancedFilters = (
    <>
      <label className="adminProps__filter adminProps__filter--beds">
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

      <label className="adminProps__filter adminProps__filter--baths">
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

      <label className="adminProps__filter adminProps__filter--occupancy">
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

      <label className="adminProps__filter adminProps__filter--exit">
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

      <label className="adminProps__filter adminProps__filter--workflow">
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
    </>
  );
  
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

  async function handlePhotoUrlAdd(url) {
    return createPropertyPhotoFromUrl(url);
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

  function openAssignSellerModal(property) {
    setAssignmentSearchError("");
    setAssignmentSaveError("");
    setAssignmentResults([]);
    setAssignmentModal({ open: true, property });
  }

  async function handleAssignmentSearch(query) {
    if (!query?.trim()) return;

    setAssignmentSearching(true);
    setAssignmentSearchError("");

    try {
      const sellers = await searchAdminSellers({ q: query.trim() }, { page: 0, size: 12, sort: "createdAt,desc" });
      setAssignmentResults(sellers?.content ?? []);
      if ((sellers?.content ?? []).length === 0) {
        setAssignmentSearchError("No sellers matched that query.");
      }
    } catch (e) {
      setAssignmentResults([]);
      setAssignmentSearchError(e?.message || "Failed to search sellers.");
    } finally {
      setAssignmentSearching(false);
    }
  }

  async function handleAssignmentSave(sellerId) {
    const property = assignmentModal.property;
    if (!property?.id) return;

    const stop = startAdminTimer("admin.properties.assign_seller", {
      propertyId: property.id,
      sellerId: sellerId ?? null,
    });

    setAssignmentSaving(true);
    setAssignmentSaveError("");

    try {
      await assignPropertySeller(property.id, sellerId ?? null);
      stop("success");
      signalAdminQueueRefresh();
      setAssignmentModal({ open: false, property: null });
      setAssignmentResults([]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setAssignmentSaveError(e?.message || "Failed to assign seller.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setAssignmentSaving(false);
    }
  }

  function openSellerReviewModal(property) {
    setSellerReviewError("");
    setSellerReviewModal({ open: true, property });
  }

  async function handleSellerReviewSubmit({ action, reviewNote }) {
    const property = sellerReviewModal.property;
    if (!property?.id) return;

    const stop = startAdminTimer("admin.properties.review_seller", {
      propertyId: property.id,
      action,
    });

    setSellerReviewSubmitting(true);
    setSellerReviewError("");

    try {
      await reviewSellerProperty(property.id, action, reviewNote ?? "");
      stop("success");
      signalAdminQueueRefresh();
      setSellerReviewModal({ open: false, property: null });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setSellerReviewError(e?.message || "Failed to review seller listing.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setSellerReviewSubmitting(false);
    }
  }

  function openChangeDecisionModal(request) {
    setChangeDecisionError("");
    setChangeDecisionModal({ open: true, request });
  }

  async function handleChangeDecisionSubmit({ action, adminNote }) {
    const request = changeDecisionModal.request;
    if (!request?.id) return;

    const stop = startAdminTimer("admin.properties.change_request", {
      requestId: request.id,
      action,
    });

    setChangeDecisionSubmitting(true);
    setChangeDecisionError("");

    try {
      await moderatePropertyChangeRequest(request.id, action, adminNote ?? "");
      stop("success");
      signalAdminQueueRefresh();
      setChangeDecisionModal({ open: false, request: null });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setChangeDecisionError(e?.message || "Failed to update change request.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setChangeDecisionSubmitting(false);
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
    <section className={`adminProps ${sidebarCollapsed ? "adminProps--sidebarCollapsed" : ""}`.trim()}>
      <AdminFilterBar className="adminProps__filters" rowClassName="adminProps__filterRow" onSubmit={handleSearchSubmit}>
        <label className="adminProps__filter">
          <span className="adminProps__label">Search</span>
          <div className="adminProps__searchWrap">
            <input
              className="adminProps__input adminProps__input--text adminProps__input--search"
              type="search"
              placeholder="Address or title"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="adminProps__searchBtn" type="submit" aria-label="Search properties">
              <span className="material-symbols-outlined adminProps__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>
        </label>

        <label className="adminProps__filter adminProps__filter--status">
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

        <label className="adminProps__filter adminProps__filter--asking">
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

        {sidebarCollapsed ? advancedFilters : (
          <AdminFilterMore
            className="adminProps__moreMenu"
            summaryClassName="adminProps__moreSummary"
            summaryActiveClassName="adminProps__moreSummary--active"
            bodyClassName="adminProps__moreBody"
            active={hasMoreFiltersSelected}
            summaryLabel="More"
          >
            {advancedFilters}
          </AdminFilterMore>
        )}
      </AdminFilterBar>

      <div className="adminProps__tableSection">
        <div className="adminProps__below">
          <div className="adminProps__sectionHead">
            <h3 className="adminProps__sectionTitle">Properties</h3>
            <button
              className="adminProps__addBtn"
              type="button"
              onClick={() => {
                setAddOpen(true);
              }}
            >
              <span className="material-symbols-outlined">add_home</span>
              Add Property
            </button>
          </div>
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
                              onClick={() => openAssignSellerModal(p)}
                            >
                              Assign
                            </button>

                            {p.sellerWorkflowStatus === "SUBMITTED" ? (
                              <button
                                className="adminProps__textBtn"
                                type="button"
                                onClick={() => openSellerReviewModal(p)}
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

              <AdminPagination
                page={page}
                totalPages={pageMeta.totalPages}
                onPageChange={setPage}
                className="adminProps__pagination"
                buttonClassName="adminProps__pageBtn"
                numbersClassName="adminProps__pageNums"
                numberButtonClassName="adminProps__pageBtn--num"
                activeNumberClassName="adminProps__pageBtn--active"
                dotsClassName="adminProps__dots"
                metaClassName="adminProps__pageMeta"
                metaValueClassName="adminProps__pageMetaNum"
              />
              <div className="adminProps__meta">
                {rows.length.toLocaleString("en-US")} on page • {pageMeta.totalElements.toLocaleString("en-US")} total
              </div>
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
        onAddPhotoByUrl={handlePhotoUrlAdd}
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
        <div className="adminProps__changeReqHead">
          <h3>Open Seller Change Requests</h3>
          <Link className="adminProps__queueLink" to="/admin/queue">
            Open Full Queue
          </Link>
        </div>

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
                  <button type="button" className="adminProps__textBtn" onClick={() => openChangeDecisionModal(request)}>
                    Resolve
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
        onAddPhotoByUrl={handlePhotoUrlAdd}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={editSubmitting}
        submitError={editError}
        onDelete={handleEditDelete}
        deleting={editDeleting}
        deleteError={editDeleteError}
      />

      <SellerAssignmentModal
        open={assignmentModal.open}
        property={assignmentModal.property}
        searching={assignmentSearching}
        searchError={assignmentSearchError}
        results={assignmentResults}
        saving={assignmentSaving}
        saveError={assignmentSaveError}
        onClose={() => {
          if (assignmentSaving) return;
          setAssignmentModal({ open: false, property: null });
          setAssignmentResults([]);
          setAssignmentSearchError("");
          setAssignmentSaveError("");
        }}
        onSearch={handleAssignmentSearch}
        onAssign={(sellerId) => handleAssignmentSave(sellerId)}
        onUnassign={() => handleAssignmentSave(null)}
      />

      <SellerReviewModal
        open={sellerReviewModal.open}
        property={sellerReviewModal.property}
        submitting={sellerReviewSubmitting}
        submitError={sellerReviewError}
        onClose={() => {
          if (sellerReviewSubmitting) return;
          setSellerReviewModal({ open: false, property: null });
          setSellerReviewError("");
        }}
        onSubmit={handleSellerReviewSubmit}
      />

      <ChangeRequestDecisionModal
        open={changeDecisionModal.open}
        request={changeDecisionModal.request}
        submitting={changeDecisionSubmitting}
        submitError={changeDecisionError}
        onClose={() => {
          if (changeDecisionSubmitting) return;
          setChangeDecisionModal({ open: false, request: null });
          setChangeDecisionError("");
        }}
        onSubmit={handleChangeDecisionSubmit}
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
