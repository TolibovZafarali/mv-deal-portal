import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  approveInvestor,
  getAdminInvestorById,
  rejectInvestor,
  updateInvestorRejectionReason,
} from "@/api/modules/adminInvestorApi";
import {
  moderatePropertyChangeRequest,
  reviewSellerProperty,
} from "@/api/modules/sellerPropertyApi";
import useAdminQueue from "@/features/admin/hooks/useAdminQueue";
import AdminInvestorReviewModal from "@/features/admin/modals/AdminInvestorReviewModal";
import SellerReviewModal from "@/features/admin/modals/SellerReviewModal";
import ChangeRequestDecisionModal from "@/features/admin/modals/ChangeRequestDecisionModal";
import {
  signalAdminQueueRefresh,
  startAdminTimer,
  trackAdminEvent,
} from "@/features/admin/utils/adminTelemetry";
import "@/features/admin/pages/AdminQueuePage.css";

function prettyDate(value) {
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
  const line1 = [property?.street1, property?.street2].filter(Boolean).join(", ");
  const line2 = [property?.city, property?.state, property?.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" ") || `Property #${property?.id ?? "—"}`;
}

function investorName(investor) {
  const full = [investor?.firstName, investor?.lastName].filter(Boolean).join(" ").trim();
  return full || investor?.email || `Investor #${investor?.id ?? "—"}`;
}

function QueueSection({ title, count, emptyMessage, children }) {
  return (
    <section className="adminQueue__section">
      <header className="adminQueue__sectionHead">
        <h3>{title}</h3>
        <span className="adminQueue__count">{count}</span>
      </header>
      {count === 0 ? <div className="adminQueue__empty">{emptyMessage}</div> : <div className="adminQueue__list">{children}</div>}
    </section>
  );
}

export default function AdminQueuePage() {
  const navigate = useNavigate();
  const { counts, sections, queueItems, loading, error, partialErrors, refresh } = useAdminQueue({ includeItems: true });

  const [sellerReviewTarget, setSellerReviewTarget] = useState(null);
  const [sellerReviewSubmitting, setSellerReviewSubmitting] = useState(false);
  const [sellerReviewError, setSellerReviewError] = useState("");

  const [changeRequestTarget, setChangeRequestTarget] = useState(null);
  const [changeRequestSubmitting, setChangeRequestSubmitting] = useState(false);
  const [changeRequestError, setChangeRequestError] = useState("");

  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  const [investorLoadingId, setInvestorLoadingId] = useState(null);
  const [investorSubmitting, setInvestorSubmitting] = useState(false);
  const [investorSubmitError, setInvestorSubmitError] = useState("");

  function openDetails(path, detail = {}) {
    trackAdminEvent("admin.queue.open_details", { path, detail });
    navigate(path, { state: { fromQueue: true, ...detail } });
  }

  async function handleSellerReviewSubmit({ action, reviewNote }) {
    if (!sellerReviewTarget) return;

    const stop = startAdminTimer("admin.queue.seller_review", {
      propertyId: sellerReviewTarget.id,
      action,
    });

    setSellerReviewSubmitting(true);
    setSellerReviewError("");

    try {
      await reviewSellerProperty(sellerReviewTarget.id, action, reviewNote ?? "");
      stop("success");
      signalAdminQueueRefresh();
      setSellerReviewTarget(null);
      refresh();
    } catch (e) {
      setSellerReviewError(e?.message || "Failed to save seller review.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setSellerReviewSubmitting(false);
    }
  }

  async function handleChangeRequestSubmit({ action, adminNote }) {
    if (!changeRequestTarget) return;

    const stop = startAdminTimer("admin.queue.change_request", {
      requestId: changeRequestTarget.id,
      action,
    });

    setChangeRequestSubmitting(true);
    setChangeRequestError("");

    try {
      await moderatePropertyChangeRequest(changeRequestTarget.id, action, adminNote ?? "");
      stop("success");
      signalAdminQueueRefresh();
      setChangeRequestTarget(null);
      refresh();
    } catch (e) {
      setChangeRequestError(e?.message || "Failed to save change request decision.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setChangeRequestSubmitting(false);
    }
  }

  async function openInvestorReview(id) {
    if (!id) return;

    const stop = startAdminTimer("admin.queue.open_investor", { investorId: id });

    setInvestorLoadingId(id);
    setInvestorSubmitError("");

    try {
      const investor = await getAdminInvestorById(id);
      setSelectedInvestor(investor);
      setInvestorModalOpen(true);
      stop("success");
    } catch (e) {
      setInvestorSubmitError(e?.message || "Failed to load investor details.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setInvestorLoadingId(null);
    }
  }

  async function handleInvestorSave({ status, rejectionReason }) {
    if (!selectedInvestor) return;

    const stop = startAdminTimer("admin.queue.investor_review", {
      investorId: selectedInvestor.id,
      action: status,
    });

    setInvestorSubmitting(true);
    setInvestorSubmitError("");

    try {
      if (selectedInvestor.status === "PENDING") {
        if (status === "APPROVED") await approveInvestor(selectedInvestor.id);
        if (status === "REJECTED") await rejectInvestor(selectedInvestor.id, rejectionReason.trim());
      } else if (selectedInvestor.status === "REJECTED") {
        await updateInvestorRejectionReason(selectedInvestor.id, rejectionReason.trim());
      }

      stop("success");
      signalAdminQueueRefresh();
      setInvestorModalOpen(false);
      setSelectedInvestor(null);
      refresh();
    } catch (e) {
      setInvestorSubmitError(e?.message || "Failed to save investor.");
      stop("error", { error: e?.message || "unknown" });
    } finally {
      setInvestorSubmitting(false);
    }
  }

  return (
    <section className="adminQueue">
      <header className="adminQueue__header">
        <h2>Action Queue</h2>
        <div className="adminQueue__meta">{queueItems.length} items loaded • {counts.submittedProperties + counts.openChangeRequests + counts.pendingInvestors} total pending</div>
      </header>

      {loading ? <div className="adminQueue__notice">Loading queue...</div> : null}
      {!loading && error ? <div className="adminQueue__notice adminQueue__notice--error">{error}</div> : null}
      {!loading && !error && partialErrors.length > 0 ? (
        <div className="adminQueue__notice adminQueue__notice--warn">{partialErrors.join(" ")}</div>
      ) : null}
      {!loading && !error && queueItems.length === 0 ? (
        <div className="adminQueue__notice">No actions pending right now.</div>
      ) : null}

      <div className="adminQueue__grid">
        <QueueSection title="Submitted Listings" count={counts.submittedProperties} emptyMessage="No submitted listings in this page of queue results.">
          {sections.submittedListings.map((property) => (
            <article className="adminQueue__item" key={`submitted-${property.id}`}>
              <div className="adminQueue__itemMain">
                <div className="adminQueue__itemTitle">{propertyAddress(property)}</div>
                <div className="adminQueue__itemSub">Property #{property.id} • {property.title || "Untitled listing"}</div>
                <div className="adminQueue__itemTime">Submitted {prettyDate(property.submittedAt || property.updatedAt || property.createdAt)}</div>
              </div>
              <div className="adminQueue__itemActions">
                <button
                  type="button"
                  className="adminQueue__btn adminQueue__btn--primary"
                  onClick={() => {
                    setSellerReviewError("");
                    setSellerReviewTarget(property);
                  }}
                >
                  Review listing
                </button>
                <button type="button" className="adminQueue__btn" onClick={() => openDetails("/admin/properties", { propertyId: property.id })}>
                  Open details
                </button>
              </div>
            </article>
          ))}
        </QueueSection>

        <QueueSection title="Open Change Requests" count={counts.openChangeRequests} emptyMessage="No open change requests in this page of queue results.">
          {sections.openChangeRequests.map((request) => (
            <article className="adminQueue__item" key={`change-${request.id}`}>
              <div className="adminQueue__itemMain">
                <div className="adminQueue__itemTitle">Change request #{request.id}</div>
                <div className="adminQueue__itemSub">Property #{request.propertyId} • Seller #{request.sellerId}</div>
                <div className="adminQueue__itemBody">{request.requestedChanges || "No change details provided."}</div>
                <div className="adminQueue__itemTime">Created {prettyDate(request.createdAt || request.updatedAt)}</div>
              </div>
              <div className="adminQueue__itemActions">
                <button
                  type="button"
                  className="adminQueue__btn adminQueue__btn--primary"
                  onClick={() => {
                    setChangeRequestError("");
                    setChangeRequestTarget(request);
                  }}
                >
                  Resolve request
                </button>
                <button type="button" className="adminQueue__btn" onClick={() => openDetails("/admin/properties", { propertyId: request.propertyId })}>
                  Open details
                </button>
              </div>
            </article>
          ))}
        </QueueSection>

        <QueueSection title="Pending Investors" count={counts.pendingInvestors} emptyMessage="No pending investors in this page of queue results.">
          {sections.pendingInvestors.map((investor) => (
            <article className="adminQueue__item" key={`investor-${investor.id}`}>
              <div className="adminQueue__itemMain">
                <div className="adminQueue__itemTitle">{investorName(investor)}</div>
                <div className="adminQueue__itemSub">{investor.companyName || investor.email || "No company"}</div>
                <div className="adminQueue__itemTime">Requested {prettyDate(investor.createdAt)}</div>
              </div>
              <div className="adminQueue__itemActions">
                <button
                  type="button"
                  className="adminQueue__btn adminQueue__btn--primary"
                  onClick={() => openInvestorReview(investor.id)}
                  disabled={investorLoadingId === investor.id}
                >
                  {investorLoadingId === investor.id ? "Loading..." : "Review investor"}
                </button>
                <button type="button" className="adminQueue__btn" onClick={() => openDetails("/admin/investors", { investorId: investor.id })}>
                  Open details
                </button>
              </div>
            </article>
          ))}
        </QueueSection>
      </div>

      <SellerReviewModal
        open={Boolean(sellerReviewTarget)}
        property={sellerReviewTarget}
        submitting={sellerReviewSubmitting}
        submitError={sellerReviewError}
        onClose={() => {
          if (sellerReviewSubmitting) return;
          setSellerReviewTarget(null);
          setSellerReviewError("");
        }}
        onSubmit={handleSellerReviewSubmit}
      />

      <ChangeRequestDecisionModal
        open={Boolean(changeRequestTarget)}
        request={changeRequestTarget}
        submitting={changeRequestSubmitting}
        submitError={changeRequestError}
        onClose={() => {
          if (changeRequestSubmitting) return;
          setChangeRequestTarget(null);
          setChangeRequestError("");
        }}
        onSubmit={handleChangeRequestSubmit}
      />

      <AdminInvestorReviewModal
        open={investorModalOpen}
        investor={selectedInvestor}
        submitting={investorSubmitting}
        submitError={investorSubmitError}
        onClose={() => {
          if (investorSubmitting) return;
          setInvestorModalOpen(false);
          setSelectedInvestor(null);
          setInvestorSubmitError("");
        }}
        onSave={handleInvestorSave}
      />
    </section>
  );
}
