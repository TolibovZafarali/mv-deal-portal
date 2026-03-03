import { useEffect, useMemo, useState } from "react";
import { searchProperties } from "@/api/modules/propertyApi";
import { createInquiry } from "@/api/modules/inquiryApi";
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
  return [line1, property.city, property.state, property.zip].filter(Boolean).join(", ");
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

export default function InvestorDashboard() {
  const { user } = useAuth();
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

  const favoritePropertyIdSet = useMemo(() => {
    return new Set(favoritePropertyIds);
  }, [favoritePropertyIds]);

  const visibleRows = useMemo(() => {
    if (!showFavoritesOnly) return rows;
    return rows.filter((row) => favoritePropertyIdSet.has(String(row.id)));
  }, [favoritePropertyIdSet, rows, showFavoritesOnly]);

  const detailProperty = useMemo(() => {
    if (detailPropertyId === null) return null;
    return rows.find((row) => row.id === detailPropertyId) || null;
  }, [detailPropertyId, rows]);

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
    if (!visibleRows.length) {
      setSelectedPropertyId(null);
      return;
    }

    const selectedStillVisible = visibleRows.some((row) => row.id === selectedPropertyId);
    if (!selectedStillVisible && selectedPropertyId !== null) {
      setSelectedPropertyId(null);
    }
  }, [visibleRows, selectedPropertyId]);

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

  const hasMoreFiltersSelected = useMemo(() => {
    return [
      filters.minBeds,
      filters.minBaths,
      filters.minAskingPrice,
      filters.maxAskingPrice,
    ].some((value) => String(value ?? "").trim().length > 0);
  }, [filters.minBeds, filters.minBaths, filters.minAskingPrice, filters.maxAskingPrice]);

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
    if (selectedPropertyId === property.id) {
      setDetailPropertyId(property.id);
      setInquiryMessageBody(DEFAULT_INQUIRY_MESSAGE);
      setInquiryError("");
      setInquirySuccess("");
      return;
    }

    setSelectedPropertyId(property.id);
  }

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
    setDetailPropertyId(null);
    setInquiryError("");
    setInquirySuccess("");
  }

  async function handleSendInquiry() {
    if (!detailProperty) return;

    const investorId = user?.investorId;
    if (!investorId) {
      setInquiryError("Missing investor identity. Please log out and log in again.");
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
        subject: `Property inquiry: ${subjectAddress}`,
        messageBody,
        contactName,
        companyName,
        contactEmail,
        contactPhone,
      });
      setInquirySuccess("Inquiry sent.");
    } catch (nextError) {
      setInquiryError(nextError?.message || "Failed to send inquiry.");
    } finally {
      setInquirySending(false);
    }
  }

  const emptyMessage = showFavoritesOnly ? "No favorite properties found." : "No properties found.";

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
              aria-pressed={showFavoritesOnly}
            >
              Favorites
            </button>

            <select
              className="invDash__select"
              value={filters.occupancyStatus}
              onChange={(event) => updateFilter("occupancyStatus", event.target.value)}
            >
              {OCCUPANCY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="invDash__select"
              value={filters.exitStrategy}
              onChange={(event) => updateFilter("exitStrategy", event.target.value)}
            >
              {EXIT_STRATEGY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="invDash__select"
              value={filters.closingTerms}
              onChange={(event) => updateFilter("closingTerms", event.target.value)}
            >
              {CLOSING_TERMS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <details className="invDash__moreMenu">
              <summary
                className={`invDash__moreSummary ${
                  hasMoreFiltersSelected ? "invDash__moreSummary--active" : ""
                }`}
              >
                More
              </summary>

              <div className="invDash__moreBody">
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
            properties={visibleRows}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={setSelectedPropertyId}
            loading={loading}
          />
        </div>

        <div className="invDash__listPane">
          {favoritesError ? <div className="invDash__notice invDash__notice--error">{favoritesError}</div> : null}
          {loading ? <div className="invDash__notice">Loading properties...</div> : null}
          {!loading && error ? <div className="invDash__notice invDash__notice--error">{error}</div> : null}
          {!loading && !error && visibleRows.length === 0 ? <div className="invDash__notice">{emptyMessage}</div> : null}

          {!loading && !error && visibleRows.length > 0 ? (
            <div className="invDash__cards">
              {visibleRows.map((property) => {
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

                return (
                  <article
                    key={property.id}
                    className={`invDash__card ${isActive ? "invDash__card--active" : ""}`}
                  >
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

                    <button
                      type="button"
                      className="invDash__cardFocus"
                      onClick={() => handleCardClick(property)}
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
                        </div>

                        <p
                          className={`invDash__cardHint ${
                            isActive ? "invDash__cardHint--visible" : ""
                          }`}
                        >
                          Click again for details
                        </p>
                      </div>
                    </button>
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
        isFavorite={detailProperty ? favoritePropertyIdSet.has(String(detailProperty.id)) : false}
        onToggleFavorite={() => {
          if (!detailProperty) return;
          void toggleFavoriteProperty(detailProperty.id);
        }}
        onClose={closePropertyDetails}
      />
    </section>
  );
}
