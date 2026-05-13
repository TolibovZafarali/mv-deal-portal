import { Link } from "react-router-dom";

const ABOUT_SECTIONS = [
    {
        eyebrow: "The beginning",
        title: "Built in Saint Louis with a simple standard.",
        lead: "Megna is based in Saint Louis, MO, where CEO Michael Megna shaped the business around trust, direct communication, and cleaner presentation. The goal from the start was simple: make real estate opportunities feel easier to understand, easier to trust, and easier to move on when the fit is right.",
        image: {
            src: "/about/st-louis-skyline.jpg",
            alt: "Saint Louis skyline with the Gateway Arch",
        },
    },
    {
        eyebrow: "Building on success",
        title: "Better alignment creates better momentum.",
        lead: "As the business grows, Megna keeps the same discipline at the center of the work. Each opportunity is framed to reduce noise, clarify the details, and give qualified buyers and sellers a calmer way to decide whether the next step makes sense.",
        image: {
            src: "/about/key-handoff.jpg",
            alt: "A real estate key handoff",
        },
    },
    {
        eyebrow: "The journey continues",
        title: "A calmer path forward.",
        lead: "The next chapter is about building on relationships, quality opportunities, and a marketplace experience that respects people’s time. Megna continues forward with a focus on qualified attention, clear communication, and real momentum.",
        image: {
            src: "/about/home-path.jpg",
            alt: "A residential home with a front path",
        },
    },
];

function AboutPicture({ image, className = "", loading = "lazy" }) {
    return (
        <figure className={`homeAboutPage__picture ${className}`.trim()}>
            <img src={image.src} alt={image.alt} loading={loading} />
        </figure>
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
    const isActive = isVisible || isClosing;
    const primaryCtaClassName = `homeButton ${isAuthed ? "" : "homeAboutPage__joinButton"}`.trim();

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
                            <h1 className="homeAboutPage__title">
                                <span>A focused</span>
                                <span>real estate room.</span>
                            </h1>
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
                                <Link to={primaryCtaTo} state={primaryCtaState} className={primaryCtaClassName}>
                                    {primaryCtaLabel}
                                </Link>
                                <button type="button" className="homeButton homeButton--ghost" onClick={onClose}>
                                    Return home
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="homeAboutPage__sections" aria-label="Megna story">
                    {ABOUT_SECTIONS.map((section, index) => (
                        <section
                            key={section.eyebrow}
                            className={`homeAboutPage__storySection ${index % 2 === 0 ? "homeAboutPage__storySection--offset" : ""}`}
                        >
                            <div className="homeShell homeAboutPage__storyInner">
                                <div className="homeSectionHeading homeAboutPage__sectionHeading">
                                    <p className="homeSectionHeading__eyebrow">{section.eyebrow}</p>
                                    <h2 className="homeSectionHeading__title">{section.title}</h2>
                                    <p className="homeSectionHeading__lead">{section.lead}</p>
                                </div>
                                <AboutPicture image={section.image} />
                            </div>
                        </section>
                    ))}
                </section>
            </div>
        </section>
    );
}
