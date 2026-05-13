import { Link } from "react-router-dom";

export default function HomeAboutPage({
    id,
    isVisible,
    isClosing,
    isAuthed,
    primaryCtaLabel,
    primaryCtaTo,
    primaryCtaState,
    onClose,
}) {
    const isActive = isVisible || isClosing;

    return (
        <section
            id={id}
            className={`homeAboutPage ${isActive ? "is-visible" : ""} ${isClosing ? "is-closing" : ""}`}
            aria-label="About us page"
        >
            <button
                type="button"
                className="homeAboutPage__close"
                onClick={onClose}
                aria-label="Close about us page"
            >
                Close
            </button>

            <div className="homeAboutPage__scroll">
                <section className="homeAboutPage__hero">
                    <div className="homeShell homeAboutPage__heroInner">
                        <div className="homeAboutPage__copy">
                            <p className="homeAboutPage__eyebrow">About Megna</p>
                            <h1 className="homeAboutPage__title">A focused real estate room.</h1>
                            <p className="homeAboutPage__lead">
                                Megna keeps the process private, clear, and calm so serious buyers and sellers can find
                                alignment without the noise.
                            </p>
                            <p className="homeAboutPage__note">
                                {isAuthed
                                    ? "Your dashboard carries that same standard forward: cleaner context, qualified attention, and direct next steps."
                                    : "Apply once to enter a quieter marketplace built around clean presentation, qualified attention, and direct next steps."}
                            </p>

                            <div className="homeAboutPage__actions">
                                <Link to={primaryCtaTo} state={primaryCtaState} className="homeButton">
                                    {primaryCtaLabel}
                                </Link>
                                <button type="button" className="homeButton homeButton--ghost" onClick={onClose}>
                                    Return home
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
