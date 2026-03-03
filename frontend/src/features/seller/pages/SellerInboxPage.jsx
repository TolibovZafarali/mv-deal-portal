import { useEffect, useMemo, useState } from "react";
import { getSellerInquiries } from "@/api/modules/inquiryApi";
import { getSellerPropertyById } from "@/api/modules/sellerPropertyApi";
import "@/features/seller/pages/SellerInboxPage.css";

const PAGE_SIZE = 20;

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  const line2 = [property.city, property.state, property.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" • ");
}

export default function SellerInboxPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [propertyContextById, setPropertyContextById] = useState({});

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getSellerInquiries({ page, size: PAGE_SIZE, sort: "createdAt,desc" });
        if (!alive) return;

        const nextRows = data?.content ?? [];
        setRows(nextRows);
        setMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(nextError?.message || "Failed to load seller inbox.");
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

    const missingPropertyIds = [...new Set(rows.map((row) => row?.propertyId).filter(Boolean))].filter(
      (propertyId) => !propertyContextById[propertyId],
    );
    if (!missingPropertyIds.length) return undefined;

    (async () => {
      const pairs = await Promise.all(
        missingPropertyIds.map(async (propertyId) => {
          try {
            const property = await getSellerPropertyById(propertyId);
            return [
              propertyId,
              {
                title: compactAddress(property) || `Property #${propertyId}`,
                address: compactAddress(property),
              },
            ];
          } catch {
            return [propertyId, { title: `Property #${propertyId}`, address: "" }];
          }
        }),
      );

      if (!alive) return;

      setPropertyContextById((prev) => {
        const next = { ...prev };
        pairs.forEach(([propertyId, context]) => {
          next[propertyId] = context;
        });
        return next;
      });
    })();

    return () => {
      alive = false;
    };
  }, [rows, propertyContextById]);

  const subtitle = useMemo(() => {
    if (loading) return "Loading inbox...";
    if (error) return error;
    return `${meta.totalElements.toLocaleString("en-US")} inquiries`;
  }, [loading, error, meta.totalElements]);

  return (
    <section className="sellerInbox">
      <header>
        <h2>Seller Inbox</h2>
        <p>{subtitle}</p>
      </header>

      <div className="sellerInbox__tableWrap">
        <table className="sellerInbox__table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Investor ID</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="sellerInbox__empty">
                  Investor messages are handled by Megna Team.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const propertyContext = propertyContextById[row.propertyId];

              return (
                <tr key={row.id}>
                  <td>
                    <div>{propertyContext?.title || `Property #${row.propertyId}`}</div>
                    <div className="sellerInbox__subtle">{propertyContext?.address || ""}</div>
                  </td>
                  <td>{row.investorId}</td>
                  <td>
                    <div>{row.contactName}</div>
                    <div className="sellerInbox__subtle">{row.companyName || "—"}</div>
                    <div className="sellerInbox__subtle">{row.contactEmail}</div>
                    <div className="sellerInbox__subtle">{row.contactPhone}</div>
                  </td>
                  <td>
                    <div>{row.subject || "No subject"}</div>
                    <div className="sellerInbox__message">{row.messageBody}</div>
                  </td>
                  <td>{formatDateTime(row.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 ? (
        <div className="sellerInbox__pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Prev
          </button>
          <span>
            Page {page + 1} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
