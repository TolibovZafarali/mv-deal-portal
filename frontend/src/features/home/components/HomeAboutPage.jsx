import { Link } from "react-router-dom";

const ABOUT_SIGNALS = [
    "Private-market focus",
    "Operator-grade clarity",
    "Built for conviction",
];

const CORE_POINTS = [
    {
        label: "01",
        title: "Clarity first",
        text: "The opportunity should feel legible immediately, not buried under noise.",
    },
    {
        label: "02",
        title: "Qualified attention",
        text: "We care more about alignment than volume. Serious rooms create better movement.",
    },
    {
        label: "03",
        title: "Momentum with taste",
        text: "Presentation and execution belong together. Better framing leads to better next steps.",
    },
];

const PROCESS_STEPS = [
    {
        label: "01",
        title: "Curate the room",
        text: "We create a more disciplined environment before the opportunity is even seen.",
    },
    {
        label: "02",
        title: "Frame it clearly",
        text: "Context, numbers, and narrative are arranged to help serious people assess quickly.",
    },
    {
        label: "03",
        title: "Advance with intent",
        text: "Once conviction is there, the workflow stays direct, calm, and easy to move through.",
    },
];

function prefersReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToSection(sectionId) {
    if (typeof document === "undefined") return;

    document.getElementById(sectionId)?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
    });
}

function AboutSectionHeading({ eyebrow, title, lead, className = "" }) {
    return (
        <div className={`homeSectionHeading homeAboutPage__sectionHeading ${className}`.trim()}>
            <p className="homeSectionHeading__eyebrow">{eyebrow}</p>
            <h2 className="homeSectionHeading__title">{title}</h2>
            <p className="homeSectionHeading__lead">{lead}</p>
        </div>
    );
}

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
    return (
        <section
            id={id}
            className={`homeAboutPage ${isVisible ? "is-visible" : ""} ${isClosing ? "is-closing" : ""}`}
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
                            <p className="homeAboutPage__eyebrow homeReveal" data-delay="40">
                                About Megna
                            </p>
                            <h1 className="homeAboutPage__title homeReveal" data-delay="120">
                                A quieter, higher-standard room for serious real estate.
                            </h1>
                            <p className="homeAboutPage__lead homeReveal" data-delay="200">
                                Megna is built for buyers and sellers who want discretion, sharper presentation, and a calmer
                                path from first look to serious next step.
                            </p>

                            <div className="homeAboutPage__signalRow homeReveal" data-delay="260" aria-label="Megna qualities">
                                {ABOUT_SIGNALS.map((signal) => (
                                    <span key={signal} className="homeAboutPage__signal">
                                        {signal}
                                    </span>
                                ))}
                            </div>

                            <p className="homeAboutPage__quote homeReveal" data-delay="320">
                                We are building a better room inside the market.
                            </p>

                            <div className="homeAboutPage__actions homeReveal" data-delay="380">
                                <Link to={primaryCtaTo} state={primaryCtaState} className="homeButton">
                                    {primaryCtaLabel}
                                </Link>
                                <button
                                    type="button"
                                    className="homeButton homeButton--ghost"
                                    onClick={() => scrollToSection("about-core")}
                                >
                                    Read the essentials
                                </button>
                            </div>
                        </div>

                        <div className="homeAboutPage__stage">
                            <article className="homeAboutPage__heroCard homeAboutPage__surface homeReveal homeReveal--right" data-delay="180">
                                <p className="homeAboutPage__cardLabel">The Megna standard</p>
                                <h2 className="homeAboutPage__heroCardTitle">Less noise. Better alignment.</h2>
                                <p className="homeAboutPage__heroCardText">
                                    We design every surface to make the opportunity feel credible, composed, and easy to act on.
                                </p>

                                <div className="homeAboutPage__metricRow">
                                    <div className="homeAboutPage__metricBlock">
                                        <p className="homeAboutPage__metricValue">Signal</p>
                                        <p className="homeAboutPage__metricText">over clutter</p>
                                    </div>
                                    <div className="homeAboutPage__metricBlock">
                                        <p className="homeAboutPage__metricValue">Trust</p>
                                        <p className="homeAboutPage__metricText">through clarity</p>
                                    </div>
                                    <div className="homeAboutPage__metricBlock">
                                        <p className="homeAboutPage__metricValue">Flow</p>
                                        <p className="homeAboutPage__metricText">without drag</p>
                                    </div>
                                </div>
                            </article>

                            <div className="homeAboutPage__detailGrid">
                                <article className="homeAboutPage__detailCard homeAboutPage__detailCard--wide homeAboutPage__surface homeReveal" data-delay="260">
                                    <p className="homeAboutPage__detailLabel">Built for</p>
                                    <p className="homeAboutPage__detailText">
                                        Buyers and sellers who care how an opportunity is presented, how trust forms, and how
                                        quickly the right next step becomes obvious.
                                    </p>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="about-core" className="homeAboutPage__section">
                    <div className="homeShell">
                        <div className="homeAboutPage__differenceGrid">
                            <article className="homeAboutPage__differenceIntro homeAboutPage__surface homeReveal">
                                <p className="homeAboutPage__differenceLabel">Who we are</p>
                                <h2 className="homeAboutPage__differenceTitle">
                                    A platform shaped by judgment, not volume.
                                </h2>
                                <p className="homeAboutPage__differenceText">
                                    Megna exists to make private-market real estate feel clearer and more credible the moment it
                                    reaches the right audience.
                                </p>
                                <p className="homeAboutPage__differenceText">
                                    We believe presentation is part of execution. When the signal is cleaner, better decisions
                                    happen sooner.
                                </p>
                            </article>

                            <div className="homeAboutPage__differenceStack">
                                {CORE_POINTS.map((item, index) => (
                                    <article
                                        key={item.title}
                                        className="homeAboutPage__differenceCard homeAboutPage__surface homeReveal"
                                        data-delay={120 + (index * 90)}
                                    >
                                        <p className="homeAboutPage__differenceCardLabel">{item.label}</p>
                                        <h3 className="homeAboutPage__differenceCardTitle">{item.title}</h3>
                                        <p className="homeAboutPage__differenceCardText">{item.text}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="about-approach" className="homeAboutPage__section">
                    <div className="homeShell">
                        <AboutSectionHeading
                            eyebrow="Our approach"
                            title="A cleaner path from first look to next step."
                            lead="Keep the opportunity legible, the audience qualified, and the workflow calm enough for conviction to show up early."
                            className="homeReveal"
                        />

                        <div className="homeAboutPage__processGrid">
                            {PROCESS_STEPS.map((step, index) => (
                                <article
                                    key={step.title}
                                    className="homeAboutPage__processCard homeAboutPage__surface homeReveal"
                                    data-delay={index * 90}
                                >
                                    <p className="homeAboutPage__processLabel">{step.label}</p>
                                    <h3 className="homeAboutPage__processTitle">{step.title}</h3>
                                    <p className="homeAboutPage__processText">{step.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="about-next" className="homeAboutPage__section homeAboutPage__section--cta">
                    <div className="homeShell">
                        <article className="homeAboutPage__ctaPanel homeAboutPage__surface homeReveal">
                            <div className="homeAboutPage__ctaCopy">
                                <p className="homeAboutPage__ctaEyebrow">Next step</p>
                                <h2 className="homeAboutPage__ctaTitle">
                                    {isAuthed ? "The room is already open." : "If this standard matches yours, step inside."}
                                </h2>
                                <p className="homeAboutPage__ctaLead">
                                    {isAuthed
                                        ? "Open your dashboard and continue in the same calmer workflow."
                                        : "Apply once and enter a platform built for qualified attention, cleaner presentation, and real momentum."}
                                </p>
                            </div>

                            <div className="homeAboutPage__ctaActions">
                                <Link to={primaryCtaTo} state={primaryCtaState} className="homeButton">
                                    {primaryCtaLabel}
                                </Link>
                                <button type="button" className="homeButton homeButton--ghost" onClick={onClose}>
                                    Return home
                                </button>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </section>
    );
}
