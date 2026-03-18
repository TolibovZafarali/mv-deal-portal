import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvestorInvitation, getInvestorInvitationPreview } from "@/api";
import { useAuth } from "@/features/auth";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";
import { useAuthModalClose } from "@/features/auth/modals/useAuthModalClose";
import "@/features/auth/pages/AcceptInvestorInvitePage.css";

function formatPhoneDigits(digits) {
  if (!digits) return "";

  const raw = digits.slice(0, 11);
  let prefix = "";
  let normalizedDigits = raw;

  if (raw.length === 11 && raw.startsWith("1")) {
    prefix = "+1 ";
    normalizedDigits = raw.slice(1);
  } else {
    normalizedDigits = raw.slice(0, 10);
  }

  const a = normalizedDigits.slice(0, 3);
  const b = normalizedDigits.slice(3, 6);
  const c = normalizedDigits.slice(6, 10);

  if (normalizedDigits.length <= 3) return `(${a}`;
  if (normalizedDigits.length <= 6) return `${prefix}(${a}) ${b}`;
  return `${prefix}(${a}) ${b}-${c}`;
}

function cursorPosFromDigitCount(formatted, digitCount) {
  if (digitCount <= 0) return 0;

  let count = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      count += 1;
    }
    if (count === digitCount) {
      return index + 1;
    }
  }

  return formatted.length;
}

export default function AcceptInvestorInvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const hasBackground = !!location.state?.backgroundLocation;
  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const forceHomeOnClose = !!location.state?.forceHomeOnClose;
  const { isClosing, close } = useAuthModalClose({
    navigate,
    hasBackground,
    backgroundLocation: bg,
    forceHomeOnClose,
  });

  const token = String(searchParams.get("token") || "").trim();
  const phoneRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const [autoSignInError, setAutoSignInError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let alive = true;

    async function loadPreview() {
      if (!token) {
        setPreview(null);
        setPreviewError("Invitation link is invalid or expired.");
        setLoadingPreview(false);
        return;
      }

      setLoadingPreview(true);
      setPreviewError("");

      try {
        const data = await getInvestorInvitationPreview(token);
        if (!alive) return;
        setPreview(data);
      } catch (error) {
        if (!alive) return;
        setPreview(null);
        setPreviewError(error?.message || "Invitation link is invalid or expired.");
      } finally {
        if (alive) {
          setLoadingPreview(false);
        }
      }
    }

    loadPreview();
    return () => {
      alive = false;
    };
  }, [token]);

  function handlePhoneChange(event) {
    const inputValue = event.target.value;
    const cursor = event.target.selectionStart ?? inputValue.length;
    const digits = inputValue.replace(/\D/g, "").slice(0, 11);
    const digitsBeforeCursor = (inputValue.slice(0, cursor).match(/\d/g) || []).length;
    const formatted = formatPhoneDigits(digits);

    setPhone(formatted);

    window.requestAnimationFrame(() => {
      const element = phoneRef.current;
      if (!element) return;
      const nextPosition = cursorPosFromDigitCount(formatted, digitsBeforeCursor);
      element.setSelectionRange(nextPosition, nextPosition);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setAutoSignInError("");
    setResult(null);

    if (!token) {
      setSubmitError("Invitation link is invalid or expired.");
      return;
    }

    if (!preview) {
      setSubmitError("Invitation details are not available.");
      return;
    }

    const normalizedPhone = phone.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();
    const invitationEmail = String(preview?.email || "").trim();

    if (!normalizedPhone) {
      setSubmitError("Phone is required.");
      return;
    }

    if (normalizedPassword.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const acceptedAccount = await acceptInvestorInvitation(token, {
        companyName: companyName.trim(),
        phone: normalizedPhone,
        password: normalizedPassword,
      });
      setPassword("");
      setConfirmPassword("");

      try {
        await signIn(invitationEmail, normalizedPassword);
        navigate("/app", { replace: true });
        return;
      } catch {
        setResult(acceptedAccount);
        setAutoSignInError("Your account is ready, but automatic sign-in failed. Continue to sign in.");
      }
    } catch (error) {
      setSubmitError(error?.message || "Failed to accept invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  function goToLogin() {
    navigate("/login", { replace: true });
  }

  return (
    <div className={`inviteAcceptOverlay ${isClosing ? "inviteAcceptOverlay--closing" : ""}`} onMouseDown={close}>
      <div
        className={`inviteAccept ${isClosing ? "inviteAccept--closing" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="inviteAccept__header">
          <div>
            <h2 className="inviteAccept__title">Accept invitation</h2>
            <p className="inviteAccept__subtitle">Finish setting up your Megna investor account.</p>
          </div>
          <div
            className="inviteAccept__close"
            onClick={close}
            role="button"
            tabIndex={0}
            aria-label="Close invitation setup"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") close();
            }}
          >
            ✕
          </div>
        </div>

        {result ? (
          <div className="inviteAccept__success">
            <p className="inviteAccept__successText">
              Your investor account is ready.
            </p>
            {result?.email ? (
              <p className="inviteAccept__successMeta">
                {result.email} {result.status ? `• ${result.status}` : ""}
              </p>
            ) : null}
            {autoSignInError ? <div className="inviteAccept__error">{autoSignInError}</div> : null}
            <button type="button" className="inviteAccept__btn inviteAccept__btn--full" onClick={goToLogin}>
              Continue to sign in
            </button>
          </div>
        ) : (
          <form className="inviteAccept__form" onSubmit={handleSubmit}>
            {loadingPreview ? (
              <div className="inviteAccept__notice">Loading invitation...</div>
            ) : previewError ? (
              <div className="inviteAccept__notice inviteAccept__notice--error">{previewError}</div>
            ) : (
              <>
                <div className="inviteAccept__grid">
                  <label className="inviteAccept__field">
                    <span>First name</span>
                    <input type="text" value={preview?.firstName || ""} readOnly className="inviteAccept__input inviteAccept__input--locked" />
                  </label>

                  <label className="inviteAccept__field">
                    <span>Last name</span>
                    <input type="text" value={preview?.lastName || ""} readOnly className="inviteAccept__input inviteAccept__input--locked" />
                  </label>
                </div>

                <label className="inviteAccept__field">
                  <span>Email</span>
                  <input type="email" value={preview?.email || ""} readOnly className="inviteAccept__input inviteAccept__input--locked" />
                </label>

                <label className="inviteAccept__field">
                  <span>Company name (optional)</span>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="inviteAccept__input"
                    disabled={submitting}
                  />
                </label>

                <label className="inviteAccept__field">
                  <span>Phone</span>
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="inviteAccept__input"
                    disabled={submitting}
                  />
                </label>

                <div className="inviteAccept__field inviteAccept__field--password">
                  <span>Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="inviteAccept__input"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="inviteAccept__toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>

                {passwordStrength ? (
                  <div className={`inviteAccept__passwordStrength inviteAccept__passwordStrength--${passwordStrength}`}>
                    Password strength: {passwordStrength === "strong" ? "Strong" : "Weak"}
                  </div>
                ) : null}

                <div className="inviteAccept__field inviteAccept__field--password">
                  <span>Confirm password</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="inviteAccept__input"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="inviteAccept__toggle"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined">
                      {showConfirmPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>

                <p className="inviteAccept__copy">
                  Your invitation will create an approved investor account as soon as setup is complete.
                </p>
              </>
            )}

            {submitError ? <div className="inviteAccept__error">{submitError}</div> : null}

            <div className="inviteAccept__actions">
              <button type="button" className="inviteAccept__btn inviteAccept__btn--secondary" onClick={close} disabled={submitting}>
                Close
              </button>
              <button
                type="submit"
                className="inviteAccept__btn"
                disabled={loadingPreview || !!previewError || submitting || !preview}
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
