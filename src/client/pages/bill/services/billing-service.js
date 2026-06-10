import { invoke } from "@tauri-apps/api/core";

// ─────────────────────────────────────────────────────────────
// Billing service — single place where all billing Tauri commands
// are called.  All methods return the raw invoke() promise.
// Callers (hooks) own error handling and toast display.
// ─────────────────────────────────────────────────────────────

export const billingService = {

  // ── Lookup / reference data ──────────────────────────────────

  /** All tables with current_status, table_group info, applicable_rate */
  getTablesForBilling: () =>
    invoke("get_tables_for_billing"),

  /** Floor view — tables with live session overlay, running total, waiter, covers */
  getFloorView: () =>
    invoke("get_floor_view"),

  /** Active menu cards with all five rates, category, group, kitchen section */
  getMenuForBilling: () =>
    invoke("get_menu_for_billing"),

  /** All currently OPEN or KOT_SENT order sessions */
  getActiveSessions: () =>
    invoke("get_active_sessions"),

  // ── Session lifecycle ────────────────────────────────────────

  openOrderSession: ({ tableId, orderType, covers, customerId, waiterId, reservationId, customerName }) =>
    invoke("open_order_session", {
      tableId,
      orderType,
      covers:         covers         ?? 1,
      customerId:     customerId     ?? null,
      waiterId:       waiterId       ?? null,
      reservationId:  reservationId  ?? null,
      customerName:   customerName   ?? null,
    }),

  getOrderSession: (sessionId) =>
    invoke("get_order_session", { sessionId }),

  /** Full session detail — waiter, customer, running total, item counts, bill info */
  getSessionDetail: (sessionId) =>
    invoke("get_session_detail", { sessionId }),

  updateSessionInfo: ({ sessionId, orderType, covers, customerName }) =>
    invoke("update_session_info", {
      sessionId,
      orderType,
      covers,
      customerName: customerName ?? null,
    }),

  cancelOrderSession: (sessionId, remarks) =>
    invoke("cancel_order_session", { sessionId, remarks: remarks ?? null }),

  // ── Order items ───────────────────────────────────────────────

  getOrderItems: (sessionId) =>
    invoke("get_order_items", { sessionId }),

  addOrderItem: ({ sessionId, menuId, quantity, specialInstruction }) =>
    invoke("add_order_item", {
      sessionId,
      menuId,
      quantity:            quantity            ?? 1,
      specialInstruction:  specialInstruction  ?? null,
    }),

  updateOrderItemQty: (orderItemId, quantity) =>
    invoke("update_order_item_qty", { orderItemId, quantity }),

  cancelOrderItem: (orderItemId) =>
    invoke("cancel_order_item", { orderItemId }),

  cancelOrderItemWithReason: ({ orderItemId, quantityToVoid, voidReason, userId, voidedBy }) =>
    invoke("cancel_order_item_with_reason", { orderItemId, quantityToVoid, voidReason, userId, voidedBy }),

  // ── KOT ───────────────────────────────────────────────────────

  generateKot: (sessionId, remarks) =>
    invoke("generate_kot", { sessionId, remarks: remarks ?? null }),

  getKotList: (sessionId) =>
    invoke("get_kot_list", { sessionId }),

  // ── Table shift / item transfer ───────────────────────────────

  /** Move an entire session (items, KOTs, state, time) to a free table */
  shiftTableFull: ({ sessionId, targetTableId }) =>
    invoke("shift_table_full", { sessionId, targetTableId }),

  /** Move selected order items to another table (merges or opens a session) */
  transferOrderItems: ({ sourceSessionId, targetTableId, itemIds }) =>
    invoke("transfer_order_items", { sourceSessionId, targetTableId, itemIds }),

  /** Move selected items with per-item quantity (supports partial qty of a row) */
  transferOrderItemsWithQty: ({ sourceSessionId, targetTableId, items }) =>
    invoke("transfer_order_items_with_qty", { sourceSessionId, targetTableId, items }),

  // ── Bill & payment ────────────────────────────────────────────

  getBillSummary: (sessionId) =>
    invoke("get_bill_summary", { sessionId }),

  generateBill: (sessionId, billDiscountAmount, billNetAmount) =>
    invoke("generate_bill", {
      sessionId,
      billDiscountAmount: billDiscountAmount ?? null,
      billNetAmount:      billNetAmount      ?? null,
    }),

  /**
   * @param {Object} params
   * @param {number} params.sessionId
   * @param {number} params.billId
   * @param {string} params.paymentType  — CASH | CARD | UPI | DUE | PART
   * @param {number} params.paymentAmount
   * @param {string|null} params.referenceNo
   * @param {Array<{payment_mode,amount,reference_no}>} params.partPayments
   * @param {number} params.writeOffAmount
   */
  settleBill: ({ sessionId, billId, paymentType, paymentAmount, referenceNo, partPayments, writeOffAmount, customerName, customerMobile, customerAddress }) =>
    invoke("settle_bill", {
      sessionId,
      billId,
      paymentType,
      paymentAmount,
      referenceNo:     referenceNo     ?? null,
      partPayments:    partPayments    ?? [],
      writeOffAmount:  writeOffAmount  ?? 0,
      customerName:    customerName    ?? null,
      customerMobile:  customerMobile  ?? null,
      customerAddress: customerAddress ?? null,
    }),

  /** Active payment methods mapped from the day_book master */
  getPaymentMethods: () =>
    invoke("get_payment_methods"),

  // ── Reservations ──────────────────────────────────────────────

  getReservations: (filter) =>
    invoke("get_reservations", { filter: filter ?? null }),

  getReservationById: (reservationId) =>
    invoke("get_reservation_by_id", { reservationId }),

  createReservation: ({ tableId, customerName, customerMobile, guestCount, reservationDate, reservationTime, durationMinutes, preferredWaiterId, notes }) =>
    invoke("create_reservation", {
      input: {
        table_id:             tableId          ?? null,
        customer_name:        customerName     ?? null,
        customer_mobile:      customerMobile   ?? null,
        guest_count:          guestCount       ?? 1,
        reservation_date:     reservationDate,
        reservation_time:     reservationTime,
        duration_minutes:     durationMinutes  ?? null,
        preferred_waiter_id:  preferredWaiterId ?? null,
        notes:                notes            ?? null,
      },
    }),

  updateReservation: (reservationId, { tableId, customerName, customerMobile, guestCount, reservationDate, reservationTime, durationMinutes, preferredWaiterId, notes }) =>
    invoke("update_reservation", {
      reservationId,
      input: {
        table_id:             tableId          ?? null,
        customer_name:        customerName     ?? null,
        customer_mobile:      customerMobile   ?? null,
        guest_count:          guestCount       ?? 1,
        reservation_date:     reservationDate,
        reservation_time:     reservationTime,
        duration_minutes:     durationMinutes  ?? null,
        preferred_waiter_id:  preferredWaiterId ?? null,
        notes:                notes            ?? null,
      },
    }),

  getEmployeesForBilling: () =>
    invoke("get_employees_for_billing"),

  // ── Customer / waiter party ──────────────────────────────────

  /** Search customers by name/mobile for the billing party picker */
  searchCustomers: (query) =>
    invoke("search_customers", { query: query ?? "" }),

  /** Outstanding pending dues for the customer matching a mobile number */
  getCustomerDueByMobile: (mobile) =>
    invoke("get_customer_due_by_mobile", { mobile: mobile ?? "" }),

  /** Quick-create a customer (lands in customer_information master) */
  quickCreateCustomer: ({ name, mobile, email, address }) =>
    invoke("quick_create_customer", {
      name,
      mobile:  mobile  ?? null,
      email:   email   ?? null,
      address: address ?? null,
    }),

  /** Assign / update customer + waiter on an existing session */
  updateSessionParty: ({ sessionId, customerId, customerName, customerMobile, waiterId }) =>
    invoke("update_session_party", {
      sessionId,
      customerId:     customerId     ?? null,
      customerName:   customerName   ?? null,
      customerMobile: customerMobile ?? null,
      waiterId:       waiterId       ?? null,
    }),

  // ── KOT messages / item modifiers ────────────────────────────

  /** Search KOT messages (kot_message master) by text or code */
  searchKotMessages: (query) =>
    invoke("search_kot_messages", { query: query ?? "" }),

  /** Attach a KOT message to an order item (order_item_modifier) */
  addOrderItemModifier: (orderItemId, modifierName) =>
    invoke("add_order_item_modifier", { orderItemId, modifierName }),

  /** Clear all KOT messages from an order item */
  clearOrderItemModifiers: (orderItemId) =>
    invoke("clear_order_item_modifiers", { orderItemId }),

  updateReservationStatus: (reservationId, status) =>
    invoke("update_reservation_status", { reservationId, status }),

  cancelReservation: (reservationId) =>
    invoke("cancel_reservation", { reservationId }),

  expireNoShowReservations: () =>
    invoke("expire_no_show_reservations"),

  // ── Bill Reprint ──────────────────────────────────────────────

  /** Search settled bills. search/dateFrom/dateTo are all optional. */
  searchSettledBills: ({ search, dateFrom, dateTo } = {}) =>
    invoke("search_settled_bills", {
      search:   search   ?? null,
      dateFrom: dateFrom ?? null,
      dateTo:   dateTo   ?? null,
    }),

  /** Full bill detail (header + items + tax + payments) for reprint. */
  getBillForReprint: (billId) =>
    invoke("get_bill_for_reprint", { billId }),
};
