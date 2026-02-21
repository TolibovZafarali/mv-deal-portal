export function formatPriceInput(value) {
    const raw = String(value ?? "");
    const cleaned = raw.replace(/[^\d.]/g, "");

    if (!cleaned) return "";

    const hasDot = cleaned.includes(".");
    const [intPartRaw, ...decimalParts] = cleaned.split(".");
    const decimalPart = decimalParts.join("");

    const normalizedInt = intPartRaw.replace(/^0+(?=\d)/, "");
    const intPart = (normalizedInt || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (!hasDot) return intPart;
    if (!decimalPart && raw.trim().endsWith(".")) return `${intPart}.`;

    return `${intPart}.${decimalPart}`;
}