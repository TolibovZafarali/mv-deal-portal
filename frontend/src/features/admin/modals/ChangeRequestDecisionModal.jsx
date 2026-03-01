import { useState } from "react";
import Modal from "@/shared/ui/modal/Modal";
import "@/features/admin/modals/ChangeRequestDecisionModal.css";

function ChangeRequestDecisionModalBody({
  request,
  submitting,
  submitError,
  onClose,
  onSubmit,
}) {
  const [action, setAction] = useState("APPLIED");
  const [adminNote, setAdminNote] = useState("");

  function handleSubmit() {
    onSubmit?.({ action, adminNote });
  }

  return (
    <div className="changeDecision">
      <div className="changeDecision__meta">
        <div><span>Request:</span> #{request.id}</div>
        <div><span>Property:</span> #{request.propertyId}</div>
        <div><span>Seller:</span> #{request.sellerId}</div>
      </div>

      <div className="changeDecision__requestBody">{request.requestedChanges || "No change details provided."}</div>

      <div className="changeDecision__actionGroup">
        <button
          className={`changeDecision__choice ${action === "APPLIED" ? "changeDecision__choice--active" : ""}`}
          type="button"
          onClick={() => setAction("APPLIED")}
          disabled={submitting}
        >
          Apply
        </button>
        <button
          className={`changeDecision__choice changeDecision__choice--danger ${action === "REJECTED" ? "changeDecision__choice--active" : ""}`}
          type="button"
          onClick={() => setAction("REJECTED")}
          disabled={submitting}
        >
          Reject
        </button>
      </div>

      <label className="changeDecision__noteWrap">
        <span>Admin note (optional)</span>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          maxLength={1000}
          disabled={submitting}
          placeholder="Add context for this decision"
        />
      </label>

      {submitError ? <div className="changeDecision__error">{submitError}</div> : null}

      <div className="changeDecision__actions">
        <button type="button" className="changeDecision__btn" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className="changeDecision__btn changeDecision__btn--primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Decision"}
        </button>
      </div>
    </div>
  );
}

export default function ChangeRequestDecisionModal({
  open,
  request,
  submitting = false,
  submitError = "",
  onClose,
  onSubmit,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Resolve Change Request" width={760}>
      {!request ? null : (
        <ChangeRequestDecisionModalBody
          key={`change-decision-${request.id}-${open ? "open" : "closed"}`}
          request={request}
          submitting={submitting}
          submitError={submitError}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}
