import { useCallback, useEffect, useRef, useState } from "react";
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

function propertyPricePerSqft(property) {
  const asking = Number(property?.askingPrice);
  const sqft = Number(property?.livingAreaSqft);
  if (!Number.isFinite(asking) || !Number.isFinite(sqft) || sqft <= 0) return null;
  return asking / sqft;
}

function compPricePerSqft(comp) {
  const soldPrice = Number(comp?.soldPrice);
  const sqft = Number(comp?.livingAreaSqft);
  if (!Number.isFinite(soldPrice) || !Number.isFinite(sqft) || sqft <= 0) return null;
  return soldPrice / sqft;
}

const MESSAGE_CHAR_LIMIT = 200;

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
  alreadyMessaged = false,
  isFavorite = false,
  onToggleFavorite,
  onClose,
}) {
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState(0);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoScrollerRef = useRef(null);
  const photoProgressFillRef = useRef(null);
  const messageSectionRef = useRef(null);
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

  const photos = Array.isArray(property?.photos)
    ? property.photos
      .map((photo) => ({
        full: String(photo?.url ?? "").trim(),
        thumb: String(photo?.thumbnailUrl ?? photo?.url ?? "").trim(),
      }))
      .filter((photo) => photo.full)
    : [];
  const boundedPreviewIndex =
    photoPreviewIndex >= 0 && photoPreviewIndex < photos.length ? photoPreviewIndex : 0;
  const activePhoto = photos[boundedPreviewIndex]?.full || "";
  const nextPotentialProfit = potentialProfit(property);
  const saleComps = Array.isArray(property?.saleComps) ? property.saleComps : [];
  const propertyAddress = fullAddress(property);
  const canNavigatePreview = photos.length > 1;
  const showCurrentRent = String(property?.occupancyStatus ?? "").toUpperCase() === "YES";
  const priceMetricCount = showCurrentRent ? 6 : 5;
  const messageCharsUsed = String(messageBody ?? "").length;
  const messageCharsRemaining = Math.max(MESSAGE_CHAR_LIMIT - messageCharsUsed, 0);
  const askingPricePerSqft = propertyPricePerSqft(property);
  const askingMetricStyle = { backgroundColor: "#101010", borderColor: "#101010" };
  const askingMetricLabelStyle = { color: "rgba(242, 242, 242, 0.82)", fontWeight: 700 };
  const askingMetricValueStyle = { color: "#ffffff", fontSize: "21px" };
  const profitMetricStyle = { backgroundColor: "#0a7d2c", borderColor: "#0a7d2c" };
  const profitMetricLabelStyle = { color: "#ffffff" };
  const profitMetricValueStyle = { color: "#ffffff", fontSize: "21px" };

  useEffect(() => {
    const rail = photoScrollerRef.current;
    const progressFill = photoProgressFillRef.current;
    if (!rail || !open || photos.length === 0) {
      if (progressFill) {
        progressFill.style.transform = "scaleX(0)";
      }
      return undefined;
    }

    function updatePhotoScrollProgress() {
      const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
      if (!progressFill) return;
      if (maxScrollLeft <= 0) {
        progressFill.style.transform = "scaleX(1)";
        return;
      }
      const next = Math.min(Math.max(rail.scrollLeft / maxScrollLeft, 0), 1);
      progressFill.style.transform = `scaleX(${next})`;
    }

    updatePhotoScrollProgress();
    rail.addEventListener("scroll", updatePhotoScrollProgress, { passive: true });
    window.addEventListener("resize", updatePhotoScrollProgress, { passive: true });

    return () => {
      rail.removeEventListener("scroll", updatePhotoScrollProgress);
      window.removeEventListener("resize", updatePhotoScrollProgress);
    };
  }, [open, photos.length]);

  if (!open || !property) return null;

  function movePreviewPhoto(step) {
    if (!canNavigatePreview) return;

    setPhotoPreviewIndex((prev) => {
      const currentIndex = prev >= 0 && prev < photos.length ? prev : 0;
      return (currentIndex + step + photos.length) % photos.length;
    });
  }

  function scrollToMessageSection() {
    messageSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
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
        <div className="invPropDetail__topBar">
          <h2 className="invPropDetail__modalTitle">Property Details</h2>
          <button
            type="button"
            className="invPropDetail__close"
            aria-label="Close property details"
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        <div className="invPropDetail__left">
          <div className="invPropDetail__gallery">
            {photos.length > 0 ? (
              <>
                <div
                  className="invPropDetail__photoScroller"
                  role="list"
                  aria-label="Property photos"
                  ref={photoScrollerRef}
                >
                  {photos.map((photo, idx) => (
                    <button
                      key={`${property.id}-photo-${idx}`}
                      type="button"
                      role="listitem"
                      className="invPropDetail__photoSlide"
                      onClick={() => {
                        setPhotoPreviewIndex(idx);
                        setPhotoPreviewOpen(true);
                      }}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img
                        src={photo.full}
                        alt={`${propertyAddress || `Property ${property.id}`} photo ${idx + 1}`}
                        className="invPropDetail__photoSlideImg"
                      />
                    </button>
                  ))}
                </div>
                {photos.length > 1 ? (
                  <div className="invPropDetail__photoProgress" aria-hidden="true">
                    <span className="invPropDetail__photoProgressFill" ref={photoProgressFillRef} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="invPropDetail__photoFallback">
                <span className="material-symbols-outlined">home</span>
              </div>
            )}
          </div>

          <section className="invPropDetail__section invPropDetail__section--address">
            <div className="invPropDetail__addressRow">
              <div className="invPropDetail__addressInfo">
                <h3 className="invPropDetail__sectionTitle">Address</h3>
                <p className="invPropDetail__address">{propertyAddress || "Address unavailable"}</p>
              </div>
              {!alreadyMessaged || onToggleFavorite ? (
                <div className="invPropDetail__addressActions">
                  {!alreadyMessaged ? (
                    <button
                      type="button"
                      className="invPropDetail__messageJump"
                      onClick={scrollToMessageSection}
                    >
                      Interested
                    </button>
                  ) : null}
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
              ) : null}
            </div>
          </section>

          <section className="invPropDetail__section">
            <h3 className="invPropDetail__sectionTitle">Price Details</h3>
            <div
              className="invPropDetail__metrics"
              style={{ "--invPropMetricCols": String(priceMetricCount) }}
            >
              <div className="invPropDetail__metric invPropDetail__metric--asking" style={askingMetricStyle}>
                <span style={askingMetricLabelStyle}>Asking Price</span>
                <strong style={askingMetricValueStyle}>{money(property.askingPrice)}</strong>
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
              {showCurrentRent ? (
                <div>
                  <span>Current Rent (Monthly)</span>
                  <strong>{money(property.currentRent)}</strong>
                </div>
              ) : null}
              <div className="invPropDetail__metric invPropDetail__metric--profit" style={profitMetricStyle}>
                <span style={profitMetricLabelStyle}>Potential Profit</span>
                <strong className="invPropDetail__profit" style={profitMetricValueStyle}>
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
                <span>Price / sqft</span>
                <strong>{askingPricePerSqft === null ? "—" : money(askingPricePerSqft)}</strong>
              </div>
              <div>
                <span>Occupied</span>
                <strong>{enumLabel(property.occupancyStatus)}</strong>
              </div>
              <div>
                <span>Exit Strategy</span>
                <strong>{enumLabel(property.exitStrategy)}</strong>
              </div>
              <div>
                <span>Closing Terms</span>
                <strong>{enumLabel(property.closingTerms)}</strong>
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

          <aside className="invPropDetail__right" ref={messageSectionRef}>
            {alreadyMessaged ? (
              <>
                <h3 className="invPropDetail__sideTitle">Already Messaged Megna Team</h3>
                <p className="invPropDetail__sideHelp">
                  You already sent a message for this property. Check Messages in your profile for status.
                </p>
              </>
            ) : (
              <>
                <h3 className="invPropDetail__sideTitle">Message Megna Team</h3>
                <p className="invPropDetail__sideHelp">
                  Ask follow-up questions here. This message goes to the Megna team, not the seller.
                </p>
                <div className="invPropDetail__messageWrap">
                  <span className="invPropDetail__charCount" aria-live="polite">
                    {messageCharsRemaining}/{MESSAGE_CHAR_LIMIT}
                  </span>
                  <textarea
                    className="invPropDetail__message"
                    value={messageBody}
                    onChange={(event) =>
                      onMessageBodyChange?.(String(event.target.value ?? "").slice(0, MESSAGE_CHAR_LIMIT))
                    }
                    placeholder="Write your message"
                    rows={6}
                    maxLength={MESSAGE_CHAR_LIMIT}
                  />
                </div>

                {profileError ? <div className="invPropDetail__msg invPropDetail__msg--error">{profileError}</div> : null}
                {inquiryError ? <div className="invPropDetail__msg invPropDetail__msg--error">{inquiryError}</div> : null}
                {inquirySuccess ? <div className="invPropDetail__msg invPropDetail__msg--ok">{inquirySuccess}</div> : null}

                <button
                  type="button"
                  className="invPropDetail__send"
                  onClick={onSubmitInquiry}
                  disabled={inquirySending}
                >
                  {inquirySending ? "Sending..." : "Send to Megna Team"}
                </button>
              </>
            )}
          </aside>
        </div>
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
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
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
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
