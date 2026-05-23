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

export function useMenuForBilling() {
  return useQuery({
    queryKey: BQK.MENU,
    queryFn:  billingService.getMenuForBilling,
    staleTime: 60_000,
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

    onMutate: async ({ menuId, quantity, specialInstruction }) => {
      await qc.cancelQueries({ queryKey: BQK.ORDER_ITEMS(sessionId) });
      const prevItems = qc.getQueryData(BQK.ORDER_ITEMS(sessionId));

      if (Array.isArray(prevItems)) {
        const menu     = qc.getQueryData(BQK.MENU) ?? [];
        const session  = qc.getQueryData(BQK.SESSION_DETAIL(sessionId));
        const menuItem = menu.find((m) => m.id === menuId);

        if (menuItem) {
          const instrKey = specialInstruction ?? null;

          // Check for existing PENDING item with same menu + instruction → merge
          const existingIdx = prevItems.findIndex(
            (i) =>
              i.menu_id === menuId &&
              i.kot_status === "PENDING" &&
              i.item_status === "ACTIVE" &&
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
            const rate    = selectItemRate(menuItem, session?.applicable_rate ?? 1);
            const amounts = recalcItem(rate, quantity || 1, 0, menuItem.tax_percentage ?? 0);
            const optimistic = {
              id:                  -(Date.now()),
              code:                0,
              order_session_id:    sessionId,
              menu_id:             menuId,
              item_name:           menuItem.item_name,
              quantity:            quantity || 1,
              rate,
              discount_percent:    0,
              tax_name:            menuItem.tax_name ?? null,
              tax_percentage:      menuItem.tax_percentage ?? 0,
              food_type:           menuItem.food_type ?? null,
              food_type_id:        menuItem.food_type_id ?? null,
              kitchen_section_id:  menuItem.kitchen_section_id ?? null,
              is_liquor:           menuItem.is_liquor ?? false,
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
          const amounts = recalcItem(item.rate, qty, item.discount_percent, item.tax_percentage);
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
      toast.success("KOT generated");
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
    mutationFn: () => billingService.generateBill(sessionId),
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
      qc.invalidateQueries({ queryKey: BQK.SESSION(sessionId) });
      qc.invalidateQueries({ queryKey: BQK.BILL_SUMMARY(sessionId) });
      toast.success("Bill settled");
    },
    onError: (e) => toast.error(String(e)),
  });
}
