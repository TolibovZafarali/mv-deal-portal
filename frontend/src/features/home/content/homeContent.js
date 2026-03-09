export const ROLE_INVESTOR = "INVESTOR";
export const ROLE_SELLER = "SELLER";
export const HOME_ROLE_STORAGE_KEY = "home.selectedRole";

export const NAV_LINKS = [
    { label: "Perspective", href: "#perspective" },
    { label: "Flow", href: "#flow" },
    { label: "Proof", href: "#proof" },
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
            eyebrow: "Private deal flow for decisive buyers",
            title: "Private real estate, presented with conviction.",
            subtitle:
                "Megna gives active investors a calmer way to discover vetted opportunities, evaluate quickly, and stay close to the deal without the noise.",
            primaryCtaLabel: "Request buyer access",
            primaryCtaTo: "/signup",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
            signals: ["Curated flow", "Clear underwriting", "Direct execution"],
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
        statement: {
            eyebrow: "Perspective",
            title: "Less chasing. More decision-making.",
            lead:
                "Every surface is designed to strip out ambiguity, so serious buyers can stay focused on fit, risk, and the next move.",
            quote: "When the room is disciplined, conviction shows up earlier.",
        },
        metrics: [
            { value: 24, suffix: "h", label: "typical first-response window" },
            { value: 3, suffix: "x", label: "faster deal triage" },
            { value: 100, suffix: "%", label: "focused on private-market flow" },
        ],
        principles: {
            title: "Built for buyers who know what matters.",
            lead:
                "The experience stays selective, visual, and operationally sharp from first look to final movement.",
            items: [
                {
                    label: "01",
                    title: "Selective by design",
                    text: "Opportunities are framed for relevance before they ever reach your attention.",
                },
                {
                    label: "02",
                    title: "Underwriting in context",
                    text: "Core numbers, condition, and upside sit in a tighter, cleaner read.",
                },
                {
                    label: "03",
                    title: "Momentum built in",
                    text: "From first look to next step, the workflow stays direct and intentional.",
                },
            ],
        },
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
                "Apply once and step into a deal flow built for investors who move with discipline.",
        },
    },
    [ROLE_SELLER]: {
        hero: {
            eyebrow: "Elevated presentation for serious sellers",
            title: "Serious buyers move faster when the presentation is clean.",
            subtitle:
                "Megna gives sellers a more refined way to position off-market opportunities, attract qualified capital, and keep every conversation moving.",
            primaryCtaLabel: "Launch seller profile",
            primaryCtaTo: "/signup/seller",
            secondaryCtaLabel: "See recent closings",
            secondaryCtaHref: "#proof",
            signals: ["Sharper presentation", "Qualified buyers", "Faster movement"],
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
        statement: {
            eyebrow: "Perspective",
            title: "Presentation shapes momentum.",
            lead:
                "When the deal is staged with precision, better buyers arrive sooner and the process stays cleaner from first interest to close.",
            quote: "A sharper stage attracts sharper attention.",
        },
        metrics: [
            { value: 24, suffix: "h", label: "typical investor response window" },
            { value: 3, suffix: "x", label: "faster buyer alignment" },
            { value: 100, suffix: "%", label: "centered on qualified demand" },
        ],
        principles: {
            title: "Built for sellers who value how a deal is received.",
            lead:
                "The platform keeps the opportunity crisp, the audience serious, and the next step unmistakably clear.",
            items: [
                {
                    label: "01",
                    title: "Editorial-level presentation",
                    text: "Each opportunity is framed with enough clarity for buyers to act sooner.",
                },
                {
                    label: "02",
                    title: "Qualified investor reach",
                    text: "Serious capital sees the deal without the usual low-intent noise around it.",
                },
                {
                    label: "03",
                    title: "Operational clarity",
                    text: "Communication, updates, and next actions stay aligned all the way to execution.",
                },
            ],
        },
        process: {
            eyebrow: "Flow",
            title: "From opportunity intake to confident execution.",
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
