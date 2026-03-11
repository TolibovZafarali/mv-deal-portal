import LegalPage from "@/features/home/components/LegalPage";

const LAST_UPDATED = "March 10, 2026";
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
        value: "privacy@megna.us",
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
                value: "privacy@megna.us",
                href: "mailto:privacy@megna.us",
            },
            {
                label: "General support",
                value: "contact@megna.us",
                href: "mailto:contact@megna.us",
            },
            {
                label: "Mail",
                value: "Megna Real Estate LLC\nAttn: Privacy Team\n[Insert mailing address]",
                type: "address",
            },
        ],
    },
];

export default function PrivacyPolicyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            subtitle="This page explains how user information is collected, used, shared, and safeguarded when you browse the site, request access, submit a property, or communicate with Megna."
            lastUpdated={LAST_UPDATED}
            highlights={POLICY_HIGHLIGHTS}
            articleEyebrow="Your privacy matters"
            articleLead="We wrote this policy to be direct and readable. The sections below explain what information we collect, why we collect it, when it may be shared, how long it may be kept, and what choices may be available to you."
            sections={POLICY_SECTIONS}
        />
    );
}
