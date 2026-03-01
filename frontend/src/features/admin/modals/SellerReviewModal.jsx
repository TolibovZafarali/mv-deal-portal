import { useMemo, useState } from "react";
import Modal from "@/shared/ui/modal/Modal";
import "@/features/admin/modals/SellerReviewModal.css";

function SellerReviewModalBody({ property, submitting, submitError, onClose, onSubmit }) {
  const [action, setAction] = useState("PUBLISH");
  const [reviewNote, setReviewNote] = useState("");
  const address = [property.street1, property.street2, property.city, property.state, property.zip]
    .filter((value) => String(value ?? "").trim().length > 0)
    .join(", ");

  const requiresNote = useMemo(() => action === "REQUEST_CHANGES", [action]);

  function handleSubmit() {
    if (requiresNote && !reviewNote.trim()) return;
    onSubmit?.({ action, reviewNote });
  }

  return (
    <div className="sellerReview">
      <div className="sellerReview__meta">
        <div><span>Property:</span> #{property.id}</div>
        <div><span>Title:</span> {property.title || "—"}</div>
        <div><span>Address:</span> {address || "—"}</div>
        <div><span>Current Workflow:</span> {property.sellerWorkflowStatus || "—"}</div>
      </div>

      <div className="sellerReview__actionGroup">
        <button
          className={`sellerReview__choice ${action === "PUBLISH" ? "sellerReview__choice--active" : ""}`}
          type="button"
          onClick={() => setAction("PUBLISH")}
          disabled={submitting}
        >
          Publish
        </button>
        <button
          className={`sellerReview__choice sellerReview__choice--warning ${action === "REQUEST_CHANGES" ? "sellerReview__choice--active" : ""}`}
          type="button"
          onClick={() => setAction("REQUEST_CHANGES")}
          disabled={submitting}
        >
          Request Changes
        </button>
      </div>

      <label className="sellerReview__noteWrap">
        <span>Review note {requiresNote ? "(required)" : "(optional)"}</span>
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={4}
          maxLength={1000}
          disabled={submitting}
          placeholder={requiresNote ? "Explain what must be changed" : "Optional context for seller"}
        />
      </label>

      {submitError ? <div className="sellerReview__error">{submitError}</div> : null}

      <div className="sellerReview__actions">
        <button type="button" className="sellerReview__btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="sellerReview__btn sellerReview__btn--primary"
          onClick={handleSubmit}
          disabled={submitting || (requiresNote && !reviewNote.trim())}
        >
          {submitting ? "Saving..." : "Save Decision"}
        </button>
      </div>
    </div>
  );
}

export default function SellerReviewModal({
  open,
  property,
  submitting = false,
  submitError = "",
  onClose,
  onSubmit,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Review Seller Listing" width={700}>
      {!property ? null : (
        <SellerReviewModalBody
          key={`seller-review-${property.id}-${open ? "open" : "closed"}`}
          property={property}
          submitting={submitting}
          submitError={submitError}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}
