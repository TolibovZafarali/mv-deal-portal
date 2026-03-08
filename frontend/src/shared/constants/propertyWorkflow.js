export const PROPERTY_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
});

export const SELLER_WORKFLOW_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
});

export const SELLER_REVIEW_ACTION = Object.freeze({
  PUBLISH: "PUBLISH",
  REQUEST_CHANGES: "REQUEST_CHANGES",
});

export const STATUS_LABEL_ALIASES = Object.freeze({
  SUBMITTED: "Under Review",
  NEEDS_ACTION: "Draft",
});

export const PROPERTY_STATUS_ORDER = Object.freeze({
  [PROPERTY_STATUS.ACTIVE]: 0,
  [PROPERTY_STATUS.DRAFT]: 1,
  [PROPERTY_STATUS.CLOSED]: 2,
});

export const PROPERTY_STATUS_FILTER_OPTIONS = Object.freeze([
  { label: "All", value: "" },
  { label: "Draft", value: PROPERTY_STATUS.DRAFT },
  { label: "Active", value: PROPERTY_STATUS.ACTIVE },
  { label: "Closed", value: PROPERTY_STATUS.CLOSED },
]);

export const SELLER_WORKFLOW_FILTER_OPTIONS = Object.freeze([
  { label: "All", value: "" },
  { label: "Under Review", value: SELLER_WORKFLOW_STATUS.SUBMITTED },
  { label: "Changes Requested", value: SELLER_WORKFLOW_STATUS.CHANGES_REQUESTED },
  { label: "Published", value: SELLER_WORKFLOW_STATUS.PUBLISHED },
  { label: "Closed", value: SELLER_WORKFLOW_STATUS.CLOSED },
]);

export const PROPERTY_STATUS_UPSERT_OPTIONS = Object.freeze([
  { label: "Draft", value: PROPERTY_STATUS.DRAFT },
  { label: "Active", value: PROPERTY_STATUS.ACTIVE },
  { label: "Closed", value: PROPERTY_STATUS.CLOSED },
]);

const PROPERTY_STATUS_TONES = Object.freeze({
  [PROPERTY_STATUS.ACTIVE]: "active",
  [PROPERTY_STATUS.DRAFT]: "draft",
  [PROPERTY_STATUS.CLOSED]: "closed",
});

export function normalizeStatusToken(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function formatStatusLabel(value, aliases = {}) {
  const normalized = normalizeStatusToken(value);
  if (!normalized) return "—";

  if (Object.prototype.hasOwnProperty.call(aliases, normalized)) {
    return aliases[normalized];
  }

  return normalized
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function propertyStatusTone(value) {
  const normalized = normalizeStatusToken(value);
  return PROPERTY_STATUS_TONES[normalized] ?? "unknown";
}
