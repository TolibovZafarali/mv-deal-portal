import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { register } from "../api";
import "./SignUpModal.css"

const STEP_INFO = 0;
const STEP_PASSWORD = 1;
const STEP_DONE = 2;

export default function SignUpModal() {
    const navigate = useNavigate();
    const location = useLocation();

    const hasBackground = !!location.state?.backgroundLocation;
    const forceHomeOnClose = !!location.state?.forceHomeOnClose;

    const [step, setStep] = useState(STEP_INFO);

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

    const bg = location.state?.backgroundLocation || { pathname: "/" };
    const phoneRef = useRef(null);

    function goStep(nextStep) {
        setDirection(nextStep > step ? "forward" : "back");
        setStep(nextStep);
        setAnimKey((k) => k + 1);
    }

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
    }, [hasBackground, forceHomeOnClose]);

    const infoValid = useMemo(() => {
        return (
            form.firstName.trim() && 
            form.lastName.trim() &&
            form.companyName.trim() &&
            form.email.trim() &&
            form.phone.trim()
        );
    }, [form]);

    const passwordValid = useMemo(() => {
        // backend requires minLength 8 for password
        return form.password.length >= 8 && form.password === confirmPassword;
    }, [form.password, confirmPassword]);

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
        const digitsBeforeCursor = (inputValue.slice(0, cursor).match(/\d/g) || []).length;

        const formatted = formatPhoneDigits(digits);

        setForm((p) => ({ ...p, phone: formatted }));

        window.requestAnimatedFrame(() => {
            const el = phoneRef.current;
            if (!el) return;
            const newPos = cursorPosFromDigitCount(formatted, digitsBeforeCursor);
            el.setSelectionRange(newPos, newPos);
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (step === STEP_INFO) {
            if (!infoValid) {
                setError("Fill out all fields to continue.");
                return;
            }
            goStep(STEP_PASSWORD);
            return;
        }

        if (step === STEP_PASSWORD) {
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
                // RegisterRequestDto requires: firstName, lastName, companyName, email, phone, password
                const res = await register({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    companyName: form.companyName.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    password: form.password,
                });

                setResult(res);
                goStep(STEP_DONE);
            } catch (err) {
                setError(err?.response?.data?.message || err?.message || "Sign up failed");
            } finally {
                setLoading(false);
            }
            return;
        }

        // STEP_DONE
        close();
    }

    const modalTitle =
      step === STEP_PASSWORD ? "Set password" : step === STEP_DONE ? "Thank you" : "Sign Up";

    return (
        <div className="signupOverlay" onMouseDown={close}>
            <div className="signupModal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="signupModal__header">
                    <div className="signupModal__headerLeft">
                        <h2 className="signupModal__title">
                            {modalTitle}
                        </h2>

                        {step !== STEP_DONE && (
                            <div className="signupModal__step">
                                Step {step + 1} of 2
                            </div>
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


                <form className="signupModal__form" onSubmit={handleSubmit}>
                    <div className="signupModal__contentWrap">
                        <div
                            key={animKey}
                            className={`signupModal__content signupModal__content--${direction}`}>
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
                                        <label className="field__label">Company name</label>
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
                                            <span className="signupModal__altLinkInner">
                                                Login
                                            </span>
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
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            <span className="material-symbols-outlined">
                                                {showPassword ? "visibility" : "visibility_off"}
                                            </span>
                                        </button>
                                    </div>

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
                                            aria-label={showConfirm ? "Hide password" : "Show password"}
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
                                        Your request has been received. Please wait until the Megna team reaches out to you.
                                    </p>

                                    {result?.email && (
                                        <p className="signupModal__doneMeta">
                                            {result.email} {result.status ? `• ${result.status}` : ""}
                                        </p>
                                    )}

                                    <button className="signupModal__btn" type="submit">
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
                                        {loading ? "Submitting..." : "Get Started"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}