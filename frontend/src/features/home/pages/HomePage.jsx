import { Link } from "react-router-dom";
import "@/features/home/pages/HomePage.css"
import { useEffect, useRef } from "react";

export default function HomePage({ location, isAuthed, bootstrapping }) {
    const homeRef = useRef(null);

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
            </main>

            <footer className="homeFooter">
                <div className="homeFooter__inner">
                    © {new Date().getFullYear()} Megna Real Estate. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
