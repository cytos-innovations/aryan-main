import { createContext, useContext, useReducer, useCallback } from "react";
import { BILLING_VIEW, ORDER_TYPE } from "../constants/billing";

function r2(n) { return Math.round(n * 100) / 100; }

// Monotonic counter for temporary draft-line ids. Date.now() alone collides when
// several lines are added in the same millisecond (e.g. picking multiple
// complimentary items at once), which breaks id-based line keying.
let draftIdSeq = 0;
function nextDraftId() { draftIdSeq += 1; return -(Date.now() * 1000 + (draftIdSeq % 1000)); }

// Draft lines are addressed by a "key": menu_id for normal lines (so taps of the
// same item merge), or the line's own (negative) id for complimentary lines so a
// free line never collides with a paid line of the same menu_id.
function draftLineKey(i) { return i.is_complimentary ? i.id : i.menu_id; }
function matchesDraftKey(i, key) { return draftLineKey(i) === key; }
function calcDraftAmounts(rate, qty, taxPct) {
  const gross = r2(rate * qty);
  const tax   = r2(gross * ((taxPct || 0) / 100));
  return { gross_amount: gross, discount_amount: 0, taxable_amount: gross, tax_amount: tax, final_amount: r2(gross + tax) };
}

const initialState = {
  activeSessionId:      null,
  selectedTableId:      null,
  selectedTableName:    null,
  selectedTableGroupName: null,
  view:                 BILLING_VIEW.TABLE_SELECT,

  selectedMenuCategoryId: null,
  selectedMenuGroupId:    null,

  paymentEntries: [],

  // Draft mode — holds items before a DB session is created
  draftItems:          [],
  draftOrderType:      ORDER_TYPE.DINE_IN,
  draftCovers:         2,
  draftApplicableRate: 1,
  draftCustomerName:   null,  // pre-filled from reservation when guest has arrived
  draftCustomerId:     null,  // selected from customer picker
  draftCustomerMobile: null,
  draftWaiterId:       null,  // assigned waiter
  draftWaiterName:     null,
  isRestoredFromHold:  false, // true when this draft was restored from a hold (Hold btn → Release)

  // KOT messages for existing-session PENDING items, held in UI until KOT punch.
  // Keyed by order_item_id → message string (null = cleared).
  pendingItemKotMsgs:  {},
};

const BillingContext = createContext(null);

function billingReducer(state, action) {
  switch (action.type) {

    case "SET_SESSION":
      return {
        ...state,
        activeSessionId:      action.payload.sessionId,
        selectedTableId:      action.payload.tableId,
        selectedTableName:    action.payload.tableName,
        selectedTableGroupName: action.payload.tableGroupName ?? null,
        view:                 action.payload.view ?? BILLING_VIEW.ORDER_ENTRY,
        // Restore held draft items if provided, otherwise start fresh
        draftItems:          action.payload.draftItems        ?? [],
        draftOrderType:      action.payload.orderType         ?? ORDER_TYPE.DINE_IN,
        draftCovers:         action.payload.draftCovers       ?? 2,
        draftApplicableRate: action.payload.applicableRate    ?? 1,
        draftCustomerName:   action.payload.draftCustomerName ?? null,
        draftCustomerId:     action.payload.draftCustomerId   ?? null,
        draftCustomerMobile: null,
        draftWaiterId:       action.payload.draftWaiterId     ?? null,
        draftWaiterName:     null,
        isRestoredFromHold:  action.payload.isRestoredFromHold ?? false,
      };

    case "SET_VIEW":
      return { ...state, view: action.payload };

    case "SELECT_MENU_CATEGORY":
      return { ...state, selectedMenuCategoryId: action.payload, selectedMenuGroupId: null };

    case "SELECT_MENU_GROUP":
      return { ...state, selectedMenuGroupId: action.payload };

    case "SET_PAYMENT_ENTRIES":
      return { ...state, paymentEntries: action.payload };

    case "ADD_PAYMENT_ENTRY":
      return { ...state, paymentEntries: [...state.paymentEntries, action.payload] };

    case "REMOVE_PAYMENT_ENTRY":
      return { ...state, paymentEntries: state.paymentEntries.filter((_, i) => i !== action.payload) };

    // ── Draft items ───────────────────────────────────────────────

    case "ADD_DRAFT_ITEM": {
      const { menuItem, rate, addons, isComplimentary } = action.payload;
      const isComp = !!isComplimentary;
      // Per-unit add-on charge, taxed at the parent rate (mirrors the Rust calc).
      // Complimentary lines carry no add-ons and no charge.
      const addonList = isComp ? [] : (addons ?? []);
      const addonRate = r2(addonList.reduce((s, a) => s + (Number(a.rate) || 0), 0));
      const baseRate  = isComp ? 0 : rate;
      const taxPct    = isComp ? 0 : (menuItem.tax_percentage ?? 0);
      const effRate   = r2(baseRate + addonRate);

      // Merge only when neither the existing nor the new line carries add-ons,
      // and neither is complimentary. (Draft mode keys lines by menu_id.)
      const existing = (addonList.length > 0 || isComp)
        ? null
        : state.draftItems.find((i) => i.menu_id === menuItem.id && !(Number(i.addon_rate) > 0) && !i.is_complimentary);
      if (existing) {
        const newQty = existing.quantity + 1;
        const existingEff = (Number(existing.rate) || 0) + (Number(existing.addon_rate) || 0);
        const amounts = calcDraftAmounts(existingEff, newQty, existing.tax_percentage);
        return {
          ...state,
          draftItems: state.draftItems.map((i) =>
            i === existing ? { ...i, quantity: newQty, ...amounts } : i,
          ),
        };
      }
      const amounts = calcDraftAmounts(effRate, 1, taxPct);
      return {
        ...state,
        draftItems: [...state.draftItems, {
          id:                  nextDraftId(),
          menu_id:             menuItem.id,
          item_name:           menuItem.item_name,
          quantity:            1,
          rate:                baseRate,
          addon_rate:          addonRate,
          addons:              addonList.map((a) => ({
            menu_id: a.menuId ?? a.menu_id,
            name:    a.name,
            rate:    a.rate,
          })),
          discount_percent:    0,
          tax_name:            isComp ? null : (menuItem.tax_name ?? null),
          tax_percentage:      taxPct,
          tax_details:         isComp ? [] : (menuItem.tax_details ?? []),
          category_id:         menuItem.category_id ?? null,
          category_name:       menuItem.category_name ?? null,
          food_type:           menuItem.food_type ?? null,
          food_type_id:        menuItem.food_type_id ?? null,
          is_liquor:           menuItem.is_liquor ?? false,
          as_per_size:         menuItem.as_per_size ?? false,
          is_complimentary:    isComp,
          special_instruction: null,
          kot_message:         null,  // selected KOT message (persisted to order_item_modifier on KOT)
          kot_status:          "PENDING",
          item_status:         "ACTIVE",
          ordered_at:          null,
          ...amounts,
        }],
      };
    }

    case "SET_DRAFT_ITEM_KOT_MSG":
      return {
        ...state,
        draftItems: state.draftItems.map((i) =>
          matchesDraftKey(i, action.payload.menuId)
            ? { ...i, kot_message: action.payload.message || null }
            : i,
        ),
      };

    case "SET_PENDING_ITEM_KOT_MSG":
      return {
        ...state,
        pendingItemKotMsgs: {
          ...state.pendingItemKotMsgs,
          [action.payload.orderItemId]: action.payload.message || null,
        },
      };

    case "CLEAR_PENDING_ITEM_KOT_MSGS":
      return { ...state, pendingItemKotMsgs: {} };

    case "UPDATE_DRAFT_QTY": {
      const { menuId, qty } = action.payload;
      if (qty <= 0) {
        return { ...state, draftItems: state.draftItems.filter((i) => !matchesDraftKey(i, menuId)) };
      }
      return {
        ...state,
        draftItems: state.draftItems.map((i) => {
          if (!matchesDraftKey(i, menuId)) return i;
          const effRate = (Number(i.rate) || 0) + (Number(i.addon_rate) || 0);
          return { ...i, quantity: qty, ...calcDraftAmounts(effRate, qty, i.tax_percentage) };
        }),
      };
    }

    case "UPDATE_DRAFT_ITEM_RATE": {
      // Override the per-unit base rate for an "As Per Size" line. Add-on rate
      // is preserved; amounts recompute from (newRate + addonRate) * qty.
      const { menuId, rate } = action.payload;
      const newRate = Math.max(0, Number(rate) || 0);
      return {
        ...state,
        draftItems: state.draftItems.map((i) => {
          if (!matchesDraftKey(i, menuId)) return i;
          const effRate = newRate + (Number(i.addon_rate) || 0);
          return { ...i, rate: newRate, ...calcDraftAmounts(effRate, i.quantity, i.tax_percentage) };
        }),
      };
    }

    case "SET_DRAFT_ITEM_ADDONS": {
      const { menuId, addons } = action.payload;
      const addonList = addons ?? [];
      const addonRate = r2(addonList.reduce((s, a) => s + (Number(a.rate) || 0), 0));
      return {
        ...state,
        draftItems: state.draftItems.map((i) => {
          if (!matchesDraftKey(i, menuId)) return i;
          const effRate = (Number(i.rate) || 0) + addonRate;
          return {
            ...i,
            addon_rate: addonRate,
            addons: addonList.map((a) => ({
              menu_id: a.menuId ?? a.menu_id,
              name:    a.name,
              rate:    a.rate,
            })),
            ...calcDraftAmounts(effRate, i.quantity, i.tax_percentage),
          };
        }),
      };
    }

    case "REMOVE_DRAFT_ITEM":
      return { ...state, draftItems: state.draftItems.filter((i) => !matchesDraftKey(i, action.payload)) };

    case "SET_DRAFT_CONFIG":
      return {
        ...state,
        ...(action.payload.orderType      !== undefined ? { draftOrderType:      action.payload.orderType }      : {}),
        ...(action.payload.covers         !== undefined ? { draftCovers:         action.payload.covers }         : {}),
        ...(action.payload.customerId     !== undefined ? { draftCustomerId:     action.payload.customerId }     : {}),
        ...(action.payload.customerName   !== undefined ? { draftCustomerName:   action.payload.customerName }   : {}),
        ...(action.payload.customerMobile !== undefined ? { draftCustomerMobile: action.payload.customerMobile } : {}),
        ...(action.payload.waiterId       !== undefined ? { draftWaiterId:       action.payload.waiterId }       : {}),
        ...(action.payload.waiterName     !== undefined ? { draftWaiterName:     action.payload.waiterName }     : {}),
      };

    case "CLEAR_SESSION":
      return { ...initialState };

    default:
      return state;
  }
}

export function BillingProvider({ children }) {
  const [state, dispatch] = useReducer(billingReducer, initialState);

  // sessionId=null means draft mode (no DB session yet).
  // opts: { draftCovers, draftCustomerName } — optional reservation pre-fill
  const setSession = useCallback(
    (sessionId, tableId, tableName, view, applicableRate, orderType, opts = {}) =>
      dispatch({ type: "SET_SESSION", payload: { sessionId, tableId, tableName, view, applicableRate, orderType, ...opts } }),
    [],
  );

  const setView = useCallback((view) =>
    dispatch({ type: "SET_VIEW", payload: view }),
  []);

  const selectMenuCategory = useCallback((id) =>
    dispatch({ type: "SELECT_MENU_CATEGORY", payload: id }),
  []);

  const selectMenuGroup = useCallback((id) =>
    dispatch({ type: "SELECT_MENU_GROUP", payload: id }),
  []);

  const addPaymentEntry = useCallback((entry) =>
    dispatch({ type: "ADD_PAYMENT_ENTRY", payload: entry }),
  []);

  const removePaymentEntry = useCallback((index) =>
    dispatch({ type: "REMOVE_PAYMENT_ENTRY", payload: index }),
  []);

  const setPaymentEntries = useCallback((entries) =>
    dispatch({ type: "SET_PAYMENT_ENTRIES", payload: entries }),
  []);

  const clearSession = useCallback(() =>
    dispatch({ type: "CLEAR_SESSION" }),
  []);

  const addDraftItem = useCallback((menuItem, rate, addons, isComplimentary = false) =>
    dispatch({ type: "ADD_DRAFT_ITEM", payload: { menuItem, rate, addons, isComplimentary } }),
  []);

  const updateDraftQty = useCallback((menuId, qty) =>
    dispatch({ type: "UPDATE_DRAFT_QTY", payload: { menuId, qty } }),
  []);

  const updateDraftItemRate = useCallback((menuId, rate) =>
    dispatch({ type: "UPDATE_DRAFT_ITEM_RATE", payload: { menuId, rate } }),
  []);

  const removeDraftItem = useCallback((menuId) =>
    dispatch({ type: "REMOVE_DRAFT_ITEM", payload: menuId }),
  []);

  const setDraftItemAddons = useCallback((menuId, addons) =>
    dispatch({ type: "SET_DRAFT_ITEM_ADDONS", payload: { menuId, addons } }),
  []);

  const setDraftItemKotMsg = useCallback((menuId, message) =>
    dispatch({ type: "SET_DRAFT_ITEM_KOT_MSG", payload: { menuId, message } }),
  []);

  const setPendingItemKotMsg = useCallback((orderItemId, message) =>
    dispatch({ type: "SET_PENDING_ITEM_KOT_MSG", payload: { orderItemId, message } }),
  []);

  const clearPendingItemKotMsgs = useCallback(() =>
    dispatch({ type: "CLEAR_PENDING_ITEM_KOT_MSGS" }),
  []);

  const setDraftConfig = useCallback((cfg) =>
    dispatch({ type: "SET_DRAFT_CONFIG", payload: cfg }),
  []);

  return (
    <BillingContext.Provider value={{
      ...state,
      setSession,
      setView,
      selectMenuCategory,
      selectMenuGroup,
      addPaymentEntry,
      removePaymentEntry,
      setPaymentEntries,
      clearSession,
      addDraftItem,
      updateDraftQty,
      updateDraftItemRate,
      removeDraftItem,
      setDraftItemAddons,
      setDraftItemKotMsg,
      setPendingItemKotMsg,
      clearPendingItemKotMsgs,
      setDraftConfig,
    }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBillingContext() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBillingContext must be used inside <BillingProvider>");
  return ctx;
}
