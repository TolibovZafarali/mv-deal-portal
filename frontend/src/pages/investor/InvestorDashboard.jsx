import { useEffect, useMemo, useState } from "react";
import { searchProperties } from "../../api/propertyApi";
import InvestorPropertyMap from "../../components/InvestorPropertyMap";
import "./InvestorDashboard.css";

const OCCUPANCY_OPTIONS = [
  { label: "Occupancy", value: "" },
  { label: "Vacant", value: "VACANT" },
  { label: "Tenant", value: "TENANT" },
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

const FAVORITES_STORAGE_KEY = "investor.favoritePropertyIds";

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

function loadFavoritePropertyIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return Array.from(new Set(parsed.map((value) => String(value)).filter(Boolean)));
  } catch {
    return [];
  }
}

export default function InvestorDashboard() {
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [favoritePropertyIds, setFavoritePropertyIds] = useState(loadFavoritePropertyIds);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const favoritePropertyIdSet = useMemo(() => {
    return new Set(favoritePropertyIds);
  }, [favoritePropertyIds]);

  const visibleRows = useMemo(() => {
    if (!showFavoritesOnly) return rows;
    return rows.filter((row) => favoritePropertyIdSet.has(String(row.id)));
  }, [favoritePropertyIdSet, rows, showFavoritesOnly]);

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritePropertyIds));
  }, [favoritePropertyIds]);

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

  function toggleFavoriteProperty(propertyId) {
    const propertyIdKey = String(propertyId);
    setFavoritePropertyIds((prev) => {
      if (prev.includes(propertyIdKey)) {
        return prev.filter((id) => id !== propertyIdKey);
      }
      return [...prev, propertyIdKey];
    });
  }

  const emptyMessage = showFavoritesOnly ? "No favorite properties found." : "No properties found.";

  return (
    <section className="invDash">
      <form className="invDash__filters" onSubmit={(event) => event.preventDefault()}>
        <div className="invDash__filterRow">
          <div className="invDash__searchWrap">
            <input
              className="invDash__search"
              type="search"
              placeholder="Address, neighborhood, city, zip"
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />
            <span className="material-symbols-outlined invDash__searchIcon">search</span>
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
          {loading ? <div className="invDash__notice">Loading properties...</div> : null}
          {!loading && error ? <div className="invDash__notice invDash__notice--error">{error}</div> : null}
          {!loading && !error && visibleRows.length === 0 ? <div className="invDash__notice">{emptyMessage}</div> : null}

          {!loading && !error && visibleRows.length > 0 ? (
            <div className="invDash__cards">
              {visibleRows.map((property) => {
                const leadPhoto = property.photos?.[0]?.url || "";
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
                        toggleFavoriteProperty(property.id);
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
                      onClick={() => setSelectedPropertyId(property.id)}
                    >
                      {leadPhoto ? (
                        <img
                          src={leadPhoto}
                          alt={property.title || fullAddress(property) || `Property ${property.id}`}
                          className="invDash__cardImg"
                        />
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
                            <span className="invDash__cardValue">{money(property.askingPrice)}</span>
                          </div>
                          <div>
                            <span className="invDash__cardLabel">ARV</span>
                            <span className="invDash__cardValue">{money(property.arv)}</span>
                          </div>
                        </div>

                        <div className="invDash__cardMeta">
                          <span>{property.beds ?? "—"} bd</span>
                          <span>{property.baths ?? "—"} ba</span>
                          <span>{property.livingAreaSqft?.toLocaleString("en-US") ?? "—"} sqft</span>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
