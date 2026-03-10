import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicSiteFooter from "@/features/home/components/PublicSiteFooter";
import "@/features/home/pages/HomePage.css";
import "@/features/home/components/LegalPage.css";

const TABLET_BREAKPOINT_PX = 1024;

function prefersReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getInitialSectionId(sections) {
    const fallbackSectionId = sections[0]?.id ?? "";

    if (typeof window === "undefined") {
        return fallbackSectionId;
    }

    const hash = window.location.hash.replace("#", "");
    const matchedSection = sections.find((section) => section.id === hash);
    return matchedSection?.id ?? fallbackSectionId;
}

function scrollToSection(sectionId, behaviorOverride) {
    if (typeof document === "undefined" || typeof window === "undefined") {
        return;
    }

    const sectionNode = document.getElementById(sectionId);
    if (!sectionNode) return;

    sectionNode.scrollIntoView({
        behavior: behaviorOverride ?? (prefersReducedMotion() ? "auto" : "smooth"),
        block: "start",
    });

    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) {
        window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}${nextHash}`,
        );
    }
}

function LegalSection({ section, index }) {
    return (
        <section id={section.id} className="legalPageSection" aria-labelledby={`${section.id}-title`}>
            <header className="legalPageSection__header">
                <p className="legalPageSection__index">{String(index + 1).padStart(2, "0")}</p>
                <div className="legalPageSection__headingGroup">
                    <h2 id={`${section.id}-title`} className="legalPageSection__title">
                        {section.title}
                    </h2>
                    <p className="legalPageSection__summary">{section.summary}</p>
                </div>
            </header>

            <div className="legalPageSection__body">
                {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="legalPageSection__paragraph">
                        {paragraph}
                    </p>
                ))}

                {section.items?.length ? (
                    <ul className="legalPageSection__list">
                        {section.items.map((item) => (
                            <li key={item} className="legalPageSection__listItem">
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : null}

                {section.subsections?.map((subsection) => (
                    <section key={subsection.heading} className="legalPageSubsection">
                        <h3 className="legalPageSubsection__title">{subsection.heading}</h3>

                        {subsection.paragraphs?.map((paragraph) => (
                            <p key={paragraph} className="legalPageSection__paragraph">
                                {paragraph}
                            </p>
                        ))}

                        {subsection.items?.length ? (
                            <ul className="legalPageSection__list">
                                {subsection.items.map((item) => (
                                    <li key={item} className="legalPageSection__listItem">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : null}

                        {subsection.note ? <p className="legalPageSection__note">{subsection.note}</p> : null}
                    </section>
                ))}

                {section.note ? <p className="legalPageSection__note">{section.note}</p> : null}

                {section.contactDetails?.length ? (
                    <div className="legalPageContactCard">
                        {section.contactDetails.map((detail) => {
                            const isAddress = detail.type === "address";

                            return (
                                <div key={detail.label} className="legalPageContactCard__row">
                                    <p className="legalPageContactCard__label">{detail.label}</p>
                                    {detail.href ? (
                                        <a
                                            href={detail.href}
                                            className="legalPageContactCard__value legalPageContactCard__value--link"
                                        >
                                            {detail.value}
                                        </a>
                                    ) : isAddress ? (
                                        <address className="legalPageContactCard__value legalPageContactCard__value--address">
                                            {detail.value}
                                        </address>
                                    ) : (
                                        <p className="legalPageContactCard__value">{detail.value}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export default function LegalPage({
    title,
    subtitle,
    lastUpdated,
    highlights = [],
    sections = [],
    articleEyebrow = "Please read carefully",
    articleLead,
    heroEyebrow = "Legal information",
    tocIntro = "Use the section links below to jump through the page quickly.",
}) {
    const [activeSectionId, setActiveSectionId] = useState(() => getInitialSectionId(sections));
    const [logoOnLightSurface, setLogoOnLightSurface] = useState(false);
    const pageRef = useRef(null);
    const tocRef = useRef(null);
    const logoRef = useRef(null);
    const articleRef = useRef(null);

    useEffect(() => {
        document.documentElement.classList.add("homeSmoothScroll");
        return () => {
            document.documentElement.classList.remove("homeSmoothScroll");
        };
    }, []);

    useLayoutEffect(() => {
        if (typeof window === "undefined") return undefined;

        const hash = window.location.hash.replace("#", "");
        if (hash && sections.some((section) => section.id === hash)) {
            scrollToSection(hash, "auto");
            return undefined;
        }

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });

        return undefined;
    }, [sections]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const sectionNodes = sections.map((section) => document.getElementById(section.id)).filter(Boolean);
        if (!sectionNodes.length) return undefined;

        let frameId = 0;
        let ticking = false;

        const syncActiveSection = () => {
            ticking = false;

            const headerOffset = window.innerWidth <= 640
                ? 118
                : window.innerWidth <= TABLET_BREAKPOINT_PX
                    ? 132
                    : 148;
            const documentHeight = document.documentElement?.scrollHeight ?? 0;
            const reachedPageBottom = window.innerHeight + window.scrollY >= documentHeight - 24;

            if (reachedPageBottom) {
                const lastSectionId = sectionNodes[sectionNodes.length - 1]?.id;
                if (lastSectionId) {
                    setActiveSectionId((current) => (current === lastSectionId ? current : lastSectionId));
                }
                return;
            }

            let nextActiveSectionId = sectionNodes[0]?.id ?? sections[0]?.id ?? "";

            for (const sectionNode of sectionNodes) {
                if (sectionNode.getBoundingClientRect().top - headerOffset <= 0) {
                    nextActiveSectionId = sectionNode.id;
                    continue;
                }

                break;
            }

            setActiveSectionId((current) => (current === nextActiveSectionId ? current : nextActiveSectionId));
        };

        const requestSync = () => {
            if (ticking) return;
            ticking = true;
            frameId = window.requestAnimationFrame(syncActiveSection);
        };

        syncActiveSection();
        window.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });
        window.addEventListener("hashchange", requestSync);

        return () => {
            window.removeEventListener("scroll", requestSync);
            window.removeEventListener("resize", requestSync);
            window.removeEventListener("hashchange", requestSync);
            window.cancelAnimationFrame(frameId);
        };
    }, [sections]);

    useEffect(() => {
        const root = pageRef.current;
        if (!root || typeof window === "undefined") return undefined;

        let frameId = 0;
        let ticking = false;

        const syncScrollProgress = () => {
            ticking = false;
            const viewportHeight = window.innerHeight || 1;
            const pageMaxScroll = Math.max((document.documentElement?.scrollHeight || 0) - viewportHeight, 1);
            const pageProgress = Math.min(window.scrollY / pageMaxScroll, 1);

            root.style.setProperty("--home-scroll-progress", pageProgress.toFixed(4));
        };

        const requestSync = () => {
            if (ticking) return;
            ticking = true;
            frameId = window.requestAnimationFrame(syncScrollProgress);
        };

        syncScrollProgress();
        window.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });

        return () => {
            window.removeEventListener("scroll", requestSync);
            window.removeEventListener("resize", requestSync);
            window.cancelAnimationFrame(frameId);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        let frameId = 0;
        let ticking = false;

        const syncLogoContrast = () => {
            ticking = false;

            const logoNode = logoRef.current;
            const articleNode = articleRef.current;
            if (!logoNode || !articleNode) return;

            const logoRect = logoNode.getBoundingClientRect();
            const articleRect = articleNode.getBoundingClientRect();
            const logoCenterX = logoRect.left + (logoRect.width / 2);
            const logoCenterY = logoRect.top + (logoRect.height / 2);
            const overlapsLightArticle = logoCenterX >= articleRect.left
                && logoCenterX <= articleRect.right
                && logoCenterY >= articleRect.top
                && logoCenterY <= articleRect.bottom;

            setLogoOnLightSurface((current) => (current === overlapsLightArticle ? current : overlapsLightArticle));
        };

        const requestSync = () => {
            if (ticking) return;
            ticking = true;
            frameId = window.requestAnimationFrame(syncLogoContrast);
        };

        syncLogoContrast();
        window.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });

        return () => {
            window.removeEventListener("scroll", requestSync);
            window.removeEventListener("resize", requestSync);
            window.cancelAnimationFrame(frameId);
        };
    }, []);

    useEffect(() => {
        const tocNode = tocRef.current;
        if (!tocNode || !activeSectionId) return;
        if (tocNode.scrollHeight <= tocNode.clientHeight + 1) return;

        const activeLinkNode = tocNode.querySelector(`[data-section-id="${activeSectionId}"]`);
        if (!(activeLinkNode instanceof HTMLElement)) return;

        const visibilityPadding = 18;
        const currentTop = tocNode.scrollTop;
        const currentBottom = currentTop + tocNode.clientHeight;
        const activeTop = activeLinkNode.offsetTop;
        const activeBottom = activeTop + activeLinkNode.offsetHeight;
        const fullyVisible = activeTop >= currentTop + visibilityPadding
            && activeBottom <= currentBottom - visibilityPadding;

        if (fullyVisible) return;

        const idealScrollTop = activeTop - (tocNode.clientHeight * 0.42) + (activeLinkNode.offsetHeight / 2);
        const maxScrollTop = Math.max(tocNode.scrollHeight - tocNode.clientHeight, 0);
        const nextScrollTop = Math.min(Math.max(idealScrollTop, 0), maxScrollTop);

        tocNode.scrollTo({
            top: nextScrollTop,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
    }, [activeSectionId]);

    return (
        <div ref={pageRef} className={`home legalPageShell ${logoOnLightSurface ? "legalPageShell--lightLogo" : ""}`.trim()}>
            <div className="homeProgress" aria-hidden="true" />

            <header className="homeHeader legalPageHeader">
                <div className="homeShell homeHeader__inner">
                    <div className="homeHeader__left legalPageHeader__left">
                        <div className="legalPageHeader__titleBlock">
                            <p className="homeHeader__roleBadge">Legal</p>
                            <p className="homeHeader__pageTitle">{title}</p>
                        </div>
                    </div>

                    <Link ref={logoRef} to="/" className="homeHeader__logo" aria-label="Megna Real Estate home">
                        <span className="homeHeader__logoImage" aria-hidden="true" />
                    </Link>

                    <div className="homeHeader__actions legalPageHeader__actions">
                        <Link to="/" className="homeHeader__utilityLink">
                            Return Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="homeMain legalPageMain">
                <section className="legalPageHero">
                    <div className="homeShell legalPageHero__inner">
                        <div className="legalPageHero__content">
                            <p className="legalPageHero__eyebrow">{heroEyebrow}</p>
                            <h1 className="legalPageHero__title">{title}</h1>
                            <p className="legalPageHero__lead">{subtitle}</p>
                        </div>

                        <div className="legalPageHero__meta">
                            <div className="legalPageHero__metaCard legalPageHero__metaCard--primary">
                                <span className="legalPageHero__metaLabel">Last updated</span>
                                <span className="legalPageHero__metaValue">{lastUpdated}</span>
                            </div>

                            {highlights.map((item) => (
                                <div key={item.label} className="legalPageHero__metaCard">
                                    <span className="legalPageHero__metaLabel">{item.label}</span>
                                    <span className="legalPageHero__metaValue">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="legalPageContent" aria-label={`${title} page`}>
                    <div className="homeShell legalPageLayout">
                        <aside className="legalPageTocPanel">
                            <nav ref={tocRef} className="legalPageToc" aria-label={`${title} sections`}>
                                <p className="legalPageToc__eyebrow">On this page</p>
                                <p className="legalPageToc__intro">{tocIntro}</p>

                                <ol className="legalPageToc__list">
                                    {sections.map((section, index) => {
                                        const isActive = activeSectionId === section.id;

                                        return (
                                            <li key={section.id} className="legalPageToc__item">
                                                <a
                                                    href={`#${section.id}`}
                                                    data-section-id={section.id}
                                                    className={`legalPageToc__link ${isActive ? "is-active" : ""}`.trim()}
                                                    aria-current={isActive ? "location" : undefined}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setActiveSectionId(section.id);
                                                        scrollToSection(section.id);
                                                    }}
                                                >
                                                    <span className="legalPageToc__index">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </span>
                                                    <span className="legalPageToc__label">{section.title}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </nav>
                        </aside>

                        <article ref={articleRef} className="legalPageArticle">
                            <div className="legalPageArticle__intro">
                                <p className="legalPageArticle__eyebrow">{articleEyebrow}</p>
                                <p className="legalPageArticle__lead">{articleLead}</p>
                            </div>

                            {sections.map((section, index) => (
                                <LegalSection key={section.id} section={section} index={index} />
                            ))}
                        </article>
                    </div>
                </section>
            </main>

            <PublicSiteFooter />
        </div>
    );
}
