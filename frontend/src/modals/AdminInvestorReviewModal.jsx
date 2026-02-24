import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import "./AdminInvestorReviewModal.css";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminInvestorReviewModal({
  open,
  investor,
  submitting = false,
  submitError = "",
  onClose,
  onSave,
}) {
  const status = investor?.status ?? "";
  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";
  const isRejected = status === "REJECTED";

  const [nextStatus, setNextStatus] = useState("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!open || !investor) return;
    setNextStatus(isPending ? "APPROVED" : status);
    setRejectionReason(investor.rejectionReason ?? "");
  }, [open, investor, status, isPending]);

  const isReadOnly = isApproved;
  const requiresReason = useMemo(
    () => (isPending && nextStatus === "REJECTED") || isRejected,
    [isPending, nextStatus, isRejected],
  );

  function handleSave() {
    if (isReadOnly) return;
    onSave?.({ status: nextStatus, rejectionReason });
  }

  return (
    <Modal
      open={open}
      title={isPending ? "Review Investor" : "Investor Details"}
      onClose={onClose}
      width={760}
    >
      {!investor ? null : (
        <div className="invModal">
          <div className="invModal__grid">
            <div><span>Name:</span> {investor.firstName} {investor.lastName}</div>
            <div><span>Company:</span> {investor.companyName || "—"}</div>
            <div><span>Email:</span> {investor.email}</div>
            <div><span>Phone:</span> {investor.phone || "—"}</div>
            <div><span>Status:</span> {investor.status}</div>
            <div><span>Created:</span> {fmtDate(investor.createdAt)}</div>
            <div><span>Updated:</span> {fmtDate(investor.updatedAt)}</div>
            <div><span>Approved:</span> {fmtDate(investor.approvedAt)}</div>
          </div>

          <div className="invModal__statusSection">
            <div className="invModal__label">Status Action</div>
            <div className="invModal__statuses">
              <button
                type="button"
                disabled={!isPending || submitting}
                className={`invModal__statusBtn ${nextStatus === "REJECTED" ? "invModal__statusBtn--danger invModal__statusBtn--active" : "invModal__statusBtn--danger"}`}
                onClick={() => setNextStatus("REJECTED")}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={!isPending || submitting}
                className={`invModal__statusBtn ${nextStatus === "APPROVED" ? "invModal__statusBtn--success invModal__statusBtn--active" : "invModal__statusBtn--success"}`}
                onClick={() => setNextStatus("APPROVED")}
              >
                Approve
              </button>
            </div>

            {requiresReason ? (
              <label className="invModal__reasonWrap">
                <span>Rejection Reason</span>
                <textarea
                  value={rejectionReason}
                  disabled={(isPending && nextStatus !== "REJECTED") || isApproved || submitting}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </label>
            ) : null}
          </div>

          {submitError ? <div className="invModal__error">{submitError}</div> : null}

          <div className="invModal__actions">
            <button type="button" className="invModal__btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="invModal__btn invModal__btn--primary"
              onClick={handleSave}
              disabled={submitting || isReadOnly || (requiresReason && !rejectionReason.trim())}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
