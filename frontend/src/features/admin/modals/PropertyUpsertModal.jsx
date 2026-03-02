import { useEffect, useMemo, useRef, useState } from "react";
import "@/features/admin/modals/PropertyUpsertModal.css";
import { formatPriceInput } from "@/shared/utils/priceFormatting";
import { numOrEmpty } from "@/shared/utils/formValue";
import { getAddressSuggestions } from "@/api/modules/propertyApi";
import { getSellerById, searchAdminSellers } from "@/api/modules/sellerApi";
import { acquireModalBodyLock } from "@/shared/ui/modal/bodyLock";

const STATUS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Closed", value: "CLOSED" },
];

const OCCUPANCY = [
  { label: "—", value: "" },
  { label: "Vacant", value: "VACANT" },
  { label: "Tenant", value: "TENANT" },
];

const EXIT = [
  { label: "—", value: "" },
  { label: "Flip", value: "FLIP" },
  { label: "Rental", value: "RENTAL" },
  { label: "Wholesale", value: "WHOLESALE" },
];

const CLOSING_TERMS = [
  { label: "—", value: "" },
  { label: "Cash Only", value: "CASH_ONLY" },
  { label: "Hard Money", value: "HARD_MONEY" },
  { label: "Conventional", value: "CONVENTIONAL" },
  { label: "Seller Finance", value: "SELLER_FINANCE" },
];

const US_STATE_OPTIONS = [
  { label: "—", value: "" },
  { label: "AL", value: "AL" },
  { label: "AK", value: "AK" },
  { label: "AZ", value: "AZ" },
  { label: "AR", value: "AR" },
  { label: "CA", value: "CA" },
  { label: "CO", value: "CO" },
  { label: "CT", value: "CT" },
  { label: "DE", value: "DE" },
  { label: "FL", value: "FL" },
  { label: "GA", value: "GA" },
  { label: "HI", value: "HI" },
  { label: "ID", value: "ID" },
  { label: "IL", value: "IL" },
  { label: "IN", value: "IN" },
  { label: "IA", value: "IA" },
  { label: "KS", value: "KS" },
  { label: "KY", value: "KY" },
  { label: "LA", value: "LA" },
  { label: "ME", value: "ME" },
  { label: "MD", value: "MD" },
  { label: "MA", value: "MA" },
  { label: "MI", value: "MI" },
  { label: "MN", value: "MN" },
  { label: "MS", value: "MS" },
  { label: "MO", value: "MO" },
  { label: "MT", value: "MT" },
  { label: "NE", value: "NE" },
  { label: "NV", value: "NV" },
  { label: "NH", value: "NH" },
  { label: "NJ", value: "NJ" },
  { label: "NM", value: "NM" },
  { label: "NY", value: "NY" },
  { label: "NC", value: "NC" },
  { label: "ND", value: "ND" },
  { label: "OH", value: "OH" },
  { label: "OK", value: "OK" },
  { label: "OR", value: "OR" },
  { label: "PA", value: "PA" },
  { label: "RI", value: "RI" },
  { label: "SC", value: "SC" },
  { label: "SD", value: "SD" },
  { label: "TN", value: "TN" },
  { label: "TX", value: "TX" },
  { label: "UT", value: "UT" },
  { label: "VT", value: "VT" },
  { label: "VA", value: "VA" },
  { label: "WA", value: "WA" },
  { label: "WV", value: "WV" },
  { label: "WI", value: "WI" },
  { label: "WY", value: "WY" },
  { label: "DC", value: "DC" },
];

const US_STATE_VALUES = new Set(US_STATE_OPTIONS.map((option) => option.value));
const ADDRESS_SUGGESTION_MIN_CHARS = 3;
const ADDRESS_SUGGESTION_DEBOUNCE_MS = 280;
const REQUIRED_ADDRESS_FIELD_LABELS = new Set([
  "Street Address",
  "City",
  "State",
  "ZIP / postcode",
]);

function createEmptyCompForm() {
  return {
    address: "",
    soldDate: "",
    soldPrice: "",
    beds: "",
    baths: "",
    livingAreaSqft: "",
    distanceMiles: "",
    notes: "",
  };
}

function normalizePhotos(photos, options = {}) {
  const { existing = false } = options;
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo, idx) => {
      const rawUrl = typeof photo === "string" ? photo : photo?.url;
      const url = String(rawUrl ?? "").trim();
      if (!url) return null;

      const thumb = String(
        typeof photo === "string" ? rawUrl : photo?.thumbnailUrl ?? rawUrl,
      ).trim();

      return {
        photoAssetId: String(photo?.photoAssetId ?? "").trim(),
        uploadId: String(photo?.uploadId ?? photo?.photoAssetId ?? "").trim(),
        url,
        thumbnailUrl: thumb || url,
        sortOrder: Number.isFinite(Number(photo?.sortOrder))
          ? Number(photo.sortOrder)
          : idx,
        caption: String(photo?.caption ?? "").trim() || null,
        isExisting: existing || Boolean(photo?.id) || Boolean(photo?.isExisting),
      };
    })
    .filter(Boolean);
}

function normalizeStateCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function formatAddressSuggestionMeta(suggestion) {
  const parts = [suggestion.city, suggestion.state, suggestion.zip]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function normalizeAddressSuggestions(rawSuggestions) {
  return (Array.isArray(rawSuggestions) ? rawSuggestions : [])
    .map((item, idx) => {
      const normalizedState = normalizeStateCode(item?.state);
      return {
        key: `${item?.display ?? item?.street1 ?? "suggestion"}-${idx}`,
        display: String(item?.display ?? "").trim(),
        street1: String(item?.street1 ?? "").trim(),
        city: String(item?.city ?? "").trim(),
        state: US_STATE_VALUES.has(normalizedState) ? normalizedState : "",
        zip: String(item?.zip ?? "").trim(),
      };
    })
    .filter(
      (item) =>
        item.display || item.street1 || item.city || item.state || item.zip,
    );
}

function buildSuggestionAddressLine(suggestion) {
  const fallback = String(suggestion?.display ?? "").trim();
  const streetLine = String(suggestion?.street1 ?? "").trim();
  const city = String(suggestion?.city ?? "").trim();
  const state = String(suggestion?.state ?? "").trim();
  const zip = String(suggestion?.zip ?? "").trim();

  if (!streetLine) return fallback;

  const location = [city, state, zip].filter(Boolean).join(", ");
  return location ? `${streetLine}, ${location}` : streetLine;
}

function normalizeSaleComps(rawSaleComps) {
  return [...(Array.isArray(rawSaleComps) ? rawSaleComps : [])]
    .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
    .map((comp, idx) => ({
      id: comp?.id ?? null,
      address: String(comp?.address ?? "").trim(),
      soldDate: String(comp?.soldDate ?? "").trim(),
      soldPrice: formatPriceInput(numOrEmpty(comp?.soldPrice)),
      beds: numOrEmpty(comp?.beds),
      baths: numOrEmpty(comp?.baths),
      livingAreaSqft: numOrEmpty(comp?.livingAreaSqft),
      distanceMiles: numOrEmpty(comp?.distanceMiles),
      notes: String(comp?.notes ?? "").trim(),
      sortOrder: Number.isFinite(Number(comp?.sortOrder))
        ? Number(comp.sortOrder)
        : idx,
    }));
}

function parseNumericValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replaceAll(",", "").replaceAll("$", "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatCompDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCompMoney(value) {
  const n = parseNumericValue(value);
  if (n === null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCompBeds(value) {
  const n = parseNumericValue(value);
  if (n === null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function formatCompBaths(value) {
  const n = parseNumericValue(value);
  if (n === null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatCompSqft(value) {
  const n = parseNumericValue(value);
  if (n === null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function formatCompDistance(value) {
  const n = parseNumericValue(value);
  if (n === null) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} mi`;
}

function formatCompPricePerSqft(comp) {
  const soldPrice = parseNumericValue(comp?.soldPrice);
  const sqft = parseNumericValue(comp?.livingAreaSqft);
  if (soldPrice === null || sqft === null || sqft <= 0) return "—";

  const pricePerSqft = soldPrice / sqft;
  return `$${pricePerSqft.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function sellerDisplayName(seller) {
  const full = [seller?.firstName, seller?.lastName].filter(Boolean).join(" ").trim();
  return full || seller?.email || `Seller #${seller?.id ?? "—"}`;
}

function sellerDisplayLabelFromProperty(property) {
  const fromParts = [property?.sellerFirstName, property?.sellerLastName].filter(Boolean).join(" ").trim();
  return (
    property?.sellerName ||
    property?.sellerFullName ||
    property?.sellerDisplayName ||
    fromParts ||
    property?.sellerEmail ||
    ""
  );
}

const DEFAULT_FORM = {
  status: "DRAFT",
  title: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  askingPrice: "",
  arv: "",
  estRepairs: "",
  fmr: "",
  beds: "",
  baths: "",
  livingAreaSqft: "",
  yearBuilt: "",
  roofAge: "",
  hvac: "",
  sellerId: "",
  occupancyStatus: "",
  exitStrategy: "",
  closingTerms: "",
  photos: [],
  saleComps: [],
};

export default function PropertyUpsertModal({
  open,
  mode = "add",
  initialValue = null,
  onClose,
  onSubmit,
  onUploadPhoto,
  onAddPhotoByUrl,
  onDeleteUploadedPhoto,
  onDelete,
  submitting = false,
  submitError = "",
  deleting = false,
  deleteError = "",
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrlOpen, setPhotoUrlOpen] = useState(false);
  const [photoUrlAdding, setPhotoUrlAdding] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSuggesting, setAddressSuggesting] = useState(false);
  const [addressSuggestError, setAddressSuggestError] = useState("");
  const [addressSuggestHasSearched, setAddressSuggestHasSearched] =
    useState(false);
  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const [compEditorOpen, setCompEditorOpen] = useState(false);
  const [compDraft, setCompDraft] = useState(() => createEmptyCompForm());
  const [compError, setCompError] = useState("");
  const [compAddressSuggestions, setCompAddressSuggestions] = useState([]);
  const [compAddressSuggesting, setCompAddressSuggesting] = useState(false);
  const [compAddressSuggestError, setCompAddressSuggestError] = useState("");
  const [compAddressSuggestHasSearched, setCompAddressSuggestHasSearched] =
    useState(false);
  const [compAddressSuggestOpen, setCompAddressSuggestOpen] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [ownerSearchResults, setOwnerSearchResults] = useState([]);
  const [ownerSearchOpen, setOwnerSearchOpen] = useState(false);
  const [ownerSearchError, setOwnerSearchError] = useState("");
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwnerCandidate, setSelectedOwnerCandidate] = useState(null);
  const [assignedOwner, setAssignedOwner] = useState(null);
  const photoInputRef = useRef(null);
  const photoUrlInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const compAddressInputRef = useRef(null);
  const photoWheelRafRef = useRef(null);
  const photoWheelTargetRef = useRef(0);
  const addressBlurTimeoutRef = useRef(null);
  const addressLookupRequestSeqRef = useRef(0);
  const suppressAddressLookupRef = useRef(false);
  const compAddressBlurTimeoutRef = useRef(null);
  const compAddressLookupRequestSeqRef = useRef(0);
  const suppressCompAddressLookupRef = useRef(false);
  const ownerBlurTimeoutRef = useRef(null);
  const ownerLookupRequestSeqRef = useRef(0);
  const isOwnerAssigned = String(form.sellerId ?? "").trim().length > 0;

  useEffect(() => {
    if (!open) setShowDeleteConfirm(false);
    if (!open) setPhotoUploadError("");
    if (!open) setPhotoUrlOpen(false);
    if (!open) setPhotoUrlAdding(false);
    if (!open) setPhotoUrlInput("");
    if (!open) {
      setAddressSuggestions([]);
      setAddressSuggesting(false);
      setAddressSuggestError("");
      setAddressSuggestHasSearched(false);
      setAddressSuggestOpen(false);
      suppressAddressLookupRef.current = false;
      addressLookupRequestSeqRef.current += 1;
      setCompEditorOpen(false);
      setCompDraft(createEmptyCompForm());
      setCompError("");
      setCompAddressSuggestions([]);
      setCompAddressSuggesting(false);
      setCompAddressSuggestError("");
      setCompAddressSuggestHasSearched(false);
      setCompAddressSuggestOpen(false);
      suppressCompAddressLookupRef.current = false;
      compAddressLookupRequestSeqRef.current += 1;
      if (addressBlurTimeoutRef.current) {
        clearTimeout(addressBlurTimeoutRef.current);
        addressBlurTimeoutRef.current = null;
      }
      if (compAddressBlurTimeoutRef.current) {
        clearTimeout(compAddressBlurTimeoutRef.current);
        compAddressBlurTimeoutRef.current = null;
      }
      setOwnerSearchQuery("");
      setOwnerSearchResults([]);
      setOwnerSearchOpen(false);
      setOwnerSearchError("");
      setOwnerSearching(false);
      setSelectedOwnerCandidate(null);
      setAssignedOwner(null);
      ownerLookupRequestSeqRef.current += 1;
      if (ownerBlurTimeoutRef.current) {
        clearTimeout(ownerBlurTimeoutRef.current);
        ownerBlurTimeoutRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (mode !== "edit") setShowDeleteConfirm(false);
  }, [mode]);

  useEffect(() => {
    if (!photoUrlOpen) return;
    photoUrlInputRef.current?.focus();
  }, [photoUrlOpen]);

  // hydrate for edit mode (later)
  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      setForm(DEFAULT_FORM);
      return;
    }

    const normalizedState = String(initialValue.state ?? "").toUpperCase();
    const normalizedPhotos = normalizePhotos(
      [...(initialValue.photos ?? [])].sort(
        (a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
      ),
      { existing: true },
    );
    const normalizedSaleComps = normalizeSaleComps(initialValue.saleComps);

    setForm({
      status: initialValue.status ?? "DRAFT",
      title: initialValue.title ?? "",
      street1: initialValue.street1 ?? "",
      street2: initialValue.street2 ?? "",
      city: initialValue.city ?? "",
      state: US_STATE_VALUES.has(normalizedState) ? normalizedState : "",
      zip: initialValue.zip ?? "",
      askingPrice: formatPriceInput(numOrEmpty(initialValue.askingPrice)),
      arv: formatPriceInput(numOrEmpty(initialValue.arv)),
      estRepairs: (formatPriceInput(numOrEmpty(initialValue.estRepairs))),
      fmr: formatPriceInput(numOrEmpty(initialValue.fmr)),
      beds: numOrEmpty(initialValue.beds),
      baths: numOrEmpty(initialValue.baths),
      livingAreaSqft: numOrEmpty(initialValue.livingAreaSqft),
      yearBuilt: numOrEmpty(initialValue.yearBuilt),
      roofAge: numOrEmpty(initialValue.roofAge),
      hvac: numOrEmpty(initialValue.hvac),
      sellerId: numOrEmpty(initialValue.sellerId),
      occupancyStatus: initialValue.occupancyStatus ?? "",
      exitStrategy: initialValue.exitStrategy ?? "",
      closingTerms: initialValue.closingTerms ?? "",
      photos: normalizedPhotos,
      saleComps: normalizedSaleComps,
    });
    setOwnerSearchQuery(
      sellerDisplayLabelFromProperty(initialValue) ||
        (initialValue.sellerId ? `Seller #${initialValue.sellerId}` : ""),
    );
    setAssignedOwner(initialValue.sellerId ? {
      id: initialValue.sellerId,
      displayName:
        sellerDisplayLabelFromProperty(initialValue) ||
        `Seller #${initialValue.sellerId}`,
      email: initialValue.sellerEmail || "",
      companyName: initialValue.sellerCompanyName || "",
    } : null);
    setSelectedOwnerCandidate(null);
    setOwnerSearchResults([]);
    setOwnerSearchOpen(false);
    setOwnerSearchError("");
  }, [open, initialValue]);

  // esc + scroll lock
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    const releaseBodyLock = acquireModalBodyLock();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      releaseBodyLock();
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (photoWheelRafRef.current) {
        cancelAnimationFrame(photoWheelRafRef.current);
        photoWheelRafRef.current = null;
      }
      if (addressBlurTimeoutRef.current) {
        clearTimeout(addressBlurTimeoutRef.current);
        addressBlurTimeoutRef.current = null;
      }
      if (compAddressBlurTimeoutRef.current) {
        clearTimeout(compAddressBlurTimeoutRef.current);
        compAddressBlurTimeoutRef.current = null;
      }
      if (ownerBlurTimeoutRef.current) {
        clearTimeout(ownerBlurTimeoutRef.current);
        ownerBlurTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (open) return;

    if (photoWheelRafRef.current) {
      cancelAnimationFrame(photoWheelRafRef.current);
      photoWheelRafRef.current = null;
    }
    photoWheelTargetRef.current = 0;
  }, [open]);

  useEffect(() => {
    if (!open || isOwnerAssigned || !ownerSearchOpen) return undefined;

    const requestSeq = ownerLookupRequestSeqRef.current + 1;
    ownerLookupRequestSeqRef.current = requestSeq;
    const timer = setTimeout(async () => {
      setOwnerSearching(true);
      setOwnerSearchError("");
      try {
        const query = String(ownerSearchQuery ?? "").trim();
        const data = await searchAdminSellers(
          query ? { q: query } : {},
          { page: 0, size: 8, sort: "createdAt,desc" },
        );
        if (ownerLookupRequestSeqRef.current !== requestSeq) return;
        const results = data?.content ?? [];
        setOwnerSearchResults(results);
        if (results.length === 0 && query) {
          setOwnerSearchError("No sellers matched that query.");
        }
      } catch (error) {
        if (ownerLookupRequestSeqRef.current !== requestSeq) return;
        setOwnerSearchResults([]);
        setOwnerSearchError(error?.message || "Failed to search sellers.");
      } finally {
        if (ownerLookupRequestSeqRef.current === requestSeq) {
          setOwnerSearching(false);
        }
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [open, isOwnerAssigned, ownerSearchOpen, ownerSearchQuery]);

  useEffect(() => {
    if (!open || !isOwnerAssigned || assignedOwner?.email || assignedOwner?.companyName) return undefined;
    const sellerId = Number(form.sellerId);
    if (!Number.isFinite(sellerId)) return undefined;
    let cancelled = false;

    async function hydrateAssignedOwner() {
      try {
        const seller = await getSellerById(sellerId);
        if (cancelled) return;
        setAssignedOwner({
          id: sellerId,
          displayName: sellerDisplayName(seller),
          email: seller?.email || "",
          companyName: seller?.companyName || "",
        });
      } catch {
        // keep fallback label from initial value if fetch fails
      }
    }
    hydrateAssignedOwner();
    return () => {
      cancelled = true;
    };
  }, [open, isOwnerAssigned, assignedOwner?.email, assignedOwner?.companyName, form.sellerId]);

  const titleText = useMemo(
    () => (isEdit ? "Edit Property" : "Add Property"),
    [isEdit],
  );

  const activeMissingRequiredFields = useMemo(() => {
    const missing = [];
    const requiredTextFields = [
      ["street1", "Street Address"],
      ["city", "City"],
      ["state", "State"],
      ["zip", "ZIP / postcode"],
      ["occupancyStatus", "Occupancy Status"],
      ["exitStrategy", "Exit Strategy"],
      ["closingTerms", "Closing Terms"],
    ];

    requiredTextFields.forEach(([key, label]) => {
      if (!String(form[key] ?? "").trim()) {
        missing.push(label);
      }
    });

    const requiredNumericFields = [
      ["askingPrice", "Asking Price"],
      ["arv", "ARV"],
      ["estRepairs", "Estimated Repairs"],
      ["beds", "Beds"],
      ["baths", "Baths"],
      ["livingAreaSqft", "Living Area (sqft)"],
      ["yearBuilt", "Year Built"],
    ];

    requiredNumericFields.forEach(([key, label]) => {
      if (form[key] === "" || form[key] === null || form[key] === undefined) {
        missing.push(label);
      }
    });

    if (normalizePhotos(form.photos).length === 0) {
      missing.push("At least 1 Photo");
    }

    return missing;
  }, [form]);

  const missingAddressFields = useMemo(() => {
    const missing = [];
    const requiredAddressFields = [
      ["street1", "Street Address"],
      ["city", "City"],
      ["state", "State"],
      ["zip", "ZIP / postcode"],
    ];

    requiredAddressFields.forEach(([key, label]) => {
      if (!String(form[key] ?? "").trim()) {
        missing.push(label);
      }
    });

    return missing;
  }, [form]);

  const activeMissingRequiredFieldsForMessage = useMemo(
    () =>
      activeMissingRequiredFields.filter(
        (field) => !REQUIRED_ADDRESS_FIELD_LABELS.has(field),
      ),
    [activeMissingRequiredFields],
  );

  const isActiveWithMissingRequired =
    form.status === "ACTIVE" && activeMissingRequiredFieldsForMessage.length > 0;
  const hasMissingAddressFields = missingAddressFields.length > 0;

  const isSubmitDisabled =
    !form.title.trim() ||
    hasMissingAddressFields ||
    submitting ||
    deleting ||
    photoUploading ||
    photoUrlAdding ||
    isActiveWithMissingRequired;

  const shouldShowAddressSuggestions =
    addressSuggestOpen &&
    String(form.street1 ?? "").trim().length >= ADDRESS_SUGGESTION_MIN_CHARS &&
    (addressSuggesting ||
      addressSuggestions.length > 0 ||
      addressSuggestError ||
      addressSuggestHasSearched);
  const shouldShowCompAddressSuggestions =
    compAddressSuggestOpen &&
    String(compDraft.address ?? "").trim().length >=
      ADDRESS_SUGGESTION_MIN_CHARS &&
    (compAddressSuggesting ||
      compAddressSuggestions.length > 0 ||
      compAddressSuggestError ||
      compAddressSuggestHasSearched);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setPriceField(key, value) {
    setForm((p) => ({ ...p, [key]: formatPriceInput(value) }));
  }

  function setCompField(key, value) {
    setCompDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setCompPriceField(key, value) {
    setCompDraft((prev) => ({ ...prev, [key]: formatPriceInput(value) }));
  }

  function clearOwnerBlurTimer() {
    if (ownerBlurTimeoutRef.current) {
      clearTimeout(ownerBlurTimeoutRef.current);
      ownerBlurTimeoutRef.current = null;
    }
  }

  function handleOwnerInputFocus() {
    clearOwnerBlurTimer();
    setOwnerSearchOpen(true);
  }

  function handleOwnerInputBlur() {
    clearOwnerBlurTimer();
    ownerBlurTimeoutRef.current = setTimeout(() => {
      setOwnerSearchOpen(false);
      ownerBlurTimeoutRef.current = null;
    }, 120);
  }

  function handleOwnerInputChange(nextValue) {
    setOwnerSearchQuery(nextValue);
    setSelectedOwnerCandidate(null);
    setOwnerSearchError("");
    setOwnerSearchOpen(true);
  }

  function pickOwnerCandidate(seller) {
    clearOwnerBlurTimer();
    setSelectedOwnerCandidate(seller);
    setOwnerSearchQuery(sellerDisplayName(seller));
    setOwnerSearchOpen(false);
    setOwnerSearchError("");
  }

  function applySelectedOwner() {
    if (!selectedOwnerCandidate?.id) return;
    setField("sellerId", String(selectedOwnerCandidate.id));
    setAssignedOwner({
      id: selectedOwnerCandidate.id,
      displayName: sellerDisplayName(selectedOwnerCandidate),
      email: selectedOwnerCandidate.email || "",
      companyName: selectedOwnerCandidate.companyName || "",
    });
    setSelectedOwnerCandidate(null);
    setOwnerSearchResults([]);
    setOwnerSearchOpen(false);
    setOwnerSearchError("");
  }

  function clearOwnerAssignment() {
    setField("sellerId", "");
    setAssignedOwner(null);
    setSelectedOwnerCandidate(null);
    setOwnerSearchQuery("");
    setOwnerSearchResults([]);
    setOwnerSearchOpen(false);
    setOwnerSearchError("");
  }

  function clearCompEditorAddressState() {
    setCompAddressSuggestions([]);
    setCompAddressSuggesting(false);
    setCompAddressSuggestError("");
    setCompAddressSuggestHasSearched(false);
    setCompAddressSuggestOpen(false);
    suppressCompAddressLookupRef.current = false;
    compAddressLookupRequestSeqRef.current += 1;
    if (compAddressBlurTimeoutRef.current) {
      clearTimeout(compAddressBlurTimeoutRef.current);
      compAddressBlurTimeoutRef.current = null;
    }
  }

  function resetCompEditor() {
    setCompDraft(createEmptyCompForm());
    setCompError("");
    clearCompEditorAddressState();
  }

  function clearAddressBlurTimer() {
    if (addressBlurTimeoutRef.current) {
      clearTimeout(addressBlurTimeoutRef.current);
      addressBlurTimeoutRef.current = null;
    }
  }

  function handleStreetAddressFocus() {
    clearAddressBlurTimer();
    if (
      String(form.street1 ?? "").trim().length >= ADDRESS_SUGGESTION_MIN_CHARS
    ) {
      setAddressSuggestOpen(true);
    }
  }

  function handleStreetAddressBlur() {
    clearAddressBlurTimer();
    addressBlurTimeoutRef.current = setTimeout(() => {
      setAddressSuggestOpen(false);
      addressBlurTimeoutRef.current = null;
    }, 120);
  }

  function handleStreetAddressChange(nextValue) {
    setField("street1", nextValue);

    if (String(nextValue ?? "").trim().length < ADDRESS_SUGGESTION_MIN_CHARS) {
      setAddressSuggestions([]);
      setAddressSuggesting(false);
      setAddressSuggestError("");
      setAddressSuggestHasSearched(false);
      setAddressSuggestOpen(false);
      addressLookupRequestSeqRef.current += 1;
      return;
    }

    setAddressSuggestError("");
    setAddressSuggestHasSearched(false);
    setAddressSuggestOpen(true);
  }

  function applyAddressSuggestion(suggestion) {
    suppressAddressLookupRef.current = true;
    clearAddressBlurTimer();
    setAddressSuggestOpen(false);
    setAddressSuggestError("");
    setAddressSuggestions([]);
    setAddressSuggestHasSearched(false);

    const nextStreet1 = String(suggestion.street1 ?? "").trim();
    const nextCity = String(suggestion.city ?? "").trim();
    const nextZip = String(suggestion.zip ?? "").trim();
    const nextState = normalizeStateCode(suggestion.state);

    setForm((prev) => ({
      ...prev,
      street1: nextStreet1 || prev.street1,
      city: nextCity || prev.city,
      state: US_STATE_VALUES.has(nextState) ? nextState : prev.state,
      zip: nextZip || prev.zip,
    }));

    addressInputRef.current?.focus();
  }

  function clearCompAddressBlurTimer() {
    if (compAddressBlurTimeoutRef.current) {
      clearTimeout(compAddressBlurTimeoutRef.current);
      compAddressBlurTimeoutRef.current = null;
    }
  }

  function handleCompAddressFocus() {
    clearCompAddressBlurTimer();
    if (
      String(compDraft.address ?? "").trim().length >=
      ADDRESS_SUGGESTION_MIN_CHARS
    ) {
      setCompAddressSuggestOpen(true);
    }
  }

  function handleCompAddressBlur() {
    clearCompAddressBlurTimer();
    compAddressBlurTimeoutRef.current = setTimeout(() => {
      setCompAddressSuggestOpen(false);
      compAddressBlurTimeoutRef.current = null;
    }, 120);
  }

  function handleCompAddressChange(nextValue) {
    setCompField("address", nextValue);

    if (String(nextValue ?? "").trim().length < ADDRESS_SUGGESTION_MIN_CHARS) {
      clearCompEditorAddressState();
      return;
    }

    setCompAddressSuggestError("");
    setCompAddressSuggestHasSearched(false);
    setCompAddressSuggestOpen(true);
  }

  function applyCompAddressSuggestion(suggestion) {
    suppressCompAddressLookupRef.current = true;
    clearCompAddressBlurTimer();
    setCompAddressSuggestOpen(false);
    setCompAddressSuggestError("");
    setCompAddressSuggestions([]);
    setCompAddressSuggestHasSearched(false);

    const selectedAddress = buildSuggestionAddressLine(suggestion);
    setCompDraft((prev) => ({
      ...prev,
      address: selectedAddress || prev.address,
    }));

    compAddressInputRef.current?.focus();
  }

  function toggleCompEditor() {
    if (compEditorOpen) {
      setCompEditorOpen(false);
      resetCompEditor();
      return;
    }

    setCompEditorOpen(true);
    setCompError("");
  }

  function cancelCompEditor() {
    setCompEditorOpen(false);
    resetCompEditor();
  }

  function addSaleComp() {
    const address = String(compDraft.address ?? "").trim();
    if (!address) {
      setCompError("Comp address is required.");
      return;
    }

    setCompError("");
    setForm((prev) => {
      const existingComps = Array.isArray(prev.saleComps) ? prev.saleComps : [];
      return {
        ...prev,
        saleComps: [
          ...existingComps,
          {
            address,
            soldDate: String(compDraft.soldDate ?? "").trim(),
            soldPrice: formatPriceInput(compDraft.soldPrice),
            beds: String(compDraft.beds ?? "").trim(),
            baths: String(compDraft.baths ?? "").trim(),
            livingAreaSqft: String(compDraft.livingAreaSqft ?? "").trim(),
            distanceMiles: String(compDraft.distanceMiles ?? "").trim(),
            notes: String(compDraft.notes ?? "").trim(),
            sortOrder: existingComps.length,
          },
        ],
      };
    });

    setCompEditorOpen(false);
    resetCompEditor();
  }

  function removeSaleComp(index) {
    setForm((prev) => ({
      ...prev,
      saleComps: (prev.saleComps ?? [])
        .filter((_, compIdx) => compIdx !== index)
        .map((comp, compIdx) => ({
          ...comp,
          sortOrder: compIdx,
        })),
    }));
  }

  function removePhoto(index) {
    const targetPhoto = form.photos?.[index];
    if (
      targetPhoto &&
      !targetPhoto.isExisting &&
      targetPhoto.uploadId &&
      onDeleteUploadedPhoto
    ) {
      onDeleteUploadedPhoto(targetPhoto.uploadId);
    }

    setForm((prev) => {
      const remaining = (prev.photos ?? []).filter((_, i) => i !== index);
      return {
        ...prev,
        photos: remaining.map((photo, i) => ({
          ...photo,
          sortOrder: i,
        })),
      };
    });
  }

  function openPhotoPicker() {
    if (submitting || deleting || photoUploading || photoUrlAdding) return;
    photoInputRef.current?.click();
  }

  function togglePhotoUrlField() {
    if (submitting || deleting || photoUploading || photoUrlAdding) return;
    const nextOpen = !photoUrlOpen;
    setPhotoUrlOpen(nextOpen);
    if (!nextOpen) {
      setPhotoUrlInput("");
    }
  }

  function handlePhotoStripWheel(event) {
    const strip = event.currentTarget;
    const canScrollHorizontally = strip.scrollWidth > strip.clientWidth + 1;
    if (!canScrollHorizontally) return;

    const deltaX = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX;
    const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    const rawDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (Math.abs(rawDelta) < 0.5) return;

    const maxScrollLeft = Math.max(strip.scrollWidth - strip.clientWidth, 0);
    const atLeft = strip.scrollLeft <= 0.5;
    const atRight = strip.scrollLeft >= maxScrollLeft - 0.5;
    const movingLeft = rawDelta < 0;
    const movingRight = rawDelta > 0;

    if ((movingLeft && atLeft) || (movingRight && atRight)) return;

    event.preventDefault();

    if (!photoWheelRafRef.current) {
      photoWheelTargetRef.current = strip.scrollLeft;
    }

    photoWheelTargetRef.current = Math.min(
      Math.max(photoWheelTargetRef.current + rawDelta * 1.2, 0),
      maxScrollLeft,
    );

    if (photoWheelRafRef.current) return;

    const animate = () => {
      const target = photoWheelTargetRef.current;
      const current = strip.scrollLeft;
      const diff = target - current;

      if (Math.abs(diff) <= 0.6) {
        strip.scrollLeft = target;
        photoWheelRafRef.current = null;
        return;
      }

      strip.scrollLeft = current + diff * 0.22;
      photoWheelRafRef.current = requestAnimationFrame(animate);
    };

    photoWheelRafRef.current = requestAnimationFrame(animate);
  }

  async function handlePhotoFileSelection(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    if (!onUploadPhoto) {
      setPhotoUploadError("Photo upload is not configured.");
      return;
    }

    setPhotoUploadError("");
    setPhotoUploading(true);

    try {
      const uploadedPhotos = [];

      for (const file of files) {
        const uploadedPhoto = await onUploadPhoto(file);
        const photoAssetId = String(uploadedPhoto?.photoAssetId ?? "").trim();
        const url = String(uploadedPhoto?.url ?? "").trim();
        const thumbnailUrl = String(
          uploadedPhoto?.thumbnailUrl ?? uploadedPhoto?.url ?? "",
        ).trim();

        if (!photoAssetId || !url) {
          throw new Error("Upload failed to return a valid photo object.");
        }

        uploadedPhotos.push({
          photoAssetId,
          uploadId: String(uploadedPhoto?.uploadId ?? photoAssetId).trim(),
          url,
          thumbnailUrl: thumbnailUrl || url,
          caption: null,
          isExisting: false,
        });
      }

      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos ?? []), ...uploadedPhotos].map((photo, i) => ({
          ...photo,
          sortOrder: i,
        })),
      }));
    } catch (error) {
      setPhotoUploadError(error?.message || "Failed to upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handlePhotoUrlAdd() {
    if (submitting || deleting || photoUploading || photoUrlAdding) return;

    if (!onAddPhotoByUrl) {
      setPhotoUploadError("Photo URL import is not configured.");
      return;
    }

    const url = String(photoUrlInput ?? "").trim();
    if (!url) {
      setPhotoUploadError("Photo URL is required.");
      return;
    }

    setPhotoUploadError("");
    setPhotoUrlAdding(true);

    try {
      const uploadedPhoto = await onAddPhotoByUrl(url);
      const photoAssetId = String(uploadedPhoto?.photoAssetId ?? "").trim();
      const uploadedUrl = String(uploadedPhoto?.url ?? "").trim();
      const thumbnailUrl = String(
        uploadedPhoto?.thumbnailUrl ?? uploadedPhoto?.url ?? "",
      ).trim();

      if (!photoAssetId || !uploadedUrl) {
        throw new Error("Photo URL import failed to return a valid photo.");
      }

      setForm((prev) => ({
        ...prev,
        photos: [
          ...(prev.photos ?? []),
          {
            photoAssetId,
            uploadId: photoAssetId,
            url: uploadedUrl,
            thumbnailUrl: thumbnailUrl || uploadedUrl,
            caption: null,
            isExisting: false,
          },
        ].map((photo, index) => ({
          ...photo,
          sortOrder: index,
        })),
      }));

      setPhotoUrlInput("");
    } catch (error) {
      setPhotoUploadError(error?.message || "Failed to add photo URL.");
    } finally {
      setPhotoUrlAdding(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting || photoUploading || photoUrlAdding) return;
    onSubmit?.(form);
  }

  useEffect(() => {
    if (!open) return;

    if (suppressAddressLookupRef.current) {
      suppressAddressLookupRef.current = false;
      return;
    }

    const query = String(form.street1 ?? "").trim();
    if (query.length < ADDRESS_SUGGESTION_MIN_CHARS) return;

    const requestSeq = addressLookupRequestSeqRef.current + 1;
    addressLookupRequestSeqRef.current = requestSeq;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setAddressSuggesting(true);
      setAddressSuggestError("");

      try {
        const suggestions = await getAddressSuggestions(query, { limit: 6 });
        if (cancelled || requestSeq !== addressLookupRequestSeqRef.current)
          return;

        setAddressSuggestions(normalizeAddressSuggestions(suggestions));
        setAddressSuggestHasSearched(true);
      } catch (error) {
        if (cancelled || requestSeq !== addressLookupRequestSeqRef.current)
          return;
        setAddressSuggestions([]);
        setAddressSuggestHasSearched(true);
        setAddressSuggestError(
          error?.message || "Failed to load address suggestions.",
        );
      } finally {
        if (!cancelled && requestSeq === addressLookupRequestSeqRef.current) {
          setAddressSuggesting(false);
        }
      }
    }, ADDRESS_SUGGESTION_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.street1, open]);

  useEffect(() => {
    if (!open || !compEditorOpen) return;

    if (suppressCompAddressLookupRef.current) {
      suppressCompAddressLookupRef.current = false;
      return;
    }

    const query = String(compDraft.address ?? "").trim();
    if (query.length < ADDRESS_SUGGESTION_MIN_CHARS) return;

    const requestSeq = compAddressLookupRequestSeqRef.current + 1;
    compAddressLookupRequestSeqRef.current = requestSeq;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCompAddressSuggesting(true);
      setCompAddressSuggestError("");

      try {
        const suggestions = await getAddressSuggestions(query, { limit: 6 });
        if (cancelled || requestSeq !== compAddressLookupRequestSeqRef.current)
          return;

        setCompAddressSuggestions(normalizeAddressSuggestions(suggestions));
        setCompAddressSuggestHasSearched(true);
      } catch (error) {
        if (cancelled || requestSeq !== compAddressLookupRequestSeqRef.current)
          return;
        setCompAddressSuggestions([]);
        setCompAddressSuggestHasSearched(true);
        setCompAddressSuggestError(
          error?.message || "Failed to load address suggestions.",
        );
      } finally {
        if (
          !cancelled &&
          requestSeq === compAddressLookupRequestSeqRef.current
        ) {
          setCompAddressSuggesting(false);
        }
      }
    }, ADDRESS_SUGGESTION_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [compDraft.address, compEditorOpen, open]);

  if (!open) return null;

  return (
    <div
      className="propModalOverlay"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="propModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="propModal__header">
          <h2 className="propModal__title">{titleText}</h2>

          <div
            className="propModal__close"
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClose?.();
            }}
          >
            ✕
          </div>
        </div>

        <form className="propModal__body" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="propField">
            <div className="propField__label">Title</div>
            <input
              className="propField__input propField__input--title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="House on the Main Street owned by John Doe"
            />
          </div>

          {/* Address */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Address</div>
            </div>

            <div className="propGrid propGrid--address">
              <div className="propField propField--addressStreet1">
                <div className="propField__label">Street Address</div>
                <div className="propAddressAutocomplete">
                  <input
                    ref={addressInputRef}
                    className="propField__input"
                    value={form.street1}
                    onChange={(e) => handleStreetAddressChange(e.target.value)}
                    onFocus={handleStreetAddressFocus}
                    onBlur={handleStreetAddressBlur}
                    placeholder="123 Main St"
                    autoComplete="off"
                    required
                  />

                  {shouldShowAddressSuggestions ? (
                    <div className="propAddressSuggest" role="listbox">
                      {addressSuggesting ? (
                        <div className="propAddressSuggest__status">
                          Searching addresses...
                        </div>
                      ) : null}

                      {!addressSuggesting && addressSuggestError ? (
                        <div className="propAddressSuggest__status propAddressSuggest__status--error">
                          {addressSuggestError}
                        </div>
                      ) : null}

                      {!addressSuggesting &&
                      !addressSuggestError &&
                      addressSuggestions.length === 0 &&
                      addressSuggestHasSearched ? (
                        <div className="propAddressSuggest__status">
                          No suggestions found.
                        </div>
                      ) : null}

                      {!addressSuggesting && !addressSuggestError
                        ? addressSuggestions.map((suggestion) => {
                            const title =
                              suggestion.street1 ||
                              suggestion.display ||
                              "Suggested address";
                            const meta =
                              formatAddressSuggestionMeta(suggestion) ||
                              suggestion.display;

                            return (
                              <button
                                key={suggestion.key}
                                type="button"
                                className="propAddressSuggest__item"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applyAddressSuggestion(suggestion);
                                }}
                              >
                                <span className="propAddressSuggest__title">
                                  {title}
                                </span>
                                {meta ? (
                                  <span className="propAddressSuggest__meta">
                                    {meta}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })
                        : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="propField propField--addressStreet2">
                <div className="propField__label">
                  Apt, suite, etc (optional)
                </div>
                <input
                  className="propField__input"
                  value={form.street2}
                  onChange={(e) => setField("street2", e.target.value)}
                />
              </div>

              <div className="propField propField--addressCity">
                <div className="propField__label">City</div>
                <input
                  className="propField__input"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Saint Louis"
                  required
                />
              </div>

              <div className="propField propField--addressState">
                <div className="propField__label">State</div>
                <select
                  className="propField__input"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  required
                >
                  {US_STATE_OPTIONS.map((option) => (
                    <option key={option.value || "empty"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="propField propField--addressZip">
                <div className="propField__label">ZIP / postcode</div>
                <input
                  className="propField__input"
                  value={form.zip}
                  onChange={(e) => setField("zip", e.target.value)}
                  placeholder="63128"
                  required
                />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Price Details</div>
            </div>

            <div className="propGrid propGrid--price">
              <div className="propField">
                <div className="propField__label">Asking Price</div>
                <div className="propField__moneyWrap">
                  <span className="propField__moneyPrefix">$</span>
                  <input
                    className="propField__input propField__input--money"
                    value={form.askingPrice}
                    onChange={(e) =>
                      setPriceField("askingPrice", e.target.value)
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="propField">
                <div className="propField__label">ARV</div>
                <div className="propField__moneyWrap">
                  <span className="propField__moneyPrefix">$</span>
                  <input
                    className="propField__input propField__input--money"
                    value={form.arv}
                    onChange={(e) => setPriceField("arv", e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="propField">
                <div className="propField__label">Estimated Repairs</div>
                <div className="propField__moneyWrap">
                  <span className="propField__moneyPrefix">$</span>
                  <input
                    className="propField__input propField__input--money"
                    value={form.estRepairs}
                    onChange={(e) =>
                      setPriceField("estRepairs", e.target.value)
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="propField">
                <div className="propField__label">FMR (Monthly)</div>
                <div className="propField__moneyWrap">
                  <span className="propField__moneyPrefix">$</span>
                  <input
                    className="propField__input propField__input--money"
                    value={form.fmr}
                    readOnly
                    placeholder="Auto after save"
                  />
                </div>
                <div className="propField__help">Auto from ZIP + beds</div>
              </div>
            </div>
          </div>

          {/* Property info */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Property Information</div>
            </div>

            <div className="propGrid propGrid--3">
              <div className="propField">
                <div className="propField__label">Beds</div>
                <input
                  className="propField__input"
                  value={form.beds}
                  onChange={(e) => setField("beds", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Baths</div>
                <input
                  className="propField__input"
                  value={form.baths}
                  onChange={(e) => setField("baths", e.target.value)}
                  inputMode="decimal"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Living Area (sqft)</div>
                <input
                  className="propField__input"
                  value={form.livingAreaSqft}
                  onChange={(e) => setField("livingAreaSqft", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Year Built</div>
                <input
                  className="propField__input"
                  value={form.yearBuilt}
                  onChange={(e) => setField("yearBuilt", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Roof Age</div>
                <input
                  className="propField__input"
                  value={form.roofAge}
                  onChange={(e) => setField("roofAge", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">HVAC</div>
                <input
                  className="propField__input"
                  value={form.hvac}
                  onChange={(e) => setField("hvac", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Occupancy Status</div>
                <select
                  className="propField__input"
                  value={form.occupancyStatus}
                  onChange={(e) => setField("occupancyStatus", e.target.value)}
                >
                  {OCCUPANCY.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="propField">
                <div className="propField__label">Exit Strategy</div>
                <select
                  className="propField__input"
                  value={form.exitStrategy}
                  onChange={(e) => setField("exitStrategy", e.target.value)}
                >
                  {EXIT.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
            </div>

              <div className="propField">
                <div className="propField__label">Closing Terms</div>
                <select
                  className="propField__input"
                  value={form.closingTerms}
                  onChange={(e) => setField("closingTerms", e.target.value)}
                >
                  {CLOSING_TERMS.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="propSection">
            <div className="propSection__head propSection__head--row">
              <div className="propSection__title">Photos</div>
              <div className="propSection__headActions">
                <button
                  type="button"
                  className="propLinkBtn"
                  onClick={togglePhotoUrlField}
                  disabled={submitting || deleting || photoUploading || photoUrlAdding}
                >
                  {photoUrlOpen ? "Hide URL" : "Add by URL"}
                </button>
                <button
                  type="button"
                  className="propLinkBtn"
                  onClick={openPhotoPicker}
                  disabled={submitting || deleting || photoUploading || photoUrlAdding}
                >
                  {photoUploading ? "Uploading..." : "Upload Photo +"}
                </button>
              </div>
            </div>
            <input
              ref={photoInputRef}
              className="propFileInput"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoFileSelection}
            />

            {photoUrlOpen ? (
              <div className="propPhotoUrlRow">
                <input
                  ref={photoUrlInputRef}
                  className="propField__input propPhotoUrlInput"
                  type="url"
                  value={photoUrlInput}
                  onChange={(event) => setPhotoUrlInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handlePhotoUrlAdd();
                    }
                  }}
                  placeholder="https://example.com/photo.jpg"
                  inputMode="url"
                  autoComplete="off"
                  disabled={submitting || deleting || photoUploading || photoUrlAdding}
                />
                <button
                  type="button"
                  className="propPhotoUrlBtn"
                  onClick={handlePhotoUrlAdd}
                  disabled={submitting || deleting || photoUploading || photoUrlAdding}
                >
                  {photoUrlAdding ? "Adding..." : "Add URL"}
                </button>
              </div>
            ) : null}

            {form.photos.length === 0 ? (
              <div className="propPhotos__empty">
                No photos yet. Upload at least one photo before activating the property.
              </div>
            ) : (
              <>
                <div
                  className="propPhotos"
                  onWheel={handlePhotoStripWheel}
                >
                  {form.photos.map((photo, index) => (
                    <div key={`photo-${photo.photoAssetId || index}`} className="propPhotoCard">
                      <img
                        className="propPhotoCard__image"
                        src={photo.thumbnailUrl || photo.url}
                        alt={`Property photo ${index + 1}`}
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="propPhotoCard__remove"
                        onClick={() => removePhoto(index)}
                        disabled={photoUploading || photoUrlAdding || submitting || deleting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sale Comps */}
          <div className="propSection">
            <div className="propSection__head propSection__head--row">
              <div className="propSection__title">Sale Comps</div>
              <button
                type="button"
                className="propLinkBtn"
                disabled={submitting || deleting || photoUploading}
                onClick={toggleCompEditor}
              >
                {compEditorOpen ? "Close" : "Add Comp +"}
              </button>
            </div>

            {compEditorOpen ? (
              <div className="propCompEditor">
                <div className="propCompGrid propCompGrid--top">
                  <div className="propField propCompField--address">
                    <div className="propField__label">Comp Address</div>
                    <div className="propAddressAutocomplete">
                      <input
                        ref={compAddressInputRef}
                        className="propField__input"
                        value={compDraft.address}
                        onChange={(event) =>
                          handleCompAddressChange(event.target.value)
                        }
                        onFocus={handleCompAddressFocus}
                        onBlur={handleCompAddressBlur}
                        placeholder="123 Main St, City, ST ZIP"
                        autoComplete="off"
                      />

                      {shouldShowCompAddressSuggestions ? (
                        <div className="propAddressSuggest" role="listbox">
                          {compAddressSuggesting ? (
                            <div className="propAddressSuggest__status">
                              Searching addresses...
                            </div>
                          ) : null}

                          {!compAddressSuggesting && compAddressSuggestError ? (
                            <div className="propAddressSuggest__status propAddressSuggest__status--error">
                              {compAddressSuggestError}
                            </div>
                          ) : null}

                          {!compAddressSuggesting &&
                          !compAddressSuggestError &&
                          compAddressSuggestions.length === 0 &&
                          compAddressSuggestHasSearched ? (
                            <div className="propAddressSuggest__status">
                              No suggestions found.
                            </div>
                          ) : null}

                          {!compAddressSuggesting && !compAddressSuggestError
                            ? compAddressSuggestions.map((suggestion) => {
                                const title =
                                  suggestion.street1 ||
                                  suggestion.display ||
                                  "Suggested address";
                                const meta =
                                  formatAddressSuggestionMeta(suggestion) ||
                                  suggestion.display;

                                return (
                                  <button
                                    key={`comp-${suggestion.key}`}
                                    type="button"
                                    className="propAddressSuggest__item"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      applyCompAddressSuggestion(suggestion);
                                    }}
                                  >
                                    <span className="propAddressSuggest__title">
                                      {title}
                                    </span>
                                    {meta ? (
                                      <span className="propAddressSuggest__meta">
                                        {meta}
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })
                            : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="propField">
                    <div className="propField__label">Sold Date</div>
                    <input
                      className="propField__input"
                      type="date"
                      value={compDraft.soldDate}
                      onChange={(event) =>
                        setCompField("soldDate", event.target.value)
                      }
                    />
                  </div>

                  <div className="propField">
                    <div className="propField__label">Sold Price</div>
                    <div className="propField__moneyWrap">
                      <span className="propField__moneyPrefix">$</span>
                      <input
                        className="propField__input propField__input--money"
                        value={compDraft.soldPrice}
                        onChange={(event) =>
                          setCompPriceField("soldPrice", event.target.value)
                        }
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="propField">
                    <div className="propField__label">Distance (mi)</div>
                    <input
                      className="propField__input"
                      value={compDraft.distanceMiles}
                      onChange={(event) =>
                        setCompField("distanceMiles", event.target.value)
                      }
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="propCompGrid propCompGrid--bottom">
                  <div className="propField">
                    <div className="propField__label">Beds</div>
                    <input
                      className="propField__input"
                      value={compDraft.beds}
                      onChange={(event) =>
                        setCompField("beds", event.target.value)
                      }
                      inputMode="numeric"
                    />
                  </div>

                  <div className="propField">
                    <div className="propField__label">Baths</div>
                    <input
                      className="propField__input"
                      value={compDraft.baths}
                      onChange={(event) =>
                        setCompField("baths", event.target.value)
                      }
                      inputMode="decimal"
                    />
                  </div>

                  <div className="propField">
                    <div className="propField__label">Sq Ft</div>
                    <input
                      className="propField__input"
                      value={compDraft.livingAreaSqft}
                      onChange={(event) =>
                        setCompField("livingAreaSqft", event.target.value)
                      }
                      inputMode="numeric"
                    />
                  </div>

                  <div className="propField propCompField--notes">
                    <div className="propField__label">Notes (optional)</div>
                    <input
                      className="propField__input"
                      value={compDraft.notes}
                      onChange={(event) =>
                        setCompField("notes", event.target.value)
                      }
                    />
                  </div>
                </div>

                {compError ? (
                  <div className="propCompEditor__error">{compError}</div>
                ) : null}

                <div className="propCompActions">
                  <button
                    type="button"
                    className="propBtn"
                    onClick={cancelCompEditor}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="propBtn propBtn--primary"
                    onClick={addSaleComp}
                  >
                    Add Comp
                  </button>
                </div>
              </div>
            ) : null}

            <div className="propCompsTableWrap">
              <table className="propCompsTable">
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Sold Date</th>
                    <th className="tRight">Price</th>
                    <th className="tRight">Price/ft²</th>
                    <th className="tRight">Distance</th>
                    <th className="tRight">Bed</th>
                    <th className="tRight">Bath</th>
                    <th className="tRight">Sq Ft</th>
                    <th className="tIcon"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.saleComps ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="propCompsEmpty">
                        No comps added yet.
                      </td>
                    </tr>
                  ) : (
                    (form.saleComps ?? []).map((comp, idx) => (
                      <tr key={`comp-row-${comp.id ?? idx}`}>
                        <td className="propCompsTable__address">
                          {String(comp.address ?? "").trim() || "—"}
                        </td>
                        <td className="tNowrap">{formatCompDate(comp.soldDate)}</td>
                        <td className="tRight tNowrap">
                          {formatCompMoney(comp.soldPrice)}
                        </td>
                        <td className="tRight tNowrap">
                          {formatCompPricePerSqft(comp)}
                        </td>
                        <td className="tRight tNowrap">
                          {formatCompDistance(comp.distanceMiles)}
                        </td>
                        <td className="tRight tNowrap">
                          {formatCompBeds(comp.beds)}
                        </td>
                        <td className="tRight tNowrap">
                          {formatCompBaths(comp.baths)}
                        </td>
                        <td className="tRight tNowrap">
                          {formatCompSqft(comp.livingAreaSqft)}
                        </td>
                        <td className="tIcon">
                          <button
                            type="button"
                            className="propCompsTable__removeBtn"
                            onClick={() => removeSaleComp(idx)}
                            aria-label={`Remove comp ${idx + 1}`}
                            disabled={submitting || deleting || photoUploading}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seller Owner */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Seller Owner</div>
            </div>

            {!isOwnerAssigned ? (
              <div className="propOwnerSection">
                <div className="propOwnerRow">
                  <div className="propOwnerAutocomplete">
                    <input
                      className="propField__input propOwnerInput"
                      value={ownerSearchQuery}
                      onChange={(event) => handleOwnerInputChange(event.target.value)}
                      onFocus={handleOwnerInputFocus}
                      onBlur={handleOwnerInputBlur}
                      placeholder="Search seller by name or email"
                      name="seller_owner_lookup"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={submitting || deleting}
                    />

                    {ownerSearchOpen ? (
                      <div className="propAddressSuggest" role="listbox">
                        {ownerSearching ? (
                          <div className="propAddressSuggest__status">
                            Searching sellers...
                          </div>
                        ) : null}

                        {!ownerSearching && ownerSearchError ? (
                          <div className="propAddressSuggest__status propAddressSuggest__status--error">
                            {ownerSearchError}
                          </div>
                        ) : null}

                        {!ownerSearching &&
                        !ownerSearchError &&
                        ownerSearchResults.length === 0 ? (
                          <div className="propAddressSuggest__status">
                            No sellers found.
                          </div>
                        ) : null}

                        {!ownerSearching && !ownerSearchError
                          ? ownerSearchResults.map((seller) => (
                              <button
                                key={`owner-option-${seller.id}`}
                                type="button"
                                className="propAddressSuggest__item"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  pickOwnerCandidate(seller);
                                }}
                              >
                                <span className="propAddressSuggest__title">
                                  {sellerDisplayName(seller)}
                                </span>
                                <span className="propAddressSuggest__meta">
                                  {[seller.email, seller.companyName]
                                    .filter(Boolean)
                                    .join(" • ") || "—"}
                                </span>
                              </button>
                            ))
                          : null}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="propBtn propBtn--primary propOwnerActionBtn"
                    onClick={applySelectedOwner}
                    disabled={submitting || deleting || !selectedOwnerCandidate}
                  >
                    Assign
                  </button>
                </div>
              </div>
            ) : (
              <div className="propOwnerAssigned">
                <div className="propField__input propOwnerDisplayField">
                  <span>{assignedOwner?.displayName || `Seller #${form.sellerId}`}</span>
                  <span>{assignedOwner?.email || "—"}</span>
                  <span>{assignedOwner?.companyName || "—"}</span>
                </div>
                <button
                  type="button"
                  className="propBtn propOwnerActionBtn"
                  onClick={clearOwnerAssignment}
                  disabled={submitting || deleting}
                >
                  Unassign
                </button>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Status</div>
            </div>

            <div className="propStatus">
              {STATUS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`propStatus__btn ${form.status === s.value ? "propStatus__btn--active" : ""}`}
                  onClick={() => setField("status", s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* errors */}
          {hasMissingAddressFields ? (
            <div className="propModal__error">
              Address fields are required. Missing: {missingAddressFields.join(", ")}
            </div>
          ) : null}
          {isActiveWithMissingRequired ? (
            <div className="propModal__error">
              Active properties require all required fields. Missing: {activeMissingRequiredFieldsForMessage.join(", ")}
            </div>
          ) : null}
          {submitError ? (
            <div className="propModal__error">{submitError}</div>
          ) : null}
          {photoUploadError ? (
            <div className="propModal__error">{photoUploadError}</div>
          ) : null}
          {deleteError ? (
            <div className="propModal__error">{deleteError}</div>
          ) : null}

          {/* Actions */}
          <div className="propActions">
            {mode === "edit" ? (
              showDeleteConfirm ? (
                <div className="propDeleteConfirm">
                  <div className="propDeleteConfirm__text">
                    Delete this property?{" "}
                    <span className="propDeleteConfirm__sub">
                      (This cannot be undone)
                    </span>
                  </div>

                  <div className="propDeleteConfirm__actions">
                    <button
                      type="button"
                      className="propBtn"
                      disabled={submitting || deleting}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="propBtn propBtn--danger"
                      disabled={submitting || deleting}
                      onClick={() => onDelete?.()}
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="propBtn propBtn--danger"
                    disabled={submitting || deleting}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>

                  <button
                    type="submit"
                    className="propBtn propBtn--primary"
                    disabled={isSubmitDisabled}
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                </>
              )
            ) : (
              <>
                <button
                  type="button"
                  className="propBtn"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="propBtn propBtn--primary"
                  disabled={isSubmitDisabled}
                >
                  {submitting ? "Adding..." : "Add"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
