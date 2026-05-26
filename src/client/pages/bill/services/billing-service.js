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

  // ── KOT ───────────────────────────────────────────────────────

  generateKot: (sessionId, remarks) =>
    invoke("generate_kot", { sessionId, remarks: remarks ?? null }),

  getKotList: (sessionId) =>
    invoke("get_kot_list", { sessionId }),

  // ── Bill & payment ────────────────────────────────────────────

  getBillSummary: (sessionId) =>
    invoke("get_bill_summary", { sessionId }),

  generateBill: (sessionId) =>
    invoke("generate_bill", { sessionId }),

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
  settleBill: ({ sessionId, billId, paymentType, paymentAmount, referenceNo, partPayments, writeOffAmount }) =>
    invoke("settle_bill", {
      sessionId,
      billId,
      paymentType,
      paymentAmount,
      referenceNo:    referenceNo    ?? null,
      partPayments:   partPayments   ?? [],
      writeOffAmount: writeOffAmount ?? 0,
    }),

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

  updateReservationStatus: (reservationId, status) =>
    invoke("update_reservation_status", { reservationId, status }),

  cancelReservation: (reservationId) =>
    invoke("cancel_reservation", { reservationId }),

  expireNoShowReservations: () =>
    invoke("expire_no_show_reservations"),
};
