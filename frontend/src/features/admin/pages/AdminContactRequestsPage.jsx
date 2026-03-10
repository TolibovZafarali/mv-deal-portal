import { useEffect, useState } from "react";
import AdminPagination from "@/features/admin/components/AdminPagination";
import {
  getAdminContactRequests,
  updateContactRequestStatus,
} from "@/api/modules/contactRequestApi";
import "@/features/admin/pages/AdminContactRequestsPage.css";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "New", value: "NEW" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Closed", value: "CLOSED" },
];
const CATEGORY_OPTIONS = [
  { label: "All inboxes", value: "" },
  { label: "General support", value: "GENERAL_SUPPORT" },
  { label: "Investor question", value: "INVESTOR_QUESTION" },
  { label: "Sell a property", value: "SELL_PROPERTY" },
  { label: "Privacy or legal", value: "PRIVACY_LEGAL" },
];

function prettyDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryLabel(value) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label || "General support";
}

function statusTone(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "NEW") return "new";
  if (normalized === "IN_PROGRESS") return "progress";
  if (normalized === "CLOSED") return "closed";
  return "unknown";
}

function emailTone(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SENT") return "sent";
  if (normalized === "FAILED") return "failed";
  return "unknown";
}

function excerpt(value, max = 180) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function actionsForStatus(status) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "NEW") {
    return [
      { label: "Start", value: "IN_PROGRESS" },
      { label: "Close", value: "CLOSED" },
    ];
  }
  if (normalized === "IN_PROGRESS") {
    return [
      { label: "Reopen", value: "NEW" },
      { label: "Close", value: "CLOSED" },
    ];
  }
  return [
    { label: "Reopen", value: "NEW" },
    { label: "Start", value: "IN_PROGRESS" },
  ];
}

export default function AdminContactRequestsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    category: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getAdminContactRequests(
          filters,
          { page, size: PAGE_SIZE, sort: "createdAt,desc" },
        );

        if (!alive) return;
        setRows(Array.isArray(data?.content) ? data.content : []);
        setTotalPages(Number(data?.totalPages ?? 0));
        setTotalElements(Number(data?.totalElements ?? 0));
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setTotalPages(0);
        setTotalElements(0);
        setError(nextError?.message || "Failed to load contact requests.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [filters, page, refreshKey]);

  async function handleStatusUpdate(id, status) {
    setUpdatingId(id);
    setError("");

    try {
      await updateContactRequestStatus(id, status);
      setRefreshKey((current) => current + 1);
    } catch (nextError) {
      setError(nextError?.message || "Failed to update contact request.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPage(0);
    setFilters((current) => ({
      ...current,
      q: searchInput.trim(),
    }));
  }

  function handleStatusFilterChange(event) {
    const value = event.target.value;
    setPage(0);
    setFilters((current) => ({ ...current, status: value }));
  }

  function handleCategoryFilterChange(event) {
    const value = event.target.value;
    setPage(0);
    setFilters((current) => ({ ...current, category: value }));
  }

  return (
    <section className="adminContact">
      <header className="adminContact__header">
        <div>
          <h1 className="adminContact__title">Contact Requests</h1>
          <p className="adminContact__lead">
            Review public contact submissions, update their status, and keep the inbox moving.
          </p>
        </div>
        <div className="adminContact__summary">
          <span className="adminContact__summaryLabel">Total requests</span>
          <span className="adminContact__summaryValue">{totalElements}</span>
        </div>
      </header>

      <section className="adminContact__filters">
        <form className="adminContact__filterRow" onSubmit={handleSearchSubmit}>
          <label className="adminContact__filter">
            <span className="adminContact__label">Search</span>
            <input
              className="adminContact__input adminContact__input--text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
            />
          </label>

          <label className="adminContact__filter">
            <span className="adminContact__label">Status</span>
            <select
              className="adminContact__input"
              value={filters.status}
              onChange={handleStatusFilterChange}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="adminContact__filter">
            <span className="adminContact__label">Inbox</span>
            <select
              className="adminContact__input"
              value={filters.category}
              onChange={handleCategoryFilterChange}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="adminContact__actionBtn" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="adminContact__tableSection">
        <h2 className="adminContact__sectionTitle">Requests</h2>

        {error ? <div className="adminContact__notice adminContact__notice--error">{error}</div> : null}
        {loading ? <div className="adminContact__notice">Loading contact requests…</div> : null}
        {!loading && !error && rows.length === 0 ? (
          <div className="adminContact__notice">No contact requests match the current filters.</div>
        ) : null}

        {rows.length ? (
          <>
            <div className="adminContact__tableWrap">
              <table className="adminContact__table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Inbox</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Emails</th>
                    <th>Message</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rowTone = statusTone(row.status);
                    const rowActions = actionsForStatus(row.status);
                    const updating = updatingId === row.id;
                    return (
                      <tr key={row.id} className={`adminContact__row adminContact__row--${rowTone}`}>
                        <td>{prettyDateTime(row.createdAt)}</td>
                        <td>{categoryLabel(row.category)}</td>
                        <td>{row.name || "—"}</td>
                        <td>{row.email || "—"}</td>
                        <td>
                          <span className={`adminContact__statusBadge adminContact__statusBadge--${rowTone}`}>
                            {String(row.status ?? "UNKNOWN").replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <div className="adminContact__emailStack">
                            <span className={`adminContact__emailBadge adminContact__emailBadge--${emailTone(row.adminEmailStatus)}`}>
                              Admin: {row.adminEmailStatus || "N/A"}
                            </span>
                            <span className={`adminContact__emailBadge adminContact__emailBadge--${emailTone(row.confirmationEmailStatus)}`}>
                              User: {row.confirmationEmailStatus || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="adminContact__messageCell">{excerpt(row.messageBody)}</td>
                        <td>
                          <div className="adminContact__actionGroup">
                            {rowActions.map((action) => (
                              <button
                                key={`${row.id}-${action.value}`}
                                type="button"
                                className="adminContact__rowActionBtn"
                                disabled={updating}
                                onClick={() => handleStatusUpdate(row.id, action.value)}
                              >
                                {updating ? "Saving..." : action.label}
                              </button>
                            ))}
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
              totalPages={totalPages}
              onPageChange={setPage}
              className="adminContact__pagination"
              buttonClassName="adminContact__pageBtn"
              numbersClassName="adminContact__pageNums"
              numberButtonClassName="adminContact__pageBtn--num"
              activeNumberClassName="adminContact__pageBtn--active"
              dotsClassName="adminContact__dots"
              metaClassName="adminContact__pageMeta"
              metaValueClassName="adminContact__pageMetaNum"
            />
          </>
        ) : null}
      </section>
    </section>
  );
}
