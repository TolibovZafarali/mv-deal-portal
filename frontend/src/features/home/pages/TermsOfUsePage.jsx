import LegalPage from "@/features/home/components/LegalPage";

const LAST_UPDATED = "March 10, 2026";

const TERMS_HIGHLIGHTS = [
    {
        label: "Applies to",
        value: "Visitors, account holders, prospective investors, sellers, brokers, and other business users",
    },
    {
        label: "Covers",
        value: "Website access, account use, submissions, listing materials, and related communications",
    },
    {
        label: "Contact",
        value: "contact@megna-realestate.com",
    },
];

const TERMS_SECTIONS = [
    {
        id: "acceptance-of-terms",
        title: "Acceptance of Terms",
        summary: "Using Megna’s website or services means you agree to these Terms of Use.",
        paragraphs: [
            "These Terms of Use govern your access to and use of the Megna Real Estate LLC website, account features, seller and investor onboarding flows, listing submission tools, and related digital services that link to these terms (collectively, the \"Services\").",
            "By visiting the website, creating an account, submitting information, requesting access to opportunities, or otherwise using the Services, you agree to be bound by these Terms of Use and our Privacy Policy. Additional guidelines, transaction-specific terms, or platform notices may also apply to particular features or interactions.",
            "If you are using the Services on behalf of a company, fund, brokerage, or other entity, you represent that you have authority to bind that entity to these terms. If you do not agree to these Terms of Use, do not access or use the Services.",
        ],
    },
    {
        id: "changes-to-terms",
        title: "Changes to Terms",
        summary: "We may update these terms as our business, platform, or legal obligations evolve.",
        paragraphs: [
            "We may revise these Terms of Use from time to time to reflect changes in our services, business practices, technology, legal requirements, or risk controls. When we do, we will update the \"Last updated\" date at the top of this page.",
            "Material changes may also be communicated through the website, by email, or by another reasonable method when appropriate. Your continued use of the Services after updated terms become effective constitutes acceptance of the revised terms.",
        ],
    },
    {
        id: "use-of-the-website",
        title: "Use of the Website",
        summary: "The website is intended for lawful business and informational use related to Megna’s services.",
        paragraphs: [
            "Megna provides information about its business, facilitates seller and investor communications, and may make available tools, forms, data rooms, or property-related materials for informational and transaction support purposes. You may use the Services only for lawful purposes and only in a manner consistent with these Terms of Use.",
        ],
        items: [
            "Learn about Megna, its real estate focus, and its service offerings.",
            "Submit inquiries, property information, documents, or other materials for review by Megna.",
            "Create and manage an account where account features are offered.",
            "Review opportunity-related materials or transaction communications made available to you.",
        ],
    },
    {
        id: "eligibility",
        title: "Eligibility",
        summary: "The Services are intended for adults and authorized business users.",
        paragraphs: [
            "You must be at least 18 years old and capable of forming a binding agreement to use the Services. By using the Services, you represent that you meet these requirements and that your access and use comply with applicable law.",
            "Certain features, listings, diligence materials, or investment-related communications may be limited to users who satisfy additional eligibility, accreditation, verification, onboarding, or approval criteria determined by Megna or required by law.",
        ],
        note: "Megna may decline access, request additional verification, or restrict specific materials or functions at its discretion and in furtherance of legal or compliance obligations.",
    },
    {
        id: "account-responsibilities",
        title: "Account Responsibilities",
        summary: "You are responsible for keeping account information accurate and credentials secure.",
        paragraphs: [
            "If you create an account, you must provide accurate, current, and complete information and keep it updated as needed. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.",
            "You must notify us promptly if you suspect unauthorized access, credential compromise, or any other security incident involving your account. We may require password resets, additional verification, or other security measures if we believe your account or the Services may be at risk.",
        ],
        items: [
            "Do not share your credentials with unauthorized persons.",
            "Do not create accounts using false or misleading information.",
            "Do not attempt to access accounts, materials, or permissions that were not granted to you.",
        ],
    },
    {
        id: "intellectual-property",
        title: "Intellectual Property",
        summary: "Megna and its licensors retain all rights in the website, brand assets, and related content.",
        paragraphs: [
            "The Services, including the website design, software, text, graphics, photographs, layouts, logos, trademarks, data compilations, reports, and other content made available by Megna, are owned by Megna or its licensors and are protected by intellectual property and other applicable laws.",
            "Subject to these Terms of Use, Megna grants you a limited, revocable, non-exclusive, non-transferable license to access and use the Services for your internal business or personal evaluation purposes only. No ownership rights are transferred to you.",
        ],
        items: [
            "You may not copy, reproduce, modify, distribute, publish, display, create derivative works from, scrape, or exploit the Services or their content except as expressly authorized in writing.",
            "You may not use Megna’s name, logos, trademarks, or other brand features without prior written permission.",
            "If you provide suggestions, feedback, or ideas about the Services, Megna may use them without restriction or obligation to you.",
        ],
    },
    {
        id: "user-conduct",
        title: "User Conduct",
        summary: "You agree not to misuse the website, platform features, or any information made available through them.",
        paragraphs: [
            "You may not use the Services in a manner that interferes with Megna’s operations, compromises the integrity of the website, violates applicable law, or infringes the rights of Megna or any third party.",
        ],
        items: [
            "Upload, transmit, or submit false, deceptive, unlawful, defamatory, or infringing content.",
            "Attempt to bypass security controls, probe vulnerabilities, gain unauthorized access, or disrupt the Services.",
            "Use bots, scrapers, harvesters, or similar automated means to access or copy website content or user information without authorization.",
            "Introduce malware, malicious code, or other harmful technology.",
            "Impersonate another person or entity, misrepresent your affiliation, or submit information on behalf of others without authority.",
            "Use the Services or any materials obtained through them for unlawful solicitation, spam, or competitive misuse.",
        ],
    },
    {
        id: "property-listings-information-disclaimer",
        title: "Property Listings / Information Disclaimer",
        summary: "Property-related information is provided for general informational purposes and requires independent verification.",
        paragraphs: [
            "Property descriptions, photos, financial illustrations, underwriting assumptions, rental figures, maps, due-diligence materials, timelines, and similar information presented through the Services may be prepared or supplied by sellers, brokers, public sources, service providers, or other third parties. Such information may be incomplete, approximate, estimated, or subject to change without notice.",
            "Megna does not guarantee the accuracy, completeness, availability, legality, investment suitability, or current status of any listing, opportunity, or related information. The appearance of a property or opportunity on the website does not obligate Megna to list it, pursue it, market it, or make it available to any particular user.",
        ],
        subsections: [
            {
                heading: "Independent verification required",
                paragraphs: [
                    "You are solely responsible for conducting your own diligence and for evaluating any property, seller submission, investment opportunity, or transaction. You should not rely on website content as the sole basis for a business, investment, legal, or financial decision.",
                ],
            },
            {
                heading: "Offers and securities matters",
                paragraphs: [
                    "Nothing on the Services constitutes an offer to sell, a solicitation of an offer to buy, or a recommendation regarding any security, real estate interest, loan, or investment product. Any opportunity that is ultimately made available by Megna will be subject to separate documentation, eligibility requirements, and applicable law.",
                ],
                note: "If separate confidentiality agreements, offering documents, purchase agreements, or transaction documents apply, those documents will control in the event of a conflict with these Terms of Use.",
            },
        ],
    },
    {
        id: "no-professional-or-investment-advice",
        title: "No Professional or Investment Advice",
        summary: "The website does not provide legal, tax, accounting, brokerage, or investment advice.",
        paragraphs: [
            "Content made available through the Services is for general informational purposes only and is not intended to serve as legal, tax, accounting, valuation, brokerage, underwriting, investment, or other professional advice. Megna is not acting as your attorney, accountant, broker-dealer, investment adviser, fiduciary, or other professional adviser merely because you use the website or communicate with us through it.",
            "You should consult your own professional advisers before making any legal, tax, financial, real estate, or investment decision. Past performance, target returns, projections, market commentary, and illustrative examples are not guarantees of future outcomes.",
        ],
    },
    {
        id: "third-party-links-and-services",
        title: "Third-Party Links and Services",
        summary: "Third-party sites, tools, and service providers operate under their own terms and policies.",
        paragraphs: [
            "The Services may contain links to third-party websites, data rooms, maps, analytics tools, communication platforms, identity verification services, or other software and service providers. Those third parties operate independently and may have their own terms, privacy practices, and security standards.",
            "Megna is not responsible for the content, availability, security, or practices of third-party services, and your use of them is at your own risk. We encourage you to review the terms and policies of any third-party service you access.",
        ],
    },
    {
        id: "disclaimer-of-warranties",
        title: "Disclaimer of Warranties",
        summary: "The Services are provided on an \"as is\" and \"as available\" basis.",
        paragraphs: [
            "To the fullest extent permitted by law, the Services and all content, materials, and functionality made available through them are provided without warranties of any kind, whether express, implied, or statutory. Megna disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, and quiet enjoyment.",
            "Megna does not warrant that the Services will be uninterrupted, error-free, secure, free of viruses or other harmful components, or that defects will be corrected. We make no warranty regarding the accuracy or reliability of any content, property information, or materials accessed through the Services.",
        ],
    },
    {
        id: "limitation-of-liability",
        title: "Limitation of Liability",
        summary: "Megna’s liability is limited to the fullest extent permitted by law.",
        paragraphs: [
            "To the fullest extent permitted by law, Megna and its affiliates, officers, managers, employees, agents, licensors, and service providers will not be liable for any indirect, incidental, consequential, special, exemplary, punitive, or similar damages, or for any loss of profits, revenue, business opportunity, goodwill, use, data, or anticipated savings, arising out of or relating to your use of or inability to use the Services.",
            "To the fullest extent permitted by law, the aggregate liability of Megna and its affiliates arising out of or relating to the Services or these Terms of Use will not exceed the greater of one hundred U.S. dollars (US$100) or the amount you paid directly to Megna, if any, for access to the specific Services giving rise to the claim during the twelve months preceding the event giving rise to liability.",
        ],
        note: "Some jurisdictions do not allow certain limitations of liability. In those jurisdictions, some of the limitations above may not apply to you to the extent prohibited by law.",
    },
    {
        id: "indemnification",
        title: "Indemnification",
        summary: "You agree to protect Megna from claims arising from your use of the Services or violation of these terms.",
        paragraphs: [
            "You agree to defend, indemnify, and hold harmless Megna and its affiliates, officers, managers, employees, agents, licensors, and service providers from and against any claims, demands, actions, damages, liabilities, judgments, losses, costs, and expenses, including reasonable attorneys’ fees, arising out of or relating to your use of the Services, your submissions or content, your violation of these Terms of Use, or your violation of any law or third-party right.",
        ],
    },
    {
        id: "termination",
        title: "Termination",
        summary: "We may suspend or terminate access when needed to protect the business, users, or platform.",
        paragraphs: [
            "Megna may suspend, restrict, or terminate your access to all or any part of the Services at any time, with or without notice, if we believe that you have violated these Terms of Use, pose a security or legal risk, provided inaccurate information, or otherwise acted inconsistently with the intended use of the platform.",
            "You may stop using the Services at any time. Provisions of these Terms of Use that by their nature should survive termination, including provisions relating to intellectual property, disclaimers, limitations of liability, indemnification, governing law, and dispute-related obligations, will survive any termination or suspension of access.",
        ],
    },
    {
        id: "governing-law",
        title: "Governing Law",
        summary: "Disputes relating to these terms are governed by the law of Megna’s home jurisdiction.",
        paragraphs: [
            "Unless applicable law requires otherwise, these Terms of Use and any dispute arising out of or relating to them or the Services will be governed by the laws of the state in which Megna Real Estate LLC is headquartered, without regard to conflict of laws principles.",
            "Subject to applicable law, any action or proceeding relating to these Terms of Use or the Services must be brought exclusively in the state or federal courts serving that jurisdiction, and you consent to the personal jurisdiction and venue of those courts.",
        ],
    },
    {
        id: "contact-information",
        title: "Contact Information",
        summary: "Questions about these terms or legal notices may be sent to Megna using the details below.",
        paragraphs: [
            "If you have questions about these Terms of Use, need support regarding website access, or want to send a legal notice related to the Services, please use the contact information below.",
        ],
        contactDetails: [
            {
                label: "Email",
                value: "contact@megna-realestate.com",
                href: "mailto:contact@megna-realestate.com",
            },
            {
                label: "Privacy requests",
                value: "privacy@megna-realestate.com",
                href: "mailto:privacy@megna-realestate.com",
            },
            {
                label: "Mail",
                value: "Megna Real Estate LLC\nAttn: Legal Notices\n[Insert mailing address]",
                type: "address",
            },
        ],
    },
];

export default function TermsOfUsePage() {
    return (
        <LegalPage
            title="Terms of Use"
            subtitle="These terms govern your access to and use of Megna’s website, account features, seller and investor workflows, and related services."
            lastUpdated={LAST_UPDATED}
            highlights={TERMS_HIGHLIGHTS}
            articleLead="These terms explain who may use the platform, what rules apply to accounts and submissions, how property information should be treated, and the limits on Megna’s responsibilities."
            sections={TERMS_SECTIONS}
        />
    );
}
