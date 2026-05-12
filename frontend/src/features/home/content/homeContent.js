export const ROLE_INVESTOR = "INVESTOR";
export const ROLE_SELLER = "SELLER";
export const HOME_ROLE_STORAGE_KEY = "home.selectedRole";

export const NAV_LINKS = [
    { label: "Recent Closings", href: "#proof" },
    { label: "Getting started", href: "#flow" },
];

export const ROLE_OPTION_CARDS = [
    {
        role: ROLE_INVESTOR,
        tag: "Buyer access",
        title: "Buyers",
        roles: [
            { title: "Fix-and-flip investors", text: "Buy homes to renovate and resell." },
            { title: "Landlords", text: "Find rentals to hold long term." },
            { title: "Cash buyers", text: "Move quickly without lender delays." },
        ],
        ctaLabel: "Join as buyer",
        ctaTo: "/signup",
    },
    {
        role: ROLE_SELLER,
        tag: "Seller access",
        title: "Sellers",
        roles: [
            { title: "Listing agents", text: "Share listings with active buyers." },
            { title: "Wholesalers", text: "Bring deals ready to move." },
            { title: "Homeowners", text: "Reach serious buyers directly." },
        ],
        ctaLabel: "Join as seller",
        ctaTo: "/signup/seller",
    },
];

export const ROLE_CONTENT = {
    [ROLE_INVESTOR]: {
        hero: {
            eyebrow: "Exclusive deals for active investors",
            title: "Private real estate deals for serious buyers.",
            subtitle: "",
            primaryCtaLabel: "Join as buyer",
            primaryCtaTo: "/signup",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
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
            eyebrow: "Getting started",
            title: "How it works.",
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
            eyebrow: "Recent Closings",
            title: "Recently closed deals.",
        },
        closing: {
            eyebrow: "Our customer",
            title: "Who we work with.",
        },
    },
    [ROLE_SELLER]: {
        hero: {
            eyebrow: "For property owners and deal finders",
            title: "Get your property in front of serious buyers.",
            subtitle: "",
            primaryCtaLabel: "Join as seller",
            primaryCtaTo: "/signup/seller",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
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
            eyebrow: "Getting started",
            title: "How it works.",
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
            eyebrow: "Recent Closings",
            title: "Recently closed deals.",
        },
        closing: {
            eyebrow: "Our customer",
            title: "Who we work with.",
        },
    },
};
