import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { requestPasswordReset } from "@/api";
import "@/features/auth/modals/ForgotPasswordModal.css";
import { useAuthModalClose } from "@/features/auth/modals/useAuthModalClose";

export default function ForgotPasswordModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasBackground = !!location.state?.backgroundLocation;
  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const forceHomeOnClose = !!location.state?.forceHomeOnClose;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { isClosing, close } = useAuthModalClose({
    navigate,
    hasBackground,
    backgroundLocation: bg,
    forceHomeOnClose,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset({ email: email.trim() });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError?.message || "Failed to submit reset request.");
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className={`forgotOverlay ${isClosing ? "forgotOverlay--closing" : ""}`} onMouseDown={close}>
      <div
        className={`forgotModal ${isClosing ? "forgotModal--closing" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="forgotModal__header">
          <h2 className="forgotModal__title">Forgot Password</h2>
          <div
            className="forgotModal__close"
            onClick={close}
            role="button"
            tabIndex={0}
            aria-label="Close forgot password"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") close();
            }}
          >
            ✕
          </div>
        </div>

        <form className={`forgotModal__form ${success ? "forgotModal__form--success" : ""}`} onSubmit={handleSubmit}>
          {!success ? (
            <>
              <div className="field">
                <input
                  className="field__input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder=" "
                  autoComplete="email"
                  type="email"
                />
                <label className="field__label">Email</label>
              </div>

              <p className="forgotModal__hint">
                Enter your account email. If it exists, we'll send a reset link.
              </p>

              {error ? <div className="forgotModal__error">{error}</div> : null}

              <div className="forgotModal__actions">
                <button type="button" className="forgotModal__backBtn" onClick={goToLogin}>
                  Back to sign in
                </button>

                <button className="forgotModal__btn" disabled={loading || !email.trim()}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </>
          ) : (
            <div className="forgotModal__success">
              <p className="forgotModal__successText">
                If an account exists for {email.trim()}, we sent a reset link.
              </p>
              <div className="forgotModal__actions forgotModal__actions--bottom">
                <button type="button" className="forgotModal__btn forgotModal__btn--full" onClick={goToLogin}>
                  Back to sign in
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
