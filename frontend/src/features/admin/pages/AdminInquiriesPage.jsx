import { useEffect, useMemo, useState } from "react";
import {
  getInquiries,
} from "@/api/modules/inquiryApi";
import { getPropertyId } from "@/api/modules/propertyApi";
import AdminFilterBar, { AdminFilterMore } from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import useFilterBarMinWidth from "@/features/admin/hooks/useFilterBarMinWidth";
import "@/features/admin/pages/AdminInquiriesPage.css";

const PAGE_SIZE = 20;
const INQUIRIES_INLINE_STATUS_MIN_WIDTH = 980;

const EMAIL_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Sent", value: "SENT" },
  { label: "Failed", value: "FAILED" },
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
  });
  const { setFilterBarRef, isWideEnough: showStatusInline } = useFilterBarMinWidth(INQUIRIES_INLINE_STATUS_MIN_WIDTH);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rawRows, setRawRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [propertyAddressById, setPropertyAddressById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filterRowClassName = showStatusInline
    ? "adminInq__filterRow adminInq__filterRow--statusInline"
    : "adminInq__filterRow adminInq__filterRow--withMore";

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getInquiries({ page, size: PAGE_SIZE });

        if (!alive) return;

        setRawRows(data?.content ?? []);
        setMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (e) {
        if (!alive) return;

        setRawRows([]);
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
  }, [page]);

  useEffect(() => {
    let alive = true;

    const missingPropertyIds = [...new Set(rawRows.map((row) => row?.propertyId).filter(Boolean))].filter(
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
  }, [rawRows, propertyAddressById]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput }));
    setPage(0);
  }

  function resolveAddress(inquiry) {
    const id = inquiry?.propertyId;
    return propertyAddressById[id] || `Property #${id ?? "—"}`;
  }

  const filteredRows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return rawRows.filter((inquiry) => {
      const resolvedAddress = propertyAddressById[inquiry?.propertyId] || `Property #${inquiry?.propertyId ?? "—"}`;

      if (filters.emailStatus && inquiry.emailStatus !== filters.emailStatus) return false;

      if (!q) return true;

      const haystack = [
        inquiry.id,
        inquiry.propertyId,
        inquiry.investorId,
        resolvedAddress,
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
  }, [rawRows, filters, propertyAddressById]);
  const hasMoreFiltersSelected = Boolean(filters.emailStatus);

  const showPagination = !loading && !error && meta.totalPages > 1;

  return (
    <section className="adminInq">
      <AdminFilterBar
        className="adminInq__filters"
        rowClassName={filterRowClassName}
        onSubmit={handleSearchSubmit}
        containerRef={setFilterBarRef}
      >
        <label className="adminInq__filter adminInq__filter--search">
          <span className="adminInq__label">Search</span>
          <div className="adminInq__searchWrap">
            <input
              className="adminInq__input adminInq__input--text adminInq__input--search"
              type="search"
              placeholder="Address, contact, company, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="adminInq__searchBtn" type="submit" aria-label="Search inquiries">
              <span className="material-symbols-outlined adminInq__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>
        </label>

        {showStatusInline ? (
          <label className="adminInq__filter adminInq__filter--status">
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
        ) : (
          <AdminFilterMore
            className="adminInq__moreMenu"
            summaryClassName="adminInq__moreSummary"
            summaryActiveClassName="adminInq__moreSummary--active"
            bodyClassName="adminInq__moreBody"
            active={hasMoreFiltersSelected}
            summaryLabel="More"
          >
            <label className="adminInq__filter adminInq__filter--status">
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
          </AdminFilterMore>
        )}
      </AdminFilterBar>

      <div className="adminInq__tableSection">
        <h3 className="adminInq__sectionTitle">Inquiries</h3>
        {loading ? <div className="adminInq__notice">Loading inquiries...</div> : null}
        {!loading && error ? (
          <div className="adminInq__notice adminInq__notice--error">{error}</div>
        ) : null}
        {!loading && !error && filteredRows.length === 0 ? (
          <div className="adminInq__notice">No inquiries found.</div>
        ) : null}

        {!loading && filteredRows.length > 0 ? (
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
                  {filteredRows.map((inquiry) => (
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

        {!loading && !error && filteredRows.length > 0 ? (
          <div className="adminInq__meta">
            {filteredRows.length.toLocaleString("en-US")} on page • {meta.totalElements.toLocaleString("en-US")} total
          </div>
        ) : null}
      </div>
    </section>
  );
}
