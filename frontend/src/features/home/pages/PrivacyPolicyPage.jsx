import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicSiteFooter from "@/features/home/components/PublicSiteFooter";
import "@/features/home/pages/HomePage.css";
import "@/features/home/pages/PrivacyPolicyPage.css";

const LAST_UPDATED = "March 10, 2026";
const TABLET_BREAKPOINT_PX = 1024;

const POLICY_HIGHLIGHTS = [
    {
        label: "Applies to",
        value: "Visitors, investors, sellers, and inquiry submitters",
    },
    {
        label: "Covers",
        value: "Website activity, account data, property submissions, and communications",
    },
    {
        label: "Privacy contact",
        value: "privacy@megna-realestate.com",
    },
];

const POLICY_SECTIONS = [
    {
        id: "introduction",
        title: "Introduction",
        summary: "Scope of this policy and the services it covers.",
        paragraphs: [
            "This Privacy Policy describes how Megna Real Estate LLC (\"Megna,\" \"we,\" \"us,\" or \"our\") collects, uses, discloses, and protects personal information when you visit our website, create or use an account, request access to investment opportunities, submit a property for review, contact our team, or otherwise interact with our services.",
            "This policy applies to information collected through our public website, investor and seller onboarding flows, contact and inquiry forms, and related business communications that link or refer to this policy. It does not apply to third-party websites, platforms, or services that operate independently of Megna.",
            "By using our services, you acknowledge that your information may be handled as described in this policy. If you do not agree with this policy, please do not use the services.",
        ],
    },
    {
        id: "information-we-collect",
        title: "Information We Collect",
        summary: "The categories of information we collect depend on how you engage with Megna.",
        paragraphs: [
            "We collect information directly from you, automatically through your use of the website, and from certain third-party sources that help us operate our business and evaluate transactions.",
        ],
        subsections: [
            {
                heading: "Information you provide directly",
                items: [
                    "Contact details such as your name, email address, phone number, mailing address, and company information.",
                    "Account and profile information, including login credentials, role selection, investment criteria, market preferences, and professional background.",
                    "Transaction-related information, such as property details, pricing expectations, supporting documents, images, messages, and other information you submit through listings, forms, or inquiries.",
                    "Communications you send to us, including emails, support requests, meeting requests, and other correspondence with our team.",
                ],
            },
            {
                heading: "Information collected automatically",
                items: [
                    "Device, browser, and network information such as IP address, browser type, operating system, referring pages, and unique device identifiers.",
                    "Usage data such as pages viewed, links clicked, sessions, navigation patterns, and timestamps associated with your interactions on the website.",
                    "Approximate location data inferred from your IP address and cookie or analytics data used to understand traffic, improve performance, and maintain security.",
                ],
            },
            {
                heading: "Information from other sources",
                items: [
                    "Public records, listing-related data sources, and other market information used to evaluate, present, or validate property opportunities.",
                    "Service providers that assist with analytics, communications, account support, fraud prevention, identity verification, or customer relationship management.",
                    "Business partners, advisers, or counterparties who share information in connection with a potential or completed transaction, referral, or diligence process.",
                ],
            },
        ],
    },
    {
        id: "how-we-use-information",
        title: "How We Use Information",
        summary: "We use information to operate the platform, support transactions, and improve our services.",
        paragraphs: [
            "We use personal information for legitimate business purposes related to operating Megna, facilitating investor and seller activity, maintaining security, and communicating with users and prospective clients.",
        ],
        items: [
            "Create, maintain, and secure user accounts and authenticate access to platform features.",
            "Review seller submissions, present listings and opportunity information, and facilitate introductions, diligence, and communications related to a property or transaction.",
            "Respond to questions, schedule follow-up discussions, and send administrative or transactional notices.",
            "Analyze how the website is used, improve functionality, refine user experience, and develop new services or features.",
            "Detect, investigate, and help prevent fraud, misuse, unauthorized access, and other harmful or unlawful activity.",
            "Comply with applicable laws, regulations, legal process, contractual obligations, and internal recordkeeping requirements.",
            "Send marketing or promotional communications where permitted by law and consistent with your preferences.",
        ],
    },
    {
        id: "cookies-and-tracking-technologies",
        title: "Cookies and Tracking Technologies",
        summary: "We use cookies and similar technologies to support website functionality, analytics, and communications.",
        paragraphs: [
            "Megna and our service providers may use cookies, pixels, tags, local storage, and similar technologies to recognize returning visitors, understand engagement, maintain session integrity, measure campaign performance, and improve site functionality.",
            "Some cookies are necessary for the website to function properly, while others help us understand usage patterns, remember preferences, or measure the effectiveness of our communications and advertising.",
        ],
        items: [
            "You can manage cookies through your browser or device settings and may be able to block or delete them at any time.",
            "Disabling certain cookies may affect site functionality, account access, or the performance of certain features.",
            "Our systems may not respond to every browser-based \"Do Not Track\" signal, and your settings may not control all technology used by third-party services.",
        ],
    },
    {
        id: "sharing-of-information",
        title: "Sharing of Information",
        summary: "We share information only as needed to operate the business, support transactions, and comply with law.",
        paragraphs: [
            "We do not sell personal information in the ordinary course of our business. We may share information with trusted recipients when reasonably necessary to operate Megna, support a requested service, or advance a potential or completed transaction.",
        ],
        items: [
            "Affiliates, advisers, and internal personnel who need access to support operations, compliance, underwriting, diligence, or client service.",
            "Vendors and service providers that help us host the website, analyze performance, manage communications, store data, provide customer support, or maintain security controls.",
            "Investors, sellers, brokers, lenders, professional advisers, or other transaction participants when information is relevant to evaluating or progressing a listing, inquiry, or deal opportunity.",
            "Government authorities, regulators, courts, or other third parties when required by law, subpoena, legal process, or to protect the rights, property, and safety of Megna or others.",
            "A buyer, successor, or other relevant party in connection with a merger, acquisition, financing, restructuring, asset sale, or similar corporate event.",
            "Other parties with your consent or at your direction.",
        ],
    },
    {
        id: "data-retention",
        title: "Data Retention",
        summary: "We keep information only for as long as it is reasonably needed.",
        paragraphs: [
            "We retain personal information for as long as necessary to provide our services, manage active relationships, support transactions, maintain business records, resolve disputes, and comply with legal, tax, accounting, or regulatory obligations.",
            "Retention periods may vary depending on the nature of the information, the sensitivity of the data, whether an account remains active, and the need to preserve records related to diligence, communications, compliance, or enforcement. When information is no longer reasonably required, we will delete it, anonymize it, or securely archive it in accordance with our recordkeeping practices.",
        ],
    },
    {
        id: "data-security",
        title: "Data Security",
        summary: "We use administrative, technical, and organizational safeguards designed to protect personal information.",
        paragraphs: [
            "We maintain security measures intended to protect personal information against accidental loss and unauthorized access, use, alteration, or disclosure. These measures may include access controls, role-based permissions, secure hosting environments, monitoring, and encryption in transit where appropriate.",
            "No method of transmission over the Internet or method of electronic storage is completely secure. For that reason, we cannot guarantee absolute security. You are responsible for safeguarding your account credentials and for notifying us promptly if you believe your account or information has been compromised.",
        ],
    },
    {
        id: "your-rights-and-choices",
        title: "Your Rights and Choices",
        summary: "Depending on your location, you may have rights regarding your personal information.",
        paragraphs: [
            "Applicable law may provide you with rights to access, correct, delete, or limit certain uses of your personal information. Those rights can vary by jurisdiction and may be subject to exceptions or verification requirements.",
        ],
        items: [
            "Request access to the personal information we hold about you and request correction of inaccurate or incomplete information.",
            "Request deletion of personal information, subject to legal, contractual, security, and recordkeeping requirements.",
            "Opt out of marketing emails by using the unsubscribe link in those messages or by contacting us directly.",
            "Manage cookies and similar technologies through your browser or device settings.",
            "Withdraw consent where our processing is based on consent, where permitted by law.",
            "Lodge a complaint with an applicable data protection or consumer protection authority if you believe your rights have been violated.",
        ],
        note: "To exercise a privacy right, contact us using the details below. We may need to verify your identity before responding to certain requests.",
    },
    {
        id: "third-party-links",
        title: "Third-Party Links",
        summary: "Links to outside websites and services are governed by their own privacy practices.",
        paragraphs: [
            "Our website may contain links to third-party websites, software, tools, or services. Those third parties operate independently and may maintain their own privacy notices, terms, and practices.",
            "We are not responsible for the content, security, or privacy practices of third-party sites or services. We encourage you to review the privacy policies of any third-party services you visit or use.",
        ],
    },
    {
        id: "childrens-privacy",
        title: "Children’s Privacy",
        summary: "Megna is intended for adults and business users, not children.",
        paragraphs: [
            "Our services are not directed to children under 13, and we do not knowingly collect personal information from children under 13 through the website. If we learn that we have collected personal information from a child under 13 without appropriate authorization, we will take steps to delete that information.",
            "If you believe a child may have provided personal information to us, please contact us so that we can review the issue and respond appropriately.",
        ],
    },
    {
        id: "changes-to-this-privacy-policy",
        title: "Changes to This Privacy Policy",
        summary: "We may update this policy from time to time as our services or legal obligations evolve.",
        paragraphs: [
            "We may revise this Privacy Policy periodically to reflect changes in our business, technology, service providers, legal requirements, or privacy practices. When we make changes, we will update the \"Last updated\" date at the top of this page.",
            "If we make a material change, we may also provide additional notice through the website, by email, or through another appropriate channel where required or appropriate.",
        ],
    },
    {
        id: "contact-us",
        title: "Contact Us",
        summary: "Questions, requests, or complaints may be directed to our privacy team.",
        paragraphs: [
            "If you have questions about this Privacy Policy, would like to exercise a privacy right, or need to report a privacy-related concern, please contact us using the information below.",
        ],
        contactDetails: [
            {
                label: "Email",
                value: "privacy@megna-realestate.com",
                href: "mailto:privacy@megna-realestate.com",
            },
            {
                label: "General support",
                value: "contact@megna-realestate.com",
                href: "mailto:contact@megna-realestate.com",
            },
            {
                label: "Mail",
                value: "Megna Real Estate LLC\nAttn: Privacy Team\n[Insert mailing address]",
            },
        ],
    },
];

function prefersReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getInitialSectionId() {
    if (typeof window === "undefined") {
        return POLICY_SECTIONS[0].id;
    }

    const hash = window.location.hash.replace("#", "");
    const matchedSection = POLICY_SECTIONS.find((section) => section.id === hash);
    return matchedSection?.id ?? POLICY_SECTIONS[0].id;
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

function PolicySection({ section, index }) {
    return (
        <section id={section.id} className="privacyPolicySection" aria-labelledby={`${section.id}-title`}>
            <header className="privacyPolicySection__header">
                <p className="privacyPolicySection__index">{String(index + 1).padStart(2, "0")}</p>
                <div className="privacyPolicySection__headingGroup">
                    <h2 id={`${section.id}-title`} className="privacyPolicySection__title">
                        {section.title}
                    </h2>
                    <p className="privacyPolicySection__summary">{section.summary}</p>
                </div>
            </header>

            <div className="privacyPolicySection__body">
                {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="privacyPolicySection__paragraph">
                        {paragraph}
                    </p>
                ))}

                {section.items?.length ? (
                    <ul className="privacyPolicySection__list">
                        {section.items.map((item) => (
                            <li key={item} className="privacyPolicySection__listItem">
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : null}

                {section.subsections?.map((subsection) => (
                    <section key={subsection.heading} className="privacyPolicySubsection">
                        <h3 className="privacyPolicySubsection__title">{subsection.heading}</h3>

                        {subsection.paragraphs?.map((paragraph) => (
                            <p key={paragraph} className="privacyPolicySection__paragraph">
                                {paragraph}
                            </p>
                        ))}

                        {subsection.items?.length ? (
                            <ul className="privacyPolicySection__list">
                                {subsection.items.map((item) => (
                                    <li key={item} className="privacyPolicySection__listItem">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </section>
                ))}

                {section.note ? <p className="privacyPolicySection__note">{section.note}</p> : null}

                {section.contactDetails?.length ? (
                    <div className="privacyPolicyContactCard">
                        {section.contactDetails.map((detail) => (
                            <div key={detail.label} className="privacyPolicyContactCard__row">
                                <p className="privacyPolicyContactCard__label">{detail.label}</p>
                                {detail.href ? (
                                    <a
                                        href={detail.href}
                                        className="privacyPolicyContactCard__value privacyPolicyContactCard__value--link"
                                    >
                                        {detail.value}
                                    </a>
                                ) : (
                                    <address className="privacyPolicyContactCard__value privacyPolicyContactCard__value--address">
                                        {detail.value}
                                    </address>
                                )}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export default function PrivacyPolicyPage() {
    const [activeSectionId, setActiveSectionId] = useState(getInitialSectionId);
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

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const hash = window.location.hash.replace("#", "");
        const frameId = window.requestAnimationFrame(() => {
            if (hash && POLICY_SECTIONS.some((section) => section.id === hash)) {
                scrollToSection(hash, "auto");
                setActiveSectionId(hash);
                return;
            }

            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const sectionNodes = POLICY_SECTIONS
            .map((section) => document.getElementById(section.id))
            .filter(Boolean);

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

            let nextActiveSectionId = sectionNodes[0]?.id ?? POLICY_SECTIONS[0].id;

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
    }, []);

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
        if (!tocNode) return;
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
        <div
            ref={pageRef}
            className={`home privacyPolicyPageShell ${logoOnLightSurface ? "privacyPolicyPageShell--lightLogo" : ""}`.trim()}
        >
            <div className="homeProgress" aria-hidden="true" />

            <header className="homeHeader privacyPolicyHeader">
                <div className="homeShell homeHeader__inner">
                    <div className="homeHeader__left privacyPolicyHeader__left">
                        <div className="privacyPolicyHeader__titleBlock">
                            <p className="homeHeader__roleBadge">Legal</p>
                            <p className="homeHeader__pageTitle">Privacy Policy</p>
                        </div>
                    </div>

                    <Link ref={logoRef} to="/" className="homeHeader__logo" aria-label="Megna Real Estate home">
                        <span className="homeHeader__logoImage" aria-hidden="true" />
                    </Link>

                    <div className="homeHeader__actions privacyPolicyHeader__actions">
                        <Link to="/" className="homeHeader__utilityLink">
                            Return Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="homeMain privacyPolicyPageMain">
                <section className="privacyPolicyHero">
                    <div className="homeShell privacyPolicyHero__inner">
                        <div className="privacyPolicyHero__content">
                            <p className="privacyPolicyHero__eyebrow">Legal information</p>
                            <h1 className="privacyPolicyHero__title">Privacy Policy</h1>
                            <p className="privacyPolicyHero__lead">
                                This page explains how user information is collected, used, shared, and safeguarded
                                when you browse the site, request access, submit a property, or communicate with
                                Megna.
                            </p>
                        </div>

                        <div className="privacyPolicyHero__meta">
                            <div className="privacyPolicyHero__metaCard privacyPolicyHero__metaCard--primary">
                                <span className="privacyPolicyHero__metaLabel">Last updated</span>
                                <span className="privacyPolicyHero__metaValue">{LAST_UPDATED}</span>
                            </div>

                            {POLICY_HIGHLIGHTS.map((item) => (
                                <div key={item.label} className="privacyPolicyHero__metaCard">
                                    <span className="privacyPolicyHero__metaLabel">{item.label}</span>
                                    <span className="privacyPolicyHero__metaValue">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="privacyPolicyPage" aria-label="Privacy policy page">
                    <div className="homeShell privacyPolicyLayout">
                        <aside className="privacyPolicyTocPanel">
                            <nav ref={tocRef} className="privacyPolicyToc" aria-label="Privacy policy sections">
                                <p className="privacyPolicyToc__eyebrow">On this page</p>
                                <p className="privacyPolicyToc__intro">
                                    Use the section links below to jump through the policy quickly.
                                </p>

                                <ol className="privacyPolicyToc__list">
                                    {POLICY_SECTIONS.map((section, index) => {
                                        const isActive = activeSectionId === section.id;

                                        return (
                                            <li key={section.id} className="privacyPolicyToc__item">
                                                <a
                                                    href={`#${section.id}`}
                                                    data-section-id={section.id}
                                                    className={`privacyPolicyToc__link ${isActive ? "is-active" : ""}`.trim()}
                                                    aria-current={isActive ? "location" : undefined}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setActiveSectionId(section.id);
                                                        scrollToSection(section.id);
                                                    }}
                                                >
                                                    <span className="privacyPolicyToc__index">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </span>
                                                    <span className="privacyPolicyToc__label">{section.title}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </nav>
                        </aside>

                        <article ref={articleRef} className="privacyPolicyArticle">
                            <div className="privacyPolicyArticle__intro">
                                <p className="privacyPolicyArticle__eyebrow">Your privacy matters</p>
                                <p className="privacyPolicyArticle__lead">
                                    We wrote this policy to be direct and readable. The sections below explain what
                                    information we collect, why we collect it, when it may be shared, how long it may
                                    be kept, and what choices may be available to you.
                                </p>
                            </div>

                            {POLICY_SECTIONS.map((section, index) => (
                                <PolicySection key={section.id} section={section} index={index} />
                            ))}
                        </article>
                    </div>
                </section>
            </main>

            <PublicSiteFooter />
        </div>
    );
}
