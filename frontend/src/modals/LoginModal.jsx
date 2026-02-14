import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useEffect, useState } from "react";
import "./LoginModal.css";

export default function LoginModal() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forcedMessage = location.state?.forcedMessage || "";
  const forceHomeOnClose = !!location.state?.forceHomeOnClose;

  const hasBackground = !!location.state?.backgroundLocation;
  const bg = location.state?.backgroundLocation || { pathname: "/" };
  const from = location.state?.from || location.state?.backgroundLocation?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (forceHomeOnClose) {
      navigate("/", { replace: true });
      return;
    }

    if (hasBackground) navigate(-1);
    else navigate("/", { replace: true });
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBackground]);

  useEffect(() => {
    if (forcedMessage) setError(forcedMessage);
  }, [forcedMessage]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.code === "ACCOUNT_PENDING") {
        const msg = "Your account is in review. Please wait for the Megna team to reach out.";

        navigate("/login", {
          replace: true,
          state: {
            modal: true,
            backgroundLocation: { pathname: "/" },
            from: "/app",
            forceHomeOnClose: true,
            forcedMessage: msg,
          },
        });

        setError(msg);
        return;
      }

      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginOverlay" onMouseDown={close}>
      <div className="loginModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="loginModal__header">
          <h2 className="loginModal__title">Login</h2>

          <div
            className="loginModal__close"
            onClick={close}
            role="button"
            tabIndex={0}
            aria-label="Close login"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") close();
            }}
          >
            ✕
          </div>
        </div>

        <form className="loginModal__form" onSubmit={handleSubmit}>
          <div className="field">
            <input
              className="field__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              autoComplete="email"
            />
            <label className="field__label">Email</label>
          </div>

          <div className="field field--password">
            <input
              className="field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
            />
            <label className="field__label">Password</label>

            {/* keep it clickable, but NOT tabbable */}
            <button
              type="button"
              className="field__toggle"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined">
                {showPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>

          {/* DOM order puts button before link so Tab goes password -> Login button.
              CSS order below makes the link LOOK between fields and button. */}
          <button className="loginModal__btn" disabled={loading || !email || !password}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="loginModal__alt">
            Don't have an account?{" "}
            <Link className="loginModal__altLink" to="/signup" replace state={{ modal: true, backgroundLocation: bg }}>
              Sign up
            </Link>
          </div>

          {error && <div className="loginModal__error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
