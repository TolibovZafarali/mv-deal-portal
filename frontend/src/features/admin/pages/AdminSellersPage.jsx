import { useEffect, useState } from "react";
import { searchAdminSellers } from "@/api/modules/sellerApi";
import AdminFilterBar from "@/features/admin/components/AdminFilterBar";
import AdminPagination from "@/features/admin/components/AdminPagination";
import "@/features/admin/pages/AdminSellersPage.css";

const PAGE_SIZE = 20;

function prettyDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function prettyEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminSellersPage() {
  const [filters, setFilters] = useState({ q: "" });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await searchAdminSellers(
          {
            q: filters.q.trim(),
          },
          { page, size: PAGE_SIZE, sort: "createdAt,desc" },
        );

        if (!alive) return;
        setRows(data?.content ?? []);
        setMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (e) {
        if (!alive) return;
        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(e?.message || "Failed to load sellers.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [filters, page]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput }));
    setPage(0);
  }

  return (
    <section className="adminSel">
      <AdminFilterBar className="adminSel__filters" rowClassName="adminSel__filterRow" onSubmit={handleSearchSubmit}>
        <label className="adminSel__filter">
          <span className="adminSel__label">Search</span>
          <div className="adminSel__searchWrap">
            <input
              className="adminSel__input adminSel__input--text adminSel__input--search"
              type="search"
              placeholder="Name, company, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="adminSel__searchBtn" type="submit" aria-label="Search sellers">
              <span className="material-symbols-outlined adminSel__searchIcon" aria-hidden="true">search</span>
            </button>
          </div>
        </label>
      </AdminFilterBar>

      <div className="adminSel__tableSection">
        <h3 className="adminSel__sectionTitle">Sellers</h3>
        {loading ? <div className="adminSel__notice">Loading sellers...</div> : null}
        {!loading && error ? <div className="adminSel__notice adminSel__notice--error">{error}</div> : null}
        {!loading && !error && rows.length === 0 ? <div className="adminSel__notice">No sellers found.</div> : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="adminSel__tableWrap">
              <table className="adminSel__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((seller) => (
                    <tr key={seller.id}>
                      <td>{seller.firstName} {seller.lastName}</td>
                      <td>{seller.companyName || "—"}</td>
                      <td>{seller.email || "—"}</td>
                      <td>{seller.phone || "—"}</td>
                      <td>{prettyEnum(seller.status)}</td>
                      <td>{prettyDate(seller.createdAt)}</td>
                      <td>{prettyDate(seller.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
              className="adminSel__pagination"
              buttonClassName="adminSel__pageBtn"
              numbersClassName="adminSel__pageNums"
              numberButtonClassName="adminSel__pageBtn--num"
              activeNumberClassName="adminSel__pageBtn--active"
              dotsClassName="adminSel__dots"
              metaClassName="adminSel__pageMeta"
              metaValueClassName="adminSel__pageMetaNum"
            />
          </>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="adminSel__meta">
            {rows.length.toLocaleString("en-US")} on page • {meta.totalElements.toLocaleString("en-US")} total
          </div>
        ) : null}
      </div>
    </section>
  );
}
