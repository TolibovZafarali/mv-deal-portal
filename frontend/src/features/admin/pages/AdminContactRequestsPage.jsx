import { useEffect, useMemo, useState } from "react";
import AdminPagination from "@/features/admin/components/AdminPagination";
import {
  getAdminContactRequests,
  replyToContactRequest,
} from "@/api/modules/contactRequestApi";
import "@/features/admin/pages/AdminContactRequestsPage.css";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "New", value: "NEW" },
  { label: "Replied", value: "REPLIED" },
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

function normalizeStatus(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "NEW") return "NEW";
  return "REPLIED";
}

function statusTone(value) {
  return normalizeStatus(value) === "NEW" ? "new" : "replied";
}

function excerpt(value, max = 180) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function toDateMs(value) {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRowsByWorkflow(rows) {
  return [...rows].sort((left, right) => {
    const leftRank = normalizeStatus(left?.status) === "NEW" ? 0 : 1;
    const rightRank = normalizeStatus(right?.status) === "NEW" ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return toDateMs(right?.createdAt) - toDateMs(left?.createdAt);
  });
}

export default function AdminContactRequestsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    category: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [replyModal, setReplyModal] = useState({
    open: false,
    row: null,
    message: "",
    sending: false,
  });

  const orderedRows = useMemo(() => sortRowsByWorkflow(rows), [rows]);

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
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setTotalPages(0);
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = searchInput.trim();
      setFilters((current) => {
        if (current.q === q) return current;
        return { ...current, q };
      });
      setPage(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function openReplyModal(row) {
    setReplyModal({
      open: true,
      row,
      message: "",
      sending: false,
    });
  }

  function closeReplyModal() {
    setReplyModal((current) => ({
      ...current,
      open: false,
      row: null,
      message: "",
      sending: false,
    }));
  }

  async function submitReply() {
    const id = replyModal.row?.id;
    const message = String(replyModal.message ?? "").trim();
    if (!id || !message) return;

    setReplyModal((current) => ({ ...current, sending: true }));
    setError("");

    try {
      await replyToContactRequest(id, message);
      closeReplyModal();
      setRefreshKey((current) => current + 1);
    } catch (nextError) {
      setReplyModal((current) => ({ ...current, sending: false }));
      setError(nextError?.message || "Failed to send reply.");
    }
  }

  return (
    <section className="adminContact">
      <section className="adminContact__filters">
        <div className="adminContact__filterRow">
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
        </div>
      </section>

      <section className="adminContact__tableSection">
        <h2 className="adminContact__sectionTitle">Requests</h2>

        {error ? <div className="adminContact__notice adminContact__notice--error">{error}</div> : null}
        {loading ? <div className="adminContact__notice">Loading contact requests...</div> : null}
        {!loading && !error && orderedRows.length === 0 ? (
          <div className="adminContact__notice">No contact requests match the current filters.</div>
        ) : null}

        {orderedRows.length ? (
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
                    <th>Message</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedRows.map((row) => {
                    const normalized = normalizeStatus(row.status);
                    const rowTone = statusTone(row.status);
                    const canReply = normalized === "NEW";
                    return (
                      <tr key={row.id} className={`adminContact__row adminContact__row--${rowTone}`}>
                        <td>{prettyDateTime(row.createdAt)}</td>
                        <td>{categoryLabel(row.category)}</td>
                        <td>{row.name || "—"}</td>
                        <td>{row.email || "—"}</td>
                        <td>
                          <span className={`adminContact__statusBadge adminContact__statusBadge--${rowTone}`}>
                            {normalized}
                          </span>
                        </td>
                        <td className="adminContact__messageCell">{excerpt(row.messageBody)}</td>
                        <td>
                          <div className="adminContact__actionGroup">
                            {canReply ? (
                              <button
                                type="button"
                                className="adminContact__rowActionBtn"
                                onClick={() => openReplyModal(row)}
                              >
                                Reply
                              </button>
                            ) : (
                              <span className="adminContact__actionDone">—</span>
                            )}
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

      {replyModal.open ? (
        <div className="adminContact__replyOverlay" onMouseDown={closeReplyModal}>
          <div
            className="adminContact__replyModal"
            role="dialog"
            aria-modal="true"
            aria-label="Reply to contact request"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adminContact__replyHeader">
              <h3 className="adminContact__replyTitle">Reply to {replyModal.row?.name || "request"}</h3>
              <button
                type="button"
                className="adminContact__replyClose"
                onClick={closeReplyModal}
                aria-label="Close reply dialog"
                disabled={replyModal.sending}
              >
                ✕
              </button>
            </div>

            <p className="adminContact__replyMeta">
              To: {replyModal.row?.email || "N/A"}
            </p>

            <dl className="adminContact__replyDetails">
              <div className="adminContact__replyDetail">
                <dt>Submitted</dt>
                <dd>{prettyDateTime(replyModal.row?.createdAt)}</dd>
              </div>
              <div className="adminContact__replyDetail">
                <dt>Inbox</dt>
                <dd>{categoryLabel(replyModal.row?.category)}</dd>
              </div>
              <div className="adminContact__replyDetail">
                <dt>Name</dt>
                <dd>{replyModal.row?.name || "N/A"}</dd>
              </div>
              <div className="adminContact__replyDetail">
                <dt>Email</dt>
                <dd>{replyModal.row?.email || "N/A"}</dd>
              </div>
            </dl>

            <div className="adminContact__replySource">
              <span className="adminContact__replySourceLabel">Original message</span>
              <p className="adminContact__replySourceBody">{replyModal.row?.messageBody || "N/A"}</p>
            </div>

            <label className="adminContact__replyField">
              <span className="adminContact__replyLabel">Message</span>
              <textarea
                className="adminContact__replyInput"
                rows={8}
                value={replyModal.message}
                onChange={(event) =>
                  setReplyModal((current) => ({ ...current, message: event.target.value }))
                }
                placeholder="Write your reply to the user..."
                disabled={replyModal.sending}
              />
            </label>

            <div className="adminContact__replyActions">
              <button
                type="button"
                className="adminContact__replyBtn adminContact__replyBtn--ghost"
                onClick={closeReplyModal}
                disabled={replyModal.sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adminContact__replyBtn adminContact__replyBtn--primary"
                onClick={submitReply}
                disabled={replyModal.sending || !String(replyModal.message ?? "").trim()}
              >
                {replyModal.sending ? "Sending..." : "Send reply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
