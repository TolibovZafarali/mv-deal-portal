import { useEffect, useMemo, useState } from "react";
import {
  approveInvestor,
  getAdminInvestorById,
  rejectInvestor,
  searchAdminInvestors,
  updateInvestorRejectionReason,
} from "@/api/modules/adminInvestorApi";
import AdminFilterBar, { AdminFilterMore } from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import useFilterBarMinWidth from "@/features/admin/hooks/useFilterBarMinWidth";
import AdminInvestorInviteModal from "@/features/admin/modals/AdminInvestorInviteModal";
import AdminInvestorReviewModal from "@/features/admin/modals/AdminInvestorReviewModal";
import { signalAdminQueueRefresh } from "@/features/admin/utils/adminTelemetry";
import "@/features/admin/pages/AdminInvestorsPage.css";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const RANGE_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];
const INVESTOR_STATUS_INLINE_MIN_WIDTH = 760;
const INVESTOR_INLINE_FILTERS_MIN_WIDTH = 1040;
const INVESTOR_INLINE_FILTERS_APPROVED_MIN_WIDTH = 1220;
const ADMIN_INVESTORS_MOBILE_QUERY = "(max-width: 900px)";
const INVESTOR_STATUS_ORDER = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

function toRange(days) {
  if (!days) return { from: null, to: null };
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - Number(days));
  return { from: from.toISOString(), to: now.toISOString() };
}

function prettyDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function prettyEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminInvestorsPage() {
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    createdRange: "",
    updatedRange: "",
    approvedRange: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(ADMIN_INVESTORS_MOBILE_QUERY).matches;
  });

  const hasApprovedFilter = filters.status === "APPROVED";
  const inlineMinWidth = hasApprovedFilter
    ? INVESTOR_INLINE_FILTERS_APPROVED_MIN_WIDTH
    : INVESTOR_INLINE_FILTERS_MIN_WIDTH;
  const { setFilterBarRef, width: filterBarWidth } = useFilterBarMinWidth(inlineMinWidth);
  const showAdvancedInline = filterBarWidth >= inlineMinWidth;
  const showStatusInline = filterBarWidth >= INVESTOR_STATUS_INLINE_MIN_WIDTH;
  const filterRowClassName = showAdvancedInline
    ? `adminInv__filterRow ${hasApprovedFilter ? "adminInv__filterRow--collapsedApproved" : "adminInv__filterRow--collapsed"}`
    : showStatusInline
      ? "adminInv__filterRow adminInv__filterRow--statusInline"
      : "adminInv__filterRow adminInv__filterRow--searchOnly";
  const hasMoreFiltersSelected = useMemo(() => {
    return [
      filters.createdRange,
      filters.updatedRange,
      filters.approvedRange,
      showStatusInline ? "" : filters.status,
    ].some(Boolean);
  }, [filters.createdRange, filters.updatedRange, filters.approvedRange, filters.status, showStatusInline]);
  const sortedRows = useMemo(() => {
    return rows
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        const rankA = INVESTOR_STATUS_ORDER[a.row?.status] ?? Number.MAX_SAFE_INTEGER;
        const rankB = INVESTOR_STATUS_ORDER[b.row?.status] ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.idx - b.idx;
      })
      .map((entry) => entry.row);
  }, [rows]);

  const advancedFilters = (
    <>
      <label className="adminInv__filter adminInv__filter--created">
        <span className="adminInv__label">Created</span>
        <select className="adminInv__input" value={filters.createdRange} onChange={(e) => updateFilter("createdRange", e.target.value)}>
          {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label className="adminInv__filter adminInv__filter--updated">
        <span className="adminInv__label">Updated</span>
        <select className="adminInv__input" value={filters.updatedRange} onChange={(e) => updateFilter("updatedRange", e.target.value)}>
          {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      {hasApprovedFilter ? (
        <label className="adminInv__filter adminInv__filter--approved">
          <span className="adminInv__label">Approved</span>
          <select className="adminInv__input" value={filters.approvedRange} onChange={(e) => updateFilter("approvedRange", e.target.value)}>
            {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
    </>
  );
  const statusFilter = (
    <label className="adminInv__filter adminInv__filter--status">
      <span className="adminInv__label">Status</span>
      <select className="adminInv__input" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const created = toRange(filters.createdRange);
        const updated = toRange(filters.updatedRange);
        const approved = filters.status === "APPROVED" ? toRange(filters.approvedRange) : { from: null, to: null };

        const data = await searchAdminInvestors(
          {
            q: filters.q.trim(),
            status: filters.status,
            createdFrom: created.from,
            createdTo: created.to,
            updatedFrom: updated.from,
            updatedTo: updated.to,
            approvedFrom: approved.from,
            approvedTo: approved.to,
          },
          { page, size: PAGE_SIZE },
        );

        if (!alive) return;
        setRows(data?.content ?? []);
        setMeta({ totalPages: data?.totalPages ?? 0, totalElements: data?.totalElements ?? 0 });
      } catch (e) {
        if (!alive) return;
        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(e?.message || "Failed to load investors.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [filters, page]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(ADMIN_INVESTORS_MOBILE_QUERY);
    const handleMediaChange = (event) => setIsMobileView(event.matches);
    const supportsModernListener = typeof media.addEventListener === "function";

    if (supportsModernListener) {
      media.addEventListener("change", handleMediaChange);
    } else {
      media.addListener(handleMediaChange);
    }

    return () => {
      if (supportsModernListener) {
        media.removeEventListener("change", handleMediaChange);
        return;
      }
      media.removeListener(handleMediaChange);
    };
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput }));
    setPage(0);
  }

  async function openModal(id) {
    setSubmitError("");
    const full = await getAdminInvestorById(id);
    setSelectedInvestor(full);
    setModalOpen(true);
  }

  async function handleSave({ status, rejectionReason }) {
    if (!selectedInvestor) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (selectedInvestor.status === "PENDING") {
        if (status === "APPROVED") await approveInvestor(selectedInvestor.id);
        if (status === "REJECTED") await rejectInvestor(selectedInvestor.id, rejectionReason.trim());
      } else if (selectedInvestor.status === "REJECTED") {
        await updateInvestorRejectionReason(selectedInvestor.id, rejectionReason.trim());
      }
      setModalOpen(false);
      setSelectedInvestor(null);
      signalAdminQueueRefresh();
      updateFilter("q", filters.q);
    } catch (e) {
      setSubmitError(e?.message || "Failed to save investor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="adminInv">
      <AdminFilterBar
        className="adminInv__filters"
        rowClassName={filterRowClassName}
        onSubmit={handleSearchSubmit}
        containerRef={setFilterBarRef}
      >
        <label className="adminInv__filter adminInv__filter--search">
          <span className="adminInv__label">Search</span>
          <div className="adminInv__searchWrap">
            <input
              className="adminInv__input adminInv__input--text adminInv__input--search"
              type="search"
              placeholder="Name, company, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="adminInv__searchBtn" type="submit" aria-label="Search investors">
              <span className="material-symbols-outlined adminInv__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>
        </label>

        {showStatusInline ? statusFilter : null}

        {showAdvancedInline ? advancedFilters : (
          <AdminFilterMore
            className="adminInv__moreMenu"
            summaryClassName="adminInv__moreSummary"
            summaryActiveClassName="adminInv__moreSummary--active"
            bodyClassName="adminInv__moreBody"
            active={hasMoreFiltersSelected}
            summaryLabel="More"
          >
            {!showStatusInline ? statusFilter : null}
            {advancedFilters}
          </AdminFilterMore>
        )}
      </AdminFilterBar>

      <div className="adminInv__tableSection">
        <div className="adminInv__sectionHead">
          <h3 className="adminInv__sectionTitle">Investors</h3>
          <button
            type="button"
            className="adminInv__addBtn"
            onClick={() => setInviteOpen(true)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">group_add</span>
            Invite Investors
          </button>
        </div>
        {loading ? <div className="adminInv__notice">Loading investors...</div> : null}
        {!loading && error ? <div className="adminInv__notice adminInv__notice--error">{error}</div> : null}
        {!loading && !error && rows.length === 0 ? <div className="adminInv__notice">No investors found.</div> : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="adminInv__tableWrap">
              <table className="adminInv__table">
                <thead>
                  <tr>
                    {isMobileView ? (
                      <>
                        <th>Name</th>
                        <th>Email</th>
                      </>
                    ) : (
                      <>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        {filters.status === "REJECTED" ? <th>Rejection Reason</th> : null}
                        <th>Created</th>
                        <th>Updated</th>
                        <th className="adminInv__thAction"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((investor) => {
                    const statusKey = String(investor?.status ?? "").trim().toUpperCase();
                    const statusTone = ["PENDING", "APPROVED", "REJECTED"].includes(statusKey)
                      ? statusKey.toLowerCase()
                      : "unknown";
                    const investorName = [investor.firstName, investor.lastName].filter(Boolean).join(" ").trim() || "—";
                    return (
                      <tr
                        key={investor.id}
                        className={`adminInv__row adminInv__row--${statusTone} ${isMobileView ? "adminInv__row--clickable" : ""}`}
                        onClick={isMobileView ? () => openModal(investor.id) : undefined}
                        onKeyDown={isMobileView ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openModal(investor.id);
                          }
                        } : undefined}
                        tabIndex={isMobileView ? 0 : undefined}
                        role={isMobileView ? "button" : undefined}
                      >
                        {isMobileView ? (
                          <>
                            <td>{investorName}</td>
                            <td>{investor.email || "—"}</td>
                          </>
                        ) : (
                          <>
                            <td>{investorName}</td>
                            <td>{investor.companyName || "—"}</td>
                            <td>{investor.email || "—"}</td>
                            <td>{investor.phone || "—"}</td>
                            <td>
                              <span className={`adminInv__statusBadge adminInv__statusBadge--${statusTone}`}>
                                {prettyEnum(investor.status)}
                              </span>
                            </td>
                            {filters.status === "REJECTED" ? <td>{investor.rejectionReason || "—"}</td> : null}
                            <td>{prettyDate(investor.createdAt)}</td>
                            <td>{prettyDate(investor.updatedAt)}</td>
                            <td className="adminInv__tdAction">
                              <button type="button" className="adminInv__actionBtn" onClick={() => openModal(investor.id)}>
                                {investor.status === "PENDING" ? "Review" : "View"}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
              className="adminInv__pagination"
              buttonClassName="adminInv__pageBtn"
              numbersClassName="adminInv__pageNums"
              numberButtonClassName="adminInv__pageBtn--num"
              activeNumberClassName="adminInv__pageBtn--active"
              dotsClassName="adminInv__dots"
              metaClassName="adminInv__pageMeta"
              metaValueClassName="adminInv__pageMetaNum"
            />
            <div className="adminInv__meta">
              {sortedRows.length.toLocaleString("en-US")} on page • {meta.totalElements.toLocaleString("en-US")} total
            </div>
          </>
        ) : null}
      </div>

      <AdminInvestorReviewModal
        open={modalOpen}
        investor={selectedInvestor}
        submitting={submitting}
        submitError={submitError}
        onClose={() => {
          if (!submitting) {
            setModalOpen(false);
            setSelectedInvestor(null);
          }
        }}
        onSave={handleSave}
      />

      <AdminInvestorInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </section>
  );
}
