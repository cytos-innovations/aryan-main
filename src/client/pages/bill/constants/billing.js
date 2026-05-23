// ─────────────────────────────────────────────────────────────
// Billing module — enums, status constants, and query keys
// ─────────────────────────────────────────────────────────────

export const ORDER_TYPE = {
  DINE_IN:  "DINE_IN",
  DELIVERY: "DELIVERY",
  PICKUP:   "PICKUP",
};

export const ORDER_TYPE_LABELS = {
  DINE_IN:  "Dine In",
  DELIVERY: "Home Delivery",
  PICKUP:   "Takeaway",
};

export const SESSION_STATUS = {
  OPEN:          "OPEN",
  KOT_SENT:      "KOT_SENT",
  BILL_PRINTED:  "BILL_PRINTED",
  SETTLED:       "SETTLED",
  CANCELLED:     "CANCELLED",
};

export const ITEM_STATUS = {
  ACTIVE:    "ACTIVE",
  CANCELLED: "CANCELLED",
  VOID:      "VOID",
};

export const KOT_STATUS = {
  PENDING:    "PENDING",
  SENT:       "SENT",
  PREPARING:  "PREPARING",
  READY:      "READY",
  SERVED:     "SERVED",
};

export const BILL_STATUS = {
  DRAFT:   "DRAFT",
  PRINTED: "PRINTED",
  PAID:    "PAID",
  DUE:     "DUE",
};

export const PAYMENT_TYPE = {
  CASH: "CASH",
  CARD: "CARD",
  UPI:  "UPI",
  DUE:  "DUE",
  PART: "PART",
};

export const PAYMENT_TYPE_LABELS = {
  CASH: "Cash",
  CARD: "Card / Swipe",
  UPI:  "UPI",
  DUE:  "Due",
  PART: "Part Payment",
};

export const SETTLEMENT_TYPE = {
  FULL:       "FULL",
  PARTIAL:    "PARTIAL",
  DUE:        "DUE",
  WRITE_OFF:  "WRITE_OFF",
};

export const TABLE_STATUS = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED:  "OCCUPIED",
  RESERVED:  "RESERVED",
};

export const BILLING_VIEW = {
  TABLE_SELECT:  "TABLE_SELECT",
  ORDER_ENTRY:   "ORDER_ENTRY",
  BILL_PREVIEW:  "BILL_PREVIEW",
  PAYMENT:       "PAYMENT",
};

// ─────────────────────────────────────────────────────────────
// TanStack Query keys — centralised so cache invalidation is consistent
// ─────────────────────────────────────────────────────────────

export const BQK = {
  TABLES:          ["billing-tables"],
  FLOOR_VIEW:      ["billing-floor-view"],
  MENU:            ["billing-menu"],
  ACTIVE_SESSIONS: ["billing-active-sessions"],
  SESSION:         (id) => ["billing-session", id],
  SESSION_DETAIL:  (id) => ["billing-session-detail", id],
  ORDER_ITEMS:     (sessionId) => ["billing-order-items", sessionId],
  BILL_SUMMARY:    (sessionId) => ["billing-bill-summary", sessionId],
  KOT_LIST:        (sessionId) => ["billing-kot-list", sessionId],
};

// ─────────────────────────────────────────────────────────────
// EMPTY_FORM shapes — used to reset local state
// ─────────────────────────────────────────────────────────────

export const EMPTY_PAYMENT_ENTRY = {
  payment_mode: PAYMENT_TYPE.CASH,
  amount:       "",
  reference_no: "",
};
