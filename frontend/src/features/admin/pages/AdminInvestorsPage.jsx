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

export default function AdminInvestorsPage() {
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    createdRange: "",
    updatedRange: "",
    approvedRange: "",
  });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasMoreFiltersSelected = useMemo(() => {
    return [filters.createdRange, filters.updatedRange, filters.approvedRange].some(Boolean);
  }, [filters.createdRange, filters.updatedRange, filters.approvedRange]);

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

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      <AdminFilterBar className="adminInv__filters" rowClassName="adminInv__filterRow" onSubmit={(e) => e.preventDefault()}>
        <label className="adminInv__filter">
          <span className="adminInv__label">Search</span>
          <input className="adminInv__input adminInv__input--text" type="search" placeholder="Name, company, email, phone" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} />
        </label>

        <label className="adminInv__filter">
          <span className="adminInv__label">Status</span>
          <select className="adminInv__input" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <AdminFilterMore
          className="adminInv__moreMenu"
          summaryClassName="adminInv__moreSummary"
          summaryActiveClassName="adminInv__moreSummary--active"
          bodyClassName="adminInv__moreBody"
          active={hasMoreFiltersSelected}
          summaryLabel="More"
        >
          <label className="adminInv__filter">
            <span className="adminInv__label">Created</span>
            <select className="adminInv__input" value={filters.createdRange} onChange={(e) => updateFilter("createdRange", e.target.value)}>
              {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="adminInv__filter">
            <span className="adminInv__label">Updated</span>
            <select className="adminInv__input" value={filters.updatedRange} onChange={(e) => updateFilter("updatedRange", e.target.value)}>
              {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          {filters.status === "APPROVED" ? (
            <label className="adminInv__filter">
              <span className="adminInv__label">Approved</span>
              <select className="adminInv__input" value={filters.approvedRange} onChange={(e) => updateFilter("approvedRange", e.target.value)}>
                {RANGE_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ) : null}
        </AdminFilterMore>
      </AdminFilterBar>

      <div className="adminInv__tableSection">
        {loading ? <div className="adminInv__notice">Loading investors...</div> : null}
        {!loading && error ? <div className="adminInv__notice adminInv__notice--error">{error}</div> : null}
        {!loading && !error && rows.length === 0 ? <div className="adminInv__notice">No investors found.</div> : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="adminInv__tableWrap">
              <table className="adminInv__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    {filters.status === "REJECTED" ? <th>Rejection Reason</th> : null}
                    <th>Created</th>
                    <th>Updated</th>
                    <th className="adminInv__thAction"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((investor) => (
                    <tr key={investor.id}>
                      <td>{investor.firstName} {investor.lastName}</td>
                      <td>{investor.companyName || "—"}</td>
                      <td>{investor.email || "—"}</td>
                      <td>{investor.phone || "—"}</td>
                      <td>{investor.status}</td>
                      {filters.status === "REJECTED" ? <td>{investor.rejectionReason || "—"}</td> : null}
                      <td>{prettyDate(investor.createdAt)}</td>
                      <td>{prettyDate(investor.updatedAt)}</td>
                      <td className="adminInv__tdAction">
                        <button type="button" className="adminInv__actionBtn" onClick={() => openModal(investor.id)}>
                          {investor.status === "PENDING" ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
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
              {rows.length.toLocaleString("en-US")} on page • {meta.totalElements.toLocaleString("en-US")} total
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
    </section>
  );
}
