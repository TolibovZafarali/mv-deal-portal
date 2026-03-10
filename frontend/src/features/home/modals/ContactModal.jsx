import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRouteModalClose } from "@/shared/ui/modal/useRouteModalClose";
import "@/features/home/modals/ContactModal.css";

const DEFAULT_CATEGORY = "GENERAL_SUPPORT";
const MESSAGE_CHAR_LIMIT = 1200;
const CATEGORY_OPTIONS = [
  {
    id: "GENERAL_SUPPORT",
    label: "General support",
  },
  {
    id: "INVESTOR_QUESTION",
    label: "Investor question",
  },
  {
    id: "SELL_PROPERTY",
    label: "Sell a property",
  },
  {
    id: "PRIVACY_LEGAL",
    label: "Privacy or legal",
  },
];

function normalizeCategory(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  return CATEGORY_OPTIONS.some((option) => option.id === raw) ? raw : DEFAULT_CATEGORY;
}

function Field({ label, name, value, onChange, type = "text", autoComplete = "off" }) {
  return (
    <div className="field">
      <input
        className="field__input"
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        type={type}
        autoComplete={autoComplete}
      />
      <label className="field__label">{label}</label>
    </div>
  );
}

export default function ContactModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasBackground = !!location.state?.backgroundLocation;
  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const presetCategory = normalizeCategory(location.state?.contactCategory);
  const [category, setCategory] = useState(presetCategory);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUiNotice, setShowUiNotice] = useState(false);
  const menuRef = useRef(null);
  const { isClosing, close } = useRouteModalClose({
    navigate,
    hasBackground,
    backgroundLocation: bg,
  });

  useEffect(() => {
    setCategory(presetCategory);
  }, [presetCategory]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const formReady = Boolean(form.name.trim() && form.email.trim() && form.message.trim());
  const selectedCategoryLabel = useMemo(() => {
    return CATEGORY_OPTIONS.find((option) => option.id === category)?.label ?? CATEGORY_OPTIONS[0].label;
  }, [category]);

  function updateField(key) {
    return (event) => {
      const nextValue = key === "message"
        ? event.target.value.slice(0, MESSAGE_CHAR_LIMIT)
        : event.target.value;

      setForm((current) => ({ ...current, [key]: nextValue }));
      if (showUiNotice) {
        setShowUiNotice(false);
      }
    };
  }

  function handleCategorySelect(nextCategory) {
    setCategory(nextCategory);
    setMenuOpen(false);
    setShowUiNotice(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!formReady) return;
    setShowUiNotice(true);
  }

  return (
    <div className={`contactOverlay ${isClosing ? "contactOverlay--closing" : ""}`} onMouseDown={close}>
      <div
        className={`contactModal ${isClosing ? "contactModal--closing" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <div className="contactModal__header">
          <h2 id="contact-modal-title" className="contactModal__title">Contact Us</h2>

          <button
            type="button"
            className="contactModal__close"
            onClick={close}
            aria-label="Close contact modal"
          >
            ✕
          </button>
        </div>

        <form className="contactModal__form" onSubmit={handleSubmit}>
          <p className="contactModal__hint">Choose the right inbox and leave a message.</p>

          <div
            className={`contactSelect ${menuOpen ? "contactSelect--open" : ""}`}
            ref={menuRef}
          >
            <button
              type="button"
              className="contactSelect__trigger"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-label="Choose inbox"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span className="contactSelect__value">{selectedCategoryLabel}</span>
              <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
            </button>

            {menuOpen ? (
              <div className="contactSelect__list" role="listbox" aria-label="Choose inbox">
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = option.id === category;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`contactSelect__option ${selected ? "contactSelect__option--active" : ""}`}
                      onClick={() => handleCategorySelect(option.id)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <Field
            label="Name"
            name="name"
            value={form.name}
            onChange={updateField("name")}
            autoComplete="name"
          />
          <Field
            label="Email"
            name="email"
            value={form.email}
            onChange={updateField("email")}
            type="email"
            autoComplete="email"
          />
          <div className="field field--textarea">
            <textarea
              className="field__input field__input--textarea"
              name="message"
              value={form.message}
              onChange={updateField("message")}
              placeholder=" "
              rows={6}
            />
            <label className="field__label">Message</label>
          </div>

          {showUiNotice ? (
            <div className="contactModal__error" aria-live="polite">
              UI only for now. Submission wiring is the next pass.
            </div>
          ) : null}

          <div className="contactModal__actions">
            <button type="button" className="contactModal__backBtn" onClick={close}>
              Close
            </button>
            <button type="submit" className="contactModal__btn" disabled={!formReady}>
              Send request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
