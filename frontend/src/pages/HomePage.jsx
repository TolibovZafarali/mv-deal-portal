import { Link, Navigate } from "react-router-dom";
import "./HomePage.css"
import { useEffect } from "react";

export default function HomePage({ location, isAuthed, bootstrapping }) {
    useEffect(() => {
        document.body.classList.add("homeNoScroll");
        return () => document.body.classList.remove("homeNoScroll");
    }, []);
    
    // Don't flash homepage while the app is still checking the token
    if (bootstrapping) {
        return <div style={{ padding: "28px 18px" }}>Loading...</div>;
    }

    // If token is valid, go straight to the app redirect (which sends to dashboard)
    if (isAuthed) {
        return <Navigate to="/app" replace />;
    }

    return (
        <div className="home">
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
                    </nav>
                </div>
            </header>

            <main className="homeMain">
                <section className="homeHero" aria-label="Hero">
                    <div className="homeHero__overlay" />
                    <div className="homeHero__content">
                        <h1 className="homeHero__title">
                            Real estate deals that are worth your attention.
                        </h1>
                        <p className="homeHero__subtitle">
                            Clean pipeline. Serious investors. Zero noise.
                        </p>

                        <Link
                            to="/signup"
                            className="homeHero__cta"
                            state={{ backgroundLocation: location, modal: true }}
                        >
                            Get started
                        </Link>
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