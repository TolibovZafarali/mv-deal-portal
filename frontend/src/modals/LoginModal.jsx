import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useEffect, useState } from "react";
import "./LoginModal.css"

export default function LoginModal() {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const hasBackground = !!location.state?.backgroundLocation;
    const from =
        location.state?.from ||
        location.state?.backgroundLocation?.pathname ||
        "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function close() {
        // If we came from inside the app, go back. If direct URL /login, go home.
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

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn(email, password);
            navigate(from, { replace: true });
        } catch (err) {
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

                    <div className="field">
                        <input
                            className="field__input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=" "
                            type="password"
                            autoComplete="current-password"
                        />
                        <label className="field__label">Password</label>
                    </div>

                    {error && <div className="loginModal__error">{error}</div>}

                    <button
                        className="loginModal__btn"
                        disabled={loading || !email || !password}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    )
}