import { Link } from "react-router-dom";
import "@/features/home/pages/HomePage.css"
import { useEffect, useRef, useState } from "react";
import { getClosedPropertyPreviews } from "@/api/modules/propertyApi";

export default function HomePage({ location, isAuthed, bootstrapping }) {
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
        return [line1, property?.city, property?.state, property?.zip].filter(Boolean).join(", ");
    }

    const homeRef = useRef(null);
    const [closedDeals, setClosedDeals] = useState([]);
    const [closedDealsLoading, setClosedDealsLoading] = useState(true);
    const [closedDealsError, setClosedDealsError] = useState("");

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
            const progress = Math.min(window.scrollY / (heroHeight * 0.9), 1);
            homeEl.style.setProperty("--hero-darken-opacity", (progress * 0.6).toFixed(3));
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
    
    // Don't flash homepage while the app is still checking the token
    if (bootstrapping) {
        return <div style={{ padding: "28px 18px" }}>Loading...</div>;
    }

    return (
        <div ref={homeRef} className="home">
            <header className="homeHeader">
                <div className="homeHeader__inner">
                    <Link
                        to="/"
                        className="homeHeader__logo"
                        aria-label="Megna Real Estate - Home"
                    >
                        <img
                            src="/favicon.svg"
                            alt="Megna Real Estate"
                            className="homeHeader__logoImg"
                        />
                    </Link>

                    <nav className="homeHeader__nav">
                        {isAuthed ? (
                            <Link to="/app" className="homeHeader__link">
                                Dashboard
                            </Link>
                        ) : (
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
                        )}
                    </nav>
                </div>
            </header>

            <main className="homeMain">
                <section className="homeHero" aria-label="Hero">
                    <div className="homeHero__overlay" />
                    <div className="homeHero__darken" />
                    <div className="homeHero__content">
                        <h1 className="homeHero__title">
                            Real estate deals that are worth your attention.
                        </h1>
                        <p className="homeHero__subtitle">
                            Clean pipeline. Serious investors. Zero noise.
                        </p>

                        {!isAuthed && (
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                <Link
                                    to="/signup"
                                    className="homeHero__cta"
                                    state={{ backgroundLocation: location, modal: true }}
                                >
                                    <span className="homeHero__ctaText">Get Started</span>
                                    <span className="homeHero__ctaArrow" aria-hidden="true"></span>
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <section className="homeWhyUs" aria-label="Why Us">
                    <div className="homeWhyUs__ambient" aria-hidden="true" />
                    <div className="homeWhyUs__inner">
                        <div className="homeWhyUs__top">
                            <div className="homeWhyUs__intro">
                                <p className="homeWhyUs__eyebrow">Why Us</p>
                                <h2 className="homeWhyUs__title">Built for speed, clarity, and serious outcomes.</h2>
                                <p className="homeWhyUs__lead">
                                    Megna is designed for real estate investors and operators who want fewer clicks,
                                    better deals, and faster decisions.
                                </p>
                            </div>

                            <div className="homeWhyUs__stats" aria-label="Platform metrics">
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">48h</p>
                                    <p className="homeWhyUs__statLabel">avg. response window</p>
                                </div>
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">3x</p>
                                    <p className="homeWhyUs__statLabel">faster deal triage</p>
                                </div>
                                <div className="homeWhyUs__stat">
                                    <p className="homeWhyUs__statValue">100%</p>
                                    <p className="homeWhyUs__statLabel">focused on off-market flow</p>
                                </div>
                            </div>
                        </div>

                        <div className="homeWhyUs__grid">
                            <article className="homeWhyUs__card">
                                <p className="homeWhyUs__cardIndex">01</p>
                                <h3 className="homeWhyUs__cardTitle">Vetted opportunities</h3>
                                <p className="homeWhyUs__cardText">
                                    Every listing is reviewed for core deal quality so you can focus on what matters.
                                </p>
                            </article>
                            <article className="homeWhyUs__card">
                                <p className="homeWhyUs__cardIndex">02</p>
                                <h3 className="homeWhyUs__cardTitle">Fast investor matching</h3>
                                <p className="homeWhyUs__cardText">
                                    Connect with active buyers quickly instead of wasting weeks chasing cold leads.
                                </p>
                            </article>
                            <article className="homeWhyUs__card">
                                <p className="homeWhyUs__cardIndex">03</p>
                                <h3 className="homeWhyUs__cardTitle">No-noise workflow</h3>
                                <p className="homeWhyUs__cardText">
                                    One clean pipeline to track opportunities, decisions, and next actions.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>

                <section className="homeDeals" aria-label="Featured Deals Preview">
                    <div className="homeDeals__inner">
                        <div className="homeDeals__head">
                            <div>
                                <p className="homeDeals__eyebrow">Featured Deals Preview</p>
                                <h2 className="homeDeals__title">A look at recently closed deals.</h2>
                                <p className="homeDeals__lead">
                                    Simple snapshots of completed opportunities. Active inventory remains private for approved investors.
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
                            <div className="homeDeals__grid">
                                {closedDeals.map((property) => {
                                    const leadPhoto = property?.photos?.[0]?.thumbnailUrl || property?.photos?.[0]?.url || "";

                                    return (
                                        <article key={property.id} className="homeDeals__card">
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
            </main>

            <footer className="homeFooter">
                <div className="homeFooter__inner">
                    © {new Date().getFullYear()} Megna Real Estate. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
