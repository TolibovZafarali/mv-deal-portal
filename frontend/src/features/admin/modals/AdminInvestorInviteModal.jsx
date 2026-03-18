import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/shared/ui/modal/Modal";
import { sendInvestorInvitations } from "@/api/modules/adminInvestorApi";
import "@/features/admin/modals/AdminInvestorInviteModal.css";

const MAX_INVITES = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createInviteRow(id) {
  return {
    id,
    firstName: "",
    lastName: "",
    email: "",
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function statusLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminInvestorInviteModal({ open, onClose }) {
  const nextRowIdRef = useRef(2);
  const [rows, setRows] = useState(() => [createInviteRow(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    nextRowIdRef.current = 2;
    setRows([createInviteRow(1)]);
    setSubmitting(false);
    setSubmitError("");
    setSubmitResult(null);
  }, [open]);

  const validationByRowId = useMemo(() => {
    const duplicateCounts = rows.reduce((acc, row) => {
      const email = normalizeEmail(row.email);
      if (!email) return acc;
      acc.set(email, (acc.get(email) ?? 0) + 1);
      return acc;
    }, new Map());

    return rows.reduce((acc, row) => {
      const issues = [];
      if (!row.firstName.trim()) issues.push("First name is required.");
      if (!row.lastName.trim()) issues.push("Last name is required.");

      const email = normalizeEmail(row.email);
      if (!email) {
        issues.push("Email is required.");
      } else {
        if (!EMAIL_PATTERN.test(email)) {
          issues.push("Enter a valid email address.");
        }
        if ((duplicateCounts.get(email) ?? 0) > 1) {
          issues.push("Email is duplicated in this batch.");
        }
      }

      acc.set(row.id, issues);
      return acc;
    }, new Map());
  }, [rows]);

  const hasValidationErrors = useMemo(() => {
    return rows.some((row) => (validationByRowId.get(row.id) ?? []).length > 0);
  }, [rows, validationByRowId]);

  function resetSubmitState() {
    setSubmitError("");
    setSubmitResult(null);
  }

  function updateRow(id, key, value) {
    resetSubmitState();
    setRows((current) => current.map((row) => (
      row.id === id ? { ...row, [key]: value } : row
    )));
  }

  function addRow() {
    if (rows.length >= MAX_INVITES) return;
    resetSubmitState();
    const nextId = nextRowIdRef.current;
    nextRowIdRef.current += 1;
    setRows((current) => [...current, createInviteRow(nextId)]);
  }

  function removeRow(id) {
    if (rows.length <= 1) return;
    resetSubmitState();
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || hasValidationErrors) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = rows.map((row) => ({
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: normalizeEmail(row.email),
      }));
      const response = await sendInvestorInvitations(payload);
      setSubmitResult(response);
    } catch (error) {
      setSubmitError(error?.message || "Failed to send invitations.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      onClose?.();
    }
  }

  return (
    <Modal
      open={open}
      title="Invite Investors"
      onClose={handleClose}
      width={860}
    >
      <form className="invInvite" onSubmit={handleSubmit}>
        <div className="invInvite__head">
          <p className="invInvite__copy">
            Add up to {MAX_INVITES} investors and send each person a setup link for their account.
          </p>
          <div className="invInvite__count">
            {rows.length} / {MAX_INVITES}
          </div>
        </div>

        <div className="invInvite__rows">
          {rows.map((row, index) => {
            const issues = validationByRowId.get(row.id) ?? [];
            return (
              <div key={row.id} className="invInvite__row">
                <div className="invInvite__rowHead">
                  <div className="invInvite__rowTitle">Investor {index + 1}</div>
                  <button
                    type="button"
                    className="invInvite__removeBtn"
                    onClick={() => removeRow(row.id)}
                    disabled={submitting || rows.length <= 1}
                  >
                    Remove
                  </button>
                </div>

                <div className="invInvite__grid">
                  <label className="invInvite__field">
                    <span>First name</span>
                    <input
                      type="text"
                      value={row.firstName}
                      onChange={(event) => updateRow(row.id, "firstName", event.target.value)}
                      disabled={submitting}
                    />
                  </label>

                  <label className="invInvite__field">
                    <span>Last name</span>
                    <input
                      type="text"
                      value={row.lastName}
                      onChange={(event) => updateRow(row.id, "lastName", event.target.value)}
                      disabled={submitting}
                    />
                  </label>

                  <label className="invInvite__field invInvite__field--wide">
                    <span>Email</span>
                    <input
                      type="email"
                      value={row.email}
                      onChange={(event) => updateRow(row.id, "email", event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                </div>

                {issues.length > 0 ? (
                  <div className="invInvite__issues">
                    {issues.map((issue) => (
                      <div key={issue}>{issue}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="invInvite__toolbar">
          <button
            type="button"
            className="invInvite__btn invInvite__btn--secondary"
            onClick={addRow}
            disabled={submitting || rows.length >= MAX_INVITES}
          >
            Add another
          </button>
        </div>

        {submitError ? <div className="invInvite__error">{submitError}</div> : null}

        {submitResult ? (
          <div className="invInvite__result">
            <div className="invInvite__resultSummary">
              <span>{submitResult.sentCount} sent</span>
              <span>{submitResult.resentCount} resent</span>
              <span>{submitResult.skippedExistingAccountCount} existing account</span>
              <span>{submitResult.skippedDuplicateCount} duplicate</span>
              <span>{submitResult.failedCount} failed</span>
            </div>

            <div className="invInvite__resultList">
              {submitResult.results?.map((result, index) => {
                const statusTone = String(result?.status ?? "").trim().toLowerCase();
                const label = [result?.firstName, result?.lastName].filter(Boolean).join(" ").trim() || result?.email || `Investor ${index + 1}`;
                return (
                  <div key={`${result?.email || index}-${result?.status || "unknown"}`} className={`invInvite__resultItem invInvite__resultItem--${statusTone}`}>
                    <div className="invInvite__resultTitle">{label}</div>
                    <div className="invInvite__resultMeta">{result?.email || "N/A"}</div>
                    <div className="invInvite__resultStatus">{statusLabel(result?.status)}</div>
                    <div className="invInvite__resultMessage">{result?.message || "No additional details."}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="invInvite__actions">
          <button type="button" className="invInvite__btn invInvite__btn--secondary" onClick={handleClose} disabled={submitting}>
            Close
          </button>
          <button type="submit" className="invInvite__btn invInvite__btn--primary" disabled={submitting || hasValidationErrors}>
            {submitting ? "Sending..." : "Send invitations"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
