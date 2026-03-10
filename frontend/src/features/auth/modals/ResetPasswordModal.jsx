import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { resetPassword } from "@/api";
import "@/features/auth/modals/ResetPasswordModal.css";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";
import { useAuthModalClose } from "@/features/auth/modals/useAuthModalClose";

export default function ResetPasswordModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasBackground = !!location.state?.backgroundLocation;
  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const forceHomeOnClose = !!location.state?.forceHomeOnClose;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const token = (searchParams.get("token") || "").trim();
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const { isClosing, close } = useAuthModalClose({
    navigate,
    hasBackground,
    backgroundLocation: bg,
    forceHomeOnClose,
  });

  const loginLinkState = hasBackground
    ? {
        modal: true,
        backgroundLocation: bg,
        from: location.state?.from || "/app",
        forceHomeOnClose,
      }
    : undefined;

  function goToLogin() {
    navigate("/login", { replace: true, state: loginLinkState });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is invalid or expired.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`resetOverlay ${isClosing ? "resetOverlay--closing" : ""}`} onMouseDown={close}>
      <div
        className={`resetModal ${isClosing ? "resetModal--closing" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="resetModal__header">
          <h2 className="resetModal__title">Set new password</h2>
          <div
            className="resetModal__close"
            onClick={close}
            role="button"
            tabIndex={0}
            aria-label="Close reset password"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") close();
            }}
          >
            ✕
          </div>
        </div>

        {!success ? (
          <form className="resetModal__form" onSubmit={handleSubmit}>
            <div className="field field--password">
              <input
                className="field__input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder=" "
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
              />
              <label className="field__label">New password</label>
              <button
                type="button"
                className="field__toggle"
                tabIndex={-1}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {passwordStrength ? (
              <div
                className={`resetModal__passwordStrength resetModal__passwordStrength--${passwordStrength}`}
                aria-live="polite"
              >
                Password strength: {passwordStrength === "strong" ? "Strong" : "Weak"}
              </div>
            ) : null}

            <div className="field field--password">
              <input
                className="field__input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder=" "
                autoComplete="new-password"
                type={showConfirmPassword ? "text" : "password"}
              />
              <label className="field__label">Confirm password</label>
              <button
                type="button"
                className="field__toggle"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>

            <p className="resetModal__copy">Choose a new password for your account.</p>

            {error ? <div className="resetModal__error">{error}</div> : null}

            <div className="resetModal__actions resetModal__actions--bottom">
              <button
                className="resetModal__btn resetModal__btn--full"
                disabled={loading || !newPassword || !confirmPassword || !token}
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        ) : (
          <div className="resetModal__success">
            <p className="resetModal__successText">Your password has been reset successfully.</p>
            <div className="resetModal__actions resetModal__actions--bottom">
              <button type="button" className="resetModal__btn resetModal__btn--full" onClick={goToLogin}>
                Continue to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
