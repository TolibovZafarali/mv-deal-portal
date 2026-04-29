import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getClosedPropertyPreviews, searchProperties } from "@/api/modules/propertyApi";
import { getInvestorById } from "@/api/modules/investorApi";
import { getSellerById } from "@/api/modules/sellerApi";
import { getSellerProperties } from "@/api/modules/sellerPropertyApi";
import {
    HOME_ROLE_STORAGE_KEY,
    ROLE_CONTENT,
    ROLE_INVESTOR,
    ROLE_OPTION_CARDS,
    ROLE_SELLER,
} from "@/features/home/content/homeContent";
import PublicSiteFooter from "@/features/home/components/PublicSiteFooter";
import "@/features/home/pages/HomePage.css";
import "@/features/home/components/HomeAboutPage.css";
import HomeAboutPage from "@/features/home/components/HomeAboutPage";

const ABOUT_PAGE_ID = "home-about-page";
const ABOUT_TRANSITION_DURATION_MS = 980;

function userPrefersReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
        return ROLE_INVESTOR;
    }

    return ROLE_INVESTOR;
}

function buildModalState(location, signupRole) {
    return {
        backgroundLocation: location,
        modal: true,
        ...(signupRole ? { signupRole } : {}),
    };
}

function buildEmptyMetrics(metrics) {
    return metrics.map(() => 0);
}

function formatMetric(metric, value) {
    return (
        <>
            {metric.prefix ? <span className="homeMetric__affix">{metric.prefix}</span> : null}
            {value.toLocaleString("en-US")}
            {metric.suffix ? <span className="homeMetric__affix">{metric.suffix}</span> : null}
        </>
    );
}

function getDealSummary(property) {
    const asking = money(property?.askingPrice);
    const arv = money(property?.arv);

    if (asking !== "—" && arv !== "—") {
        return `Asking ${asking} with an ARV of ${arv}.`;
    }

    if (asking !== "—") {
        return `Presented at ${asking} inside the Megna preview flow.`;
    }

    if (arv !== "—") {
        return `Closed with a projected ARV of ${arv}.`;
    }

    return "Closed opportunity surfaced through the Megna preview flow.";
}

function getShowcaseSummary(property, statusLabel, includePriceDetails = true) {
    if (!includePriceDetails) {
        const normalizedStatus = String(statusLabel ?? "").trim();
        return normalizedStatus ? `${normalizedStatus} property in your Megna workflow.` : "Property in your Megna workflow.";
    }

    if (statusLabel === "Closed") {
        return getDealSummary(property);
    }

    const asking = money(property?.askingPrice);
    const arv = money(property?.arv);
    const normalizedStatus = String(statusLabel ?? "").trim();

    if (asking !== "—" && arv !== "—") {
        return `${normalizedStatus} at ${asking} with an ARV of ${arv}.`;
    }

    if (asking !== "—") {
        return `${normalizedStatus} at ${asking}.`;
    }

    if (arv !== "—") {
        return `${normalizedStatus} with an ARV of ${arv}.`;
    }

    return normalizedStatus ? `${normalizedStatus} property in your Megna workflow.` : "Property in your Megna workflow.";
}

function normalizeRole(value) {
    return String(value ?? "").trim().toUpperCase();
}

function userDisplayName(user) {
    const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return full;
}

function sellerWorkflowLabel(value) {
    const normalized = normalizeRole(value);
    if (normalized === "PUBLISHED") return "Published";
    if (normalized === "DRAFT") return "Draft";
    if (normalized === "SUBMITTED") return "Under review";
    return normalized ? normalized.toLowerCase().replaceAll("_", " ") : "Listing";
}

const ABOUT_SCENE_CONTENT = {
    label: "Click here",
    title: "About Megna",
    text:
        "Megna is a focused real estate marketplace built to remove noise and keep serious buyers and sellers aligned from first look to final close.",
};

function SectionHeading({ eyebrow, title, lead, className = "" }) {
    return (
        <div className={`homeSectionHeading ${className}`.trim()}>
            <p className="homeSectionHeading__eyebrow">{eyebrow}</p>
            <h2
                className="homeSectionHeading__title"
                style={typeof title === "string" && title.includes("\n") ? { whiteSpace: "pre-line" } : undefined}
            >
                {title}
            </h2>
            <p className="homeSectionHeading__lead">{lead}</p>
        </div>
    );
}

function DealCard({
    property,
    delay = 0,
    statusLabel = "Closed",
    linkTo = null,
    linkState = null,
    hidePriceDetails = false,
}) {
    const leadPhoto = property?.photos?.[0]?.thumbnailUrl || property?.photos?.[0]?.url || "";
    const address = fullAddress(property) || "Address unavailable";
    const market = [property?.city, property?.state].filter(Boolean).join(", ");
    const livingArea = Number(property?.livingAreaSqft);
    const detailItems = [
        property?.beds !== null && property?.beds !== undefined ? `${property.beds} bd` : null,
        property?.baths !== null && property?.baths !== undefined ? `${property.baths} ba` : null,
        Number.isFinite(livingArea) ? `${livingArea.toLocaleString("en-US")} sqft` : null,
    ].filter(Boolean);

    const card = (
        <article
            className="homeShowcase__card homeReveal"
            data-delay={delay}
        >
            <div className="homeShowcase__imageWrap">
                {leadPhoto ? (
                    <img
                        src={leadPhoto}
                        alt={address}
                        className="homeShowcase__image"
                    />
                ) : (
                    <div className="homeShowcase__imageFallback" aria-hidden="true">
                        <span className="material-symbols-outlined">home</span>
                    </div>
                )}
                <span className="homeShowcase__status">{statusLabel}</span>
            </div>

            <div className="homeShowcase__body">
                <div className="homeShowcase__metaRow">
                    <span>{market || "Private market"}</span>
                    <span>Megna preview</span>
                </div>
                <h3 className="homeShowcase__address">{address}</h3>
                <p className="homeShowcase__summary">{getShowcaseSummary(property, statusLabel, !hidePriceDetails)}</p>

                {!hidePriceDetails ? (
                    <div className="homeShowcase__stats">
                        <div className="homeShowcase__stat">
                            <span className="homeShowcase__label">Asking</span>
                            <span className="homeShowcase__value">{money(property?.askingPrice)}</span>
                        </div>
                        <div className="homeShowcase__stat">
                            <span className="homeShowcase__label">ARV</span>
                            <span className="homeShowcase__value">{money(property?.arv)}</span>
                        </div>
                    </div>
                ) : null}

                {detailItems.length ? (
                    <div className="homeShowcase__detailRow">
                        {detailItems.map((item) => (
                            <span key={item} className="homeShowcase__detailChip">
                                {item}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
        </article>
    );

    if (linkTo) {
        return (
            <Link to={linkTo} state={linkState} className="homeShowcase__cardLink">
                {card}
            </Link>
        );
    }

    return card;
}

export default function HomePage({
    location,
    user,
    isAuthed,
    signOut,
}) {
    const homeRef = useRef(null);
    const metricsRef = useRef(null);
    const sceneFrameRef = useRef(null);
    const showcaseRailRef = useRef(null);
    const aboutCloseTimerRef = useRef(0);
    const [selectedRole, setSelectedRole] = useState(() => getInitialRole(location));
    const [metricValues, setMetricValues] = useState(() => buildEmptyMetrics(ROLE_CONTENT[ROLE_INVESTOR].metrics));
    const [metricsVisible, setMetricsVisible] = useState(false);
    const [sceneHovered, setSceneHovered] = useState(false);
    const [aboutPageOpen, setAboutPageOpen] = useState(false);
    const [aboutPageReady, setAboutPageReady] = useState(false);
    const [aboutPageClosing, setAboutPageClosing] = useState(false);
    const [closedDeals, setClosedDeals] = useState([]);
    const [closedDealsLoading, setClosedDealsLoading] = useState(true);
    const [closedDealsError, setClosedDealsError] = useState("");
    const [showcaseScrollState, setShowcaseScrollState] = useState({
        canScrollLeft: false,
        canScrollRight: false,
    });
    const [signedInName, setSignedInName] = useState("");

    const authenticatedRole = normalizeRole(user?.role);
    const displayRole = isAuthed
        ? (authenticatedRole === "SELLER" ? ROLE_SELLER : ROLE_INVESTOR)
        : selectedRole;
    const roleContent = ROLE_CONTENT[displayRole] || ROLE_CONTENT[ROLE_INVESTOR];
    const isSellerAuthed = isAuthed && authenticatedRole === "SELLER";
    const signedInRoleLabel = authenticatedRole
        ? `${authenticatedRole.slice(0, 1)}${authenticatedRole.slice(1).toLowerCase()}`
        : "Investor";
    const featuredDeals = isAuthed && !isSellerAuthed ? closedDeals : closedDeals.slice(0, 4);
    const heroMetric = roleContent.metrics[0];
    const showcaseHeading = isAuthed
        ? (isSellerAuthed
            ? {
                eyebrow: "Your listings",
                title: "Your listings by status.",
                lead: "Listings are prioritized so you can review what is live first, then continue working through drafts.",
                empty: "No listings are available right now.",
                loadingLabel: "Loading your listings",
                carouselLabel: "Your listings",
            }
            : {
                eyebrow: "Active properties",
                title: "Properties currently active.",
                lead: "These are live opportunities available for review right now.",
                empty: "No active properties are available right now.",
                loadingLabel: "Loading active properties",
                carouselLabel: "Active properties",
            })
        : {
            eyebrow: roleContent.proof.eyebrow,
            title: roleContent.proof.title,
            lead: roleContent.proof.lead,
            empty: "No recent closings are available right now.",
            loadingLabel: "Loading recent closings",
            carouselLabel: "Recent closings carousel",
        };
    const showShowcaseControls = !closedDealsLoading && !closedDealsError && featuredDeals.length > 1;
    const hideHomeSections = aboutPageOpen && !aboutPageClosing;

    const handleSelectRole = (role) => {
        startTransition(() => {
            setSelectedRole(role);
        });
    };

    const syncShowcaseScrollState = useEffectEvent(() => {
        const rail = showcaseRailRef.current;
        if (!rail) {
            setShowcaseScrollState((prev) => {
                if (!prev.canScrollLeft && !prev.canScrollRight) return prev;
                return { canScrollLeft: false, canScrollRight: false };
            });
            return;
        }

        const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
        const next = {
            canScrollLeft: rail.scrollLeft > 1,
            canScrollRight: rail.scrollLeft < maxScrollLeft - 1,
        };

        setShowcaseScrollState((prev) => {
            if (
                prev.canScrollLeft === next.canScrollLeft
                && prev.canScrollRight === next.canScrollRight
            ) {
                return prev;
            }

            return next;
        });
    });

    const scrollShowcase = (direction) => {
        const rail = showcaseRailRef.current;
        if (!rail || typeof window === "undefined") return;

        const firstCard = rail.querySelector(".homeShowcase__cardLink, .homeShowcase__card, .homeShowcase__placeholder");
        const grid = rail.querySelector(".homeShowcase__grid");
        const gridStyles = grid ? window.getComputedStyle(grid) : null;
        const gap = parseFloat(gridStyles?.columnGap || gridStyles?.gap || "0") || 0;
        const distance = (firstCard?.getBoundingClientRect().width || rail.clientWidth) + gap;

        rail.scrollBy({
            left: direction * distance,
            behavior: userPrefersReducedMotion() ? "auto" : "smooth",
        });
    };

    const setSceneExpandMetrics = () => {
        const root = homeRef.current;
        const frame = sceneFrameRef.current;
        if (!root || !frame || typeof window === "undefined") return;

        const rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const viewportWidth = window.innerWidth || rect.width;
        const viewportHeight = window.innerHeight || rect.height;
        const computedStyle = window.getComputedStyle(frame);
        const radius = parseFloat(computedStyle.borderTopLeftRadius || "0") || 0;
        const right = Math.max(viewportWidth - rect.right, 0);
        const bottom = Math.max(viewportHeight - rect.bottom, 0);

        root.style.setProperty("--scene-origin-top", `${rect.top.toFixed(1)}px`);
        root.style.setProperty("--scene-origin-right", `${right.toFixed(1)}px`);
        root.style.setProperty("--scene-origin-bottom", `${bottom.toFixed(1)}px`);
        root.style.setProperty("--scene-origin-left", `${rect.left.toFixed(1)}px`);
        root.style.setProperty("--scene-origin-radius", `${radius.toFixed(1)}px`);
    };

    const openScene = () => {
        if (typeof window === "undefined") return;

        window.clearTimeout(aboutCloseTimerRef.current);
        setSceneHovered(false);
        setAboutPageClosing(false);
        setSceneExpandMetrics();
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        setAboutPageOpen(true);

        if (userPrefersReducedMotion()) {
            setAboutPageReady(true);
            return;
        }

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                setAboutPageReady(true);
            });
        });
    };

    const closeScene = () => {
        if (typeof window === "undefined") return;

        if (userPrefersReducedMotion()) {
            window.clearTimeout(aboutCloseTimerRef.current);
            setAboutPageReady(false);
            setAboutPageClosing(false);
            setAboutPageOpen(false);
            window.requestAnimationFrame(() => {
                sceneFrameRef.current?.focus({ preventScroll: true });
            });
            return;
        }

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        window.requestAnimationFrame(() => {
            setSceneExpandMetrics();
            setAboutPageClosing(true);
            setAboutPageReady(false);
        });
        window.clearTimeout(aboutCloseTimerRef.current);
        aboutCloseTimerRef.current = window.setTimeout(() => {
            setAboutPageOpen(false);
            setAboutPageClosing(false);
            sceneFrameRef.current?.focus({ preventScroll: true });
        }, ABOUT_TRANSITION_DURATION_MS);
    };

    const handleEscapeClose = useEffectEvent(() => {
        closeScene();
    });

    const handleSceneToggle = () => {
        if (aboutPageOpen) {
            closeScene();
            return;
        }
        openScene();
    };

    useEffect(() => {
        document.documentElement.classList.add("homeSmoothScroll");
        return () => {
            document.documentElement.classList.remove("homeSmoothScroll");
        };
    }, []);

    useEffect(() => {
        const root = homeRef.current;
        if (!root) return undefined;

        let frameId = 0;
        let ticking = false;

        const syncMotion = () => {
            ticking = false;
            const scrollY = window.scrollY || 0;
            const viewportHeight = window.innerHeight || 1;
            const heroProgress = Math.min(scrollY / (viewportHeight * 0.92), 1.2);
            const pageMaxScroll = Math.max((document.documentElement?.scrollHeight || 0) - viewportHeight, 1);
            const pageProgress = Math.min(scrollY / pageMaxScroll, 1);
            const heroScale = 1.04 - Math.min(scrollY / 1800, 0.04);

            root.style.setProperty("--home-scroll-progress", pageProgress.toFixed(4));
            root.style.setProperty("--hero-shift", `${Math.round(scrollY * 0.22)}px`);
            root.style.setProperty("--hero-orbit-shift", `${Math.round(scrollY * 0.14)}px`);
            root.style.setProperty("--hero-scale", heroScale.toFixed(3));
            root.style.setProperty("--hero-fade", Math.min(heroProgress * 0.78, 0.78).toFixed(3));
            root.style.setProperty("--header-opacity", (0.34 + Math.min(pageProgress * 0.26, 0.18)).toFixed(3));
            root.style.setProperty("--header-border-opacity", (0.12 + Math.min(pageProgress * 0.24, 0.16)).toFixed(3));
        };

        const requestSync = () => {
            if (ticking) return;
            ticking = true;
            frameId = window.requestAnimationFrame(syncMotion);
        };

        syncMotion();
        window.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });

        return () => {
            window.removeEventListener("scroll", requestSync);
            window.removeEventListener("resize", requestSync);
            window.cancelAnimationFrame(frameId);
        };
    }, []);

    useEffect(() => {
        const root = homeRef.current;
        if (!root) return undefined;

        const nodes = Array.from(root.querySelectorAll(".homeReveal"));
        if (!nodes.length) return undefined;
        const mobileShowcaseNodes = [];
        const standardNodes = [];

        nodes.forEach((node) => {
            const isGroupedShowcaseNode = Boolean(node.closest(".homeShowcase__grid"));
            const delay = isGroupedShowcaseNode ? "0" : (node.getAttribute("data-delay") || "0");
            node.style.setProperty("--reveal-delay", `${delay}ms`);

            if (isGroupedShowcaseNode) {
                mobileShowcaseNodes.push(node);
                return;
            }

            standardNodes.push(node);
        });

        if (typeof IntersectionObserver === "undefined") {
            nodes.forEach((node) => {
                node.classList.add("is-visible");
            });

            return undefined;
        }

        const revealNode = (node) => {
            node.classList.add("is-visible");
        };
        const cleanup = [];

        if (standardNodes.length) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        revealNode(entry.target);
                        observer.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0.18,
                    rootMargin: "0px 0px -8% 0px",
                },
            );

            standardNodes.forEach((node) => {
                observer.observe(node);
            });

            cleanup.push(() => observer.disconnect());
        }

        if (mobileShowcaseNodes.length) {
            const showcaseSection = root.querySelector(".homeShowcase");
            if (!showcaseSection) {
                mobileShowcaseNodes.forEach(revealNode);
            } else {
                const showcaseObserver = new IntersectionObserver(
                    ([entry]) => {
                        if (!entry?.isIntersecting) return;
                        mobileShowcaseNodes.forEach(revealNode);
                        showcaseObserver.unobserve(showcaseSection);
                    },
                    {
                        threshold: 0.18,
                        rootMargin: "0px 0px -8% 0px",
                    },
                );

                showcaseObserver.observe(showcaseSection);
                cleanup.push(() => showcaseObserver.disconnect());
            }
        }

        return () => {
            cleanup.forEach((disconnect) => disconnect());
        };
    }, [selectedRole, closedDeals.length, closedDealsLoading, closedDealsError, aboutPageOpen, isAuthed]);

    useEffect(() => {
        const section = metricsRef.current;
        if (!section) {
            setMetricsVisible(false);
            return undefined;
        }

        if (typeof IntersectionObserver === "undefined") {
            setMetricsVisible(true);
            return undefined;
        }

        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || 0;
        const initiallyVisible = rect.bottom > 0 && rect.top < viewportHeight;
        setMetricsVisible(initiallyVisible);

        const observer = new IntersectionObserver(
            ([entry]) => {
                setMetricsVisible(entry?.isIntersecting ?? false);
            },
            {
                threshold: 0.35,
                rootMargin: "0px 0px -10% 0px",
            },
        );

        observer.observe(section);
        return () => observer.disconnect();
    }, [aboutPageOpen, isAuthed, selectedRole]);

    useEffect(() => {
        let frameId = 0;
        if (!metricsVisible) {
            return undefined;
        }

        setMetricValues(buildEmptyMetrics(roleContent.metrics));
        const durationMs = 1350;
        const startedAt = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startedAt) / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setMetricValues(
                roleContent.metrics.map((metric) => Math.round(metric.value * eased)),
            );

            if (progress < 1) {
                frameId = window.requestAnimationFrame(tick);
            }
        };

        frameId = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(frameId);
    }, [metricsVisible, roleContent.metrics]);

    useEffect(() => {
        const rail = showcaseRailRef.current;
        if (!rail) {
            syncShowcaseScrollState();
            return undefined;
        }

        let frameId = 0;
        const requestSync = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(syncShowcaseScrollState);
        };

        rail.scrollTo({ left: 0, behavior: "auto" });
        requestSync();
        rail.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });

        return () => {
            rail.removeEventListener("scroll", requestSync);
            window.removeEventListener("resize", requestSync);
            window.cancelAnimationFrame(frameId);
        };
    }, [closedDealsError, closedDealsLoading, displayRole, featuredDeals.length]);

    useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        const requestConfig = { signal: controller.signal };

        (async () => {
            setClosedDealsLoading(true);
            setClosedDealsError("");

            try {
                let rows = [];

                if (!isAuthed) {
                    const response = await getClosedPropertyPreviews(
                        { page: 0, size: 6, sort: "createdAt,desc" },
                        requestConfig,
                    );
                    rows = Array.isArray(response?.content) ? response.content : [];
                } else if (authenticatedRole === "SELLER") {
                    const response = await getSellerProperties(
                        { page: 0, size: 20, sort: "updatedAt,desc" },
                        requestConfig,
                    );
                    const sellerRows = Array.isArray(response?.content) ? response.content : [];
                    const workflowRank = (property) => {
                        const workflow = normalizeRole(property?.sellerWorkflowStatus);
                        if (workflow === "PUBLISHED") return 0;
                        if (workflow === "DRAFT") return 1;
                        return 2;
                    };
                    rows = sellerRows
                        .slice()
                        .sort((a, b) => workflowRank(a) - workflowRank(b))
                        .slice(0, 6);
                } else {
                    const response = await searchProperties(
                        { status: "ACTIVE" },
                        { page: 0, size: 6, sort: "createdAt,desc" },
                        requestConfig,
                    );
                    rows = Array.isArray(response?.content) ? response.content : [];
                }

                if (!alive) return;
                setClosedDeals(rows);
            } catch (error) {
                if (error?.code === "ERR_CANCELED") return;
                if (!alive) return;
                setClosedDeals([]);
                const fallbackError = isAuthed
                    ? (authenticatedRole === "SELLER"
                        ? "Failed to load your listings."
                        : "Failed to load active properties.")
                    : "Failed to load featured closings.";
                setClosedDealsError(error?.message || fallbackError);
            } finally {
                if (alive) {
                    setClosedDealsLoading(false);
                }
            }
        })();

        return () => {
            alive = false;
            controller.abort();
        };
    }, [authenticatedRole, isAuthed]);

    useEffect(() => {
        const nextRole = location.state?.signupRole;
        if (nextRole === ROLE_INVESTOR || nextRole === ROLE_SELLER) {
            startTransition(() => {
                setSelectedRole(nextRole);
            });
        }
    }, [location.state?.signupRole]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            window.localStorage.setItem(HOME_ROLE_STORAGE_KEY, selectedRole);
        } catch {
            return;
        }
    }, [selectedRole]);

    useEffect(() => {
        if (!isAuthed) {
            setSignedInName("");
            return;
        }

        const immediateName = userDisplayName(user);
        if (immediateName) {
            setSignedInName(immediateName);
            return;
        }

        let alive = true;
        const controller = new AbortController();
        const requestConfig = { signal: controller.signal };

        (async () => {
            try {
                if (authenticatedRole === "INVESTOR" && user?.investorId) {
                    const investor = await getInvestorById(user.investorId, requestConfig);
                    if (!alive) return;
                    setSignedInName([investor?.firstName, investor?.lastName].filter(Boolean).join(" ").trim());
                    return;
                }

                if (authenticatedRole === "SELLER" && user?.sellerId) {
                    const seller = await getSellerById(user.sellerId, requestConfig);
                    if (!alive) return;
                    setSignedInName([seller?.firstName, seller?.lastName].filter(Boolean).join(" ").trim());
                    return;
                }

                if (alive) {
                    setSignedInName("");
                }
            } catch {
                if (alive) {
                    setSignedInName("");
                }
            }
        })();

        return () => {
            alive = false;
            controller.abort();
        };
    }, [authenticatedRole, isAuthed, user]);

    useEffect(() => {
        if (!aboutPageOpen) return undefined;

        const onResize = () => {
            setSceneExpandMetrics();
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                handleEscapeClose();
            }
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [aboutPageOpen]);

    useEffect(() => {
        if (!aboutPageOpen || typeof document === "undefined") {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [aboutPageOpen]);

    useEffect(() => {
        return () => {
            window.clearTimeout(aboutCloseTimerRef.current);
        };
    }, []);

    return (
        <div
            ref={homeRef}
            className={`home ${aboutPageOpen ? "home--aboutOpen" : ""} ${aboutPageReady ? "home--aboutReady" : ""} ${aboutPageClosing ? "home--aboutClosing" : ""}`}
        >
            <div className="homeProgress" aria-hidden="true" />

            <header className="homeHeader">
                <div className="homeShell homeHeader__inner homeReveal" data-delay="20">
                    <div className={`homeHeader__left ${isAuthed ? "homeHeader__left--signedIn" : ""}`.trim()}>
                        {!isAuthed ? (
                            <div
                                className={`homeRoleSwitch homeRoleSwitch--header ${selectedRole === ROLE_SELLER ? "homeRoleSwitch--seller" : ""}`}
                                role="tablist"
                                aria-label="Choose your role"
                            >
                                <button
                                    type="button"
                                    className={`homeRoleSwitch__button ${selectedRole === ROLE_INVESTOR ? "is-active" : ""}`}
                                    onClick={() => handleSelectRole(ROLE_INVESTOR)}
                                    aria-pressed={selectedRole === ROLE_INVESTOR}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    className={`homeRoleSwitch__button ${selectedRole === ROLE_SELLER ? "is-active" : ""}`}
                                    onClick={() => handleSelectRole(ROLE_SELLER)}
                                    aria-pressed={selectedRole === ROLE_SELLER}
                                >
                                    Sell
                                </button>
                            </div>
                        ) : (
                            <>
                                <span
                                    className="homeHeader__roleBadge"
                                    aria-label={`Signed in as ${signedInRoleLabel}`}
                                >
                                    {signedInRoleLabel}
                                </span>
                                <Link to="/app" className="homeButton homeButton--compact homeHeader__dashboardShortcut">
                                    Dashboard
                                </Link>
                            </>
                        )}
                    </div>

                    <Link to="/" className="homeHeader__logo" aria-label="Megna Real Estate home">
                        <span className="homeHeader__logoImage" aria-hidden="true" />
                    </Link>

                    <div className="homeHeader__actions">
                        {isAuthed ? (
                            <>
                                <button
                                    type="button"
                                    className="homeHeader__utilityLink homeHeader__utilityButton"
                                    onClick={signOut}
                                >
                                    Log out
                                </button>
                                <Link to="/app" className="homeButton homeButton--compact">
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="homeHeader__utilityLink"
                                    state={buildModalState(location)}
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to={roleContent.hero.primaryCtaTo}
                                    className="homeButton homeButton--compact"
                                    state={buildModalState(location, selectedRole)}
                                >
                                    {roleContent.hero.primaryCtaLabel}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="homeMain">
                <section className={`homeHero ${sceneHovered ? "homeHero--immersed" : ""}`} aria-label="Homepage hero">
                    <div className="homeHero__backdrop" aria-hidden="true" />
                    <div className="homeHero__mesh" aria-hidden="true" />

                    <div className="homeShell homeHero__inner">
                        <div className="homeHero__copy homeReveal" data-delay="120">
                            <div className="homeHero__copySwap">
                                <div key={`hero-copy-${selectedRole}`} className="homeRoleMotion">
                                    <p className="homeHero__eyebrow">
                                        {isAuthed ? "WELCOME BACK" : roleContent.hero.eyebrow}
                                    </p>
                                    <h1 className={`homeHero__title ${displayRole === ROLE_SELLER ? "homeHero__title--seller" : ""}`}>
                                        {isAuthed
                                            ? signedInName
                                            : roleContent.hero.title}
                                    </h1>
                                    <p className="homeHero__subtitle">
                                        {isAuthed
                                            ? (authenticatedRole === "SELLER"
                                                ? "Published listings are surfaced first, followed by drafts so you can prioritize quickly."
                                                : "Review active properties and jump back into live opportunities without extra noise.")
                                            : roleContent.hero.subtitle}
                                    </p>

                                    <div className="homeHero__actions">
                                        {isAuthed ? (
                                            <>
                                                <Link to="/app" className="homeButton">
                                                    Open dashboard
                                                </Link>
                                                <a href="#proof" className="homeButton homeButton--ghost">
                                                    {authenticatedRole === "SELLER" ? "See your listings" : "See active properties"}
                                                </a>
                                            </>
                                        ) : (
                                            <Link
                                                to={roleContent.hero.primaryCtaTo}
                                                className="homeButton"
                                                state={buildModalState(location, selectedRole)}
                                            >
                                                {roleContent.hero.primaryCtaLabel}
                                            </Link>
                                        )}

                                        {!isAuthed ? (
                                            <a href={roleContent.hero.secondaryCtaHref} className="homeButton homeButton--ghost">
                                                {roleContent.hero.secondaryCtaLabel}
                                            </a>
                                        ) : null}
                                    </div>

                                    <div className="homeHero__signalRow" aria-label="Experience highlights">
                                        {roleContent.hero.signals.map((signal) => (
                                            <span key={signal} className="homeHero__signal homeRoleMotion">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="homeHero__scene homeReveal homeReveal--right" data-delay="240">
                            <div
                                ref={sceneFrameRef}
                                className="homeHero__sceneFrame"
                                onPointerEnter={() => setSceneHovered(true)}
                                onPointerLeave={() => setSceneHovered(false)}
                                onClick={handleSceneToggle}
                                role="button"
                                tabIndex={0}
                                aria-label={aboutPageOpen ? "Close about us page" : "Open about us page"}
                                aria-expanded={aboutPageOpen}
                                aria-controls={ABOUT_PAGE_ID}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        handleSceneToggle();
                                    }
                                }}
                            >
                                <div className="homeHero__sceneImage" />
                                <div className="homeHero__sceneGradient" />

                                <div className="homeHero__sceneText homeRoleMotion">
                                    <p className="homeHero__sceneLabel">{ABOUT_SCENE_CONTENT.label}</p>
                                    <h2 className="homeHero__sceneTitle">{ABOUT_SCENE_CONTENT.title}</h2>
                                    <p className="homeHero__sceneCopy">{ABOUT_SCENE_CONTENT.text}</p>
                                </div>
                            </div>

                            <div className="homeHero__floatCard homeHero__floatCard--metric">
                                <p className="homeHero__floatLabel">{heroMetric.label}</p>
                                <p className="homeHero__floatValue">
                                    {heroMetric.value}
                                    <span>{heroMetric.suffix}</span>
                                </p>
                            </div>

                            <div key={`scene-detail-${selectedRole}`} className="homeHero__floatCard homeHero__floatCard--detail">
                                <div className="homeHero__detailList homeRoleMotion">
                                    {roleContent.hero.detailList.map((item) => (
                                        <span key={item} className="homeHero__detailItem">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {aboutPageOpen ? (
                    <HomeAboutPage
                        id={ABOUT_PAGE_ID}
                        isVisible={aboutPageReady}
                        isClosing={aboutPageClosing}
                        isAuthed={isAuthed}
                        primaryCtaLabel={isAuthed ? "Open dashboard" : roleContent.hero.primaryCtaLabel}
                        primaryCtaTo={isAuthed ? "/app" : roleContent.hero.primaryCtaTo}
                        primaryCtaState={isAuthed ? null : buildModalState(location, selectedRole)}
                        onClose={closeScene}
                    />
                ) : null}

                {aboutPageOpen ? (
                    <div
                        className={`homeAboutTransition ${aboutPageReady ? "is-open" : ""} ${aboutPageClosing ? "is-closing" : ""}`}
                        aria-hidden="true"
                    >
                        <div className="homeAboutTransition__panel">
                            <div className="homeAboutTransition__image" />
                            <div className="homeAboutTransition__gradient" />
                            <div className="homeAboutTransition__veil" />
                            <div className="homeAboutTransition__glow" />
                        </div>
                    </div>
                ) : null}
                {hideHomeSections ? null : (
                    <>
                        {!isAuthed ? (
                            <section id="perspective" className="homeStory" aria-label="Perspective">
                                <div className="homeShell">
                                    <div className="homeReveal" data-delay="40">
                                        <div key={`story-top-${selectedRole}`} className="homeStory__top homeRoleMotion">
                                            <SectionHeading
                                                eyebrow={roleContent.statement.eyebrow}
                                                title={roleContent.statement.title}
                                                lead={roleContent.statement.lead}
                                                className=""
                                            />

                                            {roleContent.statement.quote ? (
                                                <p className="homeStory__quote">
                                                    {roleContent.statement.quote}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div ref={metricsRef} className="homeStory__metrics">
                                        {roleContent.metrics.map((metric, index) => (
                                            <article
                                                key={metric.label}
                                                className="homeStory__metric homeReveal homeRoleMotion"
                                                data-delay={index * 90}
                                            >
                                                <p className="homeStory__metricValue">{formatMetric(metric, metricValues[index] ?? 0)}</p>
                                                <p className="homeStory__metricLabel">{metric.label}</p>
                                            </article>
                                        ))}
                                    </div>

                                    <div key={`principles-intro-${selectedRole}`} className="homeStory__principlesIntro homeReveal homeRoleMotion" data-delay="60">
                                        <p className="homeStory__principlesEyebrow">Design principles</p>
                                        <h3 className="homeStory__principlesTitle">{roleContent.principles.title}</h3>
                                        <p className="homeStory__principlesLead">{roleContent.principles.lead}</p>
                                    </div>

                                    <div className="homeStory__principlesGrid">
                                        {roleContent.principles.items.map((item, index) => (
                                            <article
                                                key={item.title}
                                                className="homeStory__principle homeReveal homeRoleMotion"
                                                data-delay={index * 110}
                                            >
                                                <p className="homeStory__principleLabel">{item.label}</p>
                                                <h3 className="homeStory__principleTitle">{item.title}</h3>
                                                <p className="homeStory__principleText">{item.text}</p>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {!isAuthed ? (
                            <section id="flow" className="homeProcess" aria-label="Process">
                                <div className="homeShell">
                                    <div key={`process-heading-${selectedRole}`} className="homeRoleMotion">
                                        <SectionHeading
                                            eyebrow={roleContent.process.eyebrow}
                                            title={roleContent.process.title}
                                            lead={roleContent.process.lead}
                                            className={`homeReveal ${selectedRole === ROLE_SELLER ? "homeSectionHeading--sellerProcess" : ""}`}
                                        />
                                    </div>

                                    <div className="homeProcess__grid">
                                        {roleContent.process.steps.map((step, index) => (
                                            <article
                                                key={step.title}
                                                className="homeProcess__card homeReveal homeRoleMotion"
                                                data-delay={index * 110}
                                            >
                                                <p className="homeProcess__label">{step.label}</p>
                                                <h3 className="homeProcess__title">{step.title}</h3>
                                                <p className="homeProcess__text">{step.text}</p>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        <section id="proof" className="homeShowcase" aria-label={showcaseHeading.carouselLabel}>
                            <div className="homeShell">
                                <div className="homeShowcase__header">
                                    <div key={`proof-heading-${displayRole}`} className="homeRoleMotion">
                                        <SectionHeading
                                            eyebrow={showcaseHeading.eyebrow}
                                            title={showcaseHeading.title}
                                            lead={showcaseHeading.lead}
                                            className="homeReveal"
                                        />
                                    </div>

                                    {showShowcaseControls ? (
                                        <div className="homeShowcase__controls" aria-label="Property carousel controls">
                                            <button
                                                className="homeShowcase__navBtn"
                                                type="button"
                                                aria-label="Previous property"
                                                disabled={!showcaseScrollState.canScrollLeft}
                                                onClick={() => scrollShowcase(-1)}
                                            >
                                                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                                            </button>
                                            <button
                                                className="homeShowcase__navBtn"
                                                type="button"
                                                aria-label="Next property"
                                                disabled={!showcaseScrollState.canScrollRight}
                                                onClick={() => scrollShowcase(1)}
                                            >
                                                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>

                                {closedDealsLoading ? (
                                    <div ref={showcaseRailRef} className="homeShowcase__scroller" aria-label={showcaseHeading.loadingLabel}>
                                        <div className="homeShowcase__grid homeShowcase__grid--loading">
                                            {Array.from({ length: 4 }).map((_, index) => (
                                                <div
                                                    key={`placeholder-${index}`}
                                                    className="homeShowcase__placeholder homeReveal"
                                                    data-delay={index * 90}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {!closedDealsLoading && closedDealsError ? (
                                    <div className="homeNotice homeReveal">{closedDealsError}</div>
                                ) : null}

                                {!closedDealsLoading && !closedDealsError && featuredDeals.length === 0 ? (
                                    <div className="homeNotice homeReveal">{showcaseHeading.empty}</div>
                                ) : null}

                                {!closedDealsLoading && !closedDealsError && featuredDeals.length > 0 ? (
                                    <div ref={showcaseRailRef} className="homeShowcase__scroller" aria-label={showcaseHeading.carouselLabel}>
                                        <div className="homeShowcase__grid">
                                            {featuredDeals.map((property, index) => (
                                                <DealCard
                                                    key={property?.id ?? `${property?.street1 ?? "deal"}-${index}`}
                                                    property={property}
                                                    delay={index * 100}
                                                    hidePriceDetails={isSellerAuthed}
                                                    linkTo={isAuthed && !isSellerAuthed ? "/investor" : null}
                                                    linkState={isAuthed && !isSellerAuthed ? { homeSelectedPropertyId: property?.id } : null}
                                                    statusLabel={isAuthed
                                                        ? (isSellerAuthed
                                                            ? sellerWorkflowLabel(property?.sellerWorkflowStatus)
                                                            : "Active")
                                                        : "Closed"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        {!isAuthed ? (
                            <section className="homeClosing" aria-label="Get started">
                                <div className="homeShell">
                                    <div key={`closing-heading-${selectedRole}`} className="homeRoleMotion">
                                        <SectionHeading
                                            eyebrow={roleContent.closing.eyebrow}
                                            title={roleContent.closing.title}
                                            lead={roleContent.closing.lead}
                                            className="homeReveal"
                                        />
                                    </div>

                                    <>
                                        <div className="homeClosing__grid">
                                            {ROLE_OPTION_CARDS.map((option, index) => (
                                                <article
                                                    key={option.role}
                                                    className={`homeClosing__card ${selectedRole === option.role ? "is-selected" : ""} homeReveal`}
                                                    data-delay={index * 120}
                                                >
                                                    <p className="homeClosing__cardTag">{option.tag}</p>
                                                    <h3 className="homeClosing__cardTitle">{option.title}</h3>
                                                    <p className="homeClosing__cardText">{option.text}</p>
                                                    <Link
                                                        to={option.ctaTo}
                                                        className="homeButton homeClosing__cardButton"
                                                        state={buildModalState(location, option.role)}
                                                    >
                                                        {option.ctaLabel}
                                                    </Link>
                                                </article>
                                            ))}
                                        </div>

                                        <p className="homeClosing__signin homeReveal" data-delay="90">
                                            Already a member?{" "}
                                            <Link
                                                to="/login"
                                                className="homeClosing__signinLink"
                                                state={buildModalState(location)}
                                            >
                                                Sign in
                                            </Link>
                                        </p>
                                    </>
                                </div>
                            </section>
                        ) : null}
                    </>
                )}
            </main>

            <PublicSiteFooter />
        </div>
    );
}
