import { useMemo, useState } from "react";
import Modal from "@/shared/ui/modal/Modal";
import "@/features/admin/modals/SellerReviewModal.css";

const MAX_REVIEW_NOTE_CHARS = 200;

function SellerReviewModalBody({ property, submitting, submitError, onClose, onSubmit }) {
  const [action, setAction] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const line1 = [property.street1, property.street2]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const stateZip = [property.state, property.zip]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const line2 = [property.city, stateZip]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const address = [line1, line2].filter(Boolean).join(", ");

  const requiresNote = useMemo(() => action === "REQUEST_CHANGES", [action]);
  const remainingNoteChars = Math.max(0, MAX_REVIEW_NOTE_CHARS - reviewNote.length);

  function handleSubmit() {
    if (!action) return;
    if (requiresNote && !reviewNote.trim()) return;
    onSubmit?.({ action, reviewNote });
  }

  return (
    <div className="sellerReview">
      <div className="sellerReview__meta">
        <div><span>Property:</span> #{property.id}</div>
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
          className={`sellerReview__choice sellerReview__choice--warning ${action === "REQUEST_CHANGES" ? "sellerReview__choice--warningActive" : ""}`}
          type="button"
          onClick={() => setAction("REQUEST_CHANGES")}
          disabled={submitting}
        >
          Request Changes
        </button>
      </div>

      <label className="sellerReview__noteWrap">
        <span className="sellerReview__noteHead">
          <span>Review note {requiresNote ? "(required)" : "(optional)"}</span>
          <span className="sellerReview__noteHint">{remainingNoteChars}/{MAX_REVIEW_NOTE_CHARS}</span>
        </span>
        <textarea
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          rows={4}
          maxLength={MAX_REVIEW_NOTE_CHARS}
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
          className="sellerReview__btn"
          onClick={handleSubmit}
          disabled={submitting || !action || (requiresNote && !reviewNote.trim())}
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
