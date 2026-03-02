import { useCallback, useEffect, useState } from "react";
import "@/features/investor/modals/InvestorPropertyDetailsModal.css";

function money(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function numberLabel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("en-US");
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US");
}

function enumLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";

  return raw
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fullAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  return [line1, property.city, property.state, property.zip].filter(Boolean).join(", ");
}

function potentialProfit(property) {
  const arv = Number(property?.arv);
  const asking = Number(property?.askingPrice);
  const repairs = Number(property?.estRepairs);

  if (!Number.isFinite(arv) || !Number.isFinite(asking) || !Number.isFinite(repairs)) {
    return null;
  }

  return arv - asking - repairs;
}

function compPricePerSqft(comp) {
  const soldPrice = Number(comp?.soldPrice);
  const sqft = Number(comp?.livingAreaSqft);
  if (!Number.isFinite(soldPrice) || !Number.isFinite(sqft) || sqft <= 0) return null;
  return soldPrice / sqft;
}

export default function InvestorPropertyDetailsModal({
  open,
  property,
  messageBody,
  onMessageBodyChange,
  onSubmitInquiry,
  inquirySending,
  inquiryError,
  inquirySuccess,
  profileError,
  isFavorite = false,
  onToggleFavorite,
  onClose,
}) {
  const [photoSelection, setPhotoSelection] = useState({ propertyId: null, index: 0 });
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const closeModal = useCallback(() => {
    setPhotoPreviewOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      if (photoPreviewOpen) {
        setPhotoPreviewOpen(false);
        return;
      }
      closeModal();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, photoPreviewOpen, closeModal]);

  if (!open || !property) return null;

  const photos = Array.isArray(property.photos)
    ? property.photos
      .map((photo) => ({
        full: String(photo?.url ?? "").trim(),
        thumb: String(photo?.thumbnailUrl ?? photo?.url ?? "").trim(),
      }))
      .filter((photo) => photo.full)
    : [];
  const activePhotoIndex =
    photoSelection.propertyId === property.id ? photoSelection.index : 0;
  const boundedPhotoIndex =
    activePhotoIndex >= 0 && activePhotoIndex < photos.length ? activePhotoIndex : 0;
  const activePhoto = photos[boundedPhotoIndex]?.full || "";
  const nextPotentialProfit = potentialProfit(property);
  const saleComps = Array.isArray(property.saleComps) ? property.saleComps : [];
  const propertyAddress = fullAddress(property);
  const canNavigatePreview = photos.length > 1;

  function movePreviewPhoto(step) {
    if (!canNavigatePreview) return;

    setPhotoSelection((prev) => {
      const currentIndex =
        prev.propertyId === property.id && prev.index >= 0 && prev.index < photos.length
          ? prev.index
          : 0;
      const nextIndex = (currentIndex + step + photos.length) % photos.length;
      return { propertyId: property.id, index: nextIndex };
    });
  }

  return (
    <div
      className="invPropDetail__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Property details"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="invPropDetail">
        <button
          type="button"
          className="invPropDetail__close"
          aria-label="Close property details"
          onClick={closeModal}
        >
          ✕
        </button>

        <div className="invPropDetail__left">
          <div className="invPropDetail__gallery">
            <div
              className={
                photos.length > 1
                  ? "invPropDetail__photoRow"
                  : "invPropDetail__photoRow invPropDetail__photoRow--single"
              }
            >
              {activePhoto ? (
                <button
                  type="button"
                  className="invPropDetail__leadPhotoBtn"
                  onClick={() => setPhotoPreviewOpen(true)}
                  aria-label="View full size property photo"
                >
                  <img
                    src={activePhoto}
                    alt={propertyAddress || `Property ${property.id}`}
                    className="invPropDetail__leadPhoto"
                  />
                </button>
              ) : (
                <div className="invPropDetail__photoFallback">
                  <span className="material-symbols-outlined">home</span>
                </div>
              )}

              {photos.length > 1 ? (
                <div className="invPropDetail__thumbs" role="list" aria-label="Property photos">
                  {photos.map((photo, idx) => (
                    <button
                      key={`${property.id}-photo-${idx}`}
                      type="button"
                      role="listitem"
                      className={`invPropDetail__thumbBtn ${
                        idx === boundedPhotoIndex ? "invPropDetail__thumbBtn--active" : ""
                      }`}
                      onClick={() => setPhotoSelection({ propertyId: property.id, index: idx })}
                    >
                      <img
                        src={photo.thumb || photo.full}
                        alt={`Property photo ${idx + 1}`}
                        className="invPropDetail__thumbImg"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <section className="invPropDetail__section">
            <div className="invPropDetail__addressRow">
              <h3 className="invPropDetail__sectionTitle">Address</h3>
              {onToggleFavorite ? (
                <button
                  type="button"
                  className={`invPropDetail__bookmarkToggle ${
                    isFavorite ? "invPropDetail__bookmarkToggle--active" : ""
                  }`}
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? "Remove bookmark" : "Save bookmark"}
                  aria-pressed={isFavorite}
                >
                  <svg className="invPropDetail__bookmarkIcon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1z" />
                  </svg>
                </button>
              ) : null}
            </div>
            <p className="invPropDetail__address">{propertyAddress || "Address unavailable"}</p>
          </section>

          <section className="invPropDetail__section">
            <h3 className="invPropDetail__sectionTitle">Price Details</h3>
            <div className="invPropDetail__metrics">
              <div>
                <span>Asking Price</span>
                <strong>{money(property.askingPrice)}</strong>
              </div>
              <div>
                <span>ARV</span>
                <strong>{money(property.arv)}</strong>
              </div>
              <div>
                <span>Estimated Repairs</span>
                <strong>{money(property.estRepairs)}</strong>
              </div>
              <div>
                <span>FMR (Monthly)</span>
                <strong>{money(property.fmr)}</strong>
              </div>
              <div>
                <span>Current Rent (Monthly)</span>
                <strong>{money(property.currentRent)}</strong>
              </div>
              <div>
                <span>Potential Profit</span>
                <strong className="invPropDetail__profit">
                  {nextPotentialProfit === null ? "—" : money(nextPotentialProfit)}
                </strong>
              </div>
            </div>
          </section>

          <section className="invPropDetail__section">
            <h3 className="invPropDetail__sectionTitle">Property Information</h3>
            <div className="invPropDetail__facts">
              <div>
                <span>Bedrooms</span>
                <strong>{property.beds ?? "—"}</strong>
              </div>
              <div>
                <span>Bathrooms</span>
                <strong>{property.baths ?? "—"}</strong>
              </div>
              <div>
                <span>Year Built</span>
                <strong>{property.yearBuilt ?? "—"}</strong>
              </div>
              <div>
                <span>Living Area</span>
                <strong>{property.livingAreaSqft ? `${numberLabel(property.livingAreaSqft)} sqft` : "—"}</strong>
              </div>
              <div>
                <span>Occupancy</span>
                <strong>{enumLabel(property.occupancyStatus)}</strong>
              </div>
            </div>
          </section>

          <section className="invPropDetail__section">
            <h3 className="invPropDetail__sectionTitle">Sale Comps</h3>

            {saleComps.length === 0 ? (
              <div className="invPropDetail__empty">No sale comps available.</div>
            ) : (
              <div className="invPropDetail__tableWrap">
                <table className="invPropDetail__table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Date</th>
                      <th>Sold Price</th>
                      <th>Price / sqft</th>
                      <th>Distance</th>
                      <th>Beds</th>
                      <th>Baths</th>
                      <th>Sq ft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleComps.map((comp, idx) => {
                      const pricePerSqft = compPricePerSqft(comp);
                      return (
                        <tr key={comp.id ?? `${property.id}-comp-${idx}`}>
                          <td>{comp.address || "—"}</td>
                          <td>{formatDate(comp.soldDate)}</td>
                          <td>{money(comp.soldPrice)}</td>
                          <td>{pricePerSqft === null ? "—" : money(pricePerSqft)}</td>
                          <td>
                            {comp.distanceMiles === null || comp.distanceMiles === undefined
                              ? "—"
                              : `${Number(comp.distanceMiles).toFixed(2)} mi`}
                          </td>
                          <td>{comp.beds ?? "—"}</td>
                          <td>{comp.baths ?? "—"}</td>
                          <td>{comp.livingAreaSqft ? numberLabel(comp.livingAreaSqft) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="invPropDetail__right">
          <h3 className="invPropDetail__sideTitle">Message to the Owner</h3>
          <p className="invPropDetail__sideHelp">
            Ask follow-up questions and submit your inquiry directly from this listing.
          </p>
          <textarea
            className="invPropDetail__message"
            value={messageBody}
            onChange={(event) => onMessageBodyChange?.(event.target.value)}
            placeholder="Write your message"
            rows={6}
          />

          {profileError ? <div className="invPropDetail__msg invPropDetail__msg--error">{profileError}</div> : null}
          {inquiryError ? <div className="invPropDetail__msg invPropDetail__msg--error">{inquiryError}</div> : null}
          {inquirySuccess ? <div className="invPropDetail__msg invPropDetail__msg--ok">{inquirySuccess}</div> : null}

          <button
            type="button"
            className="invPropDetail__send"
            onClick={onSubmitInquiry}
            disabled={inquirySending}
          >
            {inquirySending ? "Sending..." : "Send"}
          </button>

          <div className="invPropDetail__chipGroup">
            <div className="invPropDetail__chip">
              <span>Exit Strategy</span>
              <strong>{enumLabel(property.exitStrategy)}</strong>
            </div>
            <div className="invPropDetail__chip">
              <span>Closing Terms</span>
              <strong>{enumLabel(property.closingTerms)}</strong>
            </div>
            <div className="invPropDetail__chip">
              <span>Status</span>
              <strong>{enumLabel(property.status)}</strong>
            </div>
          </div>
        </aside>
      </div>

      {photoPreviewOpen && activePhoto ? (
        <div
          className="invPropDetail__previewBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Full size property photo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPhotoPreviewOpen(false);
          }}
        >
          {canNavigatePreview ? (
            <button
              type="button"
              className="invPropDetail__previewNav invPropDetail__previewNav--prev"
              aria-label="Previous photo"
              onClick={() => movePreviewPhoto(-1)}
            >
              ‹
            </button>
          ) : null}

          <button
            type="button"
            className="invPropDetail__previewClose"
            aria-label="Close full size photo"
            onClick={() => setPhotoPreviewOpen(false)}
          >
            ✕
          </button>
          <img
            src={activePhoto}
            alt={propertyAddress || `Property ${property.id}`}
            className="invPropDetail__previewPhoto"
          />

          {canNavigatePreview ? (
            <button
              type="button"
              className="invPropDetail__previewNav invPropDetail__previewNav--next"
              aria-label="Next photo"
              onClick={() => movePreviewPhoto(1)}
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
