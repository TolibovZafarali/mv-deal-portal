import { Link } from "react-router-dom";
import "@/features/home/pages/HomePage.css"
import { useEffect, useRef, useState } from "react";
import { getClosedPropertyPreviews } from "@/api/modules/propertyApi";

const ROLE_INVESTOR = "INVESTOR";
const ROLE_SELLER = "SELLER";
const HOME_ROLE_STORAGE_KEY = "home.selectedRole";
const WHY_STATS_TARGETS = { hours: 24, multiplier: 3, percent: 100 };
const HERO_CTA_ROW_STYLE = { display: "flex", gap: "12px", flexWrap: "wrap" };

const ROLE_CONTENT = {
    [ROLE_SELLER]: {
        heroTitle: "Sell with more clarity. Close with serious buyers.",
        heroSubtitle: "Cleaner presentation. Faster buyer matching. Fewer dead-end conversations.",
        heroCtaLabel: "Join as Seller",
        heroCtaTo: "/signup/seller",
        whyTitle: "Built for selling with speed and confidence.",
        whyLead:
            "Megna helps sellers present deals clearly, attract qualified buyers, and keep momentum to close.",
        whyStatLabels: [
            "avg. buyer response window",
            "faster buyer matching",
            "focused on qualified demand",
        ],
        whyCards: [
            {
                title: "Structured deal presentation",
                text: "Show properties with consistent data so serious buyers can evaluate quickly.",
            },
            {
                title: "Qualified buyer visibility",
                text: "Reach active investors instead of wasting time with low-intent inquiries.",
            },
            {
                title: "Clear decision workflow",
                text: "Track updates, feedback, and next actions in one focused flow.",
            },
        ],
        dealsTitle: "Recently closed outcomes from seller-side flow.",
        dealsLead: "See how completed opportunities were positioned and closed through a cleaner process.",
        howTitle: "From listing to close in three clear steps.",
        howLead: "A no-noise seller workflow built for speed and qualified demand.",
        howSteps: [
            {
                title: "Publish your deal",
                text: "Share a clear deal profile so qualified buyers can evaluate it fast.",
            },
            {
                title: "Connect with serious buyers",
                text: "Review interest from active investors with cleaner context and fewer distractions.",
            },
            {
                title: "Move to close confidently",
                text: "Keep communication and decisions aligned until final execution.",
            },
        ],
        readyTitle: "Start selling. Keep every deal moving.",
        readyLead: "Present opportunities clearly and connect with qualified buyers faster.",
    },
    [ROLE_INVESTOR]: {
        heroTitle: "Real estate deals that are worth your attention.",
        heroSubtitle: "Clean pipeline. Serious opportunities. Zero noise.",
        heroCtaLabel: "Join as Buyer",
        heroCtaTo: "/signup",
        whyTitle: "Built for buying with speed and clarity.",
        whyLead:
            "Megna gives buyers cleaner deal flow, faster evaluation, and a workflow built for real execution.",
        whyStatLabels: [
            "avg. response window",
            "faster deal triage",
            "focused on off-market flow",
        ],
        whyCards: [
            {
                title: "Vetted opportunities",
                text: "Every listing is reviewed for core deal quality so you can focus on what matters.",
            },
            {
                title: "Fast investor matching",
                text: "Connect with active buyers quickly instead of wasting weeks chasing cold leads.",
            },
            {
                title: "No-noise workflow",
                text: "One clean pipeline to track opportunities, decisions, and next actions.",
            },
        ],
        dealsTitle: "A look at recently closed deals.",
        dealsLead: "Simple snapshots of completed opportunities. Active inventory remains private for approved members.",
        howTitle: "From buy-box to closed deal in three clear steps.",
        howLead: "No noise, no guesswork. A direct flow designed for buyers who need speed and clarity.",
        howSteps: [
            {
                title: "Set your criteria",
                text: "Define market, budget, and strategy so your deal flow matches your exact buy box.",
            },
            {
                title: "Review matched deals",
                text: "Analyze vetted opportunities quickly with clean property data and concise financial context.",
            },
            {
                title: "Move to close faster",
                text: "Engage directly and track decisions in one focused pipeline built for serious execution.",
            },
        ],
        readyTitle: "Start buying. Move with confidence.",
        readyLead: "Access vetted opportunities and evaluate them in a cleaner, faster flow.",
    },
};

function money(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return numeric.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
}

function fullAddress(property) {
    const line1 = [property?.street1, property?.street2].filter(Boolean).join(", ");
    const stateZip = [property?.state, property?.zip].filter(Boolean).join(" ");
    return [line1, property?.city, stateZip].filter(Boolean).join(", ");
}

function getInitialRole(location) {
    const stateRole = location.state?.signupRole;
    if (stateRole === ROLE_INVESTOR || stateRole === ROLE_SELLER) {
        return stateRole;
    }

    if (typeof window === "undefined") {
        return ROLE_INVESTOR;
    }

    try {
        const storedRole = window.localStorage.getItem(HOME_ROLE_STORAGE_KEY);
        if (storedRole === ROLE_INVESTOR || storedRole === ROLE_SELLER) {
            return storedRole;
        }
    } catch {
        // Ignore storage restrictions and keep default role.
    }

    return ROLE_INVESTOR;
}

export default function HomePage({
    location,
    isAuthed,
    bootstrapping,
    retrySessionRestore,
    sessionRestoreError,
}) {
    const homeRef = useRef(null);
    const homeWhyRef = useRef(null);
    const homeDealsRef = useRef(null);
    const dealsRailRef = useRef(null);
    const homeHowRef = useRef(null);
    const [closedDeals, setClosedDeals] = useState([]);
    const [closedDealsLoading, setClosedDealsLoading] = useState(true);
    const [closedDealsError, setClosedDealsError] = useState("");
    const [homeHowVisible, setHomeHowVisible] = useState(false);
    const [homeDealsVisible, setHomeDealsVisible] = useState(false);
    const [activeDealIndex, setActiveDealIndex] = useState(0);
    const [whyStats, setWhyStats] = useState({ hours: 0, multiplier: 0, percent: 0 });
    const [selectedRole, setSelectedRole] = useState(() => getInitialRole(location));
    const roleContent = ROLE_CONTENT[selectedRole] || ROLE_CONTENT[ROLE_INVESTOR];
    const showGuestCtas = !isAuthed && !sessionRestoreError;

    useEffect(() => {
        document.documentElement.classList.add("homeHideScrollbar");
        document.body.classList.add("homeHideScrollbar");
        document.documentElement.classList.add("homeSmoothScroll");

        let rafId = 0;
        let ticking = false;

        const updateScrollProgress = () => {
            ticking = false;
            const homeEl = homeRef.current;
            if (!homeEl) {
                return;
            }
            const heroHeight = window.innerHeight || 1;
            const scrollY = window.scrollY || 0;
            const progress = Math.min(scrollY / (heroHeight * 0.9), 1);
            const heroScroll = Math.min(scrollY, heroHeight);
            const pageMaxScroll = Math.max((document.documentElement?.scrollHeight || 0) - window.innerHeight, 1);
            const pageProgress = Math.min(scrollY / pageMaxScroll, 1);
            const zoomProgress = Math.min(scrollY / 360, 1);
            const heroZoomScale = 1.04 - (zoomProgress * 0.04);

            homeEl.style.setProperty("--hero-darken-opacity", (progress * 0.6).toFixed(3));
            homeEl.style.setProperty("--hero-parallax-y", `${Math.round(heroScroll * 0.2)}px`);
            homeEl.style.setProperty("--hero-overlay-parallax-y", `${Math.round(heroScroll * 0.1)}px`);
            homeEl.style.setProperty("--home-scroll-progress", pageProgress.toFixed(4));
            homeEl.style.setProperty("--hero-zoom-scale", heroZoomScale.toFixed(4));
        };

        const onScroll = () => {
            if (ticking) {
                return;
            }
            ticking = true;
            rafId = window.requestAnimationFrame(updateScrollProgress);
        };

        updateScrollProgress();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            window.cancelAnimationFrame(rafId);
            document.documentElement.classList.remove("homeHideScrollbar");
            document.documentElement.classList.remove("homeSmoothScroll");
            document.body.classList.remove("homeHideScrollbar");
        };
    }, []);

    useEffect(() => {
        let alive = true;

        (async () => {
            setClosedDealsLoading(true);
            setClosedDealsError("");

            try {
                const response = await getClosedPropertyPreviews({ page: 0, size: 6, sort: "createdAt,desc" });

                if (!alive) return;
                const rows = Array.isArray(response?.content) ? response.content : [];
                setClosedDeals(rows);
            } catch (error) {
                if (!alive) return;
                setClosedDeals([]);
                setClosedDealsError(error?.message || "Failed to load featured deals.");
            } finally {
                if (alive) setClosedDealsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        const sectionEl = homeWhyRef.current;
        if (!sectionEl) return undefined;

        const durationMs = 1450;
        let rafId = 0;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;

                const startedAt = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - startedAt) / durationMs, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const nextStats = {
                        hours: Math.round(WHY_STATS_TARGETS.hours * eased),
                        multiplier: Math.round(WHY_STATS_TARGETS.multiplier * eased),
                        percent: Math.round(WHY_STATS_TARGETS.percent * eased),
                    };

                    setWhyStats((prev) => {
                        if (
                            prev.hours === nextStats.hours
                            && prev.multiplier === nextStats.multiplier
                            && prev.percent === nextStats.percent
                        ) {
                            return prev;
                        }
                        return nextStats;
                    });

                    if (progress < 1) {
                        rafId = window.requestAnimationFrame(step);
                    } else {
                        setWhyStats(WHY_STATS_TARGETS);
                    }
                };

                rafId = window.requestAnimationFrame(step);
                observer.disconnect();
            },
            {
                threshold: 0.42,
                rootMargin: "0px 0px -8% 0px",
            },
        );

        observer.observe(sectionEl);
        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        const sectionEl = homeDealsRef.current;
        if (!sectionEl) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                setHomeDealsVisible(true);
                observer.disconnect();
            },
            {
                threshold: 0.22,
                rootMargin: "0px 0px -10% 0px",
            },
        );

        observer.observe(sectionEl);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const railEl = dealsRailRef.current;
        if (!railEl) return undefined;
        const cards = Array.from(railEl.querySelectorAll(".homeDeals__card"));
        if (!cards.length) return undefined;

        const updateActiveCard = () => {
            const railCenter = railEl.scrollLeft + (railEl.clientWidth / 2);
            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;

            cards.forEach((card, index) => {
                const cardCenter = card.offsetLeft + (card.clientWidth / 2);
                const distance = Math.abs(cardCenter - railCenter);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = index;
                }
            });

            setActiveDealIndex((prev) => (prev === bestIndex ? prev : bestIndex));
        };

        const onRailScroll = () => {
            updateActiveCard();
        };

        updateActiveCard();
        railEl.addEventListener("scroll", onRailScroll, { passive: true });
        window.addEventListener("resize", updateActiveCard, { passive: true });

        return () => {
            railEl.removeEventListener("scroll", onRailScroll);
            window.removeEventListener("resize", updateActiveCard);
        };
    }, [closedDeals.length]);

    useEffect(() => {
        const sectionEl = homeHowRef.current;
        if (!sectionEl) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                setHomeHowVisible(true);
                observer.disconnect();
            },
            {
                threshold: 0.48,
                rootMargin: "0px 0px -6% 0px",
            },
        );

        observer.observe(sectionEl);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const nextRole = location.state?.signupRole;
        if (nextRole === ROLE_INVESTOR || nextRole === ROLE_SELLER) {
            setSelectedRole(nextRole);
        }
    }, [location.state?.signupRole]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        try {
            window.localStorage.setItem(HOME_ROLE_STORAGE_KEY, selectedRole);
        } catch {
            // Ignore storage restrictions and continue without persistence.
        }
    }, [selectedRole]);
    
    // Don't flash homepage while the app is still checking the token
    if (bootstrapping) {
        return <div style={{ padding: "28px 18px" }}>Loading...</div>;
    }

    return (
        <div ref={homeRef} className="home">
            <div className="homeScrollProgress" aria-hidden="true" />
            <header className="homeHeader">
                <div className="homeHeader__inner">
                    <Link
                        to="/"
                        className="homeHeader__logo"
                        aria-label="Megna Real Estate - Home"
                    >
                        <img
                            src="/white-logo.svg"
                            alt="Megna Real Estate"
                            className="homeHeader__logoImg"
                        />
                    </Link>

                    <nav className="homeHeader__nav">
                        {isAuthed ? (
                            <Link to="/app" className="homeHeader__link">
                                Dashboard
                            </Link>
                        ) : showGuestCtas ? (
                            <>
                                <Link
                                    to="/signup"
                                    className="homeHeader__link"
                                    state={{ backgroundLocation: location, modal: true }}
                                >
                                    Sign Up
                                </Link>
                                <Link
                                    to="/login"
                                    className="homeHeader__link"
                                    state={{ backgroundLocation: location, modal: true }}
                                >
                                    Login
                                </Link>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="homeHeader__link homeHeader__linkButton"
                                onClick={() => retrySessionRestore?.()}
                            >
                                Retry Session
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            <main className="homeMain">
                <section className="homeHero" aria-label="Hero">
                    <div className="homeHero__overlay" />
                    <div className="homeHero__darken" />
                    <div className="homeHero__content">
                        <div
                            className={`homeRoleToggle ${selectedRole === ROLE_SELLER ? "homeRoleToggle--sell" : "homeRoleToggle--buy"}`}
                            role="tablist"
                            aria-label="Choose your role"
                        >
                            <button
                                type="button"
                                className={`homeRoleToggle__btn ${selectedRole === ROLE_INVESTOR ? "homeRoleToggle__btn--active" : ""}`}
                                onClick={() => setSelectedRole(ROLE_INVESTOR)}
                                aria-pressed={selectedRole === ROLE_INVESTOR}
                            >
                                Buy
                            </button>
                            <button
                                type="button"
                                className={`homeRoleToggle__btn ${selectedRole === ROLE_SELLER ? "homeRoleToggle__btn--active" : ""}`}
                                onClick={() => setSelectedRole(ROLE_SELLER)}
                                aria-pressed={selectedRole === ROLE_SELLER}
                            >
                                Sell
                            </button>
                        </div>

                        <div
                            key={selectedRole}
                            className="homeHero__copy"
                        >
                            <h1 className="homeHero__title">
                                {roleContent.heroTitle}
                            </h1>
                            <p className="homeHero__subtitle">
                                {roleContent.heroSubtitle}
                            </p>

                            {sessionRestoreError ? (
                                <div className="homeSessionNotice" role="status">
                                    <p className="homeSessionNotice__title">Session restore unavailable</p>
                                    <p className="homeSessionNotice__text">{sessionRestoreError}</p>
                                    <button
                                        type="button"
                                        className="homeReady__btn"
                                        onClick={() => retrySessionRestore?.()}
                                    >
                                        Retry session
                                    </button>
                                </div>
                            ) : null}

                            {showGuestCtas && (
                                <div style={HERO_CTA_ROW_STYLE}>
                                    <Link
                                        to={roleContent.heroCtaTo}
                                        className="homeHero__cta"
                                        state={{ backgroundLocation: location, modal: true, signupRole: selectedRole }}
                                    >
                                        <span className="homeHero__ctaText">{roleContent.heroCtaLabel}</span>
                                        <span className="homeHero__ctaArrow" aria-hidden="true"></span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section ref={homeWhyRef} className="homeWhyUs" aria-label="Why Us">
                    <div className="homeWhyUs__ambient" aria-hidden="true" />
                    <div className="homeWhyUs__inner">
                        <div className="homeWhyUs__top">
                            <div className="homeWhyUs__intro">
                                <p className="homeWhyUs__eyebrow">Why Us</p>
                                <h2 className="homeWhyUs__title">{roleContent.whyTitle}</h2>
                                <p className="homeWhyUs__lead">
                                    {roleContent.whyLead}
                                </p>
                            </div>

                            <div className="homeWhyUs__stats" aria-label="Platform metrics">
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">{whyStats.hours}h</p>
                                    <p className="homeWhyUs__statLabel">{roleContent.whyStatLabels[0]}</p>
                                </div>
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">{whyStats.multiplier}x</p>
                                    <p className="homeWhyUs__statLabel">{roleContent.whyStatLabels[1]}</p>
                                </div>
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">{whyStats.percent}%</p>
                                    <p className="homeWhyUs__statLabel">{roleContent.whyStatLabels[2]}</p>
                                </div>
                            </div>
                        </div>

                        <div className="homeWhyUs__grid">
                            {roleContent.whyCards.map((card, index) => (
                                <article className="homeWhyUs__card" key={card.title}>
                                    <p className="homeWhyUs__cardIndex">{String(index + 1).padStart(2, "0")}</p>
                                    <h3 className="homeWhyUs__cardTitle">{card.title}</h3>
                                    <p className="homeWhyUs__cardText">{card.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    ref={homeDealsRef}
                    className={`homeDeals ${homeDealsVisible ? "homeDeals--visible" : ""}`}
                    aria-label="Featured Deals Preview"
                >
                    <div className="homeDeals__inner">
                        <div className="homeDeals__head">
                            <div>
                                <p className="homeDeals__eyebrow">Featured Deals Preview</p>
                                <h2 className="homeDeals__title">{roleContent.dealsTitle}</h2>
                                <p className="homeDeals__lead">
                                    {roleContent.dealsLead}
                                </p>
                            </div>
                        </div>

                        {closedDealsLoading ? <div className="homeDeals__notice">Loading closed deals...</div> : null}
                        {!closedDealsLoading && closedDealsError ? (
                            <div className="homeDeals__notice homeDeals__notice--error">{closedDealsError}</div>
                        ) : null}
                        {!closedDealsLoading && !closedDealsError && closedDeals.length === 0 ? (
                            <div className="homeDeals__notice">No closed deals available right now.</div>
                        ) : null}

                        {!closedDealsLoading && !closedDealsError && closedDeals.length > 0 ? (
                            <div ref={dealsRailRef} className="homeDeals__grid">
                                {closedDeals.map((property, index) => {
                                    const leadPhoto = property?.photos?.[0]?.thumbnailUrl || property?.photos?.[0]?.url || "";

                                    return (
                                        <article
                                            key={property.id}
                                            className={`homeDeals__card ${activeDealIndex === index ? "homeDeals__card--active" : ""}`}
                                            style={{ "--deal-stagger": `${Math.min(index, 8) * 90}ms` }}
                                        >
                                            <div className="homeDeals__mediaWrap">
                                                {leadPhoto ? (
                                                    <img
                                                        src={leadPhoto}
                                                        alt={fullAddress(property) || `Property ${property.id}`}
                                                        className="homeDeals__media"
                                                    />
                                                ) : (
                                                    <div className="homeDeals__mediaFallback">
                                                        <span className="material-symbols-outlined">home</span>
                                                    </div>
                                                )}
                                                <span className="homeDeals__status">Closed</span>
                                            </div>

                                            <div className="homeDeals__body">
                                                <p className="homeDeals__address">{fullAddress(property) || "Address unavailable"}</p>
                                                <div className="homeDeals__stats">
                                                    <div>
                                                        <span className="homeDeals__label">Asking</span>
                                                        <span className="homeDeals__value">{money(property.askingPrice)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="homeDeals__label">ARV</span>
                                                        <span className="homeDeals__value">{money(property.arv)}</span>
                                                    </div>
                                                </div>
                                                <div className="homeDeals__meta">
                                                    <span>{property?.beds ?? "—"} bd</span>
                                                    <span>{property?.baths ?? "—"} ba</span>
                                                    <span>{property?.livingAreaSqft?.toLocaleString("en-US") ?? "—"} sqft</span>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </section>

                <section
                    ref={homeHowRef}
                    className={`homeHow ${homeHowVisible ? "homeHow--visible" : ""}`}
                    aria-label="How It Works"
                >
                    <div className="homeHow__inner">
                        <p className="homeHow__eyebrow">How It Works</p>
                        <h2 className="homeHow__title">{roleContent.howTitle}</h2>
                        <p className="homeHow__lead">
                            {roleContent.howLead}
                        </p>

                        <div className="homeHow__grid">
                            {roleContent.howSteps.map((step, index) => (
                                <article className="homeHow__card" key={step.title}>
                                    <p className="homeHow__index">{String(index + 1).padStart(2, "0")}</p>
                                    <h3 className="homeHow__cardTitle">{step.title}</h3>
                                    <p className="homeHow__cardText">{step.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="homeReady" aria-label="Get Started">
                    <div className="homeReady__ambient" aria-hidden="true" />
                    <div className="homeReady__inner">
                        <div className="homeReady__head">
                            <p className="homeReady__eyebrow">Get Started</p>
                            <h2 className="homeReady__title">{roleContent.readyTitle}</h2>
                            <p className="homeReady__lead">
                                {roleContent.readyLead}
                            </p>
                        </div>

                        {isAuthed ? (
                            <div className="homeReady__authed">
                                <p className="homeReady__authedText">Your workspace is ready.</p>
                                <Link to="/app" className="homeReady__btn homeReady__btn--wide">
                                    Open Dashboard
                                </Link>
                            </div>
                        ) : sessionRestoreError ? (
                            <div className="homeReady__authed">
                                <p className="homeReady__authedText">{sessionRestoreError}</p>
                                <button
                                    type="button"
                                    className="homeReady__btn homeReady__btn--wide"
                                    onClick={() => retrySessionRestore?.()}
                                >
                                    Retry session
                                </button>
                            </div>
                        ) : (
                            <div className="homeReady__roles">
                                <article
                                    className={`homeReady__roleCard homeReady__roleCard--investor ${selectedRole === ROLE_INVESTOR ? "homeReady__roleCard--selected" : ""}`}
                                >
                                    <p className="homeReady__roleTag">Buy</p>
                                    <h3 className="homeReady__roleTitle">Source and buy vetted opportunities</h3>
                                    <p className="homeReady__roleText">
                                        Get matched with active opportunities and evaluate them in a clean pipeline.
                                    </p>
                                    <Link
                                        to="/signup"
                                        className="homeReady__btn homeReady__btn--wide"
                                        state={{ backgroundLocation: location, modal: true, signupRole: "INVESTOR" }}
                                    >
                                        Join as Buyer
                                    </Link>
                                </article>

                                <article
                                    className={`homeReady__roleCard homeReady__roleCard--seller ${selectedRole === ROLE_SELLER ? "homeReady__roleCard--selected" : ""}`}
                                >
                                    <p className="homeReady__roleTag">Sell</p>
                                    <h3 className="homeReady__roleTitle">Present deals with clarity</h3>
                                    <p className="homeReady__roleText">
                                        Share your properties, manage updates, and connect with serious buyers faster.
                                    </p>
                                    <Link
                                        to="/signup/seller"
                                        className="homeReady__btn homeReady__btn--wide"
                                        state={{ backgroundLocation: location, modal: true, signupRole: "SELLER" }}
                                    >
                                        Join as Seller
                                    </Link>
                                </article>
                            </div>
                        )}

                        {showGuestCtas ? (
                            <div className="homeReady__foot">
                                <Link
                                    to="/login"
                                    className="homeReady__btn homeReady__btn--ghost"
                                    state={{ backgroundLocation: location, modal: true }}
                                >
                                    Sign In
                                </Link>
                            </div>
                        ) : null}
                    </div>
                </section>
            </main>

            <footer className="homeFooter">
                <div className="homeFooter__inner">
                    © {new Date().getFullYear()} Megna Real Estate. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
