import { Link } from "react-router-dom";

const FOOTER_LINKS = [
    { label: "Privacy Policy", to: "/privacy", enabled: true },
    { label: "Terms of Use", href: "/terms", enabled: false },
    { label: "Contact / Support", href: "mailto:contact@megna-realestate.com", enabled: true },
];

function preventPlaceholderNavigation(event) {
    event.preventDefault();
}

function FooterLink({ link }) {
    if (link.to && link.enabled) {
        return (
            <Link to={link.to} className="homeFooter__link">
                {link.label}
            </Link>
        );
    }

    const isDisabled = link.enabled === false;

    return (
        <a
            href={link.href ?? link.to ?? "#"}
            className="homeFooter__link"
            onClick={isDisabled ? preventPlaceholderNavigation : undefined}
        >
            {link.label}
        </a>
    );
}

export default function PublicSiteFooter() {
    return (
        <footer className="homeFooter">
            <div className="homeShell homeFooter__inner">
                <div className="homeFooter__meta">
                    <p className="homeFooter__copy">© {new Date().getFullYear()} All rights reserved.</p>
                    <p className="homeFooter__brand">Megna Real Estate LLC</p>
                </div>

                <nav className="homeFooter__links" aria-label="Footer">
                    {FOOTER_LINKS.map((link) => (
                        <FooterLink key={link.label} link={link} />
                    ))}
                </nav>
            </div>
        </footer>
    );
}
