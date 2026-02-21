export function numOrEmpty(value) {
    if (value === "" || value === null || value === undefined) return "";
    return String(value);
}