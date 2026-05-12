export const ROLE_INVESTOR = "INVESTOR";
export const ROLE_SELLER = "SELLER";
export const HOME_ROLE_STORAGE_KEY = "home.selectedRole";

export const NAV_LINKS = [
    { label: "Proof", href: "#proof" },
    { label: "Flow", href: "#flow" },
];

export const ROLE_OPTION_CARDS = [
    {
        role: ROLE_INVESTOR,
        tag: "Buyer access",
        title: "Join as buyer",
        text: "Receive curated opportunities and evaluate them inside a calmer, more disciplined workflow.",
        ctaLabel: "Request buyer access",
        ctaTo: "/signup",
    },
    {
        role: ROLE_SELLER,
        tag: "Seller access",
        title: "Join as seller",
        text: "Present opportunities with more clarity, reach qualified capital, and keep momentum intact.",
        ctaLabel: "Launch seller profile",
        ctaTo: "/signup/seller",
    },
];

export const ROLE_CONTENT = {
    [ROLE_INVESTOR]: {
        hero: {
            eyebrow: "Exclusive deals for active investors",
            title: "Private real estate deals for serious buyers.",
            subtitle: "",
            primaryCtaLabel: "Request buyer access",
            primaryCtaTo: "/signup",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
            signals: ["Vetted deals", "Clear numbers", "Fast execution"],
            spotlightLabel: "Buyer brief",
            spotlightTitle: "Signal before volume",
            spotlightText:
                "A quieter interface for investors who care about fit, downside, and speed more than crowded inboxes.",
            detailList: [
                "Private-market opportunities",
                "Sharper evaluation surfaces",
                "Clear movement to next action",
            ],
        },
        metrics: [
            { value: 24, suffix: "h", label: "typical first-response window" },
            { value: 3, suffix: "x", label: "faster deal triage" },
            { value: 100, suffix: "%", label: "focused on private-market flow" },
        ],
        process: {
            eyebrow: "Flow",
            title: "A quieter path from buy box to close.",
            lead:
                "The workflow keeps momentum high by removing presentation drag and communication clutter.",
            steps: [
                {
                    label: "01",
                    title: "Define your criteria",
                    text: "Set market, budget, and strategy so the right opportunities surface first.",
                },
                {
                    label: "02",
                    title: "Review matched opportunities",
                    text: "Move through vetted deals with cleaner data, clearer framing, and faster judgment.",
                },
                {
                    label: "03",
                    title: "Advance while conviction is high",
                    text: "Stay close to the deal and move directly into the next conversation when it fits.",
                },
            ],
        },
        proof: {
            eyebrow: "Proof",
            title: "Recent closings that show the standard.",
            lead:
                "Active inventory remains private. These completed opportunities reflect the level of work moving through the platform.",
        },
        closing: {
            eyebrow: "Access",
            title: "Access the private side of the market.",
            lead:
                "Apply once and step into a pipeline built for investors who move with discipline.",
        },
    },
    [ROLE_SELLER]: {
        hero: {
            eyebrow: "For property owners and deal finders",
            title: "Get your property in front of serious buyers.",
            subtitle: "",
            primaryCtaLabel: "Launch seller profile",
            primaryCtaTo: "/signup/seller",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
            signals: ["Professional presentation", "Qualified buyers", "Faster closings"],
            spotlightLabel: "Seller brief",
            spotlightTitle: "Position the deal with precision",
            spotlightText:
                "A premium surface for sellers who want stronger first impressions, better conversations, and cleaner execution.",
            detailList: [
                "Editorial-level presentation",
                "Qualified investor visibility",
                "Less friction to close",
            ],
        },
        metrics: [
            { value: 24, suffix: "h", label: "typical investor response window" },
            { value: 3, suffix: "x", label: "faster buyer alignment" },
            { value: 100, suffix: "%", label: "centered on qualified demand" },
        ],
        process: {
            eyebrow: "Flow",
            title: "From opportunity intake\nto confident execution.",
            lead:
                "The seller workflow is designed to make the deal feel sharper, calmer, and easier to move forward.",
            steps: [
                {
                    label: "01",
                    title: "Shape the opportunity",
                    text: "Present the property with a cleaner story, clearer numbers, and a stronger first look.",
                },
                {
                    label: "02",
                    title: "Meet the right buyers",
                    text: "Qualified investors can evaluate quickly and respond with real intent.",
                },
                {
                    label: "03",
                    title: "Keep the path to close clean",
                    text: "Move through conversations, decisions, and next steps without process drag.",
                },
            ],
        },
        proof: {
            eyebrow: "Proof",
            title: "Closings that reflect a sharper process.",
            lead:
                "These completed transactions show how well-positioned opportunities can move when the signal is clear.",
        },
        closing: {
            eyebrow: "Access",
            title: "Bring your next deal to a better room.",
            lead:
                "Share it once, put it in front of the right buyers, and keep momentum from first look to final signature.",
        },
    },
};
