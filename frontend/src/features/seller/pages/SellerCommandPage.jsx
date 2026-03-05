import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getSellerProperties, getSellerPropertyChangeRequests } from "@/api/modules/sellerPropertyApi";
import "@/features/seller/pages/SellerCommandPage.css";

const PAGE_SIZE = 30;

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

function prettyEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function addressLine(row) {
  const line1 = [row?.street1, row?.street2].filter(Boolean).join(", ");
  const stateZip = [row?.state, row?.zip].filter(Boolean).join(" ");
  const line2 = [row?.city, stateZip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" • ") || `Property #${row?.id ?? "—"}`;
}

function workflowPriority(row) {
  const workflow = row?.sellerWorkflowStatus;
  if (workflow === "CHANGES_REQUESTED") return 0;
  if (workflow === "DRAFT") return 1;
  if (workflow === "SUBMITTED") return 2;
  if (workflow === "PUBLISHED") return 3;
  return 9;
}

export default function SellerCommandPage() {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const summary = outlet.dashboardSummary;

  const [rows, setRows] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [listingsPage, requestsPage] = await Promise.all([
          getSellerProperties({ page: 0, size: PAGE_SIZE, sort: "updatedAt,desc" }),
          getSellerPropertyChangeRequests({ page: 0, size: PAGE_SIZE, sort: "updatedAt,desc" }),
        ]);

        if (!alive) return;
        setRows(Array.isArray(listingsPage?.content) ? listingsPage.content : []);
        setChangeRequests(Array.isArray(requestsPage?.content) ? requestsPage.content : []);
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setChangeRequests([]);
        setError(nextError?.message || "Failed to load command center.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const drafts = rows.filter((row) => row?.sellerWorkflowStatus === "DRAFT").length;
    const submitted = rows.filter((row) => row?.sellerWorkflowStatus === "SUBMITTED").length;
    const changesRequested = rows.filter((row) => row?.sellerWorkflowStatus === "CHANGES_REQUESTED").length;
    const published = rows.filter((row) => row?.sellerWorkflowStatus === "PUBLISHED").length;
    const openRequests = changeRequests.filter((request) => request?.status === "OPEN").length;

    return [
      { label: "Drafts", value: Number(summary?.drafts ?? drafts) },
      { label: "Submitted", value: Number(summary?.submitted ?? submitted) },
      { label: "Changes Requested", value: Number(summary?.changesRequested ?? changesRequested) },
      { label: "Published", value: Number(summary?.published ?? published) },
      { label: "Open Requests", value: Number(summary?.openRequests ?? openRequests) },
    ];
  }, [changeRequests, rows, summary]);

  const priorityQueue = useMemo(() => {
    return [...rows]
      .sort((left, right) => {
        const priorityDiff = workflowPriority(left) - workflowPriority(right);
        if (priorityDiff !== 0) return priorityDiff;

        const leftTime = new Date(left?.updatedAt ?? 0).getTime() || 0;
        const rightTime = new Date(right?.updatedAt ?? 0).getTime() || 0;
        return leftTime - rightTime;
      })
      .slice(0, 8);
  }, [rows]);

  const activity = useMemo(() => {
    const listingEvents = rows.map((row) => ({
      kind: "listing",
      id: `listing-${row.id}`,
      title: `${prettyEnum(row?.sellerWorkflowStatus || "DRAFT")} • ${addressLine(row)}`,
      timestamp: row?.updatedAt,
      route: `/seller/listings/${row.id}/edit`,
      subtitle: row?.sellerReviewNote || "",
    }));

    const requestEvents = changeRequests.map((request) => ({
      kind: "change-request",
      id: `request-${request.id}`,
      title: `${prettyEnum(request?.status)} change request • Property #${request?.propertyId ?? "—"}`,
      timestamp: request?.updatedAt || request?.createdAt,
      route: "/seller/inbox",
      subtitle: request?.adminNote || request?.requestedChanges || "",
    }));

    return [...listingEvents, ...requestEvents]
      .sort((left, right) => {
        const leftTime = new Date(left?.timestamp ?? 0).getTime() || 0;
        const rightTime = new Date(right?.timestamp ?? 0).getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 12);
  }, [changeRequests, rows]);

  return (
    <section className="sellerCommand">
      <header className="sellerCommand__header">
        <div>
          <h2>Seller Command Center</h2>
          <p>Fast path from draft to review-ready submission.</p>
        </div>
        <button type="button" className="sellerCommand__newBtn" onClick={() => navigate("/seller/listings/new")}>New Draft</button>
      </header>

      {loading ? <div className="sellerCommand__notice">Loading command center...</div> : null}
      {error ? <div className="sellerCommand__error">{error}</div> : null}

      <div className="sellerCommand__cards">
        {cards.map((card) => (
          <article key={card.label} className="sellerCommandCard">
            <div className="sellerCommandCard__label">{card.label}</div>
            <div className="sellerCommandCard__value">{card.value.toLocaleString("en-US")}</div>
          </article>
        ))}
      </div>

      <div className="sellerCommand__columns">
        <section className="sellerCommandPanel">
          <header className="sellerCommandPanel__head">
            <h3>Priority Queue</h3>
          </header>

          {priorityQueue.length === 0 ? (
            <div className="sellerCommandPanel__empty">No items requiring action.</div>
          ) : (
            <ul className="sellerCommandList">
              {priorityQueue.map((row) => (
                <li key={`priority-${row.id}`} className="sellerCommandList__row">
                  <div className="sellerCommandList__title">{addressLine(row)}</div>
                  <div className="sellerCommandList__meta">{prettyEnum(row?.sellerWorkflowStatus || "DRAFT")} • Updated {formatDateTime(row?.updatedAt)}</div>
                  <div className="sellerCommandList__actions">
                    <button type="button" onClick={() => navigate(`/seller/listings/${row.id}/edit`)}>Resume Draft</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sellerCommandPanel">
          <header className="sellerCommandPanel__head">
            <h3>Recent Activity</h3>
          </header>

          {activity.length === 0 ? (
            <div className="sellerCommandPanel__empty">No recent activity yet.</div>
          ) : (
            <ul className="sellerCommandActivity">
              {activity.map((item) => (
                <li key={item.id} className="sellerCommandActivity__row">
                  <button type="button" className="sellerCommandActivity__link" onClick={() => navigate(item.route)}>
                    <div className="sellerCommandActivity__title">{item.title}</div>
                    <div className="sellerCommandActivity__time">{formatDateTime(item.timestamp)}</div>
                    {item.subtitle ? <div className="sellerCommandActivity__subtitle">{item.subtitle}</div> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
