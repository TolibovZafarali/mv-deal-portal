import { Link, useLocation } from "react-router-dom";

const FOOTER_LINKS = [
    { label: "Privacy Policy", to: "/privacy", enabled: true },
    { label: "Terms of Use", to: "/terms", enabled: true },
    { label: "Contact Us", to: "/contact", enabled: true, modal: true, contactCategory: "GENERAL_SUPPORT" },
];

function FooterLink({ link, location }) {
    if (link.to && link.enabled) {
        const linkState = link.modal
            ? {
                modal: true,
                backgroundLocation: location,
                contactCategory: link.contactCategory,
            }
            : undefined;

        return (
            <Link to={link.to} state={linkState} className="homeFooter__link">
                {link.label}
            </Link>
        );
    }

    const isDisabled = link.enabled === false;

    return (
        <a
            href={link.href ?? link.to ?? "#"}
            className="homeFooter__link"
            onClick={isDisabled ? (event) => event.preventDefault() : undefined}
        >
            {link.label}
        </a>
    );
}

export default function PublicSiteFooter() {
    const location = useLocation();

    return (
        <footer className="homeFooter">
            <div className="homeShell homeFooter__inner">
                <div className="homeFooter__meta">
                    <p className="homeFooter__copy">© {new Date().getFullYear()} All rights reserved.</p>
                    <p className="homeFooter__brand">Megna Real Estate LLC</p>
                </div>

                <nav className="homeFooter__links" aria-label="Footer">
                    {FOOTER_LINKS.map((link) => (
                        <FooterLink key={link.label} link={link} location={location} />
                    ))}
                </nav>
            </div>
        </footer>
    );
}
