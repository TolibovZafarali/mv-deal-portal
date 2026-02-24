import { useEffect, useMemo, useRef, useState } from "react";
import "./PropertyUpsertModal.css";
import { formatPriceInput } from "../utils/priceFormatting";
import { numOrEmpty } from "../utils/formValue";
import { getAddressSuggestions } from "../api/propertyApi";

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

function normalizePhotoUrls(photos) {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo) => {
      const rawUrl = typeof photo === "string" ? photo : photo?.url;
      return String(rawUrl ?? "").trim();
    })
    .filter((url) => url.length > 0);
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
  beds: "",
  baths: "",
  livingAreaSqft: "",
  yearBuilt: "",
  roofAge: "",
  hvac: "",
  occupancyStatus: "",
  exitStrategy: "",
  closingTerms: "",
  photos: [],
};

export default function PropertyUpsertModal({
  open,
  mode = "add",
  initialValue = null,
  onClose,
  onSubmit,
  onUploadPhoto,
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
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSuggesting, setAddressSuggesting] = useState(false);
  const [addressSuggestError, setAddressSuggestError] = useState("");
  const [addressSuggestHasSearched, setAddressSuggestHasSearched] =
    useState(false);
  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const photoInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const photoWheelRafRef = useRef(null);
  const photoWheelTargetRef = useRef(0);
  const addressBlurTimeoutRef = useRef(null);
  const addressLookupRequestSeqRef = useRef(0);
  const suppressAddressLookupRef = useRef(false);

  useEffect(() => {
    if (!open) setShowDeleteConfirm(false);
    if (!open) setPhotoUploadError("");
    if (!open) {
      setAddressSuggestions([]);
      setAddressSuggesting(false);
      setAddressSuggestError("");
      setAddressSuggestHasSearched(false);
      setAddressSuggestOpen(false);
      suppressAddressLookupRef.current = false;
      addressLookupRequestSeqRef.current += 1;
      if (addressBlurTimeoutRef.current) {
        clearTimeout(addressBlurTimeoutRef.current);
        addressBlurTimeoutRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (mode !== "edit") setShowDeleteConfirm(false);
  }, [mode]);

  // hydrate for edit mode (later)
  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      setForm(DEFAULT_FORM);
      return;
    }

    const normalizedState = String(initialValue.state ?? "").toUpperCase();
    const normalizedPhotos = normalizePhotoUrls(
      [...(initialValue.photos ?? [])].sort(
        (a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
      ),
    );

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
      beds: numOrEmpty(initialValue.beds),
      baths: numOrEmpty(initialValue.baths),
      livingAreaSqft: numOrEmpty(initialValue.livingAreaSqft),
      yearBuilt: numOrEmpty(initialValue.yearBuilt),
      roofAge: numOrEmpty(initialValue.roofAge),
      hvac: numOrEmpty(initialValue.hvac),
      occupancyStatus: initialValue.occupancyStatus ?? "",
      exitStrategy: initialValue.exitStrategy ?? "",
      closingTerms: initialValue.closingTerms ?? "",
      photos: normalizedPhotos,
    });
  }, [open, initialValue]);

  // esc + scroll lock
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
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

    if (normalizePhotoUrls(form.photos).length === 0) {
      missing.push("At least 1 Photo");
    }

    return missing;
  }, [form]);

  const isActiveWithMissingRequired =
    form.status === "ACTIVE" && activeMissingRequiredFields.length > 0;

  const isSubmitDisabled =
    !form.title.trim() ||
    submitting ||
    deleting ||
    photoUploading ||
    isActiveWithMissingRequired;

  const shouldShowAddressSuggestions =
    addressSuggestOpen &&
    String(form.street1 ?? "").trim().length >= ADDRESS_SUGGESTION_MIN_CHARS &&
    (addressSuggesting ||
      addressSuggestions.length > 0 ||
      addressSuggestError ||
      addressSuggestHasSearched);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setPriceField(key, value) {
    setForm((p) => ({ ...p, [key]: formatPriceInput(value) }));
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

  function removePhoto(index) {
    setForm((prev) => ({
      ...prev,
      photos: (prev.photos ?? []).filter((_, i) => i !== index),
    }));
  }

  function openPhotoPicker() {
    if (submitting || deleting || photoUploading) return;
    photoInputRef.current?.click();
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
      const uploadedUrls = [];

      for (const file of files) {
        const uploadedUrl = await onUploadPhoto(file);
        const normalized = String(uploadedUrl ?? "").trim();
        if (!normalized) {
          throw new Error("Upload failed to return a photo URL.");
        }
        uploadedUrls.push(normalized);
      }

      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos ?? []), ...uploadedUrls],
      }));
    } catch (error) {
      setPhotoUploadError(error?.message || "Failed to upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting || photoUploading) return;
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
                />
              </div>

              <div className="propField propField--addressState">
                <div className="propField__label">State</div>
                <select
                  className="propField__input"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
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
              <button
                type="button"
                className="propLinkBtn"
                onClick={openPhotoPicker}
                disabled={submitting || deleting || photoUploading}
              >
                {photoUploading ? "Uploading..." : "Upload Photo +"}
              </button>
            </div>
            <input
              ref={photoInputRef}
              className="propFileInput"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoFileSelection}
            />

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
                  {form.photos.map((photoUrl, index) => (
                    <div key={`photo-${index}`} className="propPhotoCard">
                      <img
                        className="propPhotoCard__image"
                        src={photoUrl}
                        alt={`Property photo ${index + 1}`}
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="propPhotoCard__remove"
                        onClick={() => removePhoto(index)}
                        disabled={photoUploading || submitting || deleting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sale Comps (UI only for now) */}
          <div className="propSection">
            <div className="propSection__head propSection__head--row">
              <div className="propSection__title">Sale Comps</div>
              <button type="button" className="propLinkBtn" onClick={() => {}}>
                Add Comp +
              </button>
            </div>

            <div className="propCompsTableWrap">
              <table className="propCompsTable">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Status</th>
                    <th className="tRight">Price</th>
                    <th className="tRight">Price/ft²</th>
                    <th className="tRight">Distance</th>
                    <th className="tRight">Bed</th>
                    <th className="tRight">Bath</th>
                    <th className="tRight">Sq Ft</th>
                    <th className="tRight">Year</th>
                    <th className="tIcon"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={10} className="propCompsEmpty">
                      No comps added yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
          {isActiveWithMissingRequired ? (
            <div className="propModal__error">
              Active properties require all required fields. Missing: {activeMissingRequiredFields.join(", ")}
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
