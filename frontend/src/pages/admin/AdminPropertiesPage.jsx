import { useEffect, useMemo, useState } from "react";
import { searchProperties } from "../../api/propertyApi";
import "./AdminPropertiesPage.css";

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

const CLOSING_TERMS = [
  { label: "All", value: "" },
  { label: "Cash Only", value: "Cash Only" },
  { label: "Hard Money", value: "Hard Money" },
  { label: "Conventional", value: "Conventional" },
  { label: "Seller Finance", value: "Seller Finance" },
];

const STATUSES = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
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

  const pages = new Set([0, 1, total - 2, total - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);

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
          )
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
    occupancyStatus: "",
    exitStrategy: "",
    closingTerms: "",
    status: "",
  });

  const [page, setPage] = useState(0);

  const [rows, setRows] = useState([]);
  const [pageMeta, setPageMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
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
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [filters, page]);

  const hasRows = rows.length > 0;

  const tableCaption = useMemo(() => {
    if (loading) return "Loading properties…";
    if (error) return error;
    if (!hasRows) return "No properties found.";
    return `${pageMeta.totalElements.toLocaleString("en-US")} total properties`;
  }, [loading, error, hasRows, pageMeta.totalElements]);

  return (
    <section className="adminProps">
      <header className="adminProps__header">
        <h1 className="adminProps__title">Properties</h1>
      </header>

      <form className="adminProps__filters" onSubmit={(e) => e.preventDefault()}>
        <div className="adminProps__filterRow">
          <label className="adminProps__filter">
            <span className="adminProps__label">Occupancy Status</span>
            <select
              className="adminProps__input"
              value={filters.occupancyStatus}
              onChange={(e) => updateFilter("occupancyStatus", e.target.value)}
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
            <span className="adminProps__label">Closing Terms</span>
            <select
              className="adminProps__input"
              value={filters.closingTerms}
              onChange={(e) => updateFilter("closingTerms", e.target.value)}
            >
              {CLOSING_TERMS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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

          <button
            className="adminProps__iconBtn"
            type="button"
            title="Add Property"
            aria-label="Add Property"
            onClick={() => {
              // Step 5: open Add Property modal
            }}
          >
            <span className="material-symbols-outlined">add_home_work</span>
          </button>
        </div>
      </form>

      <div className="adminProps__below">
        {!hasRows ? (
          <div className={`adminProps__notice ${error ? "adminProps__notice--error" : ""}`}>
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
                    <th className="adminProps__thCenter">Exit</th>
                    <th className="adminProps__thRight">SqFt</th>
                    <th className="adminProps__thCenter">Bed</th>
                    <th className="adminProps__thCenter">Bath</th>
                    <th className="adminProps__thCenter">Year</th>
                    <th className="adminProps__thCenter">Status</th>
                    <th className="adminProps__thIcon"></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="adminProps__tdAddress">
                        <div className="adminProps__addrMain">{p.street1}</div>
                        <div className="adminProps__addrSub">{fullAddress(p)}</div>
                      </td>

                      <td className="adminProps__tdRight">{money(p.askingPrice)}</td>
                      <td className="adminProps__tdRight">{money(p.arv)}</td>
                      <td className="adminProps__tdRight">{money(p.estRepairs)}</td>
                      <td className="adminProps__tdCenter">{prettyEnum(p.exitStrategy)}</td>
                      <td className="adminProps__tdRight">
                        {p.livingAreaSqft?.toLocaleString("en-US") ?? "—"}
                      </td>
                      <td className="adminProps__tdCenter">{p.beds ?? "—"}</td>
                      <td className="adminProps__tdCenter">{p.baths ?? "—"}</td>
                      <td className="adminProps__tdCenter">{p.yearBuilt ?? "—"}</td>
                      <td className="adminProps__tdCenter">{prettyEnum(p.status)}</td>

                      <td className="adminProps__tdIcon">
                        <button
                          className="adminProps__editBtn"
                          type="button"
                          title="Edit"
                          aria-label={`Edit property ${p.id}`}
                          onClick={() => {
                            // Step 6: open Edit modal prefilled with property
                            console.log("Edit property:", p.id);
                          }}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} totalPages={pageMeta.totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}
