import { useEffect, useMemo, useState } from "react";
import {
  getInquiries,
  getInquiriesByProperty,
  getInquiryByInvestor,
} from "@/api/modules/inquiryApi";
import { getPropertyId } from "@/api/modules/propertyApi";
import AdminFilterBar, { AdminFilterMore } from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import "@/features/admin/pages/AdminInquiriesPage.css";

const PAGE_SIZE = 20;

const EMAIL_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Sent", value: "SENT" },
  { label: "Failed", value: "FAILED" },
];

function parseId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return parsed;
}

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

function propertyAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  const line2 = [property.city, property.state, property.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join("\n");
}

export default function AdminInquiriesPage() {
  const [filters, setFilters] = useState({
    q: "",
    emailStatus: "",
    propertyId: "",
    investorId: "",
  });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [propertyAddressById, setPropertyAddressById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMoreFiltersSelected = useMemo(
    () => [filters.propertyId, filters.investorId].some((value) => value.trim().length > 0),
    [filters.propertyId, filters.investorId],
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      const propertyId = parseId(filters.propertyId);
      const investorId = parseId(filters.investorId);
      const q = filters.q.trim().toLowerCase();

      try {
        let data;

        if (propertyId !== null) {
          data = await getInquiriesByProperty(propertyId, { page, size: PAGE_SIZE });
        } else if (investorId !== null) {
          data = await getInquiryByInvestor(investorId, { page, size: PAGE_SIZE });
        } else {
          data = await getInquiries({ page, size: PAGE_SIZE });
        }

        if (!alive) return;

        const nextRows = (data?.content ?? []).filter((inquiry) => {
          if (filters.emailStatus && inquiry.emailStatus !== filters.emailStatus) return false;
          if (investorId !== null && inquiry.investorId !== investorId) return false;

          if (!q) return true;

          const haystack = [
            inquiry.id,
            inquiry.propertyId,
            inquiry.investorId,
            inquiry.subject,
            inquiry.messageBody,
            inquiry.contactName,
            inquiry.companyName,
            inquiry.contactEmail,
            inquiry.contactPhone,
            inquiry.emailStatus,
          ]
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ");

          return haystack.includes(q);
        });

        setRows(nextRows);
        setMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (e) {
        if (!alive) return;

        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(e?.message || "Failed to load inquiries.");
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
    let alive = true;

    const missingPropertyIds = [...new Set(rows.map((row) => row?.propertyId).filter(Boolean))].filter(
      (id) => !propertyAddressById[id],
    );
    if (!missingPropertyIds.length) return undefined;

    async function loadPropertyAddresses() {
      const entries = await Promise.all(
        missingPropertyIds.map(async (id) => {
          try {
            const property = await getPropertyId(id);
            return [id, propertyAddress(property) || `Property #${id}`];
          } catch {
            return [id, `Property #${id}`];
          }
        }),
      );

      if (!alive) return;

      setPropertyAddressById((prev) => {
        const next = { ...prev };
        entries.forEach(([id, address]) => {
          next[id] = address;
        });
        return next;
      });
    }

    loadPropertyAddresses();
    return () => {
      alive = false;
    };
  }, [rows, propertyAddressById]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function resolveAddress(inquiry) {
    const id = inquiry?.propertyId;
    return propertyAddressById[id] || `Property #${id ?? "—"}`;
  }

  const showPagination = !loading && !error && meta.totalPages > 1;

  return (
    <section className="adminInq">
      <AdminFilterBar className="adminInq__filters" rowClassName="adminInq__filterRow" onSubmit={(e) => e.preventDefault()}>
        <label className="adminInq__filter">
          <span className="adminInq__label">Search</span>
          <input
            className="adminInq__input adminInq__input--text"
            type="search"
            placeholder="Address, contact, company, email, phone"
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
          />
        </label>

        <label className="adminInq__filter">
          <span className="adminInq__label">Email Status</span>
          <select
            className="adminInq__input"
            value={filters.emailStatus}
            onChange={(e) => updateFilter("emailStatus", e.target.value)}
          >
            {EMAIL_STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <AdminFilterMore
          className="adminInq__moreMenu"
          summaryClassName="adminInq__moreSummary"
          summaryActiveClassName="adminInq__moreSummary--active"
          bodyClassName="adminInq__moreBody"
          active={hasMoreFiltersSelected}
          summaryLabel="More"
        >
          <label className="adminInq__filter">
            <span className="adminInq__label">Property ID</span>
            <input
              className="adminInq__input adminInq__input--text"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 101"
              value={filters.propertyId}
              onChange={(e) =>
                updateFilter("propertyId", e.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>

          <label className="adminInq__filter">
            <span className="adminInq__label">Investor ID</span>
            <input
              className="adminInq__input adminInq__input--text"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 42"
              value={filters.investorId}
              onChange={(e) =>
                updateFilter("investorId", e.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>
        </AdminFilterMore>
      </AdminFilterBar>

      <div className="adminInq__tableSection">
        {loading ? <div className="adminInq__notice">Loading inquiries...</div> : null}
        {!loading && error ? (
          <div className="adminInq__notice adminInq__notice--error">{error}</div>
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <div className="adminInq__notice">No inquiries found.</div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="adminInq__tableWrap">
              <table className="adminInq__table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Message</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>{inquiry.contactName || "—"}</td>
                      <td className="adminInq__tdAddress" title={resolveAddress(inquiry)}>
                        {resolveAddress(inquiry)}
                      </td>
                      <td className="adminInq__tdMessage" title={inquiry.messageBody || ""}>
                        {inquiry.messageBody || "—"}
                      </td>
                      <td>{inquiry.companyName || "—"}</td>
                      <td>{inquiry.contactEmail || "—"}</td>
                      <td>{inquiry.contactPhone || "—"}</td>
                      <td>{inquiry.emailStatus || "—"}</td>
                      <td>{prettyDateTime(inquiry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </>
        ) : null}

        {showPagination ? (
          <AdminPagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            className="adminInq__pagination"
            buttonClassName="adminInq__pageBtn"
            numbersClassName="adminInq__pageNums"
            numberButtonClassName="adminInq__pageBtn--num"
            activeNumberClassName="adminInq__pageBtn--active"
            dotsClassName="adminInq__dots"
            metaClassName="adminInq__pageMeta"
            metaValueClassName="adminInq__pageMetaNum"
          />
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="adminInq__meta">
            {rows.length.toLocaleString("en-US")} on page • {meta.totalElements.toLocaleString("en-US")} total
          </div>
        ) : null}
      </div>
    </section>
  );
}
