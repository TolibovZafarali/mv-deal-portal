import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { register, registerSeller } from "@/api";
import { useAuth } from "@/features/auth";
import "@/features/auth/modals/SignUpModal.css";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";
import { useAuthModalClose } from "@/features/auth/modals/useAuthModalClose";

const STEP_INFO = 0;
const STEP_PASSWORD = 1;
const STEP_DONE = 2;
const ROLE_BUYER = "INVESTOR";
const ROLE_SELLER = "SELLER";

export default function SignUpModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const hasBackground = !!location.state?.backgroundLocation;
  const forceHomeOnClose = !!location.state?.forceHomeOnClose;

  const [step, setStep] = useState(STEP_INFO);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSlideEnabled, setRoleSlideEnabled] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [direction, setDirection] = useState("forward"); // "forward" | "back"
  const [animKey, setAnimKey] = useState(0);
  const [hasStepTransition, setHasStepTransition] = useState(false);

  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const phoneRef = useRef(null);
  const isSellerSignup = selectedRole === ROLE_SELLER;
  const { isClosing, close } = useAuthModalClose({
    navigate,
    hasBackground,
    backgroundLocation: bg,
    forceHomeOnClose,
  });

  useEffect(() => {
    const stateRole = location.state?.signupRole;
    const normalizedStateRole =
      stateRole === ROLE_BUYER || stateRole === ROLE_SELLER ? stateRole : null;
    const roleFromPath = location.pathname === "/signup/seller" ? ROLE_SELLER : null;
    const preselectedRole = normalizedStateRole || roleFromPath;

    if (!preselectedRole) return;
    setRoleSlideEnabled(false);
    setSelectedRole(preselectedRole);
  }, [location.pathname, location.state?.signupRole]);

  function goStep(nextStep) {
    setHasStepTransition(true);
    setDirection(nextStep > step ? "forward" : "back");
    setStep(nextStep);
    setAnimKey((k) => k + 1);
  }

  const infoValid = useMemo(() => {
    return Boolean(
      selectedRole &&
        form.firstName.trim() &&
        form.lastName.trim() &&
        form.email.trim() &&
        form.phone.trim(),
    );
  }, [form, selectedRole]);

  const passwordValid = useMemo(() => {
    // backend requires minLength 8 for password
    return form.password.length >= 8 && form.password === confirmPassword;
  }, [form.password, confirmPassword]);

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  function updateField(key) {
    return (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  function formatPhoneDigits(digits) {
    if (!digits) return "";

    // allow up to 11 digits, but only show +1 if it's exactly 11 and starts with 1
    const raw = digits.slice(0, 11);

    let prefix = "";
    let d = raw;

    if (raw.length === 11 && raw.startsWith("1")) {
      prefix = "+1 ";
      d = raw.slice(1); // now 10 digits
    } else {
      d = raw.slice(0, 10);
    }

    const a = d.slice(0, 3);
    const b = d.slice(3, 6);
    const c = d.slice(6, 10);

    if (d.length <= 3) return `(${a}`;
    if (d.length <= 6) return `${prefix}(${a}) ${b}`;
    return `${prefix}(${a}) ${b}-${c}`;
  }

  function cursorPosFromDigitCount(formatted, digitCount) {
    if (digitCount <= 0) return 0;
    let count = 0;

    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count === digitCount) return i + 1;
    }
    return formatted.length;
  }

  function handlePhoneChange(e) {
    const inputValue = e.target.value;
    const cursor = e.target.selectionStart ?? inputValue.length;

    const digits = inputValue.replace(/\D/g, "").slice(0, 11);
    const digitsBeforeCursor = (inputValue.slice(0, cursor).match(/\d/g) || [])
      .length;

    const formatted = formatPhoneDigits(digits);

    setForm((p) => ({ ...p, phone: formatted }));

    window.requestAnimationFrame(() => {
      const el = phoneRef.current;
      if (!el) return;
      const newPos = cursorPosFromDigitCount(formatted, digitsBeforeCursor);
      el.setSelectionRange(newPos, newPos);
    });
  }

  function handleRoleSelect(role) {
    setError("");
    setSelectedRole((prev) => {
      if (prev && prev !== role) {
        setRoleSlideEnabled(true);
      }
      return role;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (step === STEP_INFO) {
      if (!selectedRole) {
        setError("Choose Buyer or Seller to continue.");
        return;
      }
      if (!infoValid) {
        setError("Fill out all fields to continue.");
        return;
      }
      goStep(STEP_PASSWORD);
      return;
    }

    if (step === STEP_PASSWORD) {
      if (!selectedRole) {
        setError("Choose Buyer or Seller to continue.");
        return;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== confirmPassword) {
        setError("Password do not match.");
        return;
      }

      setLoading(true);
      try {
        const payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        };
        const res = isSellerSignup ? await registerSeller(payload) : await register(payload);

        if (isSellerSignup) {
          try {
            await signIn(payload.email, payload.password);
            navigate("/seller", { replace: true });
            return;
          } catch {
            setError("Your seller account was created, but automatic sign in failed. Please sign in.");
          }
        }

        setResult(res);
        goStep(STEP_DONE);
      } catch (err) {
        setError(err?.data?.message || err?.message || "Sign up failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    // STEP_DONE
    close();
  }

  const modalTitle =
    step === STEP_PASSWORD
      ? "Set password"
      : step === STEP_DONE
        ? "Thank you"
        : "Sign Up";

  return (
    <div className={`signupOverlay ${isClosing ? "signupOverlay--closing" : ""}`} onMouseDown={close}>
      <div
        className={[
          "signupModal",
          step === STEP_DONE ? "signupModal--done" : "",
          isClosing ? "signupModal--closing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`signupModal__header ${step === STEP_DONE ? "signupModal__header--done" : ""}`}
        >
          <div className="signupModal__headerLeft">
            <h2 className="signupModal__title">{modalTitle}</h2>

            {step !== STEP_DONE && (
              <div className="signupModal__step">Step {step + 1} of 2</div>
            )}
          </div>

          <div
            className="signupModal__close"
            onClick={close}
            role="button"
            tabIndex={0}
            aria-label="Close signup"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") close();
            }}
          >
            ✕
          </div>
        </div>

        <form
          className={`signupModal__form ${step === STEP_DONE ? "signupModal__form--done" : ""}`}
          onSubmit={handleSubmit}
        >
          {step === STEP_INFO && (
            <div
              className={[
                "signupModal__roleToggle",
                roleSlideEnabled ? "signupModal__roleToggle--animate" : "",
                selectedRole ? `signupModal__roleToggle--${selectedRole.toLowerCase()}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="group"
              aria-label="Account type"
            >
              <span className="signupModal__roleToggleThumb" aria-hidden="true" />

              <button
                type="button"
                className={`signupModal__roleBtn ${selectedRole === ROLE_BUYER ? "signupModal__roleBtn--active" : ""}`}
                onClick={() => handleRoleSelect(ROLE_BUYER)}
                aria-pressed={selectedRole === ROLE_BUYER}
              >
                Buyer
              </button>

              <button
                type="button"
                className={`signupModal__roleBtn ${selectedRole === ROLE_SELLER ? "signupModal__roleBtn--active" : ""}`}
                onClick={() => handleRoleSelect(ROLE_SELLER)}
                aria-pressed={selectedRole === ROLE_SELLER}
              >
                Seller
              </button>
            </div>
          )}

          <div className="signupModal__contentWrap">
            <div
              key={animKey}
              className={[
                "signupModal__content",
                hasStepTransition ? `signupModal__content--${direction}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {step === STEP_INFO && (
                <>
                  <div className="field">
                    <input
                      className="field__input"
                      value={form.firstName}
                      onChange={updateField("firstName")}
                      placeholder=" "
                      autoComplete="given-name"
                    />
                    <label className="field__label">First name</label>
                  </div>

                  <div className="field">
                    <input
                      className="field__input"
                      value={form.lastName}
                      onChange={updateField("lastName")}
                      placeholder=" "
                      autoComplete="family-name"
                    />
                    <label className="field__label">Last name</label>
                  </div>

                  <div className="field">
                    <input
                      className="field__input"
                      value={form.companyName}
                      onChange={updateField("companyName")}
                      placeholder=" "
                      autoComplete="organization"
                    />
                    <label className="field__label">Company name (optional)</label>
                  </div>

                  <div className="field">
                    <input
                      className="field__input"
                      value={form.email}
                      onChange={updateField("email")}
                      placeholder=" "
                      type="email"
                      autoComplete="email"
                    />
                    <label className="field__label">Email</label>
                  </div>

                  <div className="field">
                    <input
                      ref={phoneRef}
                      className="field__input"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder=" "
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    <label className="field__label">Phone</label>
                  </div>

                  {step === STEP_INFO && (
                    <div className="signupModal__hint">
                      Please fill out the information above.
                    </div>
                  )}
                  <div className="signupModal__alt">
                    Already have an account?{" "}
                    <Link
                      className="signupModal__altLink"
                      to="/login"
                      replace
                      state={{ modal: true, backgroundLocation: bg }}
                    >
                      <span className="signupModal__altLinkInner">Sign in</span>
                    </Link>
                  </div>
                </>
              )}

              {step === STEP_PASSWORD && (
                <>
                  <div className="field field--password">
                    <input
                      className="field__input"
                      value={form.password}
                      onChange={updateField("password")}
                      placeholder=" "
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                    />
                    <label className="field__label">Password</label>

                    <button
                      type="button"
                      className="field__toggle"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                  {passwordStrength ? (
                    <div
                      className={`signupModal__passwordStrength signupModal__passwordStrength--${passwordStrength}`}
                      aria-live="polite"
                    >
                      Password strength: {passwordStrength === "strong" ? "Strong" : "Weak"}
                    </div>
                  ) : null}

                  <div className="field field--password">
                    <input
                      className="field__input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder=" "
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                    />
                    <label className="field__label">Confirm password</label>

                    <button
                      type="button"
                      className="field__toggle"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      <span className="material-symbols-outlined">
                        {showConfirm ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {step === STEP_DONE && (
                <div className="signupModal__done">
                  <p>
                    {isSellerSignup
                      ? "Your seller account is ready. Use Sign in to access the seller portal."
                      : "Your request has been received. Please wait until the Megna team reaches out to you."}
                  </p>

                  {result?.email && (
                    <p className="signupModal__doneMeta">
                      {result.email} {result.status ? `• ${result.status}` : ""}
                    </p>
                  )}

                  <button className="signupModal__btn signupModal__doneClose" type="submit">
                    Close
                  </button>
                </div>
              )}
              {error && <div className="signupModal__error">{error}</div>}

              {step === STEP_INFO && (
                <div className="signupModal__actions signupModal__actions--single">
                  <button
                    className="signupModal__btn"
                    type="submit"
                    disabled={loading || !infoValid}
                  >
                    {loading ? "Submitting..." : "Continue"}
                  </button>
                </div>
              )}

              {step === STEP_PASSWORD && (
                <div className="signupModal__actions">
                  <button
                    type="button"
                    className="signupModal__btn signupModal__btn--secondary"
                    onClick={() => {
                      setError("");
                      goStep(STEP_INFO);
                    }}
                    disabled={loading}
                  >
                    Back
                  </button>

                  <button
                    className="signupModal__btn"
                    type="submit"
                    disabled={loading || !passwordValid}
                  >
                    {loading
                      ? "Submitting..."
                      : isSellerSignup
                        ? "Create Seller Account"
                        : "Create Buyer Account"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
