import { useEffect, useMemo, useState } from "react";
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
import { getSellerById } from "@/api/modules/sellerApi";
import {
  assignPropertySeller,
  getAdminPropertyChangeRequests,
  moderatePropertyChangeRequest,
  reviewSellerProperty,
} from "@/api/modules/sellerPropertyApi";
import "@/features/admin/pages/AdminPropertiesPage.css";
import AdminFilterBar, { AdminFilterMore } from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import useFilterBarMinWidth from "@/features/admin/hooks/useFilterBarMinWidth";
import SellerReviewModal from "@/features/admin/modals/SellerReviewModal";
import ChangeRequestDecisionModal from "@/features/admin/modals/ChangeRequestDecisionModal";
import PropertyUpsertModal from "@/features/admin/modals/PropertyUpsertModal";
import Modal from "@/shared/ui/modal/Modal";
import {
  signalAdminQueueRefresh,
  startAdminTimer,
} from "@/features/admin/utils/adminTelemetry";
import { formatPriceInput } from "@/shared/utils/priceFormatting";

const PAGE_SIZE = 20;
const PROPERTIES_PRIMARY_INLINE_MIN_WIDTH = 980;
const PROPERTIES_INLINE_FILTERS_MIN_WIDTH = 1420;
const ADMIN_PROPERTIES_MOBILE_QUERY = "(max-width: 980px)";
const PROPERTY_STATUS_ORDER = {
  ACTIVE: 0,
  DRAFT: 1,
  CLOSED: 2,
};

const OCCUPANCY = [
  { label: "All", value: "" },
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
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
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Changes Requested", value: "CHANGES_REQUESTED" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Closed", value: "CLOSED" },
];

const SECONDARY_COLUMN_OPTIONS = [
  { key: "arv", label: "After Repair Value (ARV)" },
  { key: "repairs", label: "Estimated Repairs" },
  { key: "fmr", label: "Fair Market Rent (FMR)" },
  { key: "exit", label: "Exit Strategy" },
  { key: "sqft", label: "Square Footage" },
  { key: "beds", label: "Beds" },
  { key: "baths", label: "Baths" },
  { key: "year", label: "Year Built" },
  { key: "reviewNote", label: "Review Note" },
];
const DEFAULT_SECONDARY_COLUMNS = ["arv", "repairs", "exit", "beds", "baths"];

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function propertyAddressLineOne(property) {
  return [property?.street1, property?.street2].filter(Boolean).join(", ");
}

function propertyAddressLineTwo(property) {
  const stateZip = [property?.state, property?.zip].filter(Boolean).join(" ");
  return [property?.city, stateZip].filter(Boolean).join(", ");
}

function prettyEnum(v) {
  if (!v) return "—";
  return String(v)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sellerDisplayLabel(property) {
  const fromParts = [property?.sellerFirstName, property?.sellerLastName].filter(Boolean).join(" ").trim();
  const candidate = [
    property?.sellerName,
    property?.sellerFullName,
    property?.sellerDisplayName,
    fromParts,
    property?.sellerEmail,
  ].find((value) => String(value ?? "").trim().length > 0);
  if (candidate) return candidate;
  return "";
}

function sellerDisplayName(seller) {
  const full = [seller?.firstName, seller?.lastName].filter(Boolean).join(" ").trim();
  return full || seller?.email || "";
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
  const { setFilterBarRef, width: filterBarWidth } = useFilterBarMinWidth(PROPERTIES_INLINE_FILTERS_MIN_WIDTH);
  const showAdvancedInline = filterBarWidth >= PROPERTIES_INLINE_FILTERS_MIN_WIDTH;
  const showPrimaryInline = filterBarWidth >= PROPERTIES_PRIMARY_INLINE_MIN_WIDTH;
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
  const [reviewNoteModal, setReviewNoteModal] = useState({ open: false, note: "", sellerId: null, sellerLabel: "" });

  const [sellerReviewModal, setSellerReviewModal] = useState({ open: false, property: null });
  const [sellerReviewSubmitting, setSellerReviewSubmitting] = useState(false);
  const [sellerReviewError, setSellerReviewError] = useState("");

  const [changeDecisionModal, setChangeDecisionModal] = useState({ open: false, request: null });
  const [changeDecisionSubmitting, setChangeDecisionSubmitting] = useState(false);
  const [changeDecisionError, setChangeDecisionError] = useState("");

  const [changeRequests, setChangeRequests] = useState([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [changeRequestsError, setChangeRequestsError] = useState("");
  const [secondaryColumns, setSecondaryColumns] = useState(DEFAULT_SECONDARY_COLUMNS);
  const [sellerNameById, setSellerNameById] = useState({});
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(ADMIN_PROPERTIES_MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(ADMIN_PROPERTIES_MOBILE_QUERY);
    const handleMediaChange = (event) => setIsMobileView(event.matches);
    const supportsModernListener = typeof media.addEventListener === "function";

    if (supportsModernListener) {
      media.addEventListener("change", handleMediaChange);
    } else {
      media.addListener(handleMediaChange);
    }

    return () => {
      if (supportsModernListener) {
        media.removeEventListener("change", handleMediaChange);
        return;
      }
      media.removeListener(handleMediaChange);
    };
  }, []);

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

  useEffect(() => {
    const sellerIds = [...new Set(rows.map((row) => row?.sellerId).filter((id) => id !== null && id !== undefined))];
    const missingSellerIds = sellerIds.filter((id) => !sellerNameById[id]);
    if (!missingSellerIds.length) return undefined;

    let alive = true;

    async function loadSellerNames() {
      const entries = await Promise.all(
        missingSellerIds.map(async (sellerId) => {
          try {
            const seller = await getSellerById(sellerId);
            return [sellerId, sellerDisplayName(seller) || `Seller #${sellerId}`];
          } catch {
            return [sellerId, `Seller #${sellerId}`];
          }
        }),
      );

      if (!alive) return;
      setSellerNameById((prev) => {
        const next = { ...prev };
        entries.forEach(([sellerId, name]) => {
          next[sellerId] = name;
        });
        return next;
      });
    }

    loadSellerNames();

    return () => {
      alive = false;
    };
  }, [rows, sellerNameById]);

  const hasRows = rows.length > 0;
  const sortedRows = useMemo(() => {
    return rows
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        const rankA = PROPERTY_STATUS_ORDER[a.row?.status] ?? Number.MAX_SAFE_INTEGER;
        const rankB = PROPERTY_STATUS_ORDER[b.row?.status] ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.idx - b.idx;
      })
      .map((entry) => entry.row);
  }, [rows]);

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
      showPrimaryInline ? "" : filters.status,
      showPrimaryInline ? "" : filters.minAskingPrice,
      showPrimaryInline ? "" : filters.maxAskingPrice,
    ].some((value) => String(value ?? "").trim().length > 0);
  }, [
    filters.minBeds,
    filters.minBaths,
    filters.occupancyStatus,
    filters.exitStrategy,
    filters.sellerWorkflowStatus,
    filters.status,
    filters.minAskingPrice,
    filters.maxAskingPrice,
    showPrimaryInline,
  ]);

  const secondaryColumnSet = useMemo(() => {
    return new Set(secondaryColumns);
  }, [secondaryColumns]);

  function toggleSecondaryColumn(key) {
    setSecondaryColumns((prev) => {
      if (prev.includes(key)) return prev.filter((col) => col !== key);
      return [...prev, key];
    });
  }

  function ownerNameForProperty(property) {
    if (property?.sellerId === null || property?.sellerId === undefined) return "Unassigned";
    return sellerNameById[property.sellerId] || sellerDisplayLabel(property) || "Loading...";
  }

  const primaryFilters = (
    <>
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
    </>
  );

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
        <span className="adminProps__label">Occupied</span>
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

      const created = await createProperty(dto);
      if (form?.sellerId !== "" && form?.sellerId !== null && form?.sellerId !== undefined) {
        await syncPropertyOwner(created?.id, form.sellerId);
      }

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

  async function syncPropertyOwner(propertyId, sellerId) {
    if (!propertyId) return;
    const normalizedSellerId = sellerId === "" || sellerId === null || sellerId === undefined
      ? null
      : Number(sellerId);
    const safeSellerId = Number.isFinite(normalizedSellerId) ? normalizedSellerId : null;

    const stop = startAdminTimer("admin.properties.assign_seller", {
      propertyId,
      sellerId: safeSellerId,
    });

    try {
      await assignPropertySeller(propertyId, safeSellerId);
      stop("success");
      signalAdminQueueRefresh();
    } catch (e) {
      stop("error", { error: e?.message || "unknown" });
      throw e;
    }
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
      const currentSellerId = editInitial?.sellerId ?? null;
      const nextSellerId = form?.sellerId === "" || form?.sellerId === null || form?.sellerId === undefined
        ? null
        : Number(form.sellerId);
      const normalizedNextSellerId = Number.isFinite(nextSellerId) ? nextSellerId : null;
      if (currentSellerId !== normalizedNextSellerId) {
        await syncPropertyOwner(editId, normalizedNextSellerId);
      }

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
    <section className={`adminProps ${showAdvancedInline ? "adminProps--filtersExpanded" : ""}`.trim()}>
      <AdminFilterBar
        className="adminProps__filters"
        rowClassName={`adminProps__filterRow ${showPrimaryInline ? "adminProps__filterRow--primaryInline" : "adminProps__filterRow--searchOnly"}`.trim()}
        onSubmit={handleSearchSubmit}
        containerRef={setFilterBarRef}
      >
        <label className="adminProps__filter">
          <span className="adminProps__label">Search</span>
          <div className="adminProps__searchWrap">
            <input
              className="adminProps__input adminProps__input--text adminProps__input--search"
              type="search"
              placeholder="Address"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="adminProps__searchBtn" type="submit" aria-label="Search properties">
              <span className="material-symbols-outlined adminProps__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>
        </label>

        {showPrimaryInline ? primaryFilters : null}

        {showAdvancedInline ? advancedFilters : (
          <AdminFilterMore
            className="adminProps__moreMenu"
            summaryClassName="adminProps__moreSummary"
            summaryActiveClassName="adminProps__moreSummary--active"
            bodyClassName="adminProps__moreBody"
            active={hasMoreFiltersSelected}
            summaryLabel="More"
          >
            {!showPrimaryInline ? primaryFilters : null}
            {advancedFilters}
          </AdminFilterMore>
        )}
      </AdminFilterBar>

      <div className="adminProps__tableSection">
        <div className="adminProps__below">
          <div className="adminProps__sectionHead">
            <h3 className="adminProps__sectionTitle">Properties</h3>
            <div className="adminProps__sectionActions">
              {!isMobileView ? (
                <details className="adminProps__columnsMenu">
                  <summary className="adminProps__columnsBtn">
                    <span className="material-symbols-outlined">view_column</span>
                    Columns
                    {secondaryColumns.length ? ` (${secondaryColumns.length})` : ""}
                  </summary>
                  <div className="adminProps__columnsBody">
                    {SECONDARY_COLUMN_OPTIONS.map((column) => (
                      <label key={column.key} className="adminProps__columnOption">
                        <input
                          type="checkbox"
                          checked={secondaryColumnSet.has(column.key)}
                          onChange={() => toggleSecondaryColumn(column.key)}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ) : null}
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
                      {isMobileView ? (
                        <>
                          <th>Address</th>
                          <th className="adminProps__thRight">Asking Price</th>
                        </>
                      ) : (
                        <>
                          <th>Address</th>
                          <th className="adminProps__thRight">Asking Price</th>
                          {secondaryColumnSet.has("arv") ? <th className="adminProps__thRight">After Repair Value (ARV)</th> : null}
                          {secondaryColumnSet.has("repairs") ? <th className="adminProps__thRight">Estimated Repairs</th> : null}
                          {secondaryColumnSet.has("fmr") ? <th className="adminProps__thRight">Fair Market Rent (FMR)</th> : null}
                          {secondaryColumnSet.has("exit") ? <th className="adminProps__thCenter">Exit Strategy</th> : null}
                          {secondaryColumnSet.has("sqft") ? <th className="adminProps__thRight">Square Footage</th> : null}
                          {secondaryColumnSet.has("beds") ? <th className="adminProps__thCenter">Beds</th> : null}
                          {secondaryColumnSet.has("baths") ? <th className="adminProps__thCenter">Baths</th> : null}
                          {secondaryColumnSet.has("year") ? <th className="adminProps__thCenter">Year Built</th> : null}
                          <th className="adminProps__thCenter">Seller Owner</th>
                          <th className="adminProps__thCenter">Seller Workflow</th>
                          {secondaryColumnSet.has("reviewNote") ? <th className="adminProps__thCenter">Review Note</th> : null}
                          <th className="adminProps__thCenter">Status</th>
                          <th className="adminProps__thIcon"></th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map((p) => {
                      const lineOne = propertyAddressLineOne(p);
                      const lineTwo = propertyAddressLineTwo(p);
                      const statusKey = String(p?.status ?? "").trim().toUpperCase();
                      const statusTone = ["ACTIVE", "DRAFT", "CLOSED"].includes(statusKey)
                        ? statusKey.toLowerCase()
                        : "unknown";

                      if (isMobileView) {
                        return (
                          <tr
                            key={p.id}
                            className={`adminProps__row adminProps__row--${statusTone} adminProps__row--mobileInteractive`}
                            role="button"
                            tabIndex={0}
                            aria-label={`Edit property ${lineOne || `#${p.id}`}`}
                            onClick={() => openEditModal(p.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openEditModal(p.id);
                              }
                            }}
                          >
                            <td className="adminProps__tdAddress">
                              <div className="adminProps__addrMain">{lineOne || "—"}</div>
                              <div className="adminProps__addrSub">{lineTwo || "—"}</div>
                            </td>
                            <td className="adminProps__tdRight">
                              {money(p.askingPrice)}
                            </td>
                          </tr>
                        );
                      }

                      return (
                      <tr key={p.id} className={`adminProps__row adminProps__row--${statusTone}`}>
                        <td className="adminProps__tdAddress">
                          <div className="adminProps__addrMain">{lineOne || "—"}</div>
                          <div className="adminProps__addrSub">{lineTwo || "—"}</div>
                        </td>

                        <td className="adminProps__tdRight">
                          {money(p.askingPrice)}
                        </td>
                        {secondaryColumnSet.has("arv") ? <td className="adminProps__tdRight">{money(p.arv)}</td> : null}
                        {secondaryColumnSet.has("repairs") ? (
                          <td className="adminProps__tdRight">
                            {money(p.estRepairs)}
                          </td>
                        ) : null}
                        {secondaryColumnSet.has("fmr") ? <td className="adminProps__tdRight">{money(p.fmr)}</td> : null}
                        {secondaryColumnSet.has("exit") ? (
                          <td className="adminProps__tdCenter">
                            {prettyEnum(p.exitStrategy)}
                          </td>
                        ) : null}
                        {secondaryColumnSet.has("sqft") ? (
                          <td className="adminProps__tdRight">
                            {p.livingAreaSqft?.toLocaleString("en-US") ?? "—"}
                          </td>
                        ) : null}
                        {secondaryColumnSet.has("beds") ? (
                          <td className="adminProps__tdCenter">
                            {p.beds ?? "—"}
                          </td>
                        ) : null}
                        {secondaryColumnSet.has("baths") ? (
                          <td className="adminProps__tdCenter">
                            {p.baths ?? "—"}
                          </td>
                        ) : null}
                        {secondaryColumnSet.has("year") ? (
                          <td className="adminProps__tdCenter">
                            {p.yearBuilt ?? "—"}
                          </td>
                        ) : null}
                        <td className="adminProps__tdCenter">
                          {ownerNameForProperty(p)}
                        </td>
                        <td className="adminProps__tdCenter">
                          {prettyEnum(p.sellerWorkflowStatus)}
                        </td>
                        {secondaryColumnSet.has("reviewNote") ? (
                          <td className="adminProps__tdCenter">
                            {p.sellerReviewNote ? (
                              <button
                                className="adminProps__textBtn"
                                type="button"
                                onClick={() => setReviewNoteModal({
                                  open: true,
                                  note: p.sellerReviewNote,
                                  sellerId: p.sellerId ?? null,
                                  sellerLabel: sellerDisplayLabel(p),
                                })}
                              >
                                View
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                        <td className="adminProps__tdCenter">
                          <span className={`adminProps__statusBadge adminProps__statusBadge--${statusTone}`}>
                            {prettyEnum(p.status)}
                          </span>
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
                          </div>
                        </td>
                      </tr>
                    );
                    })}
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
                {sortedRows.length.toLocaleString("en-US")} on page • {pageMeta.totalElements.toLocaleString("en-US")} total
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

      <Modal
        open={reviewNoteModal.open}
        onClose={() => setReviewNoteModal({ open: false, note: "", sellerId: null, sellerLabel: "" })}
        title={`Seller Review Note • ${
          reviewNoteModal.sellerId !== null && reviewNoteModal.sellerId !== undefined
            ? (sellerNameById[reviewNoteModal.sellerId] || reviewNoteModal.sellerLabel || "Loading...")
            : "Unassigned"
        }`}
        width={620}
      >
        <div className="adminProps__noteBody">
          <p>{reviewNoteModal.note}</p>
        </div>
      </Modal>
    </section>
  );
}
