import { useMemo, useState } from "react";
import "./AdminPropertiesPage.css";

const EXIT_STRATEGIES = ["All", "Rental", "Fix & Flip", "Wholesale", "Wholetail"];
const CLOSING_TERMS = ["All", "Cash Only", "Hard Money", "Conventional", "Seller Finance"];
const STATUSES = ["All", "Draft", "Active", "Closed"];

const PAGE_SIZE = 20;

// DEV-only demo rows so you can see the table/pagination immediately.
// Step 4 will replace this with backend data (searchProperties/getProperties).
const DEMO_PROPERTIES = Array.from({ length: 47 }, (_, i) => {
  const n = i + 1;
  return {
    id: n,
    status: n % 3 === 0 ? "Active" : n % 3 === 1 ? "Draft" : "Closed",
    title: `House #${n}`,
    street1: `${120 + (n % 60)} Main St`,
    street2: n % 5 === 0 ? `Apt ${n % 12}` : "",
    city: "Saint Louis",
    state: "Missouri",
    zip: `631${10 + (n % 20)}`,
    askingPrice: 215000 + n * 900,
    arv: 330000 + n * 1200,
    estRepairs: 42000 + n * 250,
    beds: 2 + (n % 4),
    baths: 1 + (n % 3) * 0.5,
    livingAreaSqft: 980 + n * 9,
    yearBuilt: 1950 + (n % 60),
    exitStrategy: n % 2 === 0 ? "Rental" : "Fix & Flip",
  };
});

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fullAddress(p) {
  const line1 = [p.street1, p.street2].filter(Boolean).join(", ");
  return `${line1}, ${p.city}, ${p.state} ${p.zip}`;
}

function buildPages(current, total) {
  // Keeps it clean: show first, last, and a window around current with ellipses.
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
    address: "",
    exitStrategy: "All",
    closingTerms: "All",
    status: "All",
  });

  // DEV: show table before backend wiring
  const [properties] = useState(() => (import.meta.env.DEV ? DEMO_PROPERTIES : []));

  const [page, setPage] = useState(0);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // UX: if filters change, reset to first page
  }

  function onSubmit(e) {
    e.preventDefault();
    // Step 4: wire this up to backend requests + pagination.
  }

  const totalPages = useMemo(() => {
    if (!properties.length) return 0;
    return Math.ceil(properties.length / PAGE_SIZE);
  }, [properties.length]);

  const visibleRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return properties.slice(start, start + PAGE_SIZE);
  }, [properties, page]);

  return (
    <section className="adminProps">
      <header className="adminProps__header">
        <h1 className="adminProps__title">Properties</h1>
      </header>

      <form className="adminProps__filters" onSubmit={onSubmit}>
        <div className="adminProps__filterRow">
          <label className="adminProps__filter">
            <span className="adminProps__label">Address</span>
            <input
              className="adminProps__input"
              value={filters.address}
              onChange={(e) => updateFilter("address", e.target.value)}
              placeholder="Search address"
            />
          </label>

          <label className="adminProps__filter">
            <span className="adminProps__label">Exit Strategy</span>
            <select
              className="adminProps__input"
              value={filters.exitStrategy}
              onChange={(e) => updateFilter("exitStrategy", e.target.value)}
            >
              {EXIT_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              {CLOSING_TERMS.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              // Step 4/5: open Add Property modal
            }}
          >
            <span className="material-symbols-outlined">add_home_work</span>
          </button>
        </div>
      </form>

      <div className="adminProps__below">
        {properties.length === 0 ? (
          <div className="adminProps__empty">No properties loaded yet.</div>
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
                  {visibleRows.map((p) => (
                    <tr key={p.id}>
                      <td className="adminProps__tdAddress">
                        <div className="adminProps__addrMain">{p.street1}</div>
                        <div className="adminProps__addrSub">{fullAddress(p)}</div>
                      </td>

                      <td className="adminProps__tdRight">{money(p.askingPrice)}</td>
                      <td className="adminProps__tdRight">{money(p.arv)}</td>
                      <td className="adminProps__tdRight">{money(p.estRepairs)}</td>
                      <td className="adminProps__tdCenter">{p.exitStrategy}</td>
                      <td className="adminProps__tdRight">{p.livingAreaSqft?.toLocaleString("en-US")}</td>
                      <td className="adminProps__tdCenter">{p.beds}</td>
                      <td className="adminProps__tdCenter">{p.baths}</td>
                      <td className="adminProps__tdCenter">{p.yearBuilt}</td>
                      <td className="adminProps__tdCenter">{p.status}</td>

                      <td className="adminProps__tdIcon">
                        <button
                          className="adminProps__editBtn"
                          type="button"
                          title="Edit"
                          aria-label={`Edit property ${p.id}`}
                          onClick={() => {
                            // Step 5: open Edit modal (prefill with property)
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

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}
