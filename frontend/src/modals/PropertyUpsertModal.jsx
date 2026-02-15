import { useEffect, useMemo, useState } from "react";
import "./PropertyUpsertModal.css";

const STATUS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Closed", value: "CLOSED" },
];

const OCCUPANCY = [
  { label: "—", value: "" },
  { label: "Vacant", value: "VACANT" },
  { label: "Tenant", value: "TENANT" },
];

const EXIT = [
  { label: "—", value: "" },
  { label: "Flip", value: "FLIP" },
  { label: "Rental", value: "RENTAL" },
  { label: "Wholesale", value: "WHOLESALE" },
];

const DEFAULT_FORM = {
  status: "DRAFT",
  title: "",
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
  exitStrategy: "",
  closingTerms: "",
  description: "",
};

function numOrEmpty(v) {
  if (v === "" || v === null || v === undefined) return "";
  return String(v);
}

export default function PropertyUpsertModal({
  open,
  mode = "add",
  initialValue = null,
  onClose,
  onSubmit,
  onDelete,
  submitting = false,
  submitError = "",
  deleting = false,
  deleteError = "",
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(DEFAULT_FORM);

  // hydrate for edit mode (later)
  useEffect(() => {
    if (!open) return;

    if (!initialValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      status: initialValue.status ?? "DRAFT",
      title: initialValue.title ?? "",
      street1: initialValue.street1 ?? "",
      street2: initialValue.street2 ?? "",
      city: initialValue.city ?? "",
      state: initialValue.state ?? "",
      zip: initialValue.zip ?? "",
      askingPrice: numOrEmpty(initialValue.askingPrice),
      arv: numOrEmpty(initialValue.arv),
      estRepairs: numOrEmpty(initialValue.estRepairs),
      beds: numOrEmpty(initialValue.beds),
      baths: numOrEmpty(initialValue.baths),
      livingAreaSqft: numOrEmpty(initialValue.livingAreaSqft),
      yearBuilt: numOrEmpty(initialValue.yearBuilt),
      roofAge: numOrEmpty(initialValue.roofAge),
      hvac: numOrEmpty(initialValue.hvac),
      occupancyStatus: initialValue.occupancyStatus ?? "",
      exitStrategy: initialValue.exitStrategy ?? "",
      closingTerms: initialValue.closingTerms ?? "",
      description: initialValue.description ?? "",
    });
  }, [open, initialValue]);

  // esc + scroll lock
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const titleText = useMemo(() => (isEdit ? "Edit Property" : "Add Property"), [isEdit]);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    onSubmit?.(form);
  }

  if (!open) return null;

  return (
    <div className="propModalOverlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="propModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="propModal__header">
          <h2 className="propModal__title">{titleText}</h2>

          <div
            className="propModal__close"
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClose?.();
            }}
          >
            ✕
          </div>
        </div>

        <form className="propModal__body" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="propField">
            <div className="propField__label">Title</div>
            <input
              className="propField__input"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="House on the Main Street owned by John Doe"
            />
          </div>

          {/* Address */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Address</div>
            </div>

            <div className="propGrid propGrid--2">
              <div className="propField">
                <div className="propField__label">Street Address</div>
                <input
                  className="propField__input"
                  value={form.street1}
                  onChange={(e) => setField("street1", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Apt, suite, etc (optional)</div>
                <input
                  className="propField__input"
                  value={form.street2}
                  onChange={(e) => setField("street2", e.target.value)}
                />
              </div>

              <div className="propField">
                <div className="propField__label">City</div>
                <input
                  className="propField__input"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Saint Louis"
                />
              </div>

              <div className="propField">
                <div className="propField__label">State</div>
                <input
                  className="propField__input"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="Missouri"
                />
              </div>

              <div className="propField">
                <div className="propField__label">ZIP / postcode</div>
                <input
                  className="propField__input"
                  value={form.zip}
                  onChange={(e) => setField("zip", e.target.value)}
                  placeholder="63128"
                />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Price Details</div>
            </div>

            <div className="propGrid propGrid--3">
              <div className="propField">
                <div className="propField__label">Asking Price</div>
                <input
                  className="propField__input"
                  value={form.askingPrice}
                  onChange={(e) => setField("askingPrice", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">ARV</div>
                <input
                  className="propField__input"
                  value={form.arv}
                  onChange={(e) => setField("arv", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Estimated Repairs</div>
                <input
                  className="propField__input"
                  value={form.estRepairs}
                  onChange={(e) => setField("estRepairs", e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* Property info */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Property Information</div>
            </div>

            <div className="propGrid propGrid--4">
              <div className="propField">
                <div className="propField__label">Beds</div>
                <input
                  className="propField__input"
                  value={form.beds}
                  onChange={(e) => setField("beds", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Baths</div>
                <input
                  className="propField__input"
                  value={form.baths}
                  onChange={(e) => setField("baths", e.target.value)}
                  inputMode="decimal"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Living Area (sqft)</div>
                <input
                  className="propField__input"
                  value={form.livingAreaSqft}
                  onChange={(e) => setField("livingAreaSqft", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Year Built</div>
                <input
                  className="propField__input"
                  value={form.yearBuilt}
                  onChange={(e) => setField("yearBuilt", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Roof Age</div>
                <input
                  className="propField__input"
                  value={form.roofAge}
                  onChange={(e) => setField("roofAge", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">HVAC</div>
                <input
                  className="propField__input"
                  value={form.hvac}
                  onChange={(e) => setField("hvac", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="propField">
                <div className="propField__label">Occupancy Status</div>
                <select
                  className="propField__input"
                  value={form.occupancyStatus}
                  onChange={(e) => setField("occupancyStatus", e.target.value)}
                >
                  {OCCUPANCY.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="propField">
                <div className="propField__label">Exit Strategy</div>
                <select
                  className="propField__input"
                  value={form.exitStrategy}
                  onChange={(e) => setField("exitStrategy", e.target.value)}
                >
                  {EXIT.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="propGrid propGrid--2 propGrid--tightTop">
              <div className="propField">
                <div className="propField__label">Closing Terms</div>
                <input
                  className="propField__input"
                  value={form.closingTerms}
                  onChange={(e) => setField("closingTerms", e.target.value)}
                />
              </div>

              <div className="propField">
                <div className="propField__label">Description</div>
                <input
                  className="propField__input"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Photos (UI only for now) */}
          <div className="propSection">
            <div className="propSection__head propSection__head--row">
              <div className="propSection__title">Photos</div>
              <button type="button" className="propLinkBtn" onClick={() => {}}>
                Add Photo +
              </button>
            </div>

            <div className="propPhotos">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="propPhotoSlot" />
              ))}
            </div>
          </div>

          {/* Sale Comps (UI only for now) */}
          <div className="propSection">
            <div className="propSection__head propSection__head--row">
              <div className="propSection__title">Sale Comps</div>
              <button type="button" className="propLinkBtn" onClick={() => {}}>
                Add Comp +
              </button>
            </div>

            <div className="propCompsTableWrap">
              <table className="propCompsTable">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Status</th>
                    <th className="tRight">Price</th>
                    <th className="tRight">Price/ft²</th>
                    <th className="tRight">Distance</th>
                    <th className="tRight">Bed</th>
                    <th className="tRight">Bath</th>
                    <th className="tRight">Sq Ft</th>
                    <th className="tRight">Year</th>
                    <th className="tIcon"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={10} className="propCompsEmpty">
                      No comps added yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Status */}
          <div className="propSection">
            <div className="propSection__head">
              <div className="propSection__title">Status</div>
            </div>

            <div className="propStatus">
              {STATUS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`propStatus__btn ${form.status === s.value ? "propStatus__btn--active" : ""}`}
                  onClick={() => setField("status", s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* errors */}
          {submitError ? <div className="propModal__error">{submitError}</div> : null}
          {deleteError ? <div className="propModal__error">{deleteError}</div> : null}

          {/* Actions */}
          <div className="propActions">
            {mode === "edit" ? (
                <>
                <button
                    type="button"
                    className="propBtn propBtn--danger"
                    disabled={submitting || deleting}
                    onClick={() => {
                    if (!onDelete) return;

                    const ok = window.confirm("Delete this property? This cannot be undone.");
                    if (!ok) return;

                    onDelete();
                    }}
                >
                    {deleting ? "Deleting..." : "Delete"}
                </button>

                <button
                    type="submit"
                    className="propBtn propBtn--primary"
                    disabled={!form.title.trim() || submitting || deleting}
                >
                    {submitting ? "Saving..." : "Save"}
                </button>
                </>
            ) : (
                <>
                <button type="button" className="propBtn" onClick={onClose} disabled={submitting}>
                    Cancel
                </button>

                <button type="submit" className="propBtn propBtn--primary" disabled={!form.title.trim() || submitting}>
                    {submitting ? "Adding..." : "Add"}
                </button>
                </>
            )}
            </div>
        </form>
      </div>
    </div>
  );
}
