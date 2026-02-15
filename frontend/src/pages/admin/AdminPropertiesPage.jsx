import { useState } from "react";
import "./AdminPropertiesPage.css";

const EXIT_STRATEGIES = ["All", "Rental", "Fix & Flip", "Wholesale", "Wholetail"];
const CLOSING_TERMS = ["All", "Cash Only", "Hard Money", "Conventional", "Seller Finance"];
const STATUSES = ["All", "Draft", "Active", "Closed"];

export default function AdminPropertiesPage() {
  const [filters, setFilters] = useState({
    address: "",
    exitStrategy: "All",
    closingTerms: "All",
    status: "All",
  });

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    // Step 3: wire this up to backend requests + pagination.
  }

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
              // Step 4: open Add Property modal
            }}
          >
            <span className="material-symbols-outlined">add_home_work</span>
          </button>
        </div>
      </form>

      {/* Step 3: table + pagination */}
      <div className="adminProps__below">
        <div className="adminProps__empty">No properties loaded yet.</div>
      </div>
    </section>
  );
}
