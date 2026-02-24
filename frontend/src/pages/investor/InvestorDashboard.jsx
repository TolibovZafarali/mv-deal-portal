import { useEffect, useMemo, useState } from "react";
import { searchProperties } from "../../api/propertyApi";
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

function toCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMapPoints(properties) {
  const points = properties
    .map((property) => ({
      id: property.id,
      lat: toCoordinate(property.latitude),
      lng: toCoordinate(property.longitude),
    }))
    .filter((point) => point.lat !== null && point.lng !== null);

  if (!points.length) return [];

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return points.map((point) => {
    const x = 8 + ((point.lng - minLng) / lngRange) * 84;
    const y = 10 + (1 - (point.lat - minLat) / latRange) * 76;
    return { ...point, x, y };
  });
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
    if (!rows.length) {
      setSelectedPropertyId(null);
      return;
    }

    const selectedStillVisible = rows.some((row) => row.id === selectedPropertyId);
    if (!selectedStillVisible) {
      setSelectedPropertyId(rows[0].id);
    }
  }, [rows, selectedPropertyId]);

  const mapPoints = useMemo(() => toMapPoints(rows), [rows]);

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

  return (
    <section className="invDash">
      <form className="invDash__filters" onSubmit={(event) => event.preventDefault()}>
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

        <div className="invDash__filtersRight">
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
      </form>

      <div className="invDash__content">
        <div className="invDash__mapPane" aria-label="Property map">
          <div className="invDash__mapCanvas">
            {!loading && !rows.length ? (
              <div className="invDash__mapEmpty">
                <span className="material-symbols-outlined">map</span>
                <p>No properties to display on map.</p>
              </div>
            ) : null}

            {rows.length > 0 && mapPoints.length === 0 ? (
              <div className="invDash__mapEmpty">
                <span className="material-symbols-outlined">location_off</span>
                <p>Properties loaded, but map coordinates are unavailable.</p>
              </div>
            ) : null}

            {mapPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                className={`invDash__pin ${
                  selectedPropertyId === point.id ? "invDash__pin--active" : ""
                }`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => setSelectedPropertyId(point.id)}
                aria-label={`Property ${point.id}`}
                title={`Property ${point.id}`}
              />
            ))}
          </div>
        </div>

        <div className="invDash__listPane">
          {loading ? <div className="invDash__notice">Loading properties...</div> : null}
          {!loading && error ? <div className="invDash__notice invDash__notice--error">{error}</div> : null}
          {!loading && !error && rows.length === 0 ? (
            <div className="invDash__notice">No properties found.</div>
          ) : null}

          {!loading && !error && rows.length > 0 ? (
            <div className="invDash__cards">
              {rows.map((property) => {
                const leadPhoto = property.photos?.[0]?.url || "";
                const isActive = selectedPropertyId === property.id;

                return (
                  <article
                    key={property.id}
                    className={`invDash__card ${isActive ? "invDash__card--active" : ""}`}
                  >
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
