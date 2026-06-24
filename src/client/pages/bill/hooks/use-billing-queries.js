import { useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { billingService } from "../services/billing-service";
import { BQK } from "../constants/billing";
import { selectItemRate } from "../utils/billing-calc";

// ─── Local recalc helper (mirrors Rust round2 + formula) ─────────
function r2(n) { return Math.round(n * 100) / 100; }

function recalcItem(rate, qty, discPct, taxPct) {
  const gross    = r2((rate || 0) * (qty || 0));
  const disc     = r2(gross * ((discPct || 0) / 100));
  const taxable  = r2(gross - disc);
  const tax      = r2(taxable * ((taxPct || 0) / 100));
  const final    = r2(taxable + tax);
  return {
    gross_amount:    gross,
    discount_amount: disc,
    taxable_amount:  taxable,
    tax_amount:      tax,
    final_amount:    final,
  };
}

// ─────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────

export function useTablesForBilling() {
  return useQuery({
    queryKey: BQK.TABLES,
    queryFn:  billingService.getTablesForBilling,
    staleTime: 5_000,
  });
}

export function useFloorView() {
  return useQuery({
    queryKey:       BQK.FLOOR_VIEW,
    queryFn:        billingService.getFloorView,
    staleTime:      0,
    refetchInterval: 30_000,
  });
}

// Most recently generated KOT — shown as a recap on the floor view.
export function useLastKot() {
  return useQuery({
    queryKey:  ["last-kot"],
    queryFn:   billingService.getLastKot,
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

export function useMenuForBilling() {
  return useQuery({
    queryKey: BQK.MENU,
    queryFn:  billingService.getMenuForBilling,
    staleTime: 0,
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: BQK.ACTIVE_SESSIONS,
    queryFn:  billingService.getActiveSessions,
    staleTime: 5_000,
  });
}

export function useOrderSession(sessionId) {
  return useQuery({
    queryKey: BQK.SESSION(sessionId),
    queryFn:  () => billingService.getOrderSession(sessionId),
    enabled:  !!sessionId,
  });
}

export function useSessionDetail(sessionId) {
  return useQuery({
    queryKey:        BQK.SESSION_DETAIL(sessionId),
    queryFn:         () => billingService.getSessionDetail(sessionId),
    enabled:         !!sessionId,
    staleTime:       0,
    refetchInterval: 15_000,
    retry:           1,
  });
}

export function useUpdateSessionInfo(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.updateSessionInfo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      toast.success("Session updated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useOrderItems(sessionId) {
  return useQuery({
    queryKey: BQK.ORDER_ITEMS(sessionId),
    queryFn:  () => billingService.getOrderItems(sessionId),
    enabled:  !!sessionId,
    staleTime: 2_000,
  });
}

export function useBillSummary(sessionId) {
  return useQuery({
    queryKey: BQK.BILL_SUMMARY(sessionId),
    queryFn:  () => billingService.getBillSummary(sessionId),
    enabled:  !!sessionId,
    staleTime: 2_000,
  });
}

export function useKotList(sessionId) {
  return useQuery({
    queryKey: BQK.KOT_LIST(sessionId),
    queryFn:  () => billingService.getKotList(sessionId),
    enabled:  !!sessionId,
  });
}

// ─────────────────────────────────────────────────────────────
// Session mutations
// ─────────────────────────────────────────────────────────────

export function useOpenOrderSession(onSuccess) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.openOrderSession,
    onSuccess: (sessionId) => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      onSuccess?.(sessionId);
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useCancelOrderSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, remarks }) =>
      billingService.cancelOrderSession(sessionId, remarks),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.removeQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      toast.success("Order cancelled");
    },
    onError: (e) => toast.error(String(e)),
  });
}

// ─────────────────────────────────────────────────────────────
// Order item mutations — all three use optimistic updates
// ─────────────────────────────────────────────────────────────

export function useAddOrderItem(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.addOrderItem,

    onMutate: async ({ menuId, quantity, specialInstruction, addons, isComplimentary }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      const isComp = !!isComplimentary;

      if (Array.isArray(prevItems)) {
        const menu     = qc.getQueryData(BQK.MENU) ?? [];
        const session  = qc.getQueryData(BQK.SESSION_DETAIL(sessionId));
        const menuItem = menu.find((m) => m.id === menuId);

        // Per-unit add-on charge (matches the Rust calc). Lines with add-ons never merge.
        // Complimentary lines carry no add-ons and no charge.
        const addonList = isComp ? [] : (addons ?? []);
        const addonRate = r2(addonList.reduce((s, a) => s + (Number(a.rate) || 0), 0));

        if (menuItem) {
          const instrKey = specialInstruction ?? null;

          // Check for existing PENDING item with same menu + instruction → merge.
          // Never merge into (or as) an add-on-bearing or complimentary line.
          const existingIdx = (addonList.length > 0 || isComp) ? -1 : prevItems.findIndex(
            (i) =>
              i.menu_id === menuId &&
              i.kot_status === "PENDING" &&
              i.item_status === "ACTIVE" &&
              !(Number(i.addon_rate) > 0) &&
              !i.is_complimentary &&
              (i.special_instruction ?? null) === instrKey,
          );

          if (existingIdx !== -1) {
            const existing = prevItems[existingIdx];
            const newQty   = existing.quantity + (quantity || 1);
            const amounts  = recalcItem(existing.rate, newQty, existing.discount_percent, existing.tax_percentage);
            const next     = [...prevItems];
            next[existingIdx] = { ...existing, quantity: newQty, ...amounts };
            qc.setQueryData(BQK.ORDER_ITEMS(sessionId), next);
          } else {
            const rate    = isComp ? 0 : selectItemRate(menuItem, session?.applicable_rate ?? 1);
            const taxPct  = isComp ? 0 : (menuItem.tax_percentage ?? 0);
            // Charge per unit = base rate + add-on rate, taxed at the parent rate.
            const amounts = recalcItem(rate + addonRate, quantity || 1, 0, taxPct);
            const optimistic = {
              // Unique even across same-millisecond adds (e.g. several comp items at once)
              id:                  -(Date.now() * 1000 + Math.floor(Math.random() * 1000)),
              code:                0,
              order_session_id:    sessionId,
              menu_id:             menuId,
              item_name:           menuItem.item_name,
              quantity:            quantity || 1,
              rate,
              addon_rate:          addonRate,
              addons:              addonList.map((a) => ({
                id: -(Date.now() + Math.random()),
                menu_id: a.menuId ?? a.menu_id,
                name: a.name,
                rate: a.rate,
              })),
              discount_percent:    0,
              tax_name:            isComp ? null : (menuItem.tax_name ?? null),
              tax_percentage:      taxPct,
              tax_details:         isComp ? [] : (menuItem.tax_details ?? []),
              food_type:           menuItem.food_type ?? null,
              food_type_id:        menuItem.food_type_id ?? null,
              kitchen_section_id:  menuItem.kitchen_section_id ?? null,
              is_liquor:           menuItem.is_liquor ?? false,
              is_complimentary:    isComp,
              kot_status:          "PENDING",
              item_status:         "ACTIVE",
              special_instruction: instrKey,
              ordered_at:          null,
              ...amounts,
            };
            qc.setQueryData(BQK.ORDER_ITEMS(sessionId), [...prevItems, optimistic]);
          }
        }
      }

      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

export function useUpdateOrderItemQty(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, qty }) => billingService.updateOrderItemQty(id, qty),

    onMutate: async ({ id, qty }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        const idx = prevItems.findIndex((i) => i.id === id);
        if (idx !== -1) {
          const item    = prevItems[idx];
          const effRate = (Number(item.rate) || 0) + (Number(item.addon_rate) || 0);
          const amounts = recalcItem(effRate, qty, item.discount_percent, item.tax_percentage);
          const next    = [...prevItems];
          next[idx]     = { ...item, quantity: qty, ...amounts };
          qc.setQueryData(BQK.ORDER_ITEMS(sessionId), next);
        }
      }

      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

// Override a pending order item's per-unit rate ("As Per Size" items).
export function useUpdateOrderItemRate(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rate }) => billingService.updateOrderItemRate(id, rate),

    onMutate: async ({ id, rate }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        const idx = prevItems.findIndex((i) => i.id === id);
        if (idx !== -1) {
          const item    = prevItems[idx];
          const effRate = (Number(rate) || 0) + (Number(item.addon_rate) || 0);
          const amounts = recalcItem(effRate, item.quantity, item.discount_percent, item.tax_percentage);
          const next    = [...prevItems];
          next[idx]     = { ...item, rate: Number(rate) || 0, ...amounts };
          qc.setQueryData(BQK.ORDER_ITEMS(sessionId), next);
        }
      }

      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

// All add-on master items, for the billing add-on dialog search.
export function useBillingAddons() {
  return useQuery({
    queryKey: BQK.ADDONS,
    queryFn: billingService.getBillingAddons,
    staleTime: 60_000,
  });
}

// Create a custom add-on (also saved to the add-on master so it's reusable).
export function useCreateCustomAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.createCustomAddon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.ADDONS });
      qc.invalidateQueries({ queryKey: BQK.MENU });
    },
    onError: (e) => toast.error(String(e)),
  });
}

// Replace the add-ons on an existing pending order line + recompute the line.
export function useUpdateOrderItemAddons(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.updateOrderItemAddons,

    onMutate: async ({ orderItemId, addons }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        const idx = prevItems.findIndex((i) => i.id === orderItemId);
        if (idx !== -1) {
          const item      = prevItems[idx];
          const addonRate = r2((addons ?? []).reduce((s, a) => s + (Number(a.rate) || 0), 0));
          const effRate   = (Number(item.rate) || 0) + addonRate;
          const amounts   = recalcItem(effRate, item.quantity, item.discount_percent, item.tax_percentage);
          const next      = [...prevItems];
          next[idx] = {
            ...item,
            addon_rate: addonRate,
            addons: (addons ?? []).map((a) => ({
              id: -(Date.now() + Math.random()),
              menu_id: a.menuId ?? a.menu_id,
              name: a.name,
              rate: a.rate,
            })),
            ...amounts,
          };
          qc.setQueryData(BQK.ORDER_ITEMS(sessionId), next);
        }
      }
      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

export function useCancelOrderItem(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.cancelOrderItem,

    onMutate: async (orderItemId) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        qc.setQueryData(
          BQK.ORDER_ITEMS(sessionId),
          prevItems.map((i) =>
            i.id === orderItemId ? { ...i, item_status: "CANCELLED" } : i,
          ),
        );
      }

      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSuccess: () => toast.success("Item cancelled"),

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

// Void a KOT-sent item with a mandatory reason.
// payload = { orderItemId, quantityToVoid, voidReason, userId }
export function useCancelOrderItemWithReason(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.cancelOrderItemWithReason,

    onMutate: async ({ orderItemId, quantityToVoid }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        qc.setQueryData(
          BQK.ORDER_ITEMS(sessionId),
          prevItems.map((i) => {
            if (i.id !== orderItemId) return i;
            const newQty = Math.max(0, (Number(i.quantity) || 0) - quantityToVoid);
            return newQty <= 0
              ? { ...i, item_status: "CANCELLED" }
              : { ...i, quantity: newQty };
          }),
        );
      }

      return { prevItems };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems !== undefined) {
        qc.setQueryData(BQK.ORDER_ITEMS(sessionId), ctx.prevItems);
      }
      toast.error(String(_e));
    },

    onSuccess: () => toast.success("Item voided"),

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// KOT mutations
// ─────────────────────────────────────────────────────────────

export function useGenerateKot(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ remarks } = {}) => billingService.generateKot(sessionId, remarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.KOT_LIST(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: ["last-kot"] });
      toast.success("KOT generated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useGenerateCheckKot(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ remarks } = {}) => billingService.generateKot(sessionId, remarks ?? "Check KOT"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.KOT_LIST(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: ["last-kot"] });
      toast.success("Check KOT generated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

// ─────────────────────────────────────────────────────────────
// Table shift / item transfer mutations
// ─────────────────────────────────────────────────────────────

export function useShiftTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.shiftTableFull,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      toast.success("Table shifted");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useTransferItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.transferOrderItems,
    onSuccess: (_destSessionId, { sourceSessionId }) => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sourceSessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sourceSessionId) });
      toast.success("Items moved");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useTransferItemsWithQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.transferOrderItemsWithQty,
    onSuccess: (_destSessionId, { sourceSessionId }) => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sourceSessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sourceSessionId) });
      toast.success("Items moved");
    },
    onError: (e) => toast.error(String(e)),
  });
}

// ─────────────────────────────────────────────────────────────
// Bill mutations
// ─────────────────────────────────────────────────────────────

export function useGenerateBill(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ billDiscountAmount, billNetAmount } = {}) =>
      billingService.generateBill(sessionId, billDiscountAmount, billNetAmount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.SESSION(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
      toast.success("Bill generated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useSettleBill(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.settleBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      qc.invalidateQueries({ queryKey: BQK.ACTIVE_SESSIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      qc.invalidateQueries({ queryKey: BQK.SESSION(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
      // Invalidate all settled-bills queries so Bill Reprint updates immediately
      qc.invalidateQueries({ queryKey: ["billing-settled-bills"] });
      // Refresh the "last settled bill" recap shown under the action bar
      qc.invalidateQueries({ queryKey: ["last-settled-bill"] });
      toast.success("Bill settled");
    },
    onError: (e) => toast.error(String(e)),
  });
}

// ─────────────────────────────────────────────────────────────
// Reservation queries & mutations
// ─────────────────────────────────────────────────────────────

export function useReservations(filter) {
  return useQuery({
    queryKey:        [...BQK.RESERVATIONS, filter ?? "default"],
    queryFn:         () => billingService.getReservations(filter),
    staleTime:       0,
    refetchInterval: 30_000,
  });
}

export function useReservationById(reservationId) {
  return useQuery({
    queryKey: [...BQK.RESERVATIONS, "detail", reservationId],
    queryFn:  () => billingService.getReservationById(reservationId),
    enabled:  !!reservationId,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.createReservation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      toast.success("Reservation created");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, ...input }) =>
      billingService.updateReservation(reservationId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      toast.success("Reservation updated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, status }) =>
      billingService.updateReservationStatus(reservationId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      toast.success("Reservation updated");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId) =>
      billingService.cancelReservation(reservationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
      qc.invalidateQueries({ queryKey: BQK.TABLES });
      toast.success("Reservation cancelled");
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useEmployeesForBilling() {
  return useQuery({
    queryKey:  ["billing-employees"],
    queryFn:   billingService.getEmployeesForBilling,
    staleTime: 300_000,
  });
}

export function useExpireNoShowReservations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.expireNoShowReservations,
    onSuccess: (count) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
        qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
        qc.invalidateQueries({ queryKey: BQK.TABLES });
        toast.info(`${count} reservation(s) marked as no-show`);
      }
    },
    onError: (e) => toast.error(String(e)),
  });
}

// ─────────────────────────────────────────────────────────────
// Reservation auto-expiry watcher
// Mount once at the BillingScreen root. Checks floor data on every
// 30s poll cycle + an independent 60s heartbeat.  Calls the
// expire_no_show backend when any RESERVED table has gone 15 min
// past its reservation_time without an ARRIVED mark.
// Debounced with a 55s window so concurrent triggers can't stack.
// ─────────────────────────────────────────────────────────────

export function useReservationAutoExpiry() {
  const qc       = useQueryClient();
  const { data: floorData } = useFloorView();
  const lastCallRef = useRef(0);

  const checkAndExpire = useCallback(() => {
    if (!Array.isArray(floorData) || floorData.length === 0) return;

    const now = Date.now();
    // Debounce: skip if we called within the last 55 s
    if (now - lastCallRef.current < 55_000) return;

    const hasExpirable = floorData.some((t) => {
      // Table is RESERVED in DB but has no today-reservation overlay → past-date stale lock
      if (t.current_status === "RESERVED" && !t.reservation_id) return true;

      if (!t.reservation_id || t.reservation_status !== "RESERVED" || !t.reservation_time) return false;
      const [h, m] = t.reservation_time.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return false;
      const cutoff = new Date(now);
      cutoff.setHours(h, m, 0, 0);
      return now >= cutoff.getTime() + 15 * 60_000;
    });

    if (!hasExpirable) return;

    lastCallRef.current = now;
    billingService.expireNoShowReservations()
      .then((count) => {
        if (Number(count) > 0) {
          qc.invalidateQueries({ queryKey: BQK.RESERVATIONS });
          qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
          qc.invalidateQueries({ queryKey: BQK.TABLES });
          toast.info(`${count} reservation(s) marked as no-show`);
        }
      })
      .catch(() => {
        // Reset debounce so the next cycle retries
        lastCallRef.current = 0;
      });
  }, [floorData, qc]);

  // Trigger on every floor-data refresh (primary path — every 30 s poll)
  useEffect(() => { checkAndExpire(); }, [checkAndExpire]);

  // Stable 60 s heartbeat — catches transitions between poll cycles
  const cbRef = useRef(checkAndExpire);
  useEffect(() => { cbRef.current = checkAndExpire; }, [checkAndExpire]);
  useEffect(() => {
    const id = setInterval(() => cbRef.current(), 60_000);
    return () => clearInterval(id);
  }, []);
}

// ─────────────────────────────────────────────────────────────
// Bill Reprint hooks
// ─────────────────────────────────────────────────────────────

/** Search settled bills. params = { search, dateFrom, dateTo } */
export function useSettledBills(params) {
  // Stringify params so object identity doesn't break cache key equality
  const stableKey = params ? JSON.stringify(params) : null;
  return useQuery({
    queryKey: ["billing-settled-bills", stableKey],
    queryFn:  () => billingService.searchSettledBills(params),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled:  !!params,
  });
}

/** Full bill detail for reprint (header + items + tax + payments). */
export function useBillForReprint(billId) {
  return useQuery({
    queryKey: BQK.BILL_REPRINT(billId),
    queryFn:  () => billingService.getBillForReprint(billId),
    staleTime: 60_000,
    enabled:  !!billId,
  });
}

/** Active payment methods (day_book master). Cached long — rarely changes. */
export function usePaymentMethods() {
  return useQuery({
    queryKey:  BQK.PAYMENT_METHODS,
    queryFn:   billingService.getPaymentMethods,
    staleTime: 300_000,
  });
}

/** Search customers by name/mobile (party picker). Enabled only when querying. */
export function useSearchCustomers(query, enabled = true) {
  return useQuery({
    queryKey:  BQK.CUSTOMER_SEARCH(query ?? ""),
    queryFn:   () => billingService.searchCustomers(query ?? ""),
    staleTime: 10_000,
    enabled,
  });
}

/** Quick-create a customer from the billing screen. */
export function useQuickCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.quickCreateCustomer,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["billing-customer-search"] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

/** Assign / update customer + waiter on an existing session. */
export function useUpdateSessionParty(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.updateSessionParty,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: BQK.SESSION_DETAIL(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.FLOOR_VIEW });
    },
    onError: (e) => toast.error(String(e)),
  });
}

/** Search KOT messages (kot_message master). Enabled only when querying. */
export function useSearchKotMessages(query, enabled = true) {
  return useQuery({
    queryKey:  BQK.KOT_MSG_SEARCH(query ?? ""),
    queryFn:   () => billingService.searchKotMessages(query ?? ""),
    staleTime: 30_000,
    enabled,
  });
}

/** Set the KOT message on an order item (clear existing, then add). */
export function useSetOrderItemKotMessage(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderItemId, message }) => {
      await billingService.clearOrderItemModifiers(orderItemId);
      if (message && message.trim()) {
        await billingService.addOrderItemModifier(orderItemId, message.trim());
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
    },
    onError: (e) => toast.error(String(e)),
  });
}
