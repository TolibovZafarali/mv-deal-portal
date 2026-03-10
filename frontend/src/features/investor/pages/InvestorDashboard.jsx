import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { getPropertyById, searchProperties } from "@/api/modules/propertyApi";
import { createInquiry, getInquiryByInvestor } from "@/api/modules/inquiryApi";
import { getInquiryRepliesByInvestor } from "@/api/modules/inquiryReplyApi";
import {
  addInvestorFavoriteProperty,
  getInvestorById,
  getInvestorFavoritePropertyIds,
  removeInvestorFavoriteProperty,
} from "@/api/modules/investorApi";
import { useAuth } from "@/features/auth";
import InvestorPropertyMap from "@/features/investor/components/InvestorPropertyMap";
import InvestorPropertyDetailsModal from "@/features/investor/modals/InvestorPropertyDetailsModal";
import "@/features/investor/pages/InvestorDashboard.css";

const OCCUPANCY_OPTIONS = [
  { label: "Occupancy", value: "" },
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
];

const EXIT_STRATEGY_OPTIONS = [
  { label: "Exit Strategy", value: "" },
  { label: "Flip", value: "FLIP" },
  { label: "Rental", value: "RENTAL" },
  { label: "Wholesale", value: "WHOLESALE" },
];

const CLOSING_TERMS_OPTIONS = [
  { label: "Closing Terms", value: "" },
  { label: "Cash Only", value: "CASH_ONLY" },
  { label: "Hard Money", value: "HARD_MONEY" },
  { label: "Conventional", value: "CONVENTIONAL" },
  { label: "Seller Finance", value: "SELLER_FINANCE" },
];

const DEFAULT_INQUIRY_MESSAGE = "Hi, I'm interested in this property. Can you provide more details?";
const NEW_ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function money(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function cleanString(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : "";
}

function parseNumeric(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replaceAll(",", "").replaceAll("$", "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const numeric = parseNumeric(value);
  if (numeric === null) return null;
  const parsed = Number.parseInt(String(numeric), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function fullAddress(property) {
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  const stateZip = [property.state, property.zip].filter(Boolean).join(" ");
  return [line1, property.city, stateZip].filter(Boolean).join(", ");
}

function potentialProfit(property) {
  const arv = Number(property?.arv);
  const asking = Number(property?.askingPrice);
  const repairs = Number(property?.estRepairs);

  if (!Number.isFinite(arv) || !Number.isFinite(asking) || !Number.isFinite(repairs)) {
    return null;
  }

  return arv - asking - repairs;
}

function selectedOptionLabel(options, value) {
  const match = options.find((option) => option.value === value);
  return match?.label || options[0]?.label || "";
}

function parseDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasMapCoordinates(property) {
  return toCoordinate(property?.latitude) !== null && toCoordinate(property?.longitude) !== null;
}

function propertyFreshnessMs(property) {
  const freshestDate =
    parseDate(property?.publishedAt) ?? parseDate(property?.createdAt) ?? parseDate(property?.updatedAt);
  return freshestDate?.getTime() ?? 0;
}

function isNewlyActive(property, nowMs) {
  if (String(property?.status ?? "").toUpperCase() !== "ACTIVE") return false;
  const activeAt = parseDate(property?.publishedAt) ?? parseDate(property?.createdAt);
  if (!activeAt) return false;

  const activeAtMs = activeAt.getTime();
  return activeAtMs <= nowMs && activeAtMs >= nowMs - NEW_ACTIVE_WINDOW_MS;
}

function FilterDropdown({
  menuKey,
  options,
  value,
  onChange,
  openMenu,
  onToggleMenu,
  menuRef,
  ariaLabel,
}) {
  const isOpen = openMenu === menuKey;
  const selectedLabel = selectedOptionLabel(options, value);

  return (
    <div className={`invDash__selectMenu ${isOpen ? "invDash__selectMenu--open" : ""}`} ref={menuRef}>
      <button
        type="button"
        className="invDash__selectTrigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => onToggleMenu(isOpen ? null : menuKey)}
      >
        <span>{selectedLabel}</span>
        <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
      </button>

      {isOpen ? (
        <div className="invDash__selectList" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={`${menuKey}-${option.label}-${option.value}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`invDash__selectOption ${active ? "invDash__selectOption--active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  onToggleMenu(null);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function InvestorDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setPropertyDetailsOpener, openMessagesModal } = useOutletContext() || {};
  const [filters, setFilters] = useState({
    q: "",
    occupancyStatus: "",
    exitStrategy: "",
    closingTerms: "",
    minBeds: "",
    minBaths: "",
    minAskingPrice: "",
    maxAskingPrice: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [detailPropertyId, setDetailPropertyId] = useState(null);
  const [favoritePropertyIds, setFavoritePropertyIds] = useState([]);
  const [favoritesError, setFavoritesError] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [cardPhotoIndexByPropertyId, setCardPhotoIndexByPropertyId] = useState({});
  const [cardPhotoDirectionByPropertyId, setCardPhotoDirectionByPropertyId] = useState({});
  const [investorProfile, setInvestorProfile] = useState(null);
  const [investorProfileError, setInvestorProfileError] = useState("");
  const [inquiryMessageBody, setInquiryMessageBody] = useState(DEFAULT_INQUIRY_MESSAGE);
  const [inquirySending, setInquirySending] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [inquirySuccess, setInquirySuccess] = useState("");
  const [messagedPropertyIds, setMessagedPropertyIds] = useState([]);
  const [repliedPropertyIds, setRepliedPropertyIds] = useState([]);
  const [mapVisiblePropertyIds, setMapVisiblePropertyIds] = useState([]);
  const [detailsOpenedFromMessages, setDetailsOpenedFromMessages] = useState(false);
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const occupancyMenuRef = useRef(null);
  const exitStrategyMenuRef = useRef(null);
  const closingTermsMenuRef = useRef(null);
  const occupancyMobileMenuRef = useRef(null);
  const exitStrategyMobileMenuRef = useRef(null);
  const closingTermsMobileMenuRef = useRef(null);
  const listPaneRef = useRef(null);
  const selectedPropertyOriginRef = useRef(null);
  const pendingHomepagePropertyIdRef = useRef(null);

  const favoritePropertyIdSet = useMemo(() => {
    return new Set(favoritePropertyIds);
  }, [favoritePropertyIds]);
  const messagedPropertyIdSet = useMemo(() => {
    return new Set(messagedPropertyIds);
  }, [messagedPropertyIds]);
  const repliedPropertyIdSet = useMemo(() => {
    return new Set(repliedPropertyIds);
  }, [repliedPropertyIds]);
  const mapVisiblePropertyIdSet = useMemo(() => {
    return new Set(mapVisiblePropertyIds.map((id) => String(id)));
  }, [mapVisiblePropertyIds]);

  const filteredRows = useMemo(() => {
    if (!showFavoritesOnly) return rows;
    return rows.filter((row) => favoritePropertyIdSet.has(String(row.id)));
  }, [favoritePropertyIdSet, rows, showFavoritesOnly]);

  const orderedRows = useMemo(() => {
    return [...filteredRows].sort((left, right) => {
      const leftVisibleOnMap = mapVisiblePropertyIdSet.has(String(left?.id));
      const rightVisibleOnMap = mapVisiblePropertyIdSet.has(String(right?.id));
      if (leftVisibleOnMap !== rightVisibleOnMap) {
        return leftVisibleOnMap ? -1 : 1;
      }

      const leftHasMapCoordinates = hasMapCoordinates(left);
      const rightHasMapCoordinates = hasMapCoordinates(right);
      if (leftHasMapCoordinates !== rightHasMapCoordinates) {
        return leftHasMapCoordinates ? -1 : 1;
      }

      const freshnessDelta = propertyFreshnessMs(right) - propertyFreshnessMs(left);
      if (freshnessDelta !== 0) return freshnessDelta;

      return Number(right?.id ?? 0) - Number(left?.id ?? 0);
    });
  }, [filteredRows, mapVisiblePropertyIdSet]);

  const detailProperty = useMemo(() => {
    if (detailPropertyId === null) return null;
    return rows.find((row) => row.id === detailPropertyId) || null;
  }, [detailPropertyId, rows]);

  const openPropertyDetailsFromMessages = useCallback(async (propertyId) => {
    const normalized = String(propertyId ?? "").trim();
    if (!normalized) return;

    const existing = rows.find((row) => String(row?.id) === normalized);
    if (existing) {
      setDetailsOpenedFromMessages(true);
      setSelectedPropertyId(existing.id);
      setDetailPropertyId(existing.id);
      return;
    }

    try {
      const property = await getPropertyById(propertyId);
      const fetchedId = property?.id;
      if (fetchedId === null || fetchedId === undefined) return;

      setRows((prev) => {
        const exists = prev.some((row) => String(row?.id) === String(fetchedId));
        if (exists) return prev;
        return [property, ...prev];
      });
      setDetailsOpenedFromMessages(true);
      setSelectedPropertyId(fetchedId);
      setDetailPropertyId(fetchedId);
    } catch (nextError) {
      setDetailsOpenedFromMessages(false);
      setError(nextError?.message || "Failed to load property details.");
    }
  }, [rows]);

  useEffect(() => {
    if (typeof setPropertyDetailsOpener !== "function") return undefined;

    setPropertyDetailsOpener(() => openPropertyDetailsFromMessages);
    return () => setPropertyDetailsOpener(null);
  }, [openPropertyDetailsFromMessages, setPropertyDetailsOpener]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await searchProperties(
          {
            q: cleanString(filters.q),
            occupancyStatus: cleanString(filters.occupancyStatus),
            exitStrategy: cleanString(filters.exitStrategy),
            closingTerms: cleanString(filters.closingTerms),
            minBeds: parseInteger(filters.minBeds),
            minBaths: parseNumeric(filters.minBaths),
            minAskingPrice: parseNumeric(filters.minAskingPrice),
            maxAskingPrice: parseNumeric(filters.maxAskingPrice),
          },
          { page: 0, size: 40, sort: "createdAt,desc" },
        );

        if (!alive) return;

        const nextRows = Array.isArray(response?.content) ? response.content : [];
        setRows(nextRows);
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setError(nextError?.message || "Failed to load properties.");
      } finally {
        if (alive) setLoading(false);
      }
    }, 240);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [filters]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedPropertyId(null);
      return;
    }

    const selectedStillVisible = filteredRows.some((row) => row.id === selectedPropertyId);
    if (!selectedStillVisible && selectedPropertyId !== null) {
      setSelectedPropertyId(null);
    }
  }, [filteredRows, selectedPropertyId]);

  useEffect(() => {
    const raw = location.state?.homeSelectedPropertyId;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return;

    pendingHomepagePropertyIdRef.current = numeric;
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const pendingId = pendingHomepagePropertyIdRef.current;
    if (!pendingId || !filteredRows.length) return;

    const match = filteredRows.find((row) => Number(row?.id) === pendingId);
    if (!match) return;

    setSelectedPropertyId(match.id);
    pendingHomepagePropertyIdRef.current = null;
  }, [filteredRows]);

  useEffect(() => {
    if (!detailProperty && detailPropertyId !== null) {
      setDetailPropertyId(null);
    }
  }, [detailProperty, detailPropertyId]);

  useEffect(() => {
    const investorId = user?.investorId;
    if (!investorId) {
      setFavoritePropertyIds([]);
      setFavoritesError("");
      return undefined;
    }

    let alive = true;
    setFavoritesError("");

    (async () => {
      try {
        const favoriteIds = await getInvestorFavoritePropertyIds(investorId);
        if (!alive) return;
        const normalized = Array.from(
          new Set(
            (Array.isArray(favoriteIds) ? favoriteIds : [])
              .map((value) => String(value))
              .filter(Boolean),
          ),
        );
        setFavoritePropertyIds(normalized);
      } catch (nextError) {
        if (!alive) return;
        setFavoritePropertyIds([]);
        setFavoritesError(nextError?.message || "Failed to load favorites.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.investorId]);

  useEffect(() => {
    const investorId = user?.investorId;
    if (detailPropertyId === null || !investorId) return undefined;

    let alive = true;
    setInvestorProfileError("");

    (async () => {
      try {
        const profile = await getInvestorById(investorId);
        if (!alive) return;
        setInvestorProfile(profile);
      } catch (nextError) {
        if (!alive) return;
        setInvestorProfile(null);
        setInvestorProfileError(nextError?.message || "Failed to load your profile.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [detailPropertyId, user?.investorId]);

  useEffect(() => {
    const investorId = user?.investorId;
    if (!investorId) {
      setMessagedPropertyIds([]);
      setRepliedPropertyIds([]);
      return undefined;
    }

    let alive = true;

    (async () => {
      try {
        async function loadAllPages(fetchPage) {
          let page = 0;
          let totalPages = 1;
          const rows = [];

          while (page < totalPages) {
            const data = await fetchPage(page);
            if (!alive) return null;
            const pageRows = Array.isArray(data?.content) ? data.content : [];
            rows.push(...pageRows);
            totalPages = Math.max(Number(data?.totalPages ?? 1), 1);
            page += 1;
          }

          return rows;
        }

        const allInquiries = await loadAllPages((page) => getInquiryByInvestor(investorId, {
          page,
          size: 100,
          sort: "createdAt,desc",
        }));
        if (!alive || allInquiries === null) return;

        const allReplies = await loadAllPages((page) => getInquiryRepliesByInvestor(investorId, {
            page,
            size: 100,
            sort: "createdAt,desc",
          }));
        if (!alive || allReplies === null) return;

        const nextMessaged = Array.from(
          new Set(allInquiries.map((inquiry) => String(inquiry?.propertyId ?? "")).filter(Boolean)),
        );
        const nextReplied = Array.from(
          new Set(allReplies.map((reply) => String(reply?.propertyId ?? "")).filter(Boolean)),
        );
        setMessagedPropertyIds(nextMessaged);
        setRepliedPropertyIds(nextReplied);
      } catch {
        if (!alive) return;
        setMessagedPropertyIds([]);
        setRepliedPropertyIds([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.investorId]);

  useEffect(() => {
    if (!openFilterMenu) return undefined;

    const menuRefsByKey = {
      occupancyStatus: occupancyMenuRef,
      exitStrategy: exitStrategyMenuRef,
      closingTerms: closingTermsMenuRef,
      occupancyStatusMobile: occupancyMobileMenuRef,
      exitStrategyMobile: exitStrategyMobileMenuRef,
      closingTermsMobile: closingTermsMobileMenuRef,
    };
    const activeMenuRef = menuRefsByKey[openFilterMenu];

    function closeIfOutside(event) {
      const activeNode = activeMenuRef?.current;
      if (!activeNode) return;
      if (activeNode.contains(event.target)) return;
      setOpenFilterMenu(null);
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setOpenFilterMenu(null);
    }

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFilterMenu]);

  useEffect(() => {
    if (selectedPropertyOriginRef.current !== "map") return;
    if (selectedPropertyId === null || selectedPropertyId === undefined) {
      selectedPropertyOriginRef.current = null;
      return;
    }

    const listPane = listPaneRef.current;
    if (!listPane) {
      selectedPropertyOriginRef.current = null;
      return;
    }

    const selector = `[data-property-id="${String(selectedPropertyId)}"]`;
    const targetCard = listPane.querySelector(selector);
    if (targetCard) {
      targetCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    selectedPropertyOriginRef.current = null;
  }, [orderedRows, selectedPropertyId]);

  const hasMoreFiltersSelected = useMemo(() => {
    return [
      filters.occupancyStatus,
      filters.exitStrategy,
      filters.closingTerms,
      filters.minBeds,
      filters.minBaths,
      filters.minAskingPrice,
      filters.maxAskingPrice,
    ].some((value) => String(value ?? "").trim().length > 0);
  }, [
    filters.occupancyStatus,
    filters.exitStrategy,
    filters.closingTerms,
    filters.minBeds,
    filters.minBaths,
    filters.minAskingPrice,
    filters.maxAskingPrice,
  ]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput }));
  }

  async function toggleFavoriteProperty(propertyId) {
    const investorId = user?.investorId;
    if (!investorId) {
      setFavoritesError("Missing investor identity. Please log out and log in again.");
      return;
    }

    const propertyIdKey = String(propertyId);
    const wasFavorite = favoritePropertyIdSet.has(propertyIdKey);
    setFavoritesError("");

    setFavoritePropertyIds((prev) => {
      if (wasFavorite) {
        return prev.filter((id) => id !== propertyIdKey);
      }
      return [...prev, propertyIdKey];
    });

    try {
      if (wasFavorite) {
        await removeInvestorFavoriteProperty(investorId, propertyId);
      } else {
        await addInvestorFavoriteProperty(investorId, propertyId);
      }
    } catch (nextError) {
      setFavoritePropertyIds((prev) => {
        if (wasFavorite) {
          if (prev.includes(propertyIdKey)) return prev;
          return [...prev, propertyIdKey];
        }
        return prev.filter((id) => id !== propertyIdKey);
      });
      setFavoritesError(nextError?.message || "Failed to update favorites.");
    }
  }

  function handleCardClick(property) {
    selectedPropertyOriginRef.current = null;
    const mobileView =
      typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(max-width: 720px)").matches;

    if (mobileView) {
      setDetailsOpenedFromMessages(false);
      setSelectedPropertyId(property.id);
      setDetailPropertyId(property.id);
      setInquiryMessageBody(DEFAULT_INQUIRY_MESSAGE);
      setInquiryError("");
      setInquirySuccess("");
      return;
    }

    if (selectedPropertyId === property.id) {
      setDetailsOpenedFromMessages(false);
      setDetailPropertyId(property.id);
      setInquiryMessageBody(DEFAULT_INQUIRY_MESSAGE);
      setInquiryError("");
      setInquirySuccess("");
      return;
    }

    setSelectedPropertyId(property.id);
  }

  function handleCardFocusKeyDown(event, property) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCardClick(property);
  }

  function handleMapSelectProperty(propertyId) {
    selectedPropertyOriginRef.current = "map";
    setSelectedPropertyId(propertyId);
  }

  const handleVisiblePropertyIdsChange = useCallback((propertyIds) => {
    const nextIds = Array.isArray(propertyIds) ? propertyIds.map((id) => String(id)) : [];
    setMapVisiblePropertyIds((prev) => {
      if (prev.length === nextIds.length && prev.every((id, index) => id === nextIds[index])) {
        return prev;
      }
      return nextIds;
    });
  }, []);

  function moveCardPhoto(propertyId, totalPhotos, step) {
    if (!Number.isFinite(totalPhotos) || totalPhotos <= 1) return;

    setCardPhotoDirectionByPropertyId((prev) => ({
      ...prev,
      [propertyId]: step > 0 ? "next" : "prev",
    }));

    setCardPhotoIndexByPropertyId((prev) => {
      const current = Number(prev[propertyId] ?? 0);
      const safeCurrent =
        Number.isFinite(current) && current >= 0 && current < totalPhotos ? current : 0;
      const next = (safeCurrent + step + totalPhotos) % totalPhotos;
      return { ...prev, [propertyId]: next };
    });
  }

  function closePropertyDetails() {
    const shouldReturnToMessages = detailsOpenedFromMessages;
    const returningPropertyId = detailPropertyId;
    setDetailsOpenedFromMessages(false);
    setDetailPropertyId(null);
    setInquiryError("");
    setInquirySuccess("");
    if (shouldReturnToMessages && typeof openMessagesModal === "function") {
      if (returningPropertyId === null || returningPropertyId === undefined) {
        openMessagesModal();
      } else {
        openMessagesModal({ propertyId: returningPropertyId });
      }
    }
  }

  function openMessagesFromPropertyDetails() {
    if (typeof openMessagesModal !== "function") return;

    const propertyId = detailProperty?.id;
    setDetailsOpenedFromMessages(false);
    setDetailPropertyId(null);
    setInquiryError("");
    setInquirySuccess("");

    if (propertyId === null || propertyId === undefined) {
      openMessagesModal();
      return;
    }
    openMessagesModal({ propertyId });
  }

  async function handleSendInquiry() {
    if (!detailProperty) return;

    const investorId = user?.investorId;
    const detailPropertyKey = String(detailProperty.id ?? "");
    const hasAdminReply = repliedPropertyIdSet.has(detailPropertyKey);
    if (!investorId) {
      setInquiryError("Missing investor identity. Please log out and log in again.");
      setInquirySuccess("");
      return;
    }

    if (messagedPropertyIdSet.has(detailPropertyKey) && !hasAdminReply) {
      setInquiryError("Wait for a Megna Team reply before sending another message for this property.");
      setInquirySuccess("");
      return;
    }

    if (!investorProfile) {
      setInquiryError(investorProfileError || "Unable to load your profile. Try again.");
      setInquirySuccess("");
      return;
    }

    const contactName = cleanString(
      [investorProfile.firstName, investorProfile.lastName].filter(Boolean).join(" "),
    );
    const companyName = cleanString(investorProfile.companyName);
    const contactEmail = cleanString(investorProfile.email);
    const contactPhone = cleanString(investorProfile.phone);
    const messageBody = cleanString(inquiryMessageBody);

    if (!messageBody) {
      setInquiryError("Message is required.");
      setInquirySuccess("");
      return;
    }

    if (!contactName || !companyName || !contactEmail || !contactPhone) {
      setInquiryError("Complete your profile in Account Center before sending inquiries.");
      setInquirySuccess("");
      return;
    }

    setInquirySending(true);
    setInquiryError("");
    setInquirySuccess("");

    try {
      const subjectAddress = fullAddress(detailProperty) || `Property #${detailProperty.id}`;
      await createInquiry({
        propertyId: detailProperty.id,
        investorId,
        subject: `Megna team message: ${subjectAddress}`,
        messageBody,
        contactName,
        companyName,
        contactEmail,
        contactPhone,
      });
      setMessagedPropertyIds((prev) => (prev.includes(detailPropertyKey) ? prev : [...prev, detailPropertyKey]));
      setInquirySuccess("Message sent to Megna Team.");
    } catch (nextError) {
      setInquiryError(nextError?.message || "Failed to send inquiry.");
    } finally {
      setInquirySending(false);
    }
  }

  const emptyMessage = showFavoritesOnly ? "No favorite properties found." : "No properties found.";
  const nowMs = Date.now();

  return (
    <section className="invDash">
      <form className="invDash__filters" onSubmit={handleSearchSubmit}>
        <div className="invDash__filterRow">
          <div className="invDash__searchWrap">
            <input
              className="invDash__search"
              type="search"
              placeholder="Address, neighborhood, city, zip"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button className="invDash__searchBtn" type="submit" aria-label="Search properties">
              <span className="material-symbols-outlined invDash__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>

          <div className="invDash__controlGroup">
            <button
              type="button"
              className={`invDash__favoritesFilter ${
                showFavoritesOnly ? "invDash__favoritesFilter--active" : ""
              }`}
              onClick={() => setShowFavoritesOnly((prev) => !prev)}
              aria-label={showFavoritesOnly ? "Show all listings" : "Show favorite listings"}
              aria-pressed={showFavoritesOnly}
            >
              <span className="material-symbols-outlined invDash__favoritesIcon" aria-hidden="true">
                bookmark
              </span>
              <span className="invDash__favoritesLabel">Favorites</span>
            </button>

            <div className="invDash__desktopOnlyControl">
              <FilterDropdown
                menuKey="occupancyStatus"
                options={OCCUPANCY_OPTIONS}
                value={filters.occupancyStatus}
                onChange={(value) => updateFilter("occupancyStatus", value)}
                openMenu={openFilterMenu}
                onToggleMenu={setOpenFilterMenu}
                menuRef={occupancyMenuRef}
                ariaLabel="Occupancy filter"
              />
            </div>

            <div className="invDash__desktopOnlyControl">
              <FilterDropdown
                menuKey="exitStrategy"
                options={EXIT_STRATEGY_OPTIONS}
                value={filters.exitStrategy}
                onChange={(value) => updateFilter("exitStrategy", value)}
                openMenu={openFilterMenu}
                onToggleMenu={setOpenFilterMenu}
                menuRef={exitStrategyMenuRef}
                ariaLabel="Exit strategy filter"
              />
            </div>

            <div className="invDash__desktopOnlyControl">
              <FilterDropdown
                menuKey="closingTerms"
                options={CLOSING_TERMS_OPTIONS}
                value={filters.closingTerms}
                onChange={(value) => updateFilter("closingTerms", value)}
                openMenu={openFilterMenu}
                onToggleMenu={setOpenFilterMenu}
                menuRef={closingTermsMenuRef}
                ariaLabel="Closing terms filter"
              />
            </div>

            <details className="invDash__moreMenu">
              <summary
                className={`invDash__moreSummary ${
                  hasMoreFiltersSelected ? "invDash__moreSummary--active" : ""
                }`}
              >
                More
              </summary>

              <div className="invDash__moreBody">
                <div className="invDash__mobileOnlyFilters">
                  <FilterDropdown
                    menuKey="occupancyStatusMobile"
                    options={OCCUPANCY_OPTIONS}
                    value={filters.occupancyStatus}
                    onChange={(value) => updateFilter("occupancyStatus", value)}
                    openMenu={openFilterMenu}
                    onToggleMenu={setOpenFilterMenu}
                    menuRef={occupancyMobileMenuRef}
                    ariaLabel="Occupancy filter"
                  />

                  <FilterDropdown
                    menuKey="exitStrategyMobile"
                    options={EXIT_STRATEGY_OPTIONS}
                    value={filters.exitStrategy}
                    onChange={(value) => updateFilter("exitStrategy", value)}
                    openMenu={openFilterMenu}
                    onToggleMenu={setOpenFilterMenu}
                    menuRef={exitStrategyMobileMenuRef}
                    ariaLabel="Exit strategy filter"
                  />

                  <FilterDropdown
                    menuKey="closingTermsMobile"
                    options={CLOSING_TERMS_OPTIONS}
                    value={filters.closingTerms}
                    onChange={(value) => updateFilter("closingTerms", value)}
                    openMenu={openFilterMenu}
                    onToggleMenu={setOpenFilterMenu}
                    menuRef={closingTermsMobileMenuRef}
                    ariaLabel="Closing terms filter"
                  />
                </div>

                <label className="invDash__moreField">
                  <span className="invDash__moreLabel">Min Beds</span>
                  <input
                    className="invDash__moreInput"
                    type="number"
                    min="0"
                    value={filters.minBeds}
                    onChange={(event) => updateFilter("minBeds", event.target.value)}
                  />
                </label>

                <label className="invDash__moreField">
                  <span className="invDash__moreLabel">Min Baths</span>
                  <input
                    className="invDash__moreInput"
                    type="number"
                    min="0"
                    step="0.5"
                    value={filters.minBaths}
                    onChange={(event) => updateFilter("minBaths", event.target.value)}
                  />
                </label>

                <label className="invDash__moreField">
                  <span className="invDash__moreLabel">Min Asking</span>
                  <input
                    className="invDash__moreInput"
                    type="text"
                    inputMode="numeric"
                    placeholder="$"
                    value={filters.minAskingPrice}
                    onChange={(event) => updateFilter("minAskingPrice", event.target.value)}
                  />
                </label>

                <label className="invDash__moreField">
                  <span className="invDash__moreLabel">Max Asking</span>
                  <input
                    className="invDash__moreInput"
                    type="text"
                    inputMode="numeric"
                    placeholder="$"
                    value={filters.maxAskingPrice}
                    onChange={(event) => updateFilter("maxAskingPrice", event.target.value)}
                  />
                </label>
              </div>
            </details>
          </div>
        </div>
      </form>

      <div className="invDash__content">
        <div className="invDash__mapPane">
          <InvestorPropertyMap
            properties={filteredRows}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={handleMapSelectProperty}
            onVisiblePropertyIdsChange={handleVisiblePropertyIdsChange}
            loading={loading}
          />
        </div>

        <div className="invDash__listPane" ref={listPaneRef}>
          {favoritesError ? <div className="invDash__notice invDash__notice--error">{favoritesError}</div> : null}
          {loading ? <div className="invDash__notice">Loading properties...</div> : null}
          {!loading && error ? <div className="invDash__notice invDash__notice--error">{error}</div> : null}
          {!loading && !error && orderedRows.length === 0 ? <div className="invDash__notice">{emptyMessage}</div> : null}

          {!loading && !error && orderedRows.length > 0 ? (
            <div className="invDash__cards">
              {orderedRows.map((property) => {
                const cardPhotos = Array.isArray(property.photos)
                  ? property.photos
                    .map((photo) => ({
                      thumb: String(photo?.thumbnailUrl ?? photo?.url ?? "").trim(),
                      full: String(photo?.url ?? photo?.thumbnailUrl ?? "").trim(),
                    }))
                    .filter((photo) => photo.thumb || photo.full)
                  : [];
                const totalPhotos = cardPhotos.length;
                const rawPhotoIndex = Number(cardPhotoIndexByPropertyId[property.id] ?? 0);
                const boundedPhotoIndex =
                  totalPhotos > 0 && Number.isFinite(rawPhotoIndex)
                    ? ((rawPhotoIndex % totalPhotos) + totalPhotos) % totalPhotos
                    : 0;
                const photoDirection = cardPhotoDirectionByPropertyId[property.id] || "next";
                const leadPhoto =
                  cardPhotos[boundedPhotoIndex]?.thumb ||
                  cardPhotos[boundedPhotoIndex]?.full ||
                  "";
                const estimatedProfit = potentialProfit(property);
                const isActive = selectedPropertyId === property.id;
                const isFavorite = favoritePropertyIdSet.has(String(property.id));
                const isMessaged = messagedPropertyIdSet.has(String(property.id));
                const showNewBadge = isNewlyActive(property, nowMs);

                return (
                  <article
                    key={property.id}
                    data-property-id={property.id}
                    className={`invDash__card ${
                      isActive ? "invDash__card--active" : ""
                    } ${showNewBadge ? "invDash__card--new" : ""}`}
                  >
                    {showNewBadge ? (
                      <span className="invDash__newBadge" aria-label="New listing">
                        <span className="invDash__newBadgeText">NEW</span>
                      </span>
                    ) : null}

                    <button
                      type="button"
                      className={`invDash__favoriteToggle ${
                        isFavorite ? "invDash__favoriteToggle--active" : ""
                      }`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void toggleFavoriteProperty(property.id);
                      }}
                      aria-label={isFavorite ? "Remove bookmark" : "Save bookmark"}
                      aria-pressed={isFavorite}
                    >
                      <svg
                        className="invDash__favoriteIcon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1z" />
                      </svg>
                    </button>

                    <div
                      className="invDash__cardFocus"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardClick(property)}
                      onKeyDown={(event) => handleCardFocusKeyDown(event, property)}
                    >
                      {leadPhoto ? (
                        <div className="invDash__cardImgWrap">
                          <img
                            key={`${property.id}-${boundedPhotoIndex}`}
                            src={leadPhoto}
                            alt={fullAddress(property) || `Property ${property.id}`}
                            className={`invDash__cardImg ${
                              photoDirection === "prev"
                                ? "invDash__cardImg--slidePrev"
                                : "invDash__cardImg--slideNext"
                            }`}
                          />
                          {totalPhotos > 1 ? (
                            <>
                              <button
                                type="button"
                                className="invDash__photoNav invDash__photoNav--prev"
                                aria-label="Previous photo"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveCardPhoto(property.id, totalPhotos, -1);
                                }}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">
                                  chevron_left
                                </span>
                              </button>
                              <button
                                type="button"
                                className="invDash__photoNav invDash__photoNav--next"
                                aria-label="Next photo"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveCardPhoto(property.id, totalPhotos, 1);
                                }}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">
                                  chevron_right
                                </span>
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <div className="invDash__cardImgFallback">
                          <span className="material-symbols-outlined">home</span>
                        </div>
                      )}

                      <div className="invDash__cardBody">
                        <p className="invDash__cardAddress">{fullAddress(property) || "Address unavailable"}</p>
                        <div className="invDash__cardPrices">
                          <div>
                            <span className="invDash__cardLabel">Asking</span>
                            <span className="invDash__cardValue invDash__cardValue--neutral">
                              {money(property.askingPrice)}
                            </span>
                          </div>
                          <div>
                            <span className="invDash__cardLabel">ARV</span>
                            <span className="invDash__cardValue invDash__cardValue--neutral">
                              {money(property.arv)}
                            </span>
                          </div>
                          <div>
                            <span className="invDash__cardLabel">Potential Profit</span>
                            <span className="invDash__cardValue invDash__cardValue--positive">
                              {estimatedProfit === null ? "—" : money(estimatedProfit)}
                            </span>
                          </div>
                        </div>

                        <div className="invDash__cardMeta">
                          <span>{property.beds ?? "—"} bd</span>
                          <span>{property.baths ?? "—"} ba</span>
                          <span>{property.livingAreaSqft?.toLocaleString("en-US") ?? "—"} sqft</span>
                          {isMessaged ? (
                            <span className="invDash__cardMetaStatus">Messaged</span>
                          ) : null}
                        </div>

                        <p
                          className={`invDash__cardHint ${
                            isActive ? "invDash__cardHint--visible" : ""
                          }`}
                        >
                          Click again for details
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <InvestorPropertyDetailsModal
        open={detailProperty !== null}
        property={detailProperty}
        messageBody={inquiryMessageBody}
        onMessageBodyChange={(value) => {
          setInquiryMessageBody(value);
          if (inquiryError) setInquiryError("");
          if (inquirySuccess) setInquirySuccess("");
        }}
        onSubmitInquiry={handleSendInquiry}
        inquirySending={inquirySending}
        inquiryError={inquiryError}
        inquirySuccess={inquirySuccess}
        profileError={investorProfileError}
        alreadyMessaged={detailProperty ? messagedPropertyIdSet.has(String(detailProperty.id)) : false}
        hasAdminReply={detailProperty ? repliedPropertyIdSet.has(String(detailProperty.id)) : false}
        isFavorite={detailProperty ? favoritePropertyIdSet.has(String(detailProperty.id)) : false}
        onToggleFavorite={() => {
          if (!detailProperty) return;
          void toggleFavoriteProperty(detailProperty.id);
        }}
        onOpenMessages={openMessagesFromPropertyDetails}
        onClose={closePropertyDetails}
      />
    </section>
  );
}
