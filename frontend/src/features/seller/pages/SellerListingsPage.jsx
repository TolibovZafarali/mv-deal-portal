import { useEffect, useMemo, useState } from "react";
import {
  createSellerProperty,
  getSellerProperties,
  requestSellerPropertyChange,
  submitSellerProperty,
  updateSellerProperty,
} from "@/api/modules/sellerPropertyApi";
import "@/features/seller/pages/SellerListingsPage.css";

const PAGE_SIZE = 20;
const EDITABLE_WORKFLOWS = new Set(["DRAFT", "CHANGES_REQUESTED"]);
const PROPERTY_STATUS_ORDER = {
  ACTIVE: 0,
  DRAFT: 1,
  CLOSED: 2,
};

const OCCUPANCY_OPTIONS = ["", "YES", "NO"];
const EXIT_STRATEGY_OPTIONS = ["", "FLIP", "RENTAL", "WHOLESALE"];
const CLOSING_TERMS_OPTIONS = ["", "CASH_ONLY", "HARD_MONEY", "CONVENTIONAL", "SELLER_FINANCE"];

const EMPTY_FORM = {
  street1: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  askingPrice: "",
  arv: "",
  estRepairs: "",
  beds: "",
  baths: "",
  livingAreaSqft: "",
  yearBuilt: "",
  roofAge: "",
  hvac: "",
  occupancyStatus: "",
  currentRent: "",
  exitStrategy: "",
  closingTerms: "",
};

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
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDecimal(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw.replaceAll(",", "").replaceAll("$", ""));
  return Number.isFinite(num) ? num : null;
}

function parseInteger(value) {
  const parsed = parseDecimal(value);
  if (parsed === null) return null;
  const intVal = Number.parseInt(String(parsed), 10);
  return Number.isFinite(intVal) ? intVal : null;
}

function workflowLabel(row) {
  if (row?.sellerWorkflowStatus) return prettyEnum(row.sellerWorkflowStatus);
  if (row?.status === "ACTIVE") return "Published";
  if (row?.status === "CLOSED") return "Closed";
  return "Draft";
}

function addressLine(row) {
  const line1 = [row?.street1, row?.street2].filter(Boolean).join(", ");
  const stateZip = [row?.state, row?.zip].filter(Boolean).join(" ");
  const line2 = [row?.city, stateZip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" • ") || "—";
}

function toPayload(form) {
  return {
    status: "DRAFT",
    street1: String(form.street1 ?? "").trim() || null,
    street2: String(form.street2 ?? "").trim() || null,
    city: String(form.city ?? "").trim() || null,
    state: String(form.state ?? "").trim() || null,
    zip: String(form.zip ?? "").trim() || null,
    askingPrice: parseDecimal(form.askingPrice),
    arv: parseDecimal(form.arv),
    estRepairs: parseDecimal(form.estRepairs),
    beds: parseInteger(form.beds),
    baths: parseDecimal(form.baths),
    livingAreaSqft: parseInteger(form.livingAreaSqft),
    yearBuilt: parseInteger(form.yearBuilt),
    roofAge: parseInteger(form.roofAge),
    hvac: parseInteger(form.hvac),
    occupancyStatus: form.occupancyStatus || null,
    currentRent: form.occupancyStatus === "YES" ? parseDecimal(form.currentRent) : null,
    exitStrategy: form.exitStrategy || null,
    closingTerms: form.closingTerms || null,
    photos: null,
    saleComps: null,
  };
}

function formFromRow(row) {
  if (!row) return { ...EMPTY_FORM };
  return {
    street1: row.street1 ?? "",
    street2: row.street2 ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    askingPrice: row.askingPrice ?? "",
    arv: row.arv ?? "",
    estRepairs: row.estRepairs ?? "",
    beds: row.beds ?? "",
    baths: row.baths ?? "",
    livingAreaSqft: row.livingAreaSqft ?? "",
    yearBuilt: row.yearBuilt ?? "",
    roofAge: row.roofAge ?? "",
    hvac: row.hvac ?? "",
    occupancyStatus: row.occupancyStatus ?? "",
    currentRent: row.currentRent ?? "",
    exitStrategy: row.exitStrategy ?? "",
    closingTerms: row.closingTerms ?? "",
  };
}

export default function SellerListingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 0, totalElements: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerProperties({ page, size: PAGE_SIZE, sort: "updatedAt,desc" });
        if (!alive) return;
        setRows(data?.content ?? []);
        setMeta({
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? 0,
        });
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setMeta({ totalPages: 0, totalElements: 0 });
        setError(nextError?.message || "Failed to load your listings.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [page, refreshKey]);

  const title = useMemo(() => {
    if (loading) return "Loading listings...";
    if (error) return error;
    return `${meta.totalElements.toLocaleString("en-US")} listings`;
  }, [loading, error, meta.totalElements]);
  const sortedRows = useMemo(() => {
    return rows
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        const rankA = PROPERTY_STATUS_ORDER[a.row?.status] ?? Number.MAX_SAFE_INTEGER;
        const rankB = PROPERTY_STATUS_ORDER[b.row?.status] ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.idx - b.idx;
      })
      .map((entry) => entry.row);
  }, [rows]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditingRow(null);
    setForm({ ...EMPTY_FORM });
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditingRow(row);
    setForm(formFromRow(row));
    setSubmitError("");
    setModalOpen(true);
  }

  async function saveListing() {
    const payload = toPayload(form);

    setSubmitting(true);
    setSubmitError("");

    try {
      if (editingRow) {
        await updateSellerProperty(editingRow.id, payload);
      } else {
        await createSellerProperty(payload);
      }
      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (nextError) {
      setSubmitError(nextError?.message || "Failed to save listing.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitForReview(row) {
    try {
      await submitSellerProperty(row.id);
      setRefreshKey((k) => k + 1);
    } catch (nextError) {
      window.alert(nextError?.message || "Failed to submit listing for review.");
    }
  }

  async function handleRequestChange(row) {
    const requestedChanges = window.prompt("Describe the change you want on this published listing:");
    if (!requestedChanges || !requestedChanges.trim()) return;

    try {
      await requestSellerPropertyChange(row.id, requestedChanges.trim());
      window.alert("Change request submitted.");
    } catch (nextError) {
      window.alert(nextError?.message || "Failed to submit change request.");
    }
  }

  return (
    <section className="sellerListings">
      <header className="sellerListings__header">
        <div>
          <h2>My Listings</h2>
          <p>{title}</p>
        </div>
        <button type="button" className="sellerListings__primaryBtn" onClick={openCreate}>
          New Draft
        </button>
      </header>

      <div className="sellerListings__tableWrap">
        <table className="sellerListings__table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Workflow</th>
              <th>Visibility</th>
              <th>Review Note</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="sellerListings__empty">
                  No listings yet.
                </td>
              </tr>
            ) : null}
            {sortedRows.map((row) => {
              const workflow = row?.sellerWorkflowStatus || "DRAFT";
              const canEdit = EDITABLE_WORKFLOWS.has(workflow);
              const canSubmit = EDITABLE_WORKFLOWS.has(workflow);
              const canRequestChange = workflow === "PUBLISHED" && row?.status === "ACTIVE";

              return (
                <tr key={row.id}>
                  <td>{addressLine(row)}</td>
                  <td>
                    <span className={`sellerStatus sellerStatus--${workflow.toLowerCase()}`}>
                      {workflowLabel(row)}
                    </span>
                  </td>
                  <td>{prettyEnum(row.status)}</td>
                  <td>{row.sellerReviewNote || "—"}</td>
                  <td>{formatDateTime(row.updatedAt)}</td>
                  <td className="sellerListings__actionsCell">
                    {canEdit ? (
                      <button type="button" className="sellerListings__ghostBtn" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                    ) : null}
                    {canSubmit ? (
                      <button type="button" className="sellerListings__ghostBtn" onClick={() => handleSubmitForReview(row)}>
                        Submit
                      </button>
                    ) : null}
                    {canRequestChange ? (
                      <button type="button" className="sellerListings__ghostBtn" onClick={() => handleRequestChange(row)}>
                        Request Change
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 ? (
        <div className="sellerListings__pagination">
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

      {modalOpen ? (
        <div className="sellerListingsModal__overlay" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <div className="sellerListingsModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sellerListingsModal__header">
              <h3>{editingRow ? "Edit Listing" : "New Listing Draft"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="sellerListingsModal__grid">
              <label>
                Street 1
                <input value={form.street1} onChange={(e) => updateField("street1", e.target.value)} />
              </label>
              <label>
                Street 2
                <input value={form.street2} onChange={(e) => updateField("street2", e.target.value)} />
              </label>
              <label>
                City
                <input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              </label>
              <label>
                State
                <input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              </label>
              <label>
                ZIP
                <input value={form.zip} onChange={(e) => updateField("zip", e.target.value)} />
              </label>
              <label>
                Asking Price
                <input value={form.askingPrice} onChange={(e) => updateField("askingPrice", e.target.value)} />
              </label>
              <label>
                ARV
                <input value={form.arv} onChange={(e) => updateField("arv", e.target.value)} />
              </label>
              <label>
                Est. Repairs
                <input value={form.estRepairs} onChange={(e) => updateField("estRepairs", e.target.value)} />
              </label>
              <label>
                Beds
                <input value={form.beds} onChange={(e) => updateField("beds", e.target.value)} />
              </label>
              <label>
                Baths
                <input value={form.baths} onChange={(e) => updateField("baths", e.target.value)} />
              </label>
              <label>
                Living Area (sqft)
                <input value={form.livingAreaSqft} onChange={(e) => updateField("livingAreaSqft", e.target.value)} />
              </label>
              <label>
                Year Built
                <input value={form.yearBuilt} onChange={(e) => updateField("yearBuilt", e.target.value)} />
              </label>
              <label>
                Roof Age
                <input value={form.roofAge} onChange={(e) => updateField("roofAge", e.target.value)} />
              </label>
              <label>
                HVAC Age
                <input value={form.hvac} onChange={(e) => updateField("hvac", e.target.value)} />
              </label>
              <label>
                Occupancy
                <select
                  value={form.occupancyStatus}
                  onChange={(e) => {
                    const nextOccupancyStatus = e.target.value;
                    updateField("occupancyStatus", nextOccupancyStatus);
                    if (nextOccupancyStatus !== "YES") {
                      updateField("currentRent", "");
                    }
                  }}
                >
                  {OCCUPANCY_OPTIONS.map((value) => (
                    <option key={value || "empty"} value={value}>
                      {prettyEnum(value) || "Select"}
                    </option>
                  ))}
                </select>
              </label>
              {form.occupancyStatus === "YES" ? (
                <label>
                  Current Rent (Monthly)
                  <input value={form.currentRent} onChange={(e) => updateField("currentRent", e.target.value)} />
                </label>
              ) : null}
              <label>
                Exit Strategy
                <select value={form.exitStrategy} onChange={(e) => updateField("exitStrategy", e.target.value)}>
                  {EXIT_STRATEGY_OPTIONS.map((value) => (
                    <option key={value || "empty"} value={value}>
                      {prettyEnum(value) || "Select"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Closing Terms
                <select value={form.closingTerms} onChange={(e) => updateField("closingTerms", e.target.value)}>
                  {CLOSING_TERMS_OPTIONS.map((value) => (
                    <option key={value || "empty"} value={value}>
                      {prettyEnum(value) || "Select"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {submitError ? <div className="sellerListingsModal__error">{submitError}</div> : null}

            <div className="sellerListingsModal__footer">
              <button type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" disabled={submitting} onClick={saveListing}>
                {submitting ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
