use crate::{acquire_pool, AppState};
use serde::{Deserialize, Serialize};
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — serialised to frontend
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TableForBilling {
    pub id:                       i32,
    pub code:                     i64,
    pub table_name:               String,
    pub table_group_id:           Option<i32>,
    pub table_group_name:         Option<String>,
    pub applicable_rate:          i32,
    pub is_tax_applicable:        String,
    pub current_status:           String,
    pub current_order_session_id: Option<i32>,
    pub occupied_since:           Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TaxDetailEntry {
    pub tax_name:       String,
    pub tax_percentage: f64,
}

/// An add-on available for a menu item (a menu_card row flagged is_addon, linked
/// via menu_item_addon). `rate` is the per-unit charge at applicable_rate 1.
#[derive(Debug, Serialize, Clone)]
pub struct AddonOption {
    pub menu_id:   i32,
    pub name:      String,
    pub rate_1:    f64,
    pub rate_2:    f64,
    pub rate_3:    f64,
    pub rate_4:    f64,
    pub rate_5:    f64,
}

/// A chosen add-on attached to an order line (one order_item_modifier row).
#[derive(Debug, Serialize, Clone)]
pub struct OrderItemAddon {
    pub id:         i32,
    pub menu_id:    Option<i32>,
    pub name:       String,
    pub rate:       f64,
}

/// Payload for a chosen add-on when adding an order item.
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AddonInput {
    pub menu_id: i32,
    pub rate:    f64,
}

#[derive(Debug, Serialize)]
pub struct MenuItemForBilling {
    pub id:                   i32,
    pub code:                 i64,
    pub item_name:            String,
    pub menu_alias:           Option<String>,
    pub group_id:             i32,
    pub group_name:           Option<String>,
    pub category_id:          Option<i32>,
    pub category_name:        Option<String>,
    pub food_type:            Option<String>,
    pub food_type_id:         i32,
    pub kitchen_section_id:   Option<i32>,
    pub is_liquor:            bool,
    // True when the item's menu group has "As Per Size" enabled — the cashier
    // may override the per-unit rate while the line is still editable.
    pub as_per_size:          bool,
    pub rate_1:               f64,
    pub rate_2:               f64,
    pub rate_3:               f64,
    pub rate_4:               f64,
    pub rate_5:               f64,
    pub tax_name:             Option<String>,
    pub tax_percentage:       f64,
    pub tax_details:          Vec<TaxDetailEntry>,
    pub allow_discount:        bool,
    pub max_discount_percent:  f64,
    pub auto_discount_percent: f64,
    pub is_addon:              bool,
    pub addons:                Vec<AddonOption>,
}

#[derive(Debug, Serialize)]
pub struct OrderSessionRow {
    pub id:             i32,
    pub code:           i64,
    pub order_no:       Option<String>,
    pub table_id:       Option<i32>,
    pub table_name:     Option<String>,
    pub order_type:     Option<String>,
    pub session_status: String,
    pub customer_id:    Option<i32>,
    pub customer_name:  Option<String>,
    pub covers:         i32,
    pub opened_at:      Option<String>,
    pub applicable_rate: i32,
}

#[derive(Debug, Serialize)]
pub struct OrderItemRow {
    pub id:                   i32,
    pub code:                 i64,
    pub order_session_id:     i32,
    pub menu_id:              Option<i32>,
    pub item_name:            String,
    pub quantity:             f64,
    pub rate:                 f64,
    pub gross_amount:         f64,
    pub discount_percent:     f64,
    pub discount_amount:      f64,
    pub tax_name:             Option<String>,
    pub tax_percentage:       f64,
    pub tax_amount:           f64,
    pub taxable_amount:       f64,
    pub final_amount:         f64,
    pub food_type:            Option<String>,
    pub food_type_id:         Option<i32>,
    pub kitchen_section_id:   Option<i32>,
    pub is_liquor:            bool,
    pub category_id:          Option<i32>,
    pub category_name:        Option<String>,
    pub allow_discount:       bool,
    pub max_discount_percent: f64,
    pub auto_discount_percent: f64,
    pub kot_status:           String,
    pub item_status:          String,
    pub special_instruction:  Option<String>,
    pub kot_messages:         Option<String>,
    pub ordered_at:           Option<String>,
    pub kot_id:               Option<i32>,
    pub kot_no:               Option<String>,
    pub kot_created_at:       Option<String>,
    pub addon_rate:           f64,
    pub addons:               Vec<OrderItemAddon>,
    pub is_complimentary:     bool,
}

#[derive(Debug, Serialize)]
pub struct KotRow {
    pub id:                 i32,
    pub code:               i64,
    pub kot_no:             Option<String>,
    pub order_session_id:   i32,
    pub kitchen_section_id: Option<i32>,
    pub waiter_name:        Option<String>,
    pub kot_status:         String,
    pub is_printed:         bool,
    pub created_at:         Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BillSummary {
    pub session_id:      i32,
    pub order_type:      Option<String>,
    pub table_name:      Option<String>,
    pub session_status:  String,
    pub bill_no:         Option<String>,
    pub bill_id:         Option<i32>,
    pub bill_status:     Option<String>,
    pub item_count:      i64,
    pub gross_amount:    f64,
    pub discount_amount: f64,
    pub taxable_amount:  f64,
    pub tax_amount:      f64,
    pub round_off:       f64,
    pub net_amount:      f64,
    pub paid_amount:     f64,
    pub due_amount:      f64,
    pub tax_breakdown:   Vec<TaxBreakdownRow>,
}

#[derive(Debug, Serialize)]
pub struct TaxBreakdownRow {
    pub tax_name:       String,
    pub tax_percentage: f64,
    pub taxable_amount: f64,
    pub tax_amount:     f64,
}

#[derive(Debug, Serialize)]
pub struct FloorTableRow {
    pub id:                       i32,
    pub code:                     i64,
    pub table_name:               String,
    pub table_group_id:           Option<i32>,
    pub table_group_name:         Option<String>,
    pub applicable_rate:          i32,
    pub current_status:           String,
    pub current_order_session_id: Option<i32>,
    pub occupied_since:           Option<String>,
    // Session overlay (null when table is AVAILABLE)
    pub session_id:               Option<i32>,
    pub order_type:               Option<String>,
    pub session_status:           Option<String>,
    pub covers:                   Option<i32>,
    pub waiter_name:              Option<String>,
    pub session_customer:         Option<String>,
    // Running total from active order items
    pub running_total:            f64,
    pub bill_status:              Option<String>,
    // Reservation overlay (null when no active reservation today)
    pub reservation_id:               Option<i32>,
    pub reservation_no:               Option<String>,
    pub reservation_time:             Option<String>,
    pub reservation_customer:         Option<String>,
    pub reservation_guest_count:      Option<i32>,
    pub reservation_status:           Option<String>,
    pub reservation_preferred_waiter: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct SessionDetail {
    pub id:               i32,
    pub code:             i64,
    pub order_no:         Option<String>,
    pub table_id:         Option<i32>,
    pub table_name:       Option<String>,
    pub table_group_name: Option<String>,
    pub order_type:       Option<String>,
    pub session_status:   String,
    pub covers:           i32,
    pub opened_at:        Option<String>,
    pub bill_printed_at:  Option<String>,
    pub applicable_rate:  i32,
    pub waiter_id:        Option<i32>,
    pub waiter_name:      Option<String>,
    pub customer_id:      Option<i32>,
    pub customer_name:    Option<String>,
    pub customer_mobile:  Option<String>,
    pub customer_address: Option<String>,
    pub is_home_delivery: bool,
    pub is_takeaway_enabled: bool,
    pub running_total:    f64,
    pub item_count:       i64,
    pub pending_kot:      i64,
    pub bill_id:          Option<i32>,
    pub bill_no:          Option<String>,
    pub bill_status:      Option<String>,
    pub net_amount:       f64,
}

// ─── Deserialised from frontend ───────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PartPaymentInput {
    pub payment_mode: String,
    pub amount:       f64,
    pub reference_no: Option<String>,
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

fn round2(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

// ─────────────────────────────────────────────────────────────
// Tauri commands
// ─────────────────────────────────────────────────────────────

// ── Lookup ────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_tables_for_billing(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TableForBilling>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT rt.id, rt.code, rt.table_name,
                rt.table_group_id, tg.name AS table_group_name,
                COALESCE(rt.applicable_rate, tg.applicable_rate, 1) AS applicable_rate,
                COALESCE(rt.is_tax_applicable, tg.is_tax_applicable, 'N') AS is_tax_applicable,
                COALESCE(rt.current_status, 'AVAILABLE') AS current_status,
                rt.current_order_session_id,
                rt.occupied_since
         FROM   restaurant_table rt
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id
         WHERE  rt.is_active = TRUE
         ORDER  BY tg.name NULLS LAST, rt.table_name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load tables: {e}"))?;

    Ok(rows.iter().map(|r| TableForBilling {
        id:                       r.try_get("id").unwrap_or(0),
        code:                     r.try_get("code").unwrap_or(0),
        table_name:               r.try_get("table_name").unwrap_or_default(),
        table_group_id:           r.try_get("table_group_id").ok().flatten(),
        table_group_name:         r.try_get("table_group_name").ok().flatten(),
        applicable_rate:          r.try_get("applicable_rate").unwrap_or(1),
        is_tax_applicable:        r.try_get("is_tax_applicable").unwrap_or_else(|_| "N".to_string()),
        current_status:           r.try_get("current_status").unwrap_or_else(|_| "AVAILABLE".to_string()),
        current_order_session_id: r.try_get("current_order_session_id").ok().flatten(),
        occupied_since:           r.try_get::<Option<chrono::NaiveDateTime>, _>("occupied_since")
                                   .ok().flatten()
                                   .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
    }).collect())
}

// ─── Last settled bill (for the billing footer recap) ─────────

#[derive(Debug, Serialize)]
pub struct LastSettledBill {
    pub bill_no:     Option<String>,
    pub table_name:  Option<String>,
    pub net_amount:  f64,
    pub settled_at:  Option<String>,
}

/// Most recently settled bill, used to show a quick recap under the billing
/// action bar. Returns None when nothing has been settled yet.
#[tauri::command]
pub async fn get_last_settled_bill(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Option<LastSettledBill>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT bm.bill_no, rt.table_name, bm.net_amount::float8 AS net_amount, bm.settled_at
         FROM   bill_master bm
         LEFT JOIN restaurant_table rt ON rt.id = bm.table_id
         WHERE  bm.settled_at IS NOT NULL
         ORDER  BY bm.settled_at DESC, bm.id DESC
         LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to load last settled bill: {e}"))?;

    Ok(row.map(|r| LastSettledBill {
        bill_no:    r.try_get("bill_no").ok().flatten(),
        table_name: r.try_get("table_name").ok().flatten(),
        net_amount: r.try_get::<f64, _>("net_amount").unwrap_or(0.0),
        settled_at: r.try_get::<Option<chrono::NaiveDateTime>, _>("settled_at")
                     .ok().flatten()
                     .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
    }))
}

// ─── Last KOT (for the floor-view recap) ──────────────────────

#[derive(Debug, Serialize)]
pub struct LastKot {
    pub kot_no:      Option<String>,
    pub table_name:  Option<String>,
    pub order_no:    Option<String>,
    pub created_at:  Option<String>,
}

/// Most recently generated KOT, used for a quick recap on the floor view.
/// Returns None when no KOT has been generated yet.
#[tauri::command]
pub async fn get_last_kot(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Option<LastKot>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT km.kot_no, rt.table_name, os.order_no, km.created_at
         FROM   kot_master km
         LEFT JOIN restaurant_table rt ON rt.id = km.table_id
         LEFT JOIN order_session os    ON os.id = km.order_session_id
         ORDER  BY km.created_at DESC, km.id DESC
         LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to load last KOT: {e}"))?;

    Ok(row.map(|r| LastKot {
        kot_no:     r.try_get("kot_no").ok().flatten(),
        table_name: r.try_get("table_name").ok().flatten(),
        order_no:   r.try_get("order_no").ok().flatten(),
        created_at: r.try_get::<Option<chrono::NaiveDateTime>, _>("created_at")
                     .ok().flatten()
                     .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
    }))
}

#[tauri::command]
pub async fn get_menu_for_billing(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuItemForBilling>, String> {
    use std::collections::HashMap;
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT mc.id, mc.code, mc.name AS item_name, mc.menu_alias,
                mc.menu_group_id AS group_id, mg.name AS group_name,
                mg.category_id, cat.name AS category_name,
                cat.allow_discount,
                COALESCE(cat.max_discount_percent,  0)::float8 AS max_discount_percent,
                COALESCE(cat.auto_discount_percent, 0)::float8 AS auto_discount_percent,
                mc.food_type_id, ft.name AS food_type,
                mc.kitchen_section_id,
                (mc.liquor_group_id IS NOT NULL) AS is_liquor,
                (mg.as_per_size = 'Y') AS as_per_size,
                mc.is_addon,
                mc.rate_1::float8, mc.rate_2::float8,
                mc.rate_3::float8, mc.rate_4::float8, mc.rate_5::float8,
                COALESCE(tax_info.tax_name, '')         AS tax_name,
                COALESCE(tax_info.tax_percentage, 0)::float8 AS tax_percentage
         FROM   menu_card mc
         JOIN   menu_group mg  ON mg.id  = mc.menu_group_id
         JOIN   menu_category cat ON cat.id = mg.category_id
         LEFT JOIN food_type ft ON ft.id = mc.food_type_id
         LEFT JOIN LATERAL (
             SELECT
                 SUM(mctd.tax_percentage)                         AS tax_percentage,
                 STRING_AGG(tm.name, ' + ' ORDER BY mctd.id)     AS tax_name
             FROM   menu_category_tax_detail mctd
             LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
             WHERE  mctd.category_id = cat.id
         ) tax_info ON true
         WHERE  mc.is_active = TRUE AND mc.is_addon = FALSE
         ORDER  BY cat.name, mg.name, mc.name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load menu: {e}"))?;

    // Build per-item add-on options: for each parent menu_card_id, the list of
    // add-on menu items (with their rates) it offers via menu_item_addon.
    let addon_rows = sqlx::query(
        "SELECT mia.menu_card_id, ac.id AS addon_id, ac.name AS addon_name,
                ac.rate_1::float8, ac.rate_2::float8,
                ac.rate_3::float8, ac.rate_4::float8, ac.rate_5::float8
         FROM   menu_item_addon mia
         JOIN   menu_card ac ON ac.id = mia.addon_card_id
         WHERE  mia.is_active = 1 AND ac.is_active = TRUE
         ORDER  BY mia.menu_card_id, ac.name",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut addon_map: HashMap<i32, Vec<AddonOption>> = HashMap::new();
    for ar in &addon_rows {
        let parent_id: i32 = ar.try_get("menu_card_id").unwrap_or(0);
        addon_map.entry(parent_id).or_default().push(AddonOption {
            menu_id: ar.try_get("addon_id").unwrap_or(0),
            name:    ar.try_get("addon_name").unwrap_or_default(),
            rate_1:  ar.try_get::<f64, _>("rate_1").unwrap_or(0.0),
            rate_2:  ar.try_get::<f64, _>("rate_2").unwrap_or(0.0),
            rate_3:  ar.try_get::<f64, _>("rate_3").unwrap_or(0.0),
            rate_4:  ar.try_get::<f64, _>("rate_4").unwrap_or(0.0),
            rate_5:  ar.try_get::<f64, _>("rate_5").unwrap_or(0.0),
        });
    }

    // Fetch individual tax rows for every category, keyed by category_id
    let cat_tax_rows = sqlx::query(
        "SELECT mctd.category_id, tm.name AS tax_name, mctd.tax_percentage::float8
         FROM   menu_category_tax_detail mctd
         LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
         ORDER  BY mctd.category_id, mctd.id",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut cat_tax_map: HashMap<i32, Vec<TaxDetailEntry>> = HashMap::new();
    for tr in &cat_tax_rows {
        let cat_id: i32 = tr.try_get("category_id").unwrap_or(0);
        let name: String = tr.try_get("tax_name").unwrap_or_default();
        let pct: f64 = tr.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);
        cat_tax_map.entry(cat_id).or_default().push(TaxDetailEntry { tax_name: name, tax_percentage: pct });
    }

    Ok(rows.iter().map(|r| {
        let tax_name_raw: String = r.try_get("tax_name").unwrap_or_default();
        let cat_id: i32 = r.try_get("category_id").unwrap_or(0);
        let tax_details = cat_tax_map.get(&cat_id).cloned().unwrap_or_default();
        MenuItemForBilling {
            id:                   r.try_get("id").unwrap_or(0),
            code:                 r.try_get("code").unwrap_or(0),
            item_name:            r.try_get("item_name").unwrap_or_default(),
            menu_alias:           r.try_get("menu_alias").ok().flatten(),
            group_id:             r.try_get("group_id").unwrap_or(0),
            group_name:           r.try_get("group_name").ok().flatten(),
            category_id:          r.try_get("category_id").ok().flatten(),
            category_name:        r.try_get("category_name").ok().flatten(),
            food_type:            r.try_get("food_type").ok().flatten(),
            food_type_id:         r.try_get("food_type_id").unwrap_or(0),
            kitchen_section_id:   r.try_get("kitchen_section_id").ok().flatten(),
            is_liquor:            r.try_get("is_liquor").unwrap_or(false),
            as_per_size:          r.try_get("as_per_size").unwrap_or(false),
            rate_1:               r.try_get::<f64, _>("rate_1").unwrap_or(0.0),
            rate_2:               r.try_get::<f64, _>("rate_2").unwrap_or(0.0),
            rate_3:               r.try_get::<f64, _>("rate_3").unwrap_or(0.0),
            rate_4:               r.try_get::<f64, _>("rate_4").unwrap_or(0.0),
            rate_5:               r.try_get::<f64, _>("rate_5").unwrap_or(0.0),
            tax_name:             if tax_name_raw.is_empty() { None } else { Some(tax_name_raw) },
            tax_percentage:       r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
            tax_details,
            allow_discount:        r.try_get("allow_discount").unwrap_or(false),
            max_discount_percent:  r.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
            auto_discount_percent: r.try_get::<f64, _>("auto_discount_percent").unwrap_or(0.0),
            is_addon:              r.try_get("is_addon").unwrap_or(false),
            addons:                addon_map.get(&r.try_get::<i32, _>("id").unwrap_or(0)).cloned().unwrap_or_default(),
        }
    }).collect())
}

#[tauri::command]
pub async fn get_active_sessions(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<OrderSessionRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT os.id, os.code, os.order_no, os.table_id,
                rt.table_name, os.order_type, os.session_status,
                os.customer_id, os.customer_name, os.covers, os.opened_at,
                COALESCE(rt.applicable_rate, 1) AS applicable_rate
         FROM   order_session os
         LEFT JOIN restaurant_table rt ON rt.id = os.table_id
         WHERE  os.session_status IN ('OPEN', 'KOT_SENT')
           AND  os.is_active = 1
         ORDER  BY os.opened_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load active sessions: {e}"))?;

    Ok(rows.iter().map(|r| OrderSessionRow {
        id:             r.try_get("id").unwrap_or(0),
        code:           r.try_get("code").unwrap_or(0),
        order_no:       r.try_get("order_no").ok().flatten(),
        table_id:       r.try_get("table_id").ok().flatten(),
        table_name:     r.try_get("table_name").ok().flatten(),
        order_type:     r.try_get("order_type").ok().flatten(),
        session_status: r.try_get("session_status").unwrap_or_else(|_| "OPEN".to_string()),
        customer_id:    r.try_get("customer_id").ok().flatten(),
        customer_name:  r.try_get("customer_name").ok().flatten(),
        covers:         r.try_get("covers").unwrap_or(1),
        opened_at:      r.try_get::<Option<chrono::NaiveDateTime>, _>("opened_at")
                         .ok().flatten()
                         .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        applicable_rate: r.try_get("applicable_rate").unwrap_or(1),
    }).collect())
}

// ── Floor view ───────────────────────────────────────────────

#[tauri::command]
pub async fn get_floor_view(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FloorTableRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT rt.id, rt.code, rt.table_name,
                rt.table_group_id, tg.name AS table_group_name,
                COALESCE(rt.applicable_rate, tg.applicable_rate, 1) AS applicable_rate,
                COALESCE(rt.current_status, 'AVAILABLE') AS current_status,
                rt.current_order_session_id,
                (SELECT MIN(km.created_at)
                 FROM   kot_master km
                 WHERE  km.order_session_id = os.id) AS occupied_since,
                os.id         AS session_id,
                os.order_type,
                os.session_status,
                os.covers,
                ei.name       AS waiter_name,
                os.customer_name AS session_customer,
                COALESCE((
                  SELECT SUM(oi.final_amount)
                  FROM   order_item oi
                  WHERE  oi.order_session_id = os.id
                    AND  oi.item_status = 'ACTIVE'
                ), 0)::float8 AS running_total,
                bm.bill_status,
                res.reservation_id,
                res.reservation_no,
                res.reservation_time,
                res.reservation_customer,
                res.reservation_guest_count,
                res.reservation_status,
                res.reservation_preferred_waiter
         FROM   restaurant_table rt
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id
         LEFT JOIN order_session os
               ON os.id = rt.current_order_session_id
              AND os.session_status IN ('OPEN', 'KOT_SENT', 'BILL_PRINTED')
         LEFT JOIN employee_information ei ON ei.id = os.waiter_id
         LEFT JOIN bill_master bm
               ON bm.order_session_id = os.id
              AND bm.bill_status NOT IN ('PAID', 'CANCELLED')
              AND bm.id = (
                    SELECT MAX(b2.id)
                    FROM   bill_master b2
                    WHERE  b2.order_session_id = os.id
                      AND  b2.bill_status NOT IN ('PAID', 'CANCELLED')
                  )
         LEFT JOIN LATERAL (
               SELECT rm.id                     AS reservation_id,
                      rm.reservation_no,
                      rm.reservation_time::text  AS reservation_time,
                      rm.customer_name           AS reservation_customer,
                      rm.guest_count             AS reservation_guest_count,
                      rm.reservation_status,
                      rm.preferred_waiter_id     AS reservation_preferred_waiter
               FROM   reservation_master rm
               WHERE  rm.table_id           = rt.id
                 AND  rm.reservation_date   = CURRENT_DATE
                 AND  rm.reservation_status IN ('RESERVED', 'ARRIVED')
                 AND  rm.is_active          = 1
               ORDER  BY rm.reservation_time
               LIMIT  1
         ) res ON TRUE
         WHERE  rt.is_active = TRUE
         ORDER  BY tg.name NULLS LAST, rt.code, rt.table_name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load floor view: {e}"))?;

    Ok(rows.iter().map(|r| FloorTableRow {
        id:                       r.try_get("id").unwrap_or(0),
        code:                     r.try_get("code").unwrap_or(0),
        table_name:               r.try_get("table_name").unwrap_or_default(),
        table_group_id:           r.try_get("table_group_id").ok().flatten(),
        table_group_name:         r.try_get("table_group_name").ok().flatten(),
        applicable_rate:          r.try_get("applicable_rate").unwrap_or(1),
        current_status:           r.try_get("current_status").unwrap_or_else(|_| "AVAILABLE".to_string()),
        current_order_session_id: r.try_get("current_order_session_id").ok().flatten(),
        occupied_since:           r.try_get::<Option<chrono::NaiveDateTime>, _>("occupied_since")
                                   .ok().flatten()
                                   .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        session_id:               r.try_get("session_id").ok().flatten(),
        order_type:               r.try_get("order_type").ok().flatten(),
        session_status:           r.try_get("session_status").ok().flatten(),
        covers:                   r.try_get::<Option<i32>, _>("covers").ok().flatten(),
        waiter_name:              r.try_get("waiter_name").ok().flatten(),
        session_customer:         r.try_get("session_customer").ok().flatten(),
        running_total:            r.try_get::<f64, _>("running_total").unwrap_or(0.0),
        bill_status:              r.try_get("bill_status").ok().flatten(),
        reservation_id:               r.try_get("reservation_id").ok().flatten(),
        reservation_no:               r.try_get("reservation_no").ok().flatten(),
        reservation_time:             r.try_get("reservation_time").ok().flatten(),
        reservation_customer:         r.try_get("reservation_customer").ok().flatten(),
        reservation_guest_count:      r.try_get("reservation_guest_count").ok().flatten(),
        reservation_status:           r.try_get("reservation_status").ok().flatten(),
        reservation_preferred_waiter: r.try_get("reservation_preferred_waiter").ok().flatten(),
    }).collect())
}

// ── Session lifecycle ─────────────────────────────────────────

#[tauri::command]
pub async fn open_order_session(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    table_id:       Option<i32>,
    order_type:     String,
    covers:         i32,
    customer_id:    Option<i32>,
    waiter_id:      Option<i32>,
    reservation_id: Option<i32>,
    customer_name:  Option<String>,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Resolve table_group_id once — needed in INSERT + used after commit
    let table_group_id: Option<i32> = if let Some(tid) = table_id {
        sqlx::query_scalar(
            "SELECT table_group_id FROM restaurant_table WHERE id = $1",
        )
        .bind(tid)
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .flatten()
    } else {
        None
    };

    // Duplicate guard — reject before touching any state
    if let Some(tid) = table_id {
        let existing: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM order_session
             WHERE  table_id = $1
               AND  session_status IN ('OPEN', 'KOT_SENT', 'BILL_PRINTED')
               AND  is_active = 1",
        )
        .bind(tid)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Duplicate-session check failed: {e}"))?;

        if existing > 0 {
            return Err(
                "Table already has an active session. Resume it from the floor view.".into(),
            );
        }
    }

    // Atomic: session insert + order_no/token_no + table status
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Transaction start failed: {e}"))?;

    let session_id: i32 = sqlx::query_scalar(
        "INSERT INTO order_session
            (order_type, table_id, table_group_id, covers, customer_id, customer_name, waiter_id, reservation_id, session_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
         RETURNING id",
    )
    .bind(&order_type)
    .bind(table_id)
    .bind(table_group_id)
    .bind(covers)
    .bind(customer_id)
    .bind(&customer_name)
    .bind(waiter_id)
    .bind(reservation_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create session: {e}"))?;

    // order_no and token_no share the same value
    let order_no = format!("ORD-{}", session_id);
    sqlx::query(
        "UPDATE order_session SET order_no = $1, token_no = $1 WHERE id = $2",
    )
    .bind(&order_no)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to assign order number: {e}"))?;

    if let Some(tid) = table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'OCCUPIED',
                    current_order_session_id = $1,
                    occupied_since = NOW()
             WHERE  id = $2",
        )
        .bind(session_id)
        .bind(tid)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to mark table occupied: {e}"))?;
    }

    // Link reservation → session: record session id on the reservation and
    // ensure status is ARRIVED (idempotent — stays ARRIVED if already set).
    if let Some(res_id) = reservation_id {
        sqlx::query(
            "UPDATE reservation_master
             SET    order_session_id  = $1,
                    reservation_status = CASE
                        WHEN reservation_status = 'RESERVED' THEN 'ARRIVED'
                        ELSE reservation_status
                    END
             WHERE  id = $2 AND is_active = 1",
        )
        .bind(session_id)
        .bind(res_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to link reservation to session: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Transaction commit failed: {e}"))?;

    // Audit outside the transaction — non-critical
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'SESSION_OPENED', 'Order session started')",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    Ok(session_id)
}

#[tauri::command]
pub async fn get_order_session(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<OrderSessionRow, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT os.id, os.code, os.order_no, os.table_id,
                rt.table_name, os.order_type, os.session_status,
                os.customer_id, os.customer_name, os.covers, os.opened_at,
                COALESCE(rt.applicable_rate, 1) AS applicable_rate
         FROM   order_session os
         LEFT JOIN restaurant_table rt ON rt.id = os.table_id
         WHERE  os.id = $1",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Session not found: {e}"))?;

    Ok(OrderSessionRow {
        id:             row.try_get("id").unwrap_or(0),
        code:           row.try_get("code").unwrap_or(0),
        order_no:       row.try_get("order_no").ok().flatten(),
        table_id:       row.try_get("table_id").ok().flatten(),
        table_name:     row.try_get("table_name").ok().flatten(),
        order_type:     row.try_get("order_type").ok().flatten(),
        session_status: row.try_get("session_status").unwrap_or_else(|_| "OPEN".to_string()),
        customer_id:    row.try_get("customer_id").ok().flatten(),
        customer_name:  row.try_get("customer_name").ok().flatten(),
        covers:         row.try_get("covers").unwrap_or(1),
        opened_at:      row.try_get::<Option<chrono::NaiveDateTime>, _>("opened_at")
                          .ok().flatten()
                          .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        applicable_rate: row.try_get("applicable_rate").unwrap_or(1),
    })
}

#[tauri::command]
pub async fn cancel_order_session(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
    remarks:    Option<String>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Resolve table_id before entering the transaction
    let table_id: Option<i32> = sqlx::query_scalar(
        "SELECT table_id FROM order_session WHERE id = $1 AND is_active = 1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Session not found: {e}"))?
    .flatten();

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Transaction start failed: {e}"))?;

    // Void all active order items atomically
    sqlx::query(
        "UPDATE order_item
         SET    item_status = 'CANCELLED', cancelled_at = NOW()
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to void items: {e}"))?;

    // Close session — compute occupancy at the same time
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'CANCELLED',
                settled_at = NOW(),
                updated_at = NOW(),
                total_occupancy_minutes = GREATEST(
                    0,
                    FLOOR(EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60)::integer
                )
         WHERE  id = $1",
    )
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to cancel session: {e}"))?;

    // Release the table
    if let Some(tid) = table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'AVAILABLE',
                    current_order_session_id = NULL,
                    occupied_since = NULL
             WHERE  id = $1",
        )
        .bind(tid)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to release table: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Transaction commit failed: {e}"))?;

    // table_session_history — records the full occupancy span
    if let Some(tid) = table_id {
        sqlx::query(
            "INSERT INTO table_session_history
                (table_id, order_session_id, opened_at, closed_at, total_minutes)
             SELECT $2, $1, os.opened_at, NOW(),
                    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - os.opened_at)) / 60)::integer)
             FROM   order_session os
             WHERE  os.id = $1",
        )
        .bind(session_id)
        .bind(tid)
        .execute(&pool)
        .await
        .ok();
    }

    // Audit
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'ORDER_CANCELLED', $2)",
    )
    .bind(session_id)
    .bind(remarks.as_deref().unwrap_or("Cancelled by user"))
    .execute(&pool)
    .await
    .ok();

    Ok(())
}

// ── Session detail + update ────────────────────────────────────

#[tauri::command]
pub async fn get_session_detail(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<SessionDetail, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT os.id, os.code, os.order_no,
                os.table_id, rt.table_name, tg.name AS table_group_name,
                os.order_type, os.session_status, os.covers,
                os.opened_at, os.bill_printed_at,
                COALESCE(rt.applicable_rate, tg.applicable_rate, 1) AS applicable_rate,
                os.waiter_id, ei.name AS waiter_name,
                os.customer_id,
                COALESCE(ci.customer_name, os.customer_name) AS customer_name,
                COALESCE(ci.mobile_no1,    os.customer_mobile) AS customer_mobile,
                os.delivery_address,
                (COALESCE(tg.is_home_delivery, 'N')    = 'Y') AS is_home_delivery,
                (COALESCE(tg.is_takeaway_enabled, 'N') = 'Y') AS is_takeaway_enabled,
                COALESCE((
                  SELECT SUM(oi.final_amount)
                  FROM   order_item oi
                  WHERE  oi.order_session_id = os.id
                    AND  oi.item_status = 'ACTIVE'
                ), 0)::float8 AS running_total,
                (SELECT COUNT(*) FROM order_item oi
                 WHERE  oi.order_session_id = os.id AND oi.item_status = 'ACTIVE')::bigint AS item_count,
                (SELECT COUNT(*) FROM order_item oi
                 WHERE  oi.order_session_id = os.id
                   AND  oi.item_status = 'ACTIVE'
                   AND  oi.kot_status   = 'PENDING')::bigint AS pending_kot,
                bm.id         AS bill_id,
                bm.bill_no,
                bm.bill_status,
                COALESCE(bm.net_amount, 0)::float8 AS net_amount
         FROM   order_session os
         LEFT JOIN restaurant_table rt     ON rt.id  = os.table_id
         LEFT JOIN table_group tg          ON tg.id  = rt.table_group_id
         LEFT JOIN employee_information ei ON ei.id  = os.waiter_id
         LEFT JOIN customer_information ci ON ci.id  = os.customer_id
         LEFT JOIN bill_master bm
               ON bm.order_session_id = os.id
              AND bm.bill_status NOT IN ('PAID', 'CANCELLED')
              AND bm.id = (
                    SELECT MAX(b2.id) FROM bill_master b2
                    WHERE  b2.order_session_id = os.id
                      AND  b2.bill_status NOT IN ('PAID', 'CANCELLED')
                  )
         WHERE  os.id = $1",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Session not found: {e}"))?;

    Ok(SessionDetail {
        id:               row.try_get("id").unwrap_or(0),
        code:             row.try_get("code").unwrap_or(0),
        order_no:         row.try_get("order_no").ok().flatten(),
        table_id:         row.try_get("table_id").ok().flatten(),
        table_name:       row.try_get("table_name").ok().flatten(),
        table_group_name: row.try_get("table_group_name").ok().flatten(),
        order_type:       row.try_get("order_type").ok().flatten(),
        session_status:   row.try_get("session_status").unwrap_or_else(|_| "OPEN".to_string()),
        covers:           row.try_get("covers").unwrap_or(1),
        opened_at:        row.try_get::<Option<chrono::NaiveDateTime>, _>("opened_at")
                             .ok().flatten()
                             .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        bill_printed_at:  row.try_get::<Option<chrono::NaiveDateTime>, _>("bill_printed_at")
                             .ok().flatten()
                             .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        applicable_rate:  row.try_get("applicable_rate").unwrap_or(1),
        waiter_id:        row.try_get("waiter_id").ok().flatten(),
        waiter_name:      row.try_get("waiter_name").ok().flatten(),
        customer_id:      row.try_get("customer_id").ok().flatten(),
        customer_name:    row.try_get("customer_name").ok().flatten(),
        customer_mobile:  row.try_get("customer_mobile").ok().flatten(),
        customer_address: row.try_get("customer_address").ok().flatten(),
        is_home_delivery: row.try_get("is_home_delivery").unwrap_or(false),
        is_takeaway_enabled: row.try_get("is_takeaway_enabled").unwrap_or(false),
        running_total:    row.try_get::<f64, _>("running_total").unwrap_or(0.0),
        item_count:       row.try_get("item_count").unwrap_or(0),
        pending_kot:      row.try_get("pending_kot").unwrap_or(0),
        bill_id:          row.try_get("bill_id").ok().flatten(),
        bill_no:          row.try_get("bill_no").ok().flatten(),
        bill_status:      row.try_get("bill_status").ok().flatten(),
        net_amount:       row.try_get::<f64, _>("net_amount").unwrap_or(0.0),
    })
}

#[tauri::command]
pub async fn update_session_info(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    session_id:    i32,
    order_type:    String,
    covers:        i32,
    customer_name: Option<String>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let affected = sqlx::query(
        "UPDATE order_session
         SET    order_type    = $2,
                covers        = $3,
                customer_name = $4,
                updated_at    = NOW()
         WHERE  id = $1
           AND  session_status IN ('OPEN', 'KOT_SENT')",
    )
    .bind(session_id)
    .bind(&order_type)
    .bind(covers)
    .bind(customer_name.as_deref())
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update session: {e}"))?
    .rows_affected();

    if affected == 0 {
        return Err("Session not found or is already closed.".into());
    }

    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'SESSION_UPDATED', 'Session info updated')",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    Ok(())
}

// ── Order items ───────────────────────────────────────────────

#[tauri::command]
pub async fn get_order_items(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<Vec<OrderItemRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT oi.id, oi.code, oi.order_session_id, oi.menu_id,
                oi.item_name, oi.quantity::float8, oi.rate::float8,
                oi.gross_amount::float8, oi.discount_percent::float8, oi.discount_amount::float8,
                oi.tax_name, oi.tax_percentage::float8, oi.tax_amount::float8,
                oi.taxable_amount::float8, oi.final_amount::float8,
                oi.food_type_id, ft.name AS food_type,
                oi.kitchen_section_id,
                (mc.liquor_group_id IS NOT NULL) AS is_liquor,
                mg.category_id,
                cat.name AS category_name,
                COALESCE(cat.allow_discount, FALSE) AS allow_discount,
                COALESCE(cat.max_discount_percent, 0)::float8 AS max_discount_percent,
                COALESCE(cat.auto_discount_percent, 0)::float8 AS auto_discount_percent,
                oi.kot_status, oi.item_status,
                oi.special_instruction,
                COALESCE(oi.addon_rate, 0)::float8 AS addon_rate,
                COALESCE(oi.is_complimentary, FALSE) AS is_complimentary,
                (SELECT string_agg(oim.modifier_name, ', ' ORDER BY oim.id)
                 FROM   order_item_modifier oim
                 WHERE  oim.order_item_id = oi.id AND oim.is_active = 1
                   AND  oim.menu_card_id IS NULL) AS kot_messages,
                oi.ordered_at,
                oi.kot_id,
                km.kot_no,
                km.created_at AS kot_created_at
         FROM   order_item oi
         LEFT JOIN food_type ft   ON ft.id  = oi.food_type_id
         LEFT JOIN menu_card mc   ON mc.id  = oi.menu_id
         LEFT JOIN menu_group mg  ON mg.id  = mc.menu_group_id
         LEFT JOIN menu_category cat ON cat.id = mg.category_id
         LEFT JOIN kot_master km  ON km.id  = oi.kot_id
         WHERE  oi.order_session_id = $1
         ORDER  BY oi.ordered_at, oi.id",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load order items: {e}"))?;

    // Fetch priced add-on modifiers for this session's items, keyed by order_item_id.
    use std::collections::HashMap;
    let addon_rows = sqlx::query(
        "SELECT oim.id, oim.order_item_id, oim.menu_card_id,
                oim.modifier_name, oim.modifier_rate::float8 AS modifier_rate
         FROM   order_item_modifier oim
         JOIN   order_item oi ON oi.id = oim.order_item_id
         WHERE  oi.order_session_id = $1 AND oim.is_active = 1
           AND  oim.menu_card_id IS NOT NULL
         ORDER  BY oim.order_item_id, oim.id",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let mut addons_by_item: HashMap<i32, Vec<OrderItemAddon>> = HashMap::new();
    for ar in &addon_rows {
        let oi_id: i32 = ar.try_get("order_item_id").unwrap_or(0);
        addons_by_item.entry(oi_id).or_default().push(OrderItemAddon {
            id:      ar.try_get("id").unwrap_or(0),
            menu_id: ar.try_get("menu_card_id").ok().flatten(),
            name:    ar.try_get("modifier_name").unwrap_or_default(),
            rate:    ar.try_get::<f64, _>("modifier_rate").unwrap_or(0.0),
        });
    }

    Ok(rows.iter().map(|r| {
        let oi_id: i32 = r.try_get("id").unwrap_or(0);
        OrderItemRow {
        id:                   oi_id,
        code:                 r.try_get("code").unwrap_or(0),
        order_session_id:     r.try_get("order_session_id").unwrap_or(0),
        menu_id:              r.try_get("menu_id").ok().flatten(),
        item_name:            r.try_get("item_name").unwrap_or_default(),
        quantity:             r.try_get::<f64, _>("quantity").unwrap_or(1.0),
        rate:                 r.try_get::<f64, _>("rate").unwrap_or(0.0),
        gross_amount:         r.try_get::<f64, _>("gross_amount").unwrap_or(0.0),
        discount_percent:     r.try_get::<f64, _>("discount_percent").unwrap_or(0.0),
        discount_amount:      r.try_get::<f64, _>("discount_amount").unwrap_or(0.0),
        tax_name:             r.try_get("tax_name").ok().flatten(),
        tax_percentage:       r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
        tax_amount:           r.try_get::<f64, _>("tax_amount").unwrap_or(0.0),
        taxable_amount:       r.try_get::<f64, _>("taxable_amount").unwrap_or(0.0),
        final_amount:         r.try_get::<f64, _>("final_amount").unwrap_or(0.0),
        food_type:            r.try_get("food_type").ok().flatten(),
        food_type_id:         r.try_get("food_type_id").ok().flatten(),
        kitchen_section_id:   r.try_get("kitchen_section_id").ok().flatten(),
        is_liquor:            r.try_get("is_liquor").unwrap_or(false),
        category_id:          r.try_get("category_id").ok().flatten(),
        category_name:        r.try_get("category_name").ok().flatten(),
        allow_discount:       r.try_get("allow_discount").unwrap_or(false),
        max_discount_percent: r.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
        auto_discount_percent:r.try_get::<f64, _>("auto_discount_percent").unwrap_or(0.0),
        kot_status:           r.try_get("kot_status").unwrap_or_else(|_| "PENDING".to_string()),
        item_status:          r.try_get("item_status").unwrap_or_else(|_| "ACTIVE".to_string()),
        special_instruction:  r.try_get("special_instruction").ok().flatten(),
        kot_messages:         r.try_get("kot_messages").ok().flatten(),
        ordered_at:           r.try_get::<Option<chrono::NaiveDateTime>, _>("ordered_at")
                               .ok().flatten()
                               .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        kot_id:               r.try_get("kot_id").ok().flatten(),
        kot_no:               r.try_get("kot_no").ok().flatten(),
        kot_created_at:       r.try_get::<Option<chrono::NaiveDateTime>, _>("kot_created_at")
                               .ok().flatten()
                               .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        addon_rate:           r.try_get::<f64, _>("addon_rate").unwrap_or(0.0),
        addons:               addons_by_item.get(&oi_id).cloned().unwrap_or_default(),
        is_complimentary:     r.try_get("is_complimentary").unwrap_or(false),
        }
    }).collect())
}

#[tauri::command]
pub async fn add_order_item(
    app:                 tauri::AppHandle,
    state:               tauri::State<'_, AppState>,
    session_id:          i32,
    menu_id:             i32,
    quantity:            f64,
    special_instruction: Option<String>,
    addons:              Option<Vec<AddonInput>>,
    is_complimentary:    Option<bool>,
    // Optional per-unit rate override (e.g. "As Per Size"); None → master rate.
    unit_rate:           Option<f64>,
    // Modify Bill: when true the line is marked KOT-sent immediately (billable
    // without going to the kitchen) — it's a billing correction, not a new order.
    as_correction:       Option<bool>,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let is_comp = is_complimentary.unwrap_or(false);
    let as_correction = as_correction.unwrap_or(false);

    // Resolve applicable_rate for this session's table
    let applicable_rate: i32 = sqlx::query_scalar(
        "SELECT COALESCE(rt.applicable_rate, tg.applicable_rate, 1)
         FROM   order_session os
         LEFT JOIN restaurant_table rt ON rt.id = os.table_id
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id
         WHERE  os.id = $1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to resolve rate: {e}"))?
    .unwrap_or(1);

    // Fetch menu item details + tax snapshot (explicit ::float8 for NUMERIC columns).
    // JOIN kitchen_section to validate the FK — if the section was deleted, ks.id is NULL
    // and the INSERT stores NULL rather than raising a FK violation.
    let menu_row = sqlx::query(
        "SELECT mc.name, mc.food_type_id, ks.id AS kitchen_section_id,
                mc.rate_1::float8, mc.rate_2::float8,
                mc.rate_3::float8, mc.rate_4::float8, mc.rate_5::float8,
                cat.allow_discount,
                cat.max_discount_percent::float8,
                COALESCE(tax_info.tax_name, '')         AS tax_name,
                COALESCE(tax_info.tax_percentage, 0)::float8 AS tax_percentage
         FROM   menu_card mc
         JOIN   menu_group mg  ON mg.id  = mc.menu_group_id
         JOIN   menu_category cat ON cat.id = mg.category_id
         LEFT JOIN kitchen_section ks ON ks.id = mc.kitchen_section_id
         LEFT JOIN LATERAL (
             SELECT
                 SUM(mctd.tax_percentage)                         AS tax_percentage,
                 STRING_AGG(tm.name, ' + ' ORDER BY mctd.id)     AS tax_name
             FROM   menu_category_tax_detail mctd
             LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
             WHERE  mctd.category_id = cat.id
         ) tax_info ON true
         WHERE  mc.id = $1 AND mc.is_active = TRUE",
    )
    .bind(menu_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Menu item not found: {e}"))?;

    let item_name: String = menu_row.try_get("name").unwrap_or_default();
    let food_type_id: Option<i32> = menu_row.try_get("food_type_id").ok().flatten();
    let kitchen_section_id: Option<i32> = menu_row.try_get("kitchen_section_id").ok().flatten();
    let tax_name: String = menu_row.try_get("tax_name").unwrap_or_default();
    let tax_pct: f64 = menu_row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    // Pick the correct rate
    let rate: f64 = match applicable_rate {
        1 => menu_row.try_get::<f64, _>("rate_1").unwrap_or(0.0),
        2 => menu_row.try_get::<f64, _>("rate_2").unwrap_or(0.0),
        3 => menu_row.try_get::<f64, _>("rate_3").unwrap_or(0.0),
        4 => menu_row.try_get::<f64, _>("rate_4").unwrap_or(0.0),
        5 => menu_row.try_get::<f64, _>("rate_5").unwrap_or(0.0),
        _ => menu_row.try_get::<f64, _>("rate_1").unwrap_or(0.0),
    };

    // Per-unit add-on charge: sum of chosen add-on rates. Charged per unit and
    // taxed at the parent item's tax rate (folded into this line's amounts).
    // Complimentary lines carry no charge: zero rate, no add-ons, no tax.
    let addon_list = if is_comp { Vec::new() } else { addons.unwrap_or_default() };
    let addon_rate: f64 = round2(addon_list.iter().map(|a| a.rate).sum());
    // Honour a per-unit rate override (As Per Size) for paid lines; comp = 0.
    let rate = if is_comp {
        0.0
    } else {
        match unit_rate {
            Some(r) if r >= 0.0 => r,
            _ => rate,
        }
    };
    let effective_rate = round2(rate + addon_rate);

    // Calculate amounts (base rate + add-on rate, per unit). Complimentary → all zero.
    let gross_amount   = round2(effective_rate * quantity);
    let taxable_amount = gross_amount;          // no discount at add time
    let tax_pct        = if is_comp { 0.0 } else { tax_pct };
    let tax_amount     = round2(taxable_amount * tax_pct / 100.0);
    let final_amount   = round2(taxable_amount + tax_amount);
    let tax_name_opt: Option<String> =
        if is_comp || tax_name.is_empty() { None } else { Some(tax_name) };

    // ── Merge: if a PENDING item with same menu + instruction already exists, increment qty ──
    // Lines carrying add-ons are never merged: the same item with a different add-on
    // set must remain a distinct line. Complimentary lines are also never merged with
    // a paid line. Only merge plain (no add-on, non-comp) pending lines.
    // Correction lines (modify mode) are never merged — each is inserted as a
    // distinct, immediately-billable line so the change is clearly auditable.
    let existing = if addon_list.is_empty() && !is_comp && !as_correction {
        sqlx::query(
            "SELECT id, quantity::float8 AS quantity, rate::float8 AS rate
             FROM   order_item
             WHERE  order_session_id = $1
               AND  menu_id          = $2
               AND  item_status      = 'ACTIVE'
               AND  kot_status       = 'PENDING'
               AND  COALESCE(addon_rate, 0) = 0
               AND  (
                   ($3::text IS NULL AND special_instruction IS NULL)
                   OR special_instruction = $3
               )
             LIMIT 1",
        )
        .bind(session_id)
        .bind(menu_id)
        .bind(special_instruction.as_deref())
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Merge check failed: {e}"))?
    } else {
        None
    };

    if let Some(row) = existing {
        let existing_id:  i32 = row.try_get("id").unwrap_or(0);
        let existing_qty: f64 = row.try_get::<f64, _>("quantity").unwrap_or(0.0);
        // Preserve any per-unit rate the cashier already set on this line
        // (e.g. an "As Per Size" override) instead of resetting to the master
        // rate. The merged line is just the same item with a higher qty.
        let existing_rate: f64 = row.try_get::<f64, _>("rate").unwrap_or(rate);
        let merge_rate     = round2(existing_rate + addon_rate);
        let new_qty       = existing_qty + quantity;
        let g             = round2(merge_rate * new_qty);
        let t             = round2(g * tax_pct / 100.0);
        let f             = round2(g + t);

        sqlx::query(
            "UPDATE order_item
             SET    quantity       = $1,
                    gross_amount   = $2,
                    taxable_amount = $2,
                    tax_amount     = $3,
                    final_amount   = $4,
                    updated_at     = NOW()
             WHERE  id = $5",
        )
        .bind(new_qty)
        .bind(g)
        .bind(t)
        .bind(f)
        .bind(existing_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to merge item qty: {e}"))?;

        return Ok(existing_id);
    }

    // Correction lines are billable immediately (kot_status = 'SENT') and never
    // sent to the kitchen; normal lines start PENDING until a KOT is punched.
    let kot_status = if as_correction { "SENT" } else { "PENDING" };
    let item_id: i32 = sqlx::query_scalar(
        "INSERT INTO order_item
            (order_session_id, menu_id, item_name, quantity, rate, addon_rate,
             gross_amount, discount_percent, discount_amount,
             tax_name, tax_percentage, tax_amount, taxable_amount, final_amount,
             food_type_id, kitchen_section_id, special_instruction,
             is_complimentary, kot_status, item_status)
         VALUES ($1,$2,$3,$4,$5,$6, $7,0,0, $8,$9,$10,$11,$12, $13,$14,$15, $16, $17,'ACTIVE')
         RETURNING id",
    )
    .bind(session_id)
    .bind(menu_id)
    .bind(&item_name)
    .bind(quantity)
    .bind(rate)
    .bind(addon_rate)
    .bind(gross_amount)
    .bind(tax_name_opt)
    .bind(tax_pct)
    .bind(tax_amount)
    .bind(taxable_amount)
    .bind(final_amount)
    .bind(food_type_id)
    .bind(kitchen_section_id)
    .bind(special_instruction)
    .bind(is_comp)
    .bind(kot_status)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to add order item: {e}"))?;

    // Persist each chosen add-on as a priced order_item_modifier row. The modifier
    // name is resolved from the add-on's menu_card so the KOT/bill shows a label.
    for a in &addon_list {
        let addon_name: String = sqlx::query_scalar(
            "SELECT name FROM menu_card WHERE id = $1",
        )
        .bind(a.menu_id)
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| "Add-on".to_string());

        sqlx::query(
            "INSERT INTO order_item_modifier (order_item_id, menu_card_id, modifier_name, modifier_rate, is_active)
             VALUES ($1, $2, $3, $4, 1)",
        )
        .bind(item_id)
        .bind(a.menu_id)
        .bind(addon_name)
        .bind(a.rate)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to add item add-on: {e}"))?;
    }

    Ok(item_id)
}

/// Result of creating a custom add-on on the fly from the billing screen.
#[derive(Debug, Serialize)]
pub struct CreatedAddon {
    pub menu_id: i32,
    pub name:    String,
    pub rate:    f64,
}

/// Create a custom add-on item (is_addon menu_card) from the billing dialog so
/// it's reusable later. Reuses an existing menu_group + food_type for FK validity.
/// If an add-on with the same name already exists, it's returned instead of duplicated.
#[tauri::command]
pub async fn create_custom_addon(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name:  String,
    rate:  f64,
) -> Result<CreatedAddon, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Add-on name is required".to_string());
    }
    if rate < 0.0 {
        return Err("Add-on price cannot be negative".to_string());
    }

    // Reuse an existing add-on with the same name (case-insensitive) if present.
    let existing = sqlx::query(
        "SELECT id, name, rate_1::float8 AS rate FROM menu_card
         WHERE is_addon = TRUE AND LOWER(name) = LOWER($1) LIMIT 1",
    )
    .bind(&name)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Lookup failed: {e}"))?;

    if let Some(row) = existing {
        return Ok(CreatedAddon {
            menu_id: row.try_get("id").unwrap_or(0),
            name:    row.try_get("name").unwrap_or(name),
            rate:    row.try_get::<f64, _>("rate").unwrap_or(rate),
        });
    }

    let new_id: i32 = sqlx::query_scalar(
        "INSERT INTO menu_card
            (name, menu_group_id, food_type_id, is_addon,
             rate_1, rate_2, rate_3, rate_4, rate_5, is_active)
         VALUES ($1,
                 (SELECT id FROM menu_group ORDER BY id LIMIT 1),
                 (SELECT id FROM food_type  ORDER BY id LIMIT 1),
                 TRUE, $2, $2, $2, $2, $2, TRUE)
         RETURNING id",
    )
    .bind(&name)
    .bind(rate)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to create custom add-on: {e}"))?;

    Ok(CreatedAddon { menu_id: new_id, name, rate })
}

/// List all add-on items (is_addon menu_card) for the billing add-on dialog search.
#[tauri::command]
pub async fn get_billing_addons(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AddonOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, name, rate_1::float8, rate_2::float8, rate_3::float8,
                rate_4::float8, rate_5::float8
         FROM   menu_card
         WHERE  is_addon = TRUE AND is_active = TRUE
         ORDER  BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load add-ons: {e}"))?;

    Ok(rows.iter().map(|r| AddonOption {
        menu_id: r.try_get("id").unwrap_or(0),
        name:    r.try_get("name").unwrap_or_default(),
        rate_1:  r.try_get::<f64, _>("rate_1").unwrap_or(0.0),
        rate_2:  r.try_get::<f64, _>("rate_2").unwrap_or(0.0),
        rate_3:  r.try_get::<f64, _>("rate_3").unwrap_or(0.0),
        rate_4:  r.try_get::<f64, _>("rate_4").unwrap_or(0.0),
        rate_5:  r.try_get::<f64, _>("rate_5").unwrap_or(0.0),
    }).collect())
}

/// Replace the add-ons on an existing (pending) order line and recompute its amounts.
/// Add-ons are session-scoped modifier rows — this never alters the menu master.
#[tauri::command]
pub async fn update_order_item_addons(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
    addons:        Vec<AddonInput>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Only pending (not yet KOT-sent) lines can have their add-ons edited.
    let row = sqlx::query(
        "SELECT rate::float8, quantity::float8, discount_percent::float8,
                tax_percentage::float8, kot_status
         FROM   order_item WHERE id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(order_item_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Order item not found: {e}"))?;

    let kot_status: String = row.try_get("kot_status").unwrap_or_default();
    if kot_status != "PENDING" {
        return Err("Add-ons can only be changed before the item is sent to the kitchen".to_string());
    }

    let rate:     f64 = row.try_get::<f64, _>("rate").unwrap_or(0.0);
    let quantity: f64 = row.try_get::<f64, _>("quantity").unwrap_or(1.0);
    let disc_pct: f64 = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
    let tax_pct:  f64 = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    let addon_rate: f64 = round2(addons.iter().map(|a| a.rate).sum());
    let gross_amount   = round2((rate + addon_rate) * quantity);
    let discount_amt   = round2(gross_amount * disc_pct / 100.0);
    let taxable_amount = round2(gross_amount - discount_amt);
    let tax_amount     = round2(taxable_amount * tax_pct / 100.0);
    let final_amount   = round2(taxable_amount + tax_amount);

    // Clear existing add-on modifiers (keep KOT notes, which have NULL menu_card_id).
    sqlx::query(
        "DELETE FROM order_item_modifier WHERE order_item_id = $1 AND menu_card_id IS NOT NULL",
    )
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to clear add-ons: {e}"))?;

    // Re-insert the chosen add-ons.
    for a in &addons {
        let addon_name: String = sqlx::query_scalar("SELECT name FROM menu_card WHERE id = $1")
            .bind(a.menu_id)
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten()
            .unwrap_or_else(|| "Add-on".to_string());

        sqlx::query(
            "INSERT INTO order_item_modifier (order_item_id, menu_card_id, modifier_name, modifier_rate, is_active)
             VALUES ($1, $2, $3, $4, 1)",
        )
        .bind(order_item_id)
        .bind(a.menu_id)
        .bind(addon_name)
        .bind(a.rate)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to save add-on: {e}"))?;
    }

    // Update the line's stored add-on rate + amounts.
    sqlx::query(
        "UPDATE order_item
         SET    addon_rate = $1, gross_amount = $2, discount_amount = $3,
                taxable_amount = $4, tax_amount = $5, final_amount = $6, updated_at = NOW()
         WHERE  id = $7",
    )
    .bind(addon_rate)
    .bind(gross_amount)
    .bind(discount_amt)
    .bind(taxable_amount)
    .bind(tax_amount)
    .bind(final_amount)
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update line: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn update_order_item_qty(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
    quantity:      f64,
) -> Result<(), String> {
    if quantity <= 0.0 {
        return Err("Quantity must be greater than zero".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // Fetch existing amounts to recalculate (::float8 to safely decode NUMERIC columns)
    let row = sqlx::query(
        "SELECT rate::float8, COALESCE(addon_rate, 0)::float8 AS addon_rate,
                discount_percent::float8, tax_percentage::float8
         FROM   order_item WHERE id = $1",
    )
    .bind(order_item_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Order item not found: {e}"))?;

    let rate:       f64 = row.try_get::<f64, _>("rate").unwrap_or(0.0);
    let addon_rate: f64 = row.try_get::<f64, _>("addon_rate").unwrap_or(0.0);
    let disc_pct:   f64 = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
    let tax_pct:    f64 = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    // Per-unit charge includes any add-ons so the line scales correctly with qty.
    let gross_amount   = round2((rate + addon_rate) * quantity);
    let discount_amt   = round2(gross_amount * disc_pct / 100.0);
    let taxable_amount = round2(gross_amount - discount_amt);
    let tax_amount     = round2(taxable_amount * tax_pct / 100.0);
    let final_amount   = round2(taxable_amount + tax_amount);

    sqlx::query(
        "UPDATE order_item
         SET    quantity = $1, gross_amount = $2, discount_amount = $3,
                taxable_amount = $4, tax_amount = $5, final_amount = $6,
                updated_at = NOW()
         WHERE  id = $7 AND item_status = 'ACTIVE'",
    )
    .bind(quantity)
    .bind(gross_amount)
    .bind(discount_amt)
    .bind(taxable_amount)
    .bind(tax_amount)
    .bind(final_amount)
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update quantity: {e}"))?;

    Ok(())
}

/// Override the per-unit rate of an order item (used for "As Per Size" groups,
/// where the cashier sets the price at billing time). Recomputes the line's
/// amounts from the new rate; only allowed on pending (not yet KOT-sent) lines.
#[tauri::command]
pub async fn update_order_item_rate(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
    unit_rate:     f64,
) -> Result<(), String> {
    if unit_rate < 0.0 {
        return Err("Rate cannot be negative".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT quantity::float8, COALESCE(addon_rate, 0)::float8 AS addon_rate,
                discount_percent::float8, tax_percentage::float8, kot_status
         FROM   order_item WHERE id = $1",
    )
    .bind(order_item_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Order item not found: {e}"))?;

    let kot_status: String = row.try_get("kot_status").unwrap_or_default();
    if kot_status != "PENDING" {
        return Err("Rate can only be changed before the item is sent to the kitchen".to_string());
    }

    let quantity:   f64 = row.try_get::<f64, _>("quantity").unwrap_or(0.0);
    let addon_rate: f64 = row.try_get::<f64, _>("addon_rate").unwrap_or(0.0);
    let disc_pct:   f64 = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
    let tax_pct:    f64 = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    let gross_amount   = round2((unit_rate + addon_rate) * quantity);
    let discount_amt   = round2(gross_amount * disc_pct / 100.0);
    let taxable_amount = round2(gross_amount - discount_amt);
    let tax_amount     = round2(taxable_amount * tax_pct / 100.0);
    let final_amount   = round2(taxable_amount + tax_amount);

    sqlx::query(
        "UPDATE order_item
         SET    rate = $1, gross_amount = $2, discount_amount = $3,
                taxable_amount = $4, tax_amount = $5, final_amount = $6,
                updated_at = NOW()
         WHERE  id = $7 AND item_status = 'ACTIVE' AND kot_status = 'PENDING'",
    )
    .bind(unit_rate)
    .bind(gross_amount)
    .bind(discount_amt)
    .bind(taxable_amount)
    .bind(tax_amount)
    .bind(final_amount)
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update rate: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_order_item(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE order_item
         SET    item_status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
         WHERE  id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to cancel item: {e}"))?;

    Ok(())
}

/// Cancel (or partially reduce) a KOT-sent order item and record the mandatory reason.
/// - `quantity_to_void`: units to remove (pass full qty to remove the item completely)
/// - Always inserts a row in `kot_item_void_log` for audit
/// - Full remove → item_status = CANCELLED; partial → quantity is decremented
#[tauri::command]
pub async fn cancel_order_item_with_reason(
    app:              tauri::AppHandle,
    state:            tauri::State<'_, AppState>,
    order_item_id:    i32,
    quantity_to_void: f64,
    void_reason:      String,
    user_id:          Option<i32>,
    voided_by:        Option<String>,
) -> Result<(), String> {
    // Treat 0 as null — superadmin sentinel id is 0 and has no DB row
    let user_id: Option<i32> = user_id.filter(|&id| id > 0);

    if void_reason.trim().is_empty() {
        return Err("Void reason is required".to_string());
    }
    if quantity_to_void <= 0.0 {
        return Err("Quantity to void must be greater than zero".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT oi.item_name, oi.quantity::float8 AS quantity, oi.item_status,
                oi.order_session_id, oi.kot_id,
                oi.rate::float8, oi.discount_percent::float8, oi.tax_percentage::float8,
                os.table_id
         FROM   order_item oi
         JOIN   order_session os ON os.id = oi.order_session_id
         WHERE  oi.id = $1",
    )
    .bind(order_item_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Order item not found: {e}"))?;

    let item_name:   String      = row.try_get("item_name").unwrap_or_default();
    let current_qty: f64         = row.try_get::<f64, _>("quantity").unwrap_or(0.0);
    let item_status: String      = row.try_get("item_status").unwrap_or_default();
    let session_id:  i32         = row.try_get("order_session_id").unwrap_or(0);
    let kot_id:      Option<i32> = row.try_get("kot_id").ok().flatten();
    let table_id:    Option<i32> = row.try_get("table_id").ok().flatten();
    let rate:        f64         = row.try_get::<f64, _>("rate").unwrap_or(0.0);
    let disc_pct:    f64         = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
    let tax_pct:     f64         = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    if item_status != "ACTIVE" {
        return Err("Item is already cancelled".to_string());
    }

    let actual_void    = quantity_to_void.min(current_qty);
    let new_qty        = round2(current_qty - actual_void);
    let is_full_remove = new_qty <= 0.0;
    let void_type      = if is_full_remove { "REMOVE" } else { "QTY_REDUCE" };

    let mut tx = pool.begin().await.map_err(|e| format!("TX start failed: {e}"))?;

    if is_full_remove {
        // 1. Mark order_item cancelled + inactive
        sqlx::query(
            "UPDATE order_item
             SET    item_status  = 'CANCELLED',
                    is_active    = 0,
                    cancelled_at = NOW(),
                    updated_at   = NOW()
             WHERE  id = $1 AND item_status = 'ACTIVE'",
        )
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to cancel order_item: {e}"))?;

        // 2. Mark all kot_item rows for this order_item as cancelled + inactive
        sqlx::query(
            "UPDATE kot_item
             SET    item_status = 'CANCELLED',
                    is_active   = 0,
                    updated_at  = NOW()
             WHERE  order_item_id = $1 AND is_active = 1",
        )
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to cancel kot_item: {e}"))?;

        // 3. Deactivate order_item_modifier rows
        sqlx::query(
            "UPDATE order_item_modifier
             SET    is_active  = 0,
                    updated_at = NOW()
             WHERE  order_item_id = $1 AND is_active = 1",
        )
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to deactivate modifiers: {e}"))?;

        // 4. Deactivate bill_item snapshot if a bill exists for this session
        sqlx::query(
            "UPDATE bill_item
             SET    is_active  = 0,
                    updated_at = NOW()
             WHERE  order_item_id = $1 AND is_active = 1",
        )
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to deactivate bill_item: {e}"))?;

    } else {
        // Partial quantity reduce — update amounts on order_item
        let g      = round2(rate * new_qty);
        let d      = round2(g * disc_pct / 100.0);
        let t_base = round2(g - d);
        let t      = round2(t_base * tax_pct / 100.0);
        let f      = round2(t_base + t);

        sqlx::query(
            "UPDATE order_item
             SET    quantity = $1, gross_amount = $2, discount_amount = $3,
                    taxable_amount = $4, tax_amount = $5, final_amount = $6,
                    updated_at = NOW()
             WHERE  id = $7 AND item_status = 'ACTIVE'",
        )
        .bind(new_qty).bind(g).bind(d).bind(t_base).bind(t).bind(f)
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to reduce item qty: {e}"))?;

        // Also update bill_item snapshot quantity/amounts to stay in sync
        sqlx::query(
            "UPDATE bill_item
             SET    quantity       = $1,
                    gross_amount   = $2,
                    discount_amount= $3,
                    tax_amount     = $5,
                    final_amount   = $6,
                    updated_at     = NOW()
             WHERE  order_item_id = $7 AND is_active = 1",
        )
        .bind(new_qty).bind(g).bind(d).bind(t_base).bind(t).bind(f)
        .bind(order_item_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to sync bill_item qty: {e}"))?;
    }

    sqlx::query(
        "INSERT INTO kot_item_void_log
            (order_item_id, order_session_id, kot_id, table_id, user_id, voided_by,
             item_name, quantity_voided, void_reason, void_type,
             previous_quantity, new_quantity, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6, $7,$8,$9,$10, $11,$12,$5,$5)",
    )
    .bind(order_item_id)
    .bind(session_id)
    .bind(kot_id)
    .bind(table_id)
    .bind(user_id)
    .bind(voided_by.as_deref())
    .bind(&item_name)
    .bind(actual_void)
    .bind(void_reason.trim())
    .bind(void_type)
    .bind(current_qty)
    .bind(new_qty)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to log void: {e}"))?;

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(())
}

// ── KOT ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_kot(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
    remarks:    Option<String>,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // All pending active items for this session
    let pending = sqlx::query(
        "SELECT oi.id, oi.kitchen_section_id
         FROM   order_item oi
         WHERE  oi.order_session_id = $1
           AND  oi.item_status = 'ACTIVE'
           AND  oi.kot_status  = 'PENDING'",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch pending items: {e}"))?;

    if pending.is_empty() {
        return Err("No pending items to generate KOT for".to_string());
    }

    // Get table_id for this session
    let table_id: Option<i32> = sqlx::query_scalar(
        "SELECT table_id FROM order_session WHERE id = $1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Session not found: {e}"))?
    .flatten();

    // Create one KOT master (future: group by kitchen_section_id)
    let kot_id: i32 = sqlx::query_scalar(
        "INSERT INTO kot_master (order_session_id, table_id, kot_status, remarks)
         VALUES ($1, $2, 'PENDING', $3)
         RETURNING id",
    )
    .bind(session_id)
    .bind(table_id)
    .bind(remarks.as_deref())
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to create KOT: {e}"))?;

    // Set kot_no = 'KOT-{id}'
    sqlx::query("UPDATE kot_master SET kot_no = $1 WHERE id = $2")
        .bind(format!("KOT-{}", kot_id))
        .bind(kot_id)
        .execute(&pool)
        .await
        .ok();

    // Link all pending items to this KOT
    for row in &pending {
        let oi_id: i32 = row.try_get("id").unwrap_or(0);

        sqlx::query(
            "INSERT INTO kot_item (kot_id, order_item_id, quantity)
             SELECT $1, id, quantity FROM order_item WHERE id = $2",
        )
        .bind(kot_id)
        .bind(oi_id)
        .execute(&pool)
        .await
        .ok();

        sqlx::query(
            "UPDATE order_item SET kot_status = 'SENT', kot_id = $1, updated_at = NOW()
             WHERE id = $2",
        )
        .bind(kot_id)
        .bind(oi_id)
        .execute(&pool)
        .await
        .ok();
    }

    // Advance session status
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'KOT_SENT', updated_at = NOW()
         WHERE  id = $1 AND session_status = 'OPEN'",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    // Audit
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'KOT_GENERATED', $2)",
    )
    .bind(session_id)
    .bind(format!("KOT {} generated", kot_id))
    .execute(&pool)
    .await
    .ok();

    Ok(kot_id)
}

#[tauri::command]
pub async fn get_kot_list(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<Vec<KotRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT km.id, km.code, km.kot_no, km.order_session_id,
                km.kitchen_section_id, km.waiter_name, km.kot_status,
                km.is_printed, km.created_at
         FROM   kot_master km
         WHERE  km.order_session_id = $1
         ORDER  BY km.created_at",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load KOT list: {e}"))?;

    Ok(rows.iter().map(|r| KotRow {
        id:                 r.try_get("id").unwrap_or(0),
        code:               r.try_get("code").unwrap_or(0),
        kot_no:             r.try_get("kot_no").ok().flatten(),
        order_session_id:   r.try_get("order_session_id").unwrap_or(0),
        kitchen_section_id: r.try_get("kitchen_section_id").ok().flatten(),
        waiter_name:        r.try_get("waiter_name").ok().flatten(),
        kot_status:         r.try_get("kot_status").unwrap_or_else(|_| "PENDING".to_string()),
        is_printed:         r.try_get("is_printed").unwrap_or(false),
        created_at:         r.try_get::<Option<chrono::NaiveDateTime>, _>("created_at")
                             .ok().flatten()
                             .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
    }).collect())
}

// ── Bill ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_bill_summary(
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<BillSummary, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Session + table info
    let session_row = sqlx::query(
        "SELECT os.id, os.order_type, os.session_status,
                rt.table_name
         FROM   order_session os
         LEFT JOIN restaurant_table rt ON rt.id = os.table_id
         WHERE  os.id = $1",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Session not found: {e}"))?;

    let order_type:     Option<String> = session_row.try_get("order_type").ok().flatten();
    let table_name:     Option<String> = session_row.try_get("table_name").ok().flatten();
    let session_status: String         = session_row.try_get("session_status").unwrap_or_else(|_| "OPEN".to_string());

    // Existing bill (if any)
    let bill_row = sqlx::query(
        "SELECT id, bill_no, bill_status FROM bill_master
         WHERE  order_session_id = $1
         ORDER  BY id DESC LIMIT 1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Bill query failed: {e}"))?;

    let bill_id:     Option<i32>    = bill_row.as_ref().and_then(|r| r.try_get::<i32, _>("id").ok());
    let bill_no:     Option<String> = bill_row.as_ref().and_then(|r| r.try_get::<Option<String>, _>("bill_no").ok().flatten());
    let bill_status: Option<String> = bill_row.as_ref().and_then(|r| r.try_get::<String, _>("bill_status").ok());

    // Aggregate active order items
    let totals_row = sqlx::query(
        "SELECT COUNT(*)                           AS item_count,
                COALESCE(SUM(gross_amount),    0)::float8 AS gross_amount,
                COALESCE(SUM(discount_amount), 0)::float8 AS discount_amount,
                COALESCE(SUM(taxable_amount),  0)::float8 AS taxable_amount,
                COALESCE(SUM(tax_amount),      0)::float8 AS tax_amount,
                COALESCE(SUM(final_amount),    0)::float8 AS final_amount
         FROM   order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Totals query failed: {e}"))?;

    let item_count:      i64 = totals_row.try_get("item_count").unwrap_or(0);
    let gross_amount:    f64 = totals_row.try_get::<f64, _>("gross_amount").unwrap_or(0.0);
    let discount_amount: f64 = totals_row.try_get::<f64, _>("discount_amount").unwrap_or(0.0);
    let taxable_amount:  f64 = totals_row.try_get::<f64, _>("taxable_amount").unwrap_or(0.0);
    let tax_amount:      f64 = totals_row.try_get::<f64, _>("tax_amount").unwrap_or(0.0);
    let final_amount:    f64 = totals_row.try_get::<f64, _>("final_amount").unwrap_or(0.0);

    let round_off  = round2((final_amount).round() - final_amount);
    let net_amount = round2(final_amount + round_off);

    // Tax breakdown — expand each order item into its individual tax components
    // so that e.g. "CGST ON FOODS" from two different categories is merged into one row.
    let tax_rows = sqlx::query(
        "SELECT
             COALESCE(tm.name, 'No Tax')                              AS tax_name,
             COALESCE(mctd.tax_percentage, 0)::float8                AS tax_percentage,
             SUM(oi.taxable_amount)::float8                          AS taxable_amount,
             SUM(oi.taxable_amount * mctd.tax_percentage / 100.0)::float8 AS tax_amount
         FROM order_item oi
         JOIN menu_card mc ON mc.id = oi.menu_id
         JOIN menu_group mg ON mg.id = mc.menu_group_id
         JOIN menu_category cat ON cat.id = mg.category_id
         JOIN menu_category_tax_detail mctd ON mctd.category_id = cat.id
         LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
         WHERE oi.order_session_id = $1 AND oi.item_status = 'ACTIVE'
         GROUP BY tm.name, mctd.tax_percentage
         ORDER BY tm.name",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let tax_breakdown = tax_rows.iter().map(|r| TaxBreakdownRow {
        tax_name:       r.try_get("tax_name").unwrap_or_else(|_| "No Tax".to_string()),
        tax_percentage: r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
        taxable_amount: r.try_get::<f64, _>("taxable_amount").unwrap_or(0.0),
        tax_amount:     r.try_get::<f64, _>("tax_amount").unwrap_or(0.0),
    }).collect();

    // Paid amount from payments
    let paid_amount: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(payment_amount), 0)::float8
         FROM   payment_master pm
         JOIN   bill_master bm ON bm.id = pm.bill_id
         WHERE  bm.order_session_id = $1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Payment query failed: {e}"))?
    .unwrap_or(0.0);

    let due_amount = round2((net_amount - paid_amount).max(0.0));

    Ok(BillSummary {
        session_id,
        order_type,
        table_name,
        session_status,
        bill_no,
        bill_id,
        bill_status,
        item_count,
        gross_amount:    round2(gross_amount),
        discount_amount: round2(discount_amount),
        taxable_amount:  round2(taxable_amount),
        tax_amount:      round2(tax_amount),
        round_off,
        net_amount,
        paid_amount:     round2(paid_amount),
        due_amount,
        tax_breakdown,
    })
}

#[tauri::command]
pub async fn generate_bill(
    app:                  tauri::AppHandle,
    state:                tauri::State<'_, AppState>,
    session_id:           i32,
    bill_discount_amount: Option<f64>,
    bill_net_amount:      Option<f64>,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Validate: must have at least one KOT-sent active item
    let item_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Item count failed: {e}"))?;

    if item_count == 0 {
        return Err("No KOT-sent items to bill".to_string());
    }

    // Aggregate totals from KOT-sent active items only (pending items excluded from bill)
    let totals = sqlx::query(
        "SELECT COALESCE(SUM(gross_amount),    0)::float8 AS gross_amount,
                COALESCE(SUM(discount_amount), 0)::float8 AS discount_amount,
                COALESCE(SUM(taxable_amount),  0)::float8 AS taxable_amount,
                COALESCE(SUM(tax_amount),      0)::float8 AS tax_amount,
                COALESCE(SUM(final_amount),    0)::float8 AS final_amount
         FROM   order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Totals failed: {e}"))?;

    let gross_amount:       f64 = totals.try_get::<f64, _>("gross_amount").unwrap_or(0.0);
    let item_discount:      f64 = totals.try_get::<f64, _>("discount_amount").unwrap_or(0.0);
    let base_taxable:       f64 = totals.try_get::<f64, _>("taxable_amount").unwrap_or(0.0);
    let base_tax:           f64 = totals.try_get::<f64, _>("tax_amount").unwrap_or(0.0);
    // Bill-level discount (category + bill discount from the UI panel) is applied
    // BEFORE tax (Indian GST law): it reduces the taxable base, then tax is
    // recomputed on the net value. extra_disc never exceeds the taxable base.
    let extra_disc:         f64 = bill_discount_amount.unwrap_or(0.0).max(0.0).min(base_taxable);
    // Factor that scales every item's taxable & tax down by the bill discount.
    // Applied per-line (proportional to taxable) when copying to bill_item /
    // bill_tax_detail so all stored rows stay internally consistent.
    let tax_factor:         f64 = if base_taxable > 0.0 { 1.0 - extra_disc / base_taxable } else { 1.0 };
    let taxable_amount:     f64 = round2(base_taxable - extra_disc);
    let tax_amount:         f64 = round2(base_tax * tax_factor);
    let final_amount:       f64 = round2(taxable_amount + tax_amount);
    let discount_amount:    f64 = round2(item_discount + extra_disc);
    let round_off               = round2(final_amount.round() - final_amount);
    // If a UI-computed net_amount was passed (includes misc, service charge etc.) use it,
    // otherwise derive from the post-discount final amount.
    let net_amount:         f64 = if let Some(n) = bill_net_amount {
        round2(n)
    } else {
        round2(final_amount + round_off)
    };

    // Get session details
    let (table_id, customer_id): (Option<i32>, Option<i32>) = {
        let row = sqlx::query("SELECT table_id, customer_id FROM order_session WHERE id = $1")
            .bind(session_id)
            .fetch_one(&pool)
            .await
            .map_err(|e| format!("Session not found: {e}"))?;
        (row.try_get("table_id").ok().flatten(), row.try_get("customer_id").ok().flatten())
    };

    // Check if bill already exists
    // id is NOT NULL (SERIAL) — fetch_optional gives Option<i32> directly
    let existing_bill: Option<i32> = sqlx::query_scalar::<_, i32>(
        "SELECT id FROM bill_master WHERE order_session_id = $1 AND bill_status != 'PAID' LIMIT 1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Bill check failed: {e}"))?;

    if let Some(bid) = existing_bill {
        // Reprint — update amounts and increment print count
        sqlx::query(
            "UPDATE bill_master
             SET    gross_amount = $1, discount_amount = $2, taxable_amount = $3,
                    tax_amount = $4, round_off = $5, net_amount = $6,
                    bill_status = 'PRINTED', printed_at = NOW(),
                    bill_print_count = bill_print_count + 1, updated_at = NOW()
             WHERE  id = $7",
        )
        .bind(gross_amount).bind(discount_amount).bind(taxable_amount)
        .bind(tax_amount).bind(round_off).bind(net_amount)
        .bind(bid)
        .execute(&pool)
        .await
        .map_err(|e| format!("Bill update failed: {e}"))?;

        // Drop any un-KOT'd items that were added after the previous bill print
        sqlx::query(
            "UPDATE order_item
             SET    item_status = 'CANCELLED', is_active = 0, cancelled_at = NOW(), updated_at = NOW()
             WHERE  order_session_id = $1 AND item_status = 'ACTIVE' AND kot_status = 'PENDING'",
        )
        .bind(session_id)
        .execute(&pool)
        .await
        .ok();

        // Refresh the stored bill lines + tax breakdown so a re-bill (e.g. after a
        // Modify Bill correction) reflects the current items. Delete + re-copy keeps
        // bill_item / bill_tax_detail consistent with the updated order_item set; for
        // an unchanged reprint this simply re-writes identical rows.
        sqlx::query("DELETE FROM bill_item WHERE bill_id = $1").bind(bid).execute(&pool).await.ok();
        sqlx::query("DELETE FROM bill_tax_detail WHERE bill_id = $1").bind(bid).execute(&pool).await.ok();

        sqlx::query(
            "INSERT INTO bill_item
                (bill_id, order_item_id, menu_id, item_name, quantity, rate,
                 gross_amount, discount_amount, tax_amount, final_amount, kitchen_section_id,
                 is_complimentary)
             SELECT $1, id, menu_id, item_name, quantity, rate,
                    gross_amount,
                    ROUND((discount_amount + taxable_amount * (1 - $3))::numeric, 2),
                    ROUND((tax_amount * $3)::numeric, 2),
                    ROUND((taxable_amount * $3 + tax_amount * $3)::numeric, 2),
                    kitchen_section_id,
                    COALESCE(is_complimentary, FALSE)
             FROM   order_item
             WHERE  order_session_id = $2 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'",
        )
        .bind(bid).bind(session_id).bind(tax_factor)
        .execute(&pool).await
        .map_err(|e| format!("Failed to refresh bill items: {e}"))?;

        sqlx::query(
            "INSERT INTO bill_tax_detail (bill_id, tax_name, tax_percentage, taxable_amount, tax_amount)
             SELECT $1,
                    COALESCE(tax_name, 'No Tax'),
                    MAX(tax_percentage),
                    ROUND((SUM(taxable_amount) * $3)::numeric, 2),
                    ROUND((SUM(tax_amount) * $3)::numeric, 2)
             FROM   order_item
             WHERE  order_session_id = $2 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'
             GROUP  BY tax_name",
        )
        .bind(bid).bind(session_id).bind(tax_factor)
        .execute(&pool).await
        .map_err(|e| format!("Failed to refresh bill tax detail: {e}"))?;

        return Ok(bid);
    }

    // Insert bill_master
    let bill_id: i32 = sqlx::query_scalar(
        "INSERT INTO bill_master
            (order_session_id, table_id, customer_id, bill_status,
             gross_amount, discount_amount, taxable_amount, tax_amount,
             round_off, net_amount, printed_at, bill_print_count)
         VALUES ($1,$2,$3,'PRINTED', $4,$5,$6,$7, $8,$9,NOW(),1)
         RETURNING id",
    )
    .bind(session_id).bind(table_id).bind(customer_id)
    .bind(gross_amount).bind(discount_amount).bind(taxable_amount).bind(tax_amount)
    .bind(round_off).bind(net_amount)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to create bill: {e}"))?;

    // Set bill_no
    sqlx::query("UPDATE bill_master SET bill_no = $1 WHERE id = $2")
        .bind(format!("BILL-{}", bill_id))
        .bind(bill_id)
        .execute(&pool)
        .await
        .ok();

    // Copy KOT-sent order_items → bill_items (pending items not included in bill).
    // The bill-level discount is spread per-line: each line's taxable share of the
    // discount is added to its discount_amount, and its tax is recomputed on the
    // reduced base via tax_factor so the stored bill is GST-on-net consistent.
    sqlx::query(
        "INSERT INTO bill_item
            (bill_id, order_item_id, menu_id, item_name, quantity, rate,
             gross_amount, discount_amount, tax_amount, final_amount, kitchen_section_id,
             is_complimentary)
         SELECT $1, id, menu_id, item_name, quantity, rate,
                gross_amount,
                ROUND((discount_amount + taxable_amount * (1 - $3))::numeric, 2),
                ROUND((tax_amount * $3)::numeric, 2),
                ROUND((taxable_amount * $3 + tax_amount * $3)::numeric, 2),
                kitchen_section_id,
                COALESCE(is_complimentary, FALSE)
         FROM   order_item
         WHERE  order_session_id = $2 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'",
    )
    .bind(bill_id)
    .bind(session_id)
    .bind(tax_factor)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to copy bill items: {e}"))?;

    // Insert tax breakdown → bill_tax_detail (KOT-sent items only), scaled by the
    // bill discount so the GST shown on the bill is charged on the net value.
    sqlx::query(
        "INSERT INTO bill_tax_detail (bill_id, tax_name, tax_percentage, taxable_amount, tax_amount)
         SELECT $1,
                COALESCE(tax_name, 'No Tax'),
                MAX(tax_percentage),
                ROUND((SUM(taxable_amount) * $3)::numeric, 2),
                ROUND((SUM(tax_amount) * $3)::numeric, 2)
         FROM   order_item
         WHERE  order_session_id = $2 AND item_status = 'ACTIVE' AND kot_status != 'PENDING'
         GROUP  BY tax_name",
    )
    .bind(bill_id)
    .bind(session_id)
    .bind(tax_factor)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to insert tax detail: {e}"))?;

    // Advance session status
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'BILL_PRINTED',
                bill_printed_at = NOW(), bill_print_count = bill_print_count + 1,
                updated_at = NOW()
         WHERE  id = $1",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    // Drop any un-KOT'd items — they were never sent to kitchen so excluded from this bill
    sqlx::query(
        "UPDATE order_item
         SET    item_status = 'CANCELLED', is_active = 0, cancelled_at = NOW(), updated_at = NOW()
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE' AND kot_status = 'PENDING'",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    // Audit
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'BILL_PRINTED', $2)",
    )
    .bind(session_id)
    .bind(format!("Bill {} generated", bill_id))
    .execute(&pool)
    .await
    .ok();

    Ok(bill_id)
}

// ── Modify Bill (correction of a bill-printed table) ──────────

/// Re-aggregate the bill for a BILL_PRINTED session after corrections (items
/// added/removed, discount/customer/waiter changes) and write an audit row to
/// modified_bill_log. The actual item edits are persisted by the normal
/// add/cancel/update commands beforehand — this command finalises the bill
/// totals and records WHO changed WHAT and WHY.
///
/// A settled session can never be modified: the guard below rejects it.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn save_modified_bill(
    app:                  tauri::AppHandle,
    state:                tauri::State<'_, AppState>,
    session_id:           i32,
    reason:               String,
    changes_json:         Option<serde_json::Value>,
    old_net_amount:       Option<f64>,
    new_net_amount:       Option<f64>,
    old_item_count:       Option<i32>,
    new_item_count:       Option<i32>,
    modified_by:          Option<i32>,
    // Re-aggregation inputs (same as generate_bill so totals match the UI)
    bill_discount_amount: Option<f64>,
    bill_net_amount:      Option<f64>,
) -> Result<i32, String> {
    let reason = reason.trim().to_string();
    if reason.is_empty() {
        return Err("A reason is required to modify a bill.".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // Guard: only a bill-printed (not settled / cancelled) session can be modified.
    let status: Option<String> = sqlx::query_scalar(
        "SELECT session_status FROM order_session WHERE id = $1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Session lookup failed: {e}"))?;

    match status.as_deref() {
        Some("BILL_PRINTED") => {}
        Some("SETTLED")  => return Err("This bill is already settled and can no longer be modified.".to_string()),
        Some(other)      => return Err(format!("Only bill-printed tables can be modified (status: {other}).")),
        None             => return Err("Session not found.".to_string()),
    }

    let table_id: Option<i32> = sqlx::query_scalar(
        "SELECT table_id FROM order_session WHERE id = $1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .flatten();

    // Re-run bill aggregation. generate_bill takes the BILL_PRINTED path that
    // updates the existing bill_master / bill_item / bill_tax_detail rows in
    // place and drops any un-KOT'd lines, so the stored bill reflects the edits.
    let bill_id = generate_bill(
        app.clone(),
        state.clone(),
        session_id,
        bill_discount_amount,
        bill_net_amount,
    )
    .await?;

    // Write the audit row. Audit failures must not lose the (already-saved) edit,
    // but here the log IS the point of the feature — surface a hard error.
    sqlx::query(
        "INSERT INTO modified_bill_log
            (order_session_id, bill_id, table_id, old_net_amount, new_net_amount,
             old_item_count, new_item_count, reason, changes_json, modified_by, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)",
    )
    .bind(session_id)
    .bind(bill_id)
    .bind(table_id)
    .bind(old_net_amount.unwrap_or(0.0))
    .bind(new_net_amount.unwrap_or(0.0))
    .bind(old_item_count.unwrap_or(0))
    .bind(new_item_count.unwrap_or(0))
    .bind(&reason)
    .bind(changes_json)
    .bind(modified_by)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to write modify-bill log: {e}"))?;

    // Audit trail in the shared status history too.
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'BILL_MODIFIED', $2)",
    )
    .bind(session_id)
    .bind(format!("Bill modified: {reason}"))
    .execute(&pool)
    .await
    .ok();

    Ok(bill_id)
}

// ── Payment methods (mapped from day_book master) ─────────────

#[derive(Debug, Serialize)]
pub struct PaymentMethodOption {
    pub id:   i32,
    pub name: String,
}

#[tauri::command]
pub async fn get_payment_methods(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PaymentMethodOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, name FROM day_book
         WHERE  is_active = 1 AND name IS NOT NULL
         ORDER  BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load payment methods: {e}"))?;

    Ok(rows.iter().map(|r| PaymentMethodOption {
        id:   r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

/// Resolve (find / update / create) the customer for a DUE settlement.
/// Mobile number is authoritative — an existing record is matched and its
/// name/address refreshed with anything newly entered; otherwise a new
/// customer is created. Falls back to the session's customer, then to name.
/// Returns the customer id the due should be tracked against.
async fn resolve_due_customer(
    pool:        &sqlx::PgPool,
    existing_id: Option<i32>,
    name:        &Option<String>,
    mobile:      &Option<String>,
    address:     &Option<String>,
) -> Result<Option<i32>, String> {
    let name_t   = name.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let mobile_t = mobile.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let addr_t   = address.as_deref().map(str::trim).filter(|s| !s.is_empty());

    // 1. Mobile is the key — find an existing customer by it.
    if let Some(mob) = mobile_t {
        let found: Option<i32> = sqlx::query_scalar(
            "SELECT id FROM customer_information
             WHERE mobile_no1 = $1 AND is_active = 1 ORDER BY id LIMIT 1",
        )
        .bind(mob)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Customer lookup failed: {e}"))?;

        if let Some(cid) = found {
            // Refresh saved name / address with anything newly entered.
            sqlx::query(
                "UPDATE customer_information
                 SET customer_name = COALESCE($2, customer_name),
                     address_line1 = COALESCE($3, address_line1),
                     updated_at    = NOW()
                 WHERE id = $1",
            )
            .bind(cid).bind(name_t).bind(addr_t)
            .execute(pool).await.ok();
            return Ok(Some(cid));
        }

        // No match → create a fresh customer keyed on this mobile.
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO customer_information (customer_name, mobile_no1, address_line1, is_active)
             VALUES ($1, $2, $3, 1) RETURNING id",
        )
        .bind(name_t.unwrap_or("Walk-in"))
        .bind(mob)
        .bind(addr_t)
        .fetch_one(pool).await
        .map_err(|e| format!("Failed to create customer: {e}"))?;
        return Ok(Some(new_id));
    }

    // 2. No mobile — fall back to the session's existing customer.
    if let Some(cid) = existing_id {
        sqlx::query(
            "UPDATE customer_information
             SET customer_name = COALESCE($2, customer_name),
                 address_line1 = COALESCE($3, address_line1),
                 updated_at    = NOW()
             WHERE id = $1",
        )
        .bind(cid).bind(name_t).bind(addr_t)
        .execute(pool).await.ok();
        return Ok(Some(cid));
    }

    // 3. Last resort — create from the name alone.
    if let Some(nm) = name_t {
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO customer_information (customer_name, address_line1, is_active)
             VALUES ($1, $2, 1) RETURNING id",
        )
        .bind(nm).bind(addr_t)
        .fetch_one(pool).await
        .map_err(|e| format!("Failed to create customer: {e}"))?;
        return Ok(Some(new_id));
    }

    Ok(None)
}

#[tauri::command]
pub async fn settle_bill(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    session_id:     i32,
    bill_id:        i32,
    payment_type:   String,
    payment_amount: f64,
    reference_no:   Option<String>,
    part_payments:  Vec<PartPaymentInput>,
    write_off_amount: f64,
    tip_amount:       Option<f64>,
    customer_name:    Option<String>,
    customer_mobile:  Option<String>,
    customer_address: Option<String>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Tip sits on top of the net total. `payment_amount` already includes it, so
    // strip it back out to learn how much was applied to the bill itself.
    let tip = round2(tip_amount.unwrap_or(0.0).max(0.0));

    // Persist customer snapshot on the session (delivery / takeaway captures)
    if customer_name.is_some() || customer_mobile.is_some() || customer_address.is_some() {
        sqlx::query(
            "UPDATE order_session
             SET    customer_name    = COALESCE($2, customer_name),
                    customer_mobile  = COALESCE($3, customer_mobile),
                    delivery_address = COALESCE($4, delivery_address),
                    updated_at       = NOW()
             WHERE  id = $1",
        )
        .bind(session_id)
        .bind(customer_name.as_deref().filter(|s| !s.trim().is_empty()))
        .bind(customer_mobile.as_deref().filter(|s| !s.trim().is_empty()))
        .bind(customer_address.as_deref().filter(|s| !s.trim().is_empty()))
        .execute(&pool)
        .await
        .ok();
    }

    // Get net_amount and table_id
    let bill_row = sqlx::query(
        "SELECT bm.net_amount::float8 AS net_amount, os.table_id, os.customer_id
         FROM   bill_master bm
         JOIN   order_session os ON os.id = bm.order_session_id
         WHERE  bm.id = $1",
    )
    .bind(bill_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Bill not found: {e}"))?;

    let net_amount:  f64        = bill_row.try_get::<f64, _>("net_amount").unwrap_or(0.0);
    let table_id:    Option<i32> = bill_row.try_get("table_id").ok().flatten();
    let customer_id: Option<i32> = bill_row.try_get("customer_id").ok().flatten();

    // For a DUE settlement, ensure the customer exists on record (find/update/
    // create by mobile) and attach them to the session so the due is tracked.
    let is_nc_method  = payment_type.eq_ignore_ascii_case("NC");
    let is_due_method = payment_type.eq_ignore_ascii_case("DUE");
    let effective_customer_id = if is_due_method {
        let cid = resolve_due_customer(&pool, customer_id, &customer_name, &customer_mobile, &customer_address).await?;
        if let Some(c) = cid {
            sqlx::query("UPDATE order_session SET customer_id = $2, updated_at = NOW() WHERE id = $1")
                .bind(session_id).bind(c).execute(&pool).await.ok();
        }
        cid
    } else {
        customer_id
    };

    // Insert payment_master (with a human-readable remark)
    let payment_remark = if !part_payments.is_empty() {
        let modes = part_payments.iter()
            .map(|p| format!("{} ₹{:.2}", p.payment_mode, p.amount))
            .collect::<Vec<_>>()
            .join(", ");
        format!("Split payment — {} (total ₹{:.2})", modes, payment_amount)
    } else if is_nc_method {
        match reference_no.as_deref().filter(|r| !r.trim().is_empty()) {
            Some(r) => format!("No Charge — bill ₹{:.2} written off ({})", net_amount, r),
            None    => format!("No Charge — bill ₹{:.2} written off", net_amount),
        }
    } else if is_due_method {
        format!("Due — ₹{:.2} paid now", payment_amount)
    } else {
        match reference_no.as_deref().filter(|r| !r.trim().is_empty()) {
            Some(r) => format!("{} payment ₹{:.2} (ref {})", payment_type, payment_amount, r),
            None    => format!("{} payment ₹{:.2}", payment_type, payment_amount),
        }
    };
    let payment_remark = if tip > 0.0 {
        format!("{} · incl. tip ₹{:.2}", payment_remark, tip)
    } else {
        payment_remark
    };

    let pay_id: i32 = sqlx::query_scalar(
        "INSERT INTO payment_master (bill_id, payment_type, payment_amount, reference_no, remarks)
         VALUES ($1, $2, $3, $4, $5) RETURNING id",
    )
    .bind(bill_id)
    .bind(&payment_type)
    .bind(payment_amount)
    .bind(reference_no.as_deref())
    .bind(&payment_remark)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to record payment: {e}"))?;

    // Part payment rows (if payment_type = PART)
    for pp in &part_payments {
        sqlx::query(
            "INSERT INTO payment_part_detail (payment_id, payment_mode, amount, reference_no)
             VALUES ($1, $2, $3, $4)",
        )
        .bind(pay_id)
        .bind(&pp.payment_mode)
        .bind(pp.amount)
        .bind(pp.reference_no.as_deref())
        .execute(&pool)
        .await
        .ok();
    }

    // Determine settlement type
    // NC: payment_amount = 0, write_off_amount = net_amount (frontend sets this)
    // The tip is excluded from the amount applied to the bill — it's not revenue
    // against the net total, just a pass-through to the waiter.
    let total_paid   = round2((payment_amount - tip).max(0.0));
    let pending      = if is_nc_method { 0.0 } else { round2((net_amount - total_paid - write_off_amount).max(0.0)) };
    let is_due       = !is_nc_method && (is_due_method || pending > 0.5);
    let settlement_type = if is_nc_method               { "NC" }
                          else if write_off_amount > 0.0 { "WRITE_OFF" }
                          else if is_due                 { "DUE" }
                          else                           { "FULL" };

    let nc_remark_text = reference_no.as_deref().filter(|r| !r.trim().is_empty())
        .map(|r| format!(" — {}", r))
        .unwrap_or_default();
    let settlement_remark = match settlement_type {
        "NC"         => format!("No Charge — ₹{:.2} written off{}", net_amount, nc_remark_text),
        "WRITE_OFF"  => format!("Write-off ₹{:.2} · paid ₹{:.2} of ₹{:.2}", write_off_amount, total_paid, net_amount),
        "DUE"        => format!("Due ₹{:.2} pending · paid ₹{:.2} of ₹{:.2} via {}", pending, total_paid, net_amount, payment_type),
        _            => format!("Settled in full — ₹{:.2} via {}", total_paid, payment_type),
    };

    sqlx::query(
        "INSERT INTO settlement_master
            (bill_id, settlement_type, settled_amount, pending_amount, write_off_amount, settlement_remarks)
         VALUES ($1,$2,$3,$4,$5,$6)",
    )
    .bind(bill_id)
    .bind(settlement_type)
    .bind(total_paid)
    .bind(pending)
    .bind(write_off_amount)
    .bind(&settlement_remark)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to record settlement: {e}"))?;

    // If DUE, record it in customer_due_ledger with every field populated.
    if is_due {
        if let Some(cid) = effective_customer_id {
            sqlx::query(
                "INSERT INTO customer_due_ledger
                    (customer_id, bill_id, total_amount, paid_amount, pending_amount,
                     due_status, due_date, remarks, is_active)
                 VALUES ($1,$2,$3,$4,$5,'PENDING', NOW(), $6, 1)",
            )
            .bind(cid)
            .bind(bill_id)
            .bind(net_amount)
            .bind(total_paid)
            .bind(pending)
            .bind(format!("Due recorded at settlement of bill #{bill_id}"))
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to record due: {e}"))?;
        } else if is_due_method {
            return Err("Customer name and mobile are required to record a due.".into());
        }
    }

    // Update bill_master
    let new_bill_status = if is_due { "DUE" } else { "PAID" };
    sqlx::query(
        "UPDATE bill_master
         SET    paid_amount = $1, due_amount = $2, write_off_amount = $3,
                tip_amount = $4, bill_status = $5, settled_at = NOW(), updated_at = NOW()
         WHERE  id = $6",
    )
    .bind(total_paid)
    .bind(pending)
    .bind(write_off_amount)
    .bind(tip)
    .bind(new_bill_status)
    .bind(bill_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update bill status: {e}"))?;

    // Update order_session
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'SETTLED', settled_at = NOW(), updated_at = NOW(),
                total_occupancy_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60)::integer)
         WHERE  id = $1",
    )
    .bind(session_id)
    .execute(&pool)
    .await
    .ok();

    // Release table
    if let Some(tid) = table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'AVAILABLE',
                    current_order_session_id = NULL,
                    occupied_since = NULL,
                    updated_at = NOW()
             WHERE  id = $1",
        )
        .bind(tid)
        .execute(&pool)
        .await
        .ok();

        // Table session history
        sqlx::query(
            "INSERT INTO table_session_history
                (table_id, order_session_id, opened_at, closed_at, total_minutes)
             SELECT rt.id, $1, os.opened_at, NOW(),
                    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - os.opened_at)) / 60)::integer)
             FROM   restaurant_table rt
             JOIN   order_session os ON os.id = $1
             WHERE  rt.id = $2",
        )
        .bind(session_id)
        .bind(tid)
        .execute(&pool)
        .await
        .ok();
    }

    // Audit
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'PAYMENT_DONE', $2)",
    )
    .bind(session_id)
    .bind(format!("Settled via {} — ₹{:.2}", payment_type, total_paid))
    .execute(&pool)
    .await
    .ok();

    // Complete the linked reservation and record the settled bill_id
    sqlx::query(
        "UPDATE reservation_master
         SET    reservation_status = 'COMPLETED',
                bill_id    = $2,
                updated_at = NOW()
         WHERE  order_session_id = $1
           AND  reservation_status = 'ARRIVED'
           AND  is_active = 1",
    )
    .bind(session_id)
    .bind(bill_id)
    .execute(&pool)
    .await
    .ok();

    Ok(())
}

// ── Reservations ──────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ReservationRow {
    pub id:                    i32,
    pub code:                  i64,
    pub reservation_no:        Option<String>,
    pub table_id:              Option<i32>,
    pub table_name:            Option<String>,
    pub table_group_name:      Option<String>,
    pub customer_name:         Option<String>,
    pub customer_mobile:       Option<String>,
    pub guest_count:           i32,
    pub reservation_date:      Option<String>,
    pub reservation_time:      Option<String>,
    pub duration_minutes:      i32,
    pub reservation_status:    String,
    pub notes:                 Option<String>,
    pub arrived_at:            Option<String>,
    pub expires_at:            Option<String>,
    pub order_session_id:      Option<i32>,
    pub preferred_waiter_id:   Option<i32>,
    pub preferred_waiter_name: Option<String>,
    // Settled bill info (populated after COMPLETED)
    pub bill_id:               Option<i32>,
    pub bill_no:               Option<String>,
    pub bill_net_amount:       Option<f64>,
    pub bill_status:           Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EmployeeForBilling {
    pub id:   i32,
    pub code: Option<i64>,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateReservationInput {
    pub table_id:            Option<i32>,
    pub customer_name:       Option<String>,
    pub customer_mobile:     Option<String>,
    pub guest_count:         i32,
    pub reservation_date:    String,
    pub reservation_time:    String,
    pub duration_minutes:    Option<i32>,
    pub preferred_waiter_id: Option<i32>,
    pub notes:               Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReservationInput {
    pub table_id:            Option<i32>,
    pub customer_name:       Option<String>,
    pub customer_mobile:     Option<String>,
    pub guest_count:         i32,
    pub reservation_date:    String,
    pub reservation_time:    String,
    pub duration_minutes:    Option<i32>,
    pub preferred_waiter_id: Option<i32>,
    pub notes:               Option<String>,
}

// ── Internal helpers ──────────────────────────────────────────

fn validate_mobile(mobile: &str) -> Result<(), String> {
    let digits: String = mobile.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 7 || digits.len() > 15 {
        return Err("Mobile number must be 7–15 digits".into());
    }
    Ok(())
}

fn validate_guest_count(count: i32) -> Result<(), String> {
    if count < 1 || count > 999 {
        return Err("Guest count must be between 1 and 999".into());
    }
    Ok(())
}

fn validate_reservation_datetime(date: &str, time: &str) -> Result<(), String> {
    use chrono::{Local, NaiveDate, NaiveTime};
    let d = NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map_err(|_| "Invalid reservation date (YYYY-MM-DD required)".to_string())?;
    let t = NaiveTime::parse_from_str(time, "%H:%M")
        .or_else(|_| NaiveTime::parse_from_str(time, "%H:%M:%S"))
        .map_err(|_| "Invalid reservation time (HH:MM required)".to_string())?;
    let dt = d.and_time(t);
    let now = Local::now().naive_local();
    if dt < now - chrono::Duration::minutes(5) {
        return Err("Reservation cannot be set in the past".into());
    }
    Ok(())
}

async fn check_time_conflict(
    pool:          &sqlx::PgPool,
    table_id:      i32,
    date:          &str,
    time:          &str,
    duration_mins: i32,
    exclude_id:    Option<i32>,
) -> Result<(), String> {
    let conflict: Option<i32> = sqlx::query_scalar(
        "SELECT id FROM reservation_master
         WHERE  table_id = $1
           AND  reservation_date = $2::date
           AND  reservation_status IN ('RESERVED', 'ARRIVED')
           AND  is_active = 1
           AND  ($3::integer IS NULL OR id <> $3)
           AND  reservation_time < ($4::time + $5 * INTERVAL '1 minute')
           AND  (reservation_time + COALESCE(duration_minutes, 120) * INTERVAL '1 minute') > $4::time
         LIMIT 1",
    )
    .bind(table_id)
    .bind(date)
    .bind(exclude_id)
    .bind(time)
    .bind(duration_mins)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Conflict check failed: {e}"))?;

    if conflict.is_some() {
        return Err("This table already has a reservation that overlaps the requested time".into());
    }
    Ok(())
}

fn map_reservation_row(r: &sqlx::postgres::PgRow) -> ReservationRow {
    ReservationRow {
        id:                    r.try_get("id").unwrap_or(0),
        code:                  r.try_get("code").unwrap_or(0),
        reservation_no:        r.try_get("reservation_no").ok().flatten(),
        table_id:              r.try_get("table_id").ok().flatten(),
        table_name:            r.try_get("table_name").ok().flatten(),
        table_group_name:      r.try_get("table_group_name").ok().flatten(),
        customer_name:         r.try_get("customer_name").ok().flatten(),
        customer_mobile:       r.try_get("customer_mobile").ok().flatten(),
        guest_count:           r.try_get("guest_count").unwrap_or(1),
        reservation_date:      r.try_get("reservation_date").ok().flatten(),
        reservation_time:      r.try_get("reservation_time").ok().flatten(),
        duration_minutes:      r.try_get("duration_minutes").unwrap_or(120),
        reservation_status:    r.try_get("reservation_status").unwrap_or_else(|_| "RESERVED".to_string()),
        notes:                 r.try_get("notes").ok().flatten(),
        arrived_at:            r.try_get::<Option<chrono::NaiveDateTime>, _>("arrived_at")
                                .ok().flatten()
                                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        expires_at:            r.try_get::<Option<chrono::NaiveDateTime>, _>("expires_at")
                                .ok().flatten()
                                .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
        order_session_id:      r.try_get("order_session_id").ok().flatten(),
        preferred_waiter_id:   r.try_get("preferred_waiter_id").ok().flatten(),
        preferred_waiter_name: r.try_get("preferred_waiter_name").ok().flatten(),
        bill_id:               r.try_get("bill_id").ok().flatten(),
        bill_no:               r.try_get("bill_no").ok().flatten(),
        bill_net_amount:       r.try_get::<Option<f64>, _>("bill_net_amount").ok().flatten(),
        bill_status:           r.try_get("bill_status").ok().flatten(),
    }
}

const RESERVATION_SELECT: &str =
    "SELECT rm.id, rm.code, rm.reservation_no,
            rm.table_id, rt.table_name, tg.name AS table_group_name,
            rm.customer_name, rm.customer_mobile,
            COALESCE(rm.guest_count, 1)          AS guest_count,
            rm.reservation_date::text             AS reservation_date,
            rm.reservation_time::text             AS reservation_time,
            COALESCE(rm.duration_minutes, 120)   AS duration_minutes,
            COALESCE(rm.reservation_status, 'RESERVED') AS reservation_status,
            rm.notes, rm.arrived_at, rm.expires_at,
            rm.order_session_id,
            rm.preferred_waiter_id,
            pw.name AS preferred_waiter_name,
            rm.bill_id,
            bm.bill_no,
            bm.net_amount::float8 AS bill_net_amount,
            bm.bill_status
     FROM   reservation_master rm
     LEFT JOIN restaurant_table rt     ON rt.id = rm.table_id
     LEFT JOIN table_group tg          ON tg.id = rt.table_group_id
     LEFT JOIN employee_information pw ON pw.id = rm.preferred_waiter_id
     LEFT JOIN bill_master bm          ON bm.id = rm.bill_id";

// ── Commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn get_reservations(
    app:    tauri::AppHandle,
    state:  tauri::State<'_, AppState>,
    filter: Option<String>,
) -> Result<Vec<ReservationRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let date_clause = match filter.as_deref() {
        Some("TODAY")    => "AND rm.reservation_date = CURRENT_DATE",
        Some("UPCOMING") => "AND rm.reservation_date > CURRENT_DATE",
        // Default: show last 30 days + all future (frontend does client-side date filtering)
        _                => "AND rm.reservation_date >= CURRENT_DATE - INTERVAL '30 days'",
    };

    let sql = format!(
        "{RESERVATION_SELECT}
         WHERE  rm.is_active = 1
           AND  rm.reservation_status != 'CANCELLED'
           {date_clause}
         ORDER  BY rm.reservation_date, rm.reservation_time"
    );

    let rows = sqlx::query(&sql)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to load reservations: {e}"))?;

    Ok(rows.iter().map(map_reservation_row).collect())
}

#[tauri::command]
pub async fn get_reservation_by_id(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    reservation_id: i32,
) -> Result<ReservationRow, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let sql = format!(
        "{RESERVATION_SELECT}
         WHERE  rm.id = $1 AND rm.is_active = 1"
    );

    let row = sqlx::query(&sql)
        .bind(reservation_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Failed to load reservation: {e}"))?
        .ok_or_else(|| format!("Reservation #{reservation_id} not found"))?;

    Ok(map_reservation_row(&row))
}

#[tauri::command]
pub async fn create_reservation(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    input: CreateReservationInput,
) -> Result<i32, String> {
    validate_guest_count(input.guest_count)?;
    validate_reservation_datetime(&input.reservation_date, &input.reservation_time)?;
    if let Some(ref mobile) = input.customer_mobile {
        if !mobile.trim().is_empty() {
            validate_mobile(mobile)?;
        }
    }

    let duration = input.duration_minutes.unwrap_or(120).max(15);
    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(tid) = input.table_id {
        check_time_conflict(&pool, tid, &input.reservation_date, &input.reservation_time, duration, None).await?;
    }

    let mut tx = pool.begin().await.map_err(|e| format!("TX begin failed: {e}"))?;

    let reservation_id: i32 = sqlx::query_scalar(
        "INSERT INTO reservation_master
            (table_id, customer_name, customer_mobile, guest_count,
             reservation_date, reservation_time, duration_minutes, notes,
             reservation_status, preferred_waiter_id,
             expires_at)
         VALUES ($1, $2, $3, $4, $5::date, $6::time, $7, $8, 'RESERVED', $9,
                 ($5::date || ' ' || $6)::timestamp + $7 * INTERVAL '1 minute')
         RETURNING id",
    )
    .bind(input.table_id)
    .bind(input.customer_name.as_deref())
    .bind(input.customer_mobile.as_deref())
    .bind(input.guest_count)
    .bind(&input.reservation_date)
    .bind(&input.reservation_time)
    .bind(duration)
    .bind(input.notes.as_deref())
    .bind(input.preferred_waiter_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Failed to create reservation: {e}"))?;

    sqlx::query("UPDATE reservation_master SET reservation_no = $1 WHERE id = $2")
        .bind(format!("RES-{reservation_id:06}"))
        .bind(reservation_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to assign reservation_no: {e}"))?;

    if let Some(tid) = input.table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'RESERVED'
             WHERE  id = $1 AND current_status = 'AVAILABLE'",
        )
        .bind(tid)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update table status: {e}"))?;
    }

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(reservation_id)
}

#[tauri::command]
pub async fn update_reservation(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    reservation_id: i32,
    input:          UpdateReservationInput,
) -> Result<(), String> {
    validate_guest_count(input.guest_count)?;
    validate_reservation_datetime(&input.reservation_date, &input.reservation_time)?;
    if let Some(ref mobile) = input.customer_mobile {
        if !mobile.trim().is_empty() {
            validate_mobile(mobile)?;
        }
    }

    let duration = input.duration_minutes.unwrap_or(120).max(15);
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT reservation_status, table_id
         FROM   reservation_master
         WHERE  id = $1 AND is_active = 1",
    )
    .bind(reservation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to load reservation: {e}"))?
    .ok_or_else(|| format!("Reservation #{reservation_id} not found"))?;

    let current_status: String = row.try_get("reservation_status").unwrap_or_default();
    let old_table_id: Option<i32> = row.try_get("table_id").ok().flatten();

    if current_status != "RESERVED" {
        return Err(format!(
            "Cannot edit a reservation with status '{current_status}' — only RESERVED bookings can be edited"
        ));
    }

    if let Some(tid) = input.table_id {
        check_time_conflict(&pool, tid, &input.reservation_date, &input.reservation_time, duration, Some(reservation_id)).await?;
    }

    let mut tx = pool.begin().await.map_err(|e| format!("TX begin failed: {e}"))?;

    sqlx::query(
        "UPDATE reservation_master
         SET    table_id            = $1,
                customer_name       = $2,
                customer_mobile     = $3,
                guest_count         = $4,
                reservation_date    = $5::date,
                reservation_time    = $6::time,
                duration_minutes    = $7,
                notes               = $8,
                preferred_waiter_id = $9,
                expires_at          = ($5::date || ' ' || $6)::timestamp + $7 * INTERVAL '1 minute',
                updated_at          = NOW()
         WHERE  id = $10",
    )
    .bind(input.table_id)
    .bind(input.customer_name.as_deref())
    .bind(input.customer_mobile.as_deref())
    .bind(input.guest_count)
    .bind(&input.reservation_date)
    .bind(&input.reservation_time)
    .bind(duration)
    .bind(input.notes.as_deref())
    .bind(input.preferred_waiter_id)
    .bind(reservation_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update reservation: {e}"))?;

    if old_table_id != input.table_id {
        if let Some(old_tid) = old_table_id {
            sqlx::query(
                "UPDATE restaurant_table
                 SET    current_status = 'AVAILABLE'
                 WHERE  id = $1 AND current_status = 'RESERVED'
                   AND  current_order_session_id IS NULL",
            )
            .bind(old_tid)
            .execute(&mut *tx)
            .await
            .ok();
        }
        if let Some(new_tid) = input.table_id {
            sqlx::query(
                "UPDATE restaurant_table
                 SET    current_status = 'RESERVED'
                 WHERE  id = $1 AND current_status = 'AVAILABLE'",
            )
            .bind(new_tid)
            .execute(&mut *tx)
            .await
            .ok();
        }
    }

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn update_reservation_status(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    reservation_id: i32,
    status:         String,
) -> Result<(), String> {
    let allowed = ["RESERVED", "ARRIVED", "COMPLETED", "CANCELLED", "NO_SHOW"];
    if !allowed.contains(&status.as_str()) {
        return Err(format!("Invalid reservation status '{status}'"));
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT reservation_status, table_id
         FROM   reservation_master
         WHERE  id = $1 AND is_active = 1",
    )
    .bind(reservation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to load reservation: {e}"))?
    .ok_or_else(|| format!("Reservation #{reservation_id} not found"))?;

    let current_status: String = row.try_get("reservation_status").unwrap_or_default();
    let table_id: Option<i32> = row.try_get("table_id").ok().flatten();

    let valid_transition = matches!(
        (current_status.as_str(), status.as_str()),
        ("RESERVED", "ARRIVED")
        | ("RESERVED", "CANCELLED")
        | ("RESERVED", "NO_SHOW")
        | ("ARRIVED", "COMPLETED")
        | ("ARRIVED", "CANCELLED")
    );
    if !valid_transition {
        return Err(format!(
            "Cannot transition reservation from '{current_status}' to '{status}'"
        ));
    }

    let mut tx = pool.begin().await.map_err(|e| format!("TX begin failed: {e}"))?;

    if status == "ARRIVED" {
        sqlx::query(
            "UPDATE reservation_master
             SET    reservation_status = $1, arrived_at = NOW(), updated_at = NOW()
             WHERE  id = $2",
        )
        .bind(&status)
        .bind(reservation_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update reservation: {e}"))?;
    } else {
        sqlx::query(
            "UPDATE reservation_master
             SET    reservation_status = $1, updated_at = NOW()
             WHERE  id = $2",
        )
        .bind(&status)
        .bind(reservation_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to update reservation: {e}"))?;
    }

    if let Some(tid) = table_id {
        if matches!(status.as_str(), "CANCELLED" | "NO_SHOW" | "COMPLETED") {
            sqlx::query(
                "UPDATE restaurant_table
                 SET    current_status = 'AVAILABLE'
                 WHERE  id = $1 AND current_status = 'RESERVED'
                   AND  current_order_session_id IS NULL",
            )
            .bind(tid)
            .execute(&mut *tx)
            .await
            .ok();
        }
    }

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_reservation(
    app:            tauri::AppHandle,
    state:          tauri::State<'_, AppState>,
    reservation_id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT reservation_status, table_id
         FROM   reservation_master
         WHERE  id = $1 AND is_active = 1",
    )
    .bind(reservation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to load reservation: {e}"))?
    .ok_or_else(|| format!("Reservation #{reservation_id} not found"))?;

    let current_status: String = row.try_get("reservation_status").unwrap_or_default();
    let table_id: Option<i32> = row.try_get("table_id").ok().flatten();

    if matches!(current_status.as_str(), "COMPLETED" | "CANCELLED") {
        return Err(format!("Reservation is already '{current_status}'"));
    }

    let mut tx = pool.begin().await.map_err(|e| format!("TX begin failed: {e}"))?;

    sqlx::query(
        "UPDATE reservation_master
         SET    reservation_status = 'CANCELLED', updated_at = NOW()
         WHERE  id = $1",
    )
    .bind(reservation_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to cancel reservation: {e}"))?;

    if let Some(tid) = table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'AVAILABLE'
             WHERE  id = $1 AND current_status = 'RESERVED'
               AND  current_order_session_id IS NULL",
        )
        .bind(tid)
        .execute(&mut *tx)
        .await
        .ok();
    }

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn expire_no_show_reservations(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<u64, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let mut tx = pool.begin().await.map_err(|e| format!("TX begin failed: {e}"))?;

    let result = sqlx::query(
        "UPDATE reservation_master
         SET    reservation_status = 'NO_SHOW', updated_at = NOW()
         WHERE  reservation_status = 'RESERVED'
           AND  is_active          = 1
           AND  (reservation_date::date + reservation_time::time) + INTERVAL '15 minutes' < LOCALTIMESTAMP",
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to expire reservations: {e}"))?;

    let expired = result.rows_affected();

    // Release tables whose RESERVED status was left by a now-expired reservation
    sqlx::query(
        "UPDATE restaurant_table rt
         SET    current_status = 'AVAILABLE'
         FROM   reservation_master rm
         WHERE  rm.table_id                  = rt.id
           AND  rm.reservation_status        = 'NO_SHOW'
           AND  rt.current_status            = 'RESERVED'
           AND  rt.current_order_session_id IS NULL",
    )
    .execute(&mut *tx)
    .await
    .ok();

    tx.commit().await.map_err(|e| format!("TX commit failed: {e}"))?;

    Ok(expired)
}

#[tauri::command]
pub async fn get_employees_for_billing(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<EmployeeForBilling>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name FROM employee_information ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load employees: {e}"))?;

    Ok(rows.iter().map(|r| EmployeeForBilling {
        id:   r.try_get("id").unwrap_or(0),
        code: r.try_get("code").ok().flatten(),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

// ── Customer lookup / quick-create / session party assignment ──

#[derive(Debug, Serialize)]
pub struct CustomerOption {
    pub id:      i32,
    pub code:    Option<i64>,
    pub name:    Option<String>,
    pub mobile:  Option<String>,
    pub email:   Option<String>,
    pub address: Option<String>,
}

fn map_customer_option(r: &sqlx::postgres::PgRow) -> CustomerOption {
    CustomerOption {
        id:      r.try_get("id").unwrap_or(0),
        code:    r.try_get("code").ok().flatten(),
        name:    r.try_get("customer_name").ok().flatten(),
        mobile:  r.try_get("mobile_no1").ok().flatten(),
        email:   r.try_get("email_id").ok().flatten(),
        address: r.try_get("address_line1").ok().flatten(),
    }
}

/// Search customers by name, mobile, or code (for the billing party picker).
#[tauri::command]
pub async fn search_customers(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    query: String,
) -> Result<Vec<CustomerOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let q = query.trim();
    let pattern = format!("%{}%", q);

    let rows = sqlx::query(
        "SELECT id, code, customer_name, mobile_no1, email_id, address_line1
         FROM   customer_information
         WHERE  is_active = 1
           AND  customer_type = 'RESTAURANT'
           AND  ($1 = '' OR customer_name ILIKE $2
                        OR mobile_no1 ILIKE $2
                        OR CAST(code AS TEXT) = $1)
         ORDER  BY customer_name
         LIMIT  20",
    )
    .bind(q)
    .bind(&pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to search customers: {e}"))?;

    Ok(rows.iter().map(map_customer_option).collect())
}

/// Quick-create a customer (name + mobile + email + address) from the billing
/// screen. The new row lands in customer_information so it shows in the master.
#[tauri::command]
pub async fn quick_create_customer(
    app:     tauri::AppHandle,
    state:   tauri::State<'_, AppState>,
    name:    String,
    mobile:  Option<String>,
    email:   Option<String>,
    address: Option<String>,
) -> Result<CustomerOption, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let name = name.trim();
    if name.is_empty() {
        return Err("Customer name is required".into());
    }

    let row = sqlx::query(
        "INSERT INTO customer_information
            (customer_name, mobile_no1, email_id, address_line1, customer_type, is_active)
         VALUES ($1, $2, $3, $4, 'RESTAURANT', 1)
         RETURNING id, code, customer_name, mobile_no1, email_id, address_line1",
    )
    .bind(name)
    .bind(mobile.as_deref().filter(|s| !s.trim().is_empty()))
    .bind(email.as_deref().filter(|s| !s.trim().is_empty()))
    .bind(address.as_deref().filter(|s| !s.trim().is_empty()))
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to create customer: {e}"))?;

    Ok(map_customer_option(&row))
}

#[derive(Debug, Serialize)]
pub struct CustomerDueSummary {
    pub customer_id:   i32,
    pub customer_name: Option<String>,
    pub pending_total: f64,
    pub due_count:     i64,
}

/// Outstanding (unpaid) dues for the customer matching a mobile number.
/// Returns None when no customer is found. pending_total may be 0 if the
/// customer exists but has cleared all dues.
#[tauri::command]
pub async fn get_customer_due_by_mobile(
    app:    tauri::AppHandle,
    state:  tauri::State<'_, AppState>,
    mobile: String,
) -> Result<Option<CustomerDueSummary>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let m = mobile.trim();
    if m.is_empty() {
        return Ok(None);
    }

    let cust = sqlx::query(
        "SELECT id, customer_name FROM customer_information
         WHERE  mobile_no1 = $1 AND is_active = 1 AND customer_type = 'RESTAURANT' ORDER BY id LIMIT 1",
    )
    .bind(m)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Customer lookup failed: {e}"))?;

    let Some(c) = cust else { return Ok(None); };
    let customer_id:   i32            = c.try_get("id").unwrap_or(0);
    let customer_name: Option<String> = c.try_get("customer_name").ok().flatten();

    let row = sqlx::query(
        "SELECT COALESCE(SUM(pending_amount), 0)::float8 AS pending_total,
                COUNT(*)                                  AS due_count
         FROM   customer_due_ledger
         WHERE  customer_id = $1 AND due_status = 'PENDING' AND is_active = 1",
    )
    .bind(customer_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to load dues: {e}"))?;

    Ok(Some(CustomerDueSummary {
        customer_id,
        customer_name,
        pending_total: row.try_get::<f64, _>("pending_total").unwrap_or(0.0),
        due_count:     row.try_get("due_count").unwrap_or(0),
    }))
}

/// Assign / update customer and waiter on an existing order session.
#[tauri::command]
pub async fn update_session_party(
    app:             tauri::AppHandle,
    state:           tauri::State<'_, AppState>,
    session_id:      i32,
    customer_id:     Option<i32>,
    customer_name:   Option<String>,
    customer_mobile: Option<String>,
    waiter_id:       Option<i32>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE order_session
         SET    customer_id     = COALESCE($2, customer_id),
                customer_name   = COALESCE($3, customer_name),
                customer_mobile = COALESCE($4, customer_mobile),
                waiter_id       = COALESCE($5, waiter_id),
                updated_at      = NOW()
         WHERE  id = $1
           AND  session_status IN ('OPEN', 'KOT_SENT', 'BILL_PRINTED')",
    )
    .bind(session_id)
    .bind(customer_id)
    .bind(customer_name.as_deref().filter(|s| !s.trim().is_empty()))
    .bind(customer_mobile.as_deref().filter(|s| !s.trim().is_empty()))
    .bind(waiter_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update session party: {e}"))?;

    Ok(())
}

// ── KOT messages (master) + order item modifiers ──────────────

#[derive(Debug, Serialize)]
pub struct KotMessageOption {
    pub id:      i32,
    pub code:    Option<i64>,
    pub message: String,
}

/// Search KOT messages by text or code (for the per-item KOT message picker).
#[tauri::command]
pub async fn search_kot_messages(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    query: String,
) -> Result<Vec<KotMessageOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let q = query.trim();
    let pattern = format!("%{}%", q);

    let rows = sqlx::query(
        "SELECT id, code, kot_message
         FROM   kot_message
         WHERE  is_active = TRUE
           AND  ($1 = '' OR kot_message ILIKE $2 OR CAST(code AS TEXT) = $1)
         ORDER  BY kot_message
         LIMIT  20",
    )
    .bind(q)
    .bind(&pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to search KOT messages: {e}"))?;

    Ok(rows.iter().map(|r| KotMessageOption {
        id:      r.try_get("id").unwrap_or(0),
        code:    r.try_get("code").ok().flatten(),
        message: r.try_get("kot_message").unwrap_or_default(),
    }).collect())
}

/// Attach a KOT message to an order item (stored in order_item_modifier).
#[tauri::command]
pub async fn add_order_item_modifier(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
    modifier_name: String,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let name = modifier_name.trim();
    if name.is_empty() {
        return Err("Message is required".into());
    }

    let id: i32 = sqlx::query_scalar(
        "INSERT INTO order_item_modifier (order_item_id, modifier_name, modifier_rate, is_active)
         VALUES ($1, $2, 0, 1)
         RETURNING id",
    )
    .bind(order_item_id)
    .bind(name)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to add KOT message: {e}"))?;

    Ok(id)
}

/// Remove all KOT messages from an order item (clear before re-setting).
#[tauri::command]
pub async fn clear_order_item_modifiers(
    app:           tauri::AppHandle,
    state:         tauri::State<'_, AppState>,
    order_item_id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE order_item_modifier SET is_active = 0, updated_at = NOW()
         WHERE  order_item_id = $1 AND is_active = 1",
    )
    .bind(order_item_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to clear KOT messages: {e}"))?;

    Ok(())
}

// ── Restaurant dashboard ───────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TableGroupStat {
    pub group_name:   Option<String>,
    pub total:        i64,
    pub available:    i64,
    pub occupied:     i64,
    pub bill_printed: i64,
    pub reserved:     i64,
}

#[derive(Debug, Serialize)]
pub struct SalesToday {
    pub food_sales:     f64,
    pub beverage_sales: f64,
    pub total_sales:    f64,
    pub total_bills:    i64,
}

#[derive(Debug, Serialize)]
pub struct HourlySale {
    pub hour:        i32,
    pub food_sales:  f64,
    pub bev_sales:   f64,
    pub total_sales: f64,
}

#[derive(Debug, Serialize)]
pub struct RestaurantDashboard {
    pub table_groups:        Vec<TableGroupStat>,
    pub sales_today:         SalesToday,
    pub hourly_sales:        Vec<HourlySale>,
    pub active_sessions:     i64,
    pub todays_reservations: i64,
}

#[tauri::command]
pub async fn get_restaurant_dashboard(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<RestaurantDashboard, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Table occupancy grouped by section
    let group_rows = sqlx::query(
        "SELECT tg.name AS group_name,
                COUNT(rt.id)::bigint AS total,
                COUNT(CASE WHEN COALESCE(rt.current_status, 'AVAILABLE') = 'AVAILABLE' THEN 1 END)::bigint AS available,
                COUNT(CASE WHEN rt.current_status = 'OCCUPIED'
                            AND COALESCE(os.session_status, '') != 'BILL_PRINTED' THEN 1 END)::bigint AS occupied,
                COUNT(CASE WHEN rt.current_status = 'OCCUPIED'
                            AND os.session_status = 'BILL_PRINTED' THEN 1 END)::bigint AS bill_printed,
                COUNT(CASE WHEN rt.current_status = 'RESERVED' THEN 1 END)::bigint AS reserved
         FROM   restaurant_table rt
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id
         LEFT JOIN order_session os
               ON os.id = rt.current_order_session_id
              AND os.session_status IN ('OPEN', 'KOT_SENT', 'BILL_PRINTED')
         WHERE  rt.is_active = TRUE
         GROUP  BY tg.id, tg.name
         ORDER  BY tg.name NULLS LAST",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load table stats: {e}"))?;

    let table_groups = group_rows.iter().map(|r| TableGroupStat {
        group_name:   r.try_get("group_name").ok().flatten(),
        total:        r.try_get("total").unwrap_or(0),
        available:    r.try_get("available").unwrap_or(0),
        occupied:     r.try_get("occupied").unwrap_or(0),
        bill_printed: r.try_get("bill_printed").unwrap_or(0),
        reserved:     r.try_get("reserved").unwrap_or(0),
    }).collect();

    // Today's settled bill totals
    let sales_row = sqlx::query(
        "SELECT COALESCE(SUM(food_amount),   0)::float8 AS food_sales,
                COALESCE(SUM(liquor_amount), 0)::float8 AS beverage_sales,
                COALESCE(SUM(net_amount),    0)::float8 AS total_sales,
                COUNT(*)::bigint                         AS total_bills
         FROM   bill_master
         WHERE  bill_status = 'PAID'
           AND  DATE(settled_at) = CURRENT_DATE
           AND  is_active = 1",
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to load sales data: {e}"))?;

    let sales_today = SalesToday {
        food_sales:     sales_row.try_get("food_sales").unwrap_or(0.0),
        beverage_sales: sales_row.try_get("beverage_sales").unwrap_or(0.0),
        total_sales:    sales_row.try_get("total_sales").unwrap_or(0.0),
        total_bills:    sales_row.try_get("total_bills").unwrap_or(0),
    };

    // Hourly sales breakdown for today
    let hourly_rows = sqlx::query(
        "SELECT EXTRACT(HOUR FROM settled_at)::integer AS hour,
                COALESCE(SUM(food_amount),   0)::float8 AS food_sales,
                COALESCE(SUM(liquor_amount), 0)::float8 AS bev_sales,
                COALESCE(SUM(net_amount),    0)::float8 AS total_sales
         FROM   bill_master
         WHERE  bill_status = 'PAID'
           AND  DATE(settled_at) = CURRENT_DATE
           AND  is_active = 1
         GROUP  BY EXTRACT(HOUR FROM settled_at)
         ORDER  BY hour",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load hourly sales: {e}"))?;

    let hourly_sales = hourly_rows.iter().map(|r| HourlySale {
        hour:        r.try_get("hour").unwrap_or(0),
        food_sales:  r.try_get("food_sales").unwrap_or(0.0),
        bev_sales:   r.try_get("bev_sales").unwrap_or(0.0),
        total_sales: r.try_get("total_sales").unwrap_or(0.0),
    }).collect();

    // Live active sessions
    let active_sessions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_session
         WHERE  session_status IN ('OPEN', 'KOT_SENT', 'BILL_PRINTED')
           AND  is_active = 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    // Today's pending reservations
    let todays_reservations: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM reservation_master
         WHERE  reservation_date = CURRENT_DATE
           AND  reservation_status IN ('RESERVED', 'ARRIVED')
           AND  is_active = 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    Ok(RestaurantDashboard {
        table_groups,
        sales_today,
        hourly_sales,
        active_sessions,
        todays_reservations,
    })
}

// ─────────────────────────────────────────────────────────────
// Bill Reprint — structs + commands
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct BillReprintRow {
    pub id:               i32,
    pub bill_no:          Option<String>,
    pub order_session_id: i32,
    pub order_no:         Option<String>,
    pub table_name:       Option<String>,
    pub order_type:       Option<String>,
    pub customer_name:    Option<String>,
    pub customer_mobile:  Option<String>,
    pub gross_amount:     f64,
    pub discount_amount:  f64,
    pub tax_amount:       f64,
    pub net_amount:       f64,
    pub paid_amount:      f64,
    pub bill_status:      String,
    pub settled_at:       Option<String>,
    pub created_at:       Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BillReprintItem {
    pub id:              i32,
    pub item_name:       String,
    pub quantity:        f64,
    pub rate:            f64,
    pub gross_amount:    f64,
    pub discount_amount: f64,
    pub tax_amount:      f64,
    pub final_amount:    f64,
    pub is_complimentary: bool,
}

#[derive(Debug, Serialize)]
pub struct BillReprintTax {
    pub tax_name:       String,
    pub tax_percentage: f64,
    pub taxable_amount: f64,
    pub tax_amount:     f64,
}

#[derive(Debug, Serialize)]
pub struct BillReprintPayment {
    pub payment_type:   String,
    pub payment_amount: f64,
    pub reference_no:   Option<String>,
    pub created_at:     Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BillReprintDetail {
    pub id:              i32,
    pub bill_no:         Option<String>,
    pub order_no:        Option<String>,
    pub table_name:      Option<String>,
    pub order_type:      Option<String>,
    pub customer_name:   Option<String>,
    pub customer_mobile: Option<String>,
    pub gross_amount:    f64,
    pub discount_amount: f64,
    pub taxable_amount:  f64,
    pub tax_amount:      f64,
    pub round_off:       f64,
    pub net_amount:      f64,
    pub paid_amount:     f64,
    pub bill_status:     String,
    pub settled_at:      Option<String>,
    pub created_at:      Option<String>,
    pub items:           Vec<BillReprintItem>,
    pub tax_details:     Vec<BillReprintTax>,
    pub payments:        Vec<BillReprintPayment>,
}

/// Search settled bills (PAID or DUE status).
/// `search`    — optional: bill_no, order_no, bill id, customer name/mobile
/// `date_from` — optional: YYYY-MM-DD lower bound on settled_at / created_at
/// `date_to`   — optional: YYYY-MM-DD upper bound
#[tauri::command]
pub async fn search_settled_bills(
    app:       tauri::AppHandle,
    state:     tauri::State<'_, AppState>,
    search:    Option<String>,
    date_from: Option<String>,
    date_to:   Option<String>,
) -> Result<Vec<BillReprintRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Escape LIKE wildcards so a literal % or _ in the term doesn't act as a
    // pattern. The term is then used for case-insensitive contains/prefix
    // matching across bill no, order no, id, customer name and mobile.
    let search_val: Option<String> = search
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));

    let rows = sqlx::query(
        "SELECT bm.id,
                bm.bill_no,
                bm.order_session_id,
                os.order_no,
                rt.table_name,
                os.order_type,
                COALESCE(os.customer_name, ci.customer_name)  AS customer_name,
                COALESCE(os.customer_mobile, ci.mobile_no1)   AS customer_mobile,
                bm.gross_amount::float8,
                bm.discount_amount::float8,
                bm.tax_amount::float8,
                bm.net_amount::float8,
                bm.paid_amount::float8,
                bm.bill_status,
                to_char(bm.settled_at,  'YYYY-MM-DD HH24:MI:SS') AS settled_at,
                to_char(bm.created_at,  'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM   bill_master bm
         JOIN   order_session os  ON os.id = bm.order_session_id
         LEFT JOIN restaurant_table      rt ON rt.id = os.table_id
         LEFT JOIN customer_information  ci ON ci.id = bm.customer_id
         WHERE  (bm.bill_status IN ('PAID', 'DUE') OR os.session_status = 'SETTLED')
           AND  ($1::text IS NULL OR (
                    bm.bill_no                                      ILIKE '%' || $1 || '%'
                 OR os.order_no                                     ILIKE '%' || $1 || '%'
                 OR CAST(bm.id AS TEXT)                             ILIKE $1 || '%'
                 OR COALESCE(os.customer_name, ci.customer_name)    ILIKE '%' || $1 || '%'
                 OR COALESCE(os.customer_mobile, ci.mobile_no1)     ILIKE $1 || '%'
                ))
           AND  ($2::text IS NULL
                 OR COALESCE(bm.settled_at, bm.created_at)
                    >= TO_TIMESTAMP($2, 'YYYY-MM-DD'))
           AND  ($3::text IS NULL
                 OR COALESCE(bm.settled_at, bm.created_at)
                    < TO_TIMESTAMP($3, 'YYYY-MM-DD') + INTERVAL '1 day')
         ORDER  BY COALESCE(bm.settled_at, bm.created_at) DESC
         LIMIT  200",
    )
    .bind(search_val)
    .bind(date_from.as_deref())
    .bind(date_to.as_deref())
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to search settled bills: {e}"))?;

    Ok(rows.iter().map(|r| BillReprintRow {
        id:               r.try_get("id").unwrap_or(0),
        bill_no:          r.try_get("bill_no").ok().flatten(),
        order_session_id: r.try_get("order_session_id").unwrap_or(0),
        order_no:         r.try_get("order_no").ok().flatten(),
        table_name:       r.try_get("table_name").ok().flatten(),
        order_type:       r.try_get("order_type").ok().flatten(),
        customer_name:    r.try_get("customer_name").ok().flatten(),
        customer_mobile:  r.try_get("customer_mobile").ok().flatten(),
        gross_amount:     r.try_get("gross_amount").unwrap_or(0.0),
        discount_amount:  r.try_get("discount_amount").unwrap_or(0.0),
        tax_amount:       r.try_get("tax_amount").unwrap_or(0.0),
        net_amount:       r.try_get("net_amount").unwrap_or(0.0),
        paid_amount:      r.try_get("paid_amount").unwrap_or(0.0),
        bill_status:      r.try_get("bill_status").unwrap_or_else(|_| "PAID".to_string()),
        settled_at:       r.try_get("settled_at").ok().flatten(),
        created_at:       r.try_get("created_at").ok().flatten(),
    }).collect())
}

/// Full bill detail for reprint: header + items + tax breakdown + payments.
#[tauri::command]
pub async fn get_bill_for_reprint(
    app:    tauri::AppHandle,
    state:  tauri::State<'_, AppState>,
    bill_id: i32,
) -> Result<BillReprintDetail, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // ── Header ────────────────────────────────────────────────
    let hdr = sqlx::query(
        "SELECT bm.id, bm.bill_no,
                os.order_no, rt.table_name, os.order_type,
                COALESCE(os.customer_name, ci.customer_name)  AS customer_name,
                COALESCE(os.customer_mobile, ci.mobile_no1)   AS customer_mobile,
                bm.gross_amount::float8, bm.discount_amount::float8,
                bm.taxable_amount::float8, bm.tax_amount::float8,
                bm.round_off::float8, bm.net_amount::float8, bm.paid_amount::float8,
                bm.bill_status,
                to_char(bm.settled_at, 'YYYY-MM-DD HH24:MI:SS') AS settled_at,
                to_char(bm.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM   bill_master bm
         JOIN   order_session os  ON os.id = bm.order_session_id
         LEFT JOIN restaurant_table     rt ON rt.id = os.table_id
         LEFT JOIN customer_information ci ON ci.id = bm.customer_id
         WHERE  bm.id = $1",
    )
    .bind(bill_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Bill not found: {e}"))?;

    // ── Items ─────────────────────────────────────────────────
    let item_rows = sqlx::query(
        "SELECT id, item_name,
                quantity::float8, rate::float8,
                gross_amount::float8, discount_amount::float8,
                tax_amount::float8, final_amount::float8,
                COALESCE(is_complimentary, FALSE) AS is_complimentary
         FROM   bill_item
         WHERE  bill_id = $1 AND is_active = 1
         ORDER  BY id",
    )
    .bind(bill_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load bill items: {e}"))?;

    let items: Vec<BillReprintItem> = item_rows.iter().map(|r| BillReprintItem {
        id:              r.try_get("id").unwrap_or(0),
        item_name:       r.try_get("item_name").unwrap_or_default(),
        quantity:        r.try_get("quantity").unwrap_or(0.0),
        rate:            r.try_get("rate").unwrap_or(0.0),
        gross_amount:    r.try_get("gross_amount").unwrap_or(0.0),
        discount_amount: r.try_get("discount_amount").unwrap_or(0.0),
        tax_amount:      r.try_get("tax_amount").unwrap_or(0.0),
        final_amount:    r.try_get("final_amount").unwrap_or(0.0),
        is_complimentary: r.try_get("is_complimentary").unwrap_or(false),
    }).collect();

    // ── Tax details ───────────────────────────────────────────
    let tax_rows = sqlx::query(
        "SELECT tax_name,
                tax_percentage::float8, taxable_amount::float8, tax_amount::float8
         FROM   bill_tax_detail
         WHERE  bill_id = $1 AND is_active = 1
         ORDER  BY id",
    )
    .bind(bill_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load tax details: {e}"))?;

    let tax_details: Vec<BillReprintTax> = tax_rows.iter().map(|r| BillReprintTax {
        tax_name:       r.try_get("tax_name").unwrap_or_default(),
        tax_percentage: r.try_get("tax_percentage").unwrap_or(0.0),
        taxable_amount: r.try_get("taxable_amount").unwrap_or(0.0),
        tax_amount:     r.try_get("tax_amount").unwrap_or(0.0),
    }).collect();

    // ── Payments ──────────────────────────────────────────────
    let pay_rows = sqlx::query(
        "SELECT payment_type, payment_amount::float8, reference_no,
                to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM   payment_master
         WHERE  bill_id = $1 AND is_active = 1
         ORDER  BY id",
    )
    .bind(bill_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load payments: {e}"))?;

    let payments: Vec<BillReprintPayment> = pay_rows.iter().map(|r| BillReprintPayment {
        payment_type:   r.try_get("payment_type").unwrap_or_else(|_| "CASH".to_string()),
        payment_amount: r.try_get("payment_amount").unwrap_or(0.0),
        reference_no:   r.try_get("reference_no").ok().flatten(),
        created_at:     r.try_get("created_at").ok().flatten(),
    }).collect();

    Ok(BillReprintDetail {
        id:              hdr.try_get("id").unwrap_or(0),
        bill_no:         hdr.try_get("bill_no").ok().flatten(),
        order_no:        hdr.try_get("order_no").ok().flatten(),
        table_name:      hdr.try_get("table_name").ok().flatten(),
        order_type:      hdr.try_get("order_type").ok().flatten(),
        customer_name:   hdr.try_get("customer_name").ok().flatten(),
        customer_mobile: hdr.try_get("customer_mobile").ok().flatten(),
        gross_amount:    hdr.try_get("gross_amount").unwrap_or(0.0),
        discount_amount: hdr.try_get("discount_amount").unwrap_or(0.0),
        taxable_amount:  hdr.try_get("taxable_amount").unwrap_or(0.0),
        tax_amount:      hdr.try_get("tax_amount").unwrap_or(0.0),
        round_off:       hdr.try_get("round_off").unwrap_or(0.0),
        net_amount:      hdr.try_get("net_amount").unwrap_or(0.0),
        paid_amount:     hdr.try_get("paid_amount").unwrap_or(0.0),
        bill_status:     hdr.try_get("bill_status").unwrap_or_else(|_| "PAID".to_string()),
        settled_at:      hdr.try_get("settled_at").ok().flatten(),
        created_at:      hdr.try_get("created_at").ok().flatten(),
        items,
        tax_details,
        payments,
    })
}

// ── Table shift / item transfer ───────────────────────────────

/// Full table shift — re-point an entire session to a different table.
///
/// Nothing about the order itself changes: items, KOT numbers, occupied
/// time and visual state all hang off the session, so moving the session's
/// table pointer carries everything with it. Item prices are kept as-is
/// (a seat change is not a re-order). Source table is freed; target table
/// must be empty.
#[tauri::command]
pub async fn shift_table_full(
    app:             tauri::AppHandle,
    state:           tauri::State<'_, AppState>,
    session_id:      i32,
    target_table_id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Resolve the session: source table + status + its occupied_since
    let src = sqlx::query(
        "SELECT os.table_id, os.session_status, rt.occupied_since
         FROM   order_session os
         LEFT JOIN restaurant_table rt ON rt.id = os.table_id
         WHERE  os.id = $1 AND os.is_active = 1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Session lookup failed: {e}"))?
    .ok_or_else(|| "Session not found.".to_string())?;

    let source_table_id: Option<i32> = src.try_get("table_id").ok().flatten();
    let session_status:  String      = src.try_get("session_status").unwrap_or_default();
    let occupied_since:  Option<chrono::NaiveDateTime> = src.try_get("occupied_since").ok().flatten();

    if matches!(session_status.as_str(), "SETTLED" | "CANCELLED") {
        return Err("This order is already closed — nothing to shift.".into());
    }
    if source_table_id == Some(target_table_id) {
        return Err("Source and destination are the same table.".into());
    }

    // Target must be active and free (no live session)
    let target = sqlx::query(
        "SELECT table_group_id, current_order_session_id
         FROM   restaurant_table
         WHERE  id = $1 AND is_active = TRUE",
    )
    .bind(target_table_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Target table lookup failed: {e}"))?
    .ok_or_else(|| "Destination table not found.".to_string())?;

    let target_group_id: Option<i32> = target.try_get("table_group_id").ok().flatten();
    let target_busy:     Option<i32> = target.try_get("current_order_session_id").ok().flatten();
    if target_busy.is_some() {
        return Err("Destination table already has a running order. Use item transfer to merge instead.".into());
    }

    let mut tx = pool.begin().await.map_err(|e| format!("Transaction start failed: {e}"))?;

    // Re-point the session to the new table + group
    sqlx::query(
        "UPDATE order_session
         SET    table_id = $1, table_group_id = $2, updated_at = NOW()
         WHERE  id = $3",
    )
    .bind(target_table_id)
    .bind(target_group_id)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move session: {e}"))?;

    // Free the source table
    if let Some(src_id) = source_table_id {
        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'AVAILABLE',
                    current_order_session_id = NULL,
                    occupied_since = NULL
             WHERE  id = $1",
        )
        .bind(src_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to free source table: {e}"))?;
    }

    // Occupy the target table — copy the original occupied_since so the
    // floor timer carries over.
    sqlx::query(
        "UPDATE restaurant_table
         SET    current_status = 'OCCUPIED',
                current_order_session_id = $1,
                occupied_since = COALESCE($2, NOW())
         WHERE  id = $3",
    )
    .bind(session_id)
    .bind(occupied_since)
    .bind(target_table_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to occupy destination table: {e}"))?;

    // KOTs, any open bill, and a linked reservation all follow the table
    sqlx::query(
        "UPDATE kot_master
         SET    table_id = $1, updated_at = NOW(),
                remarks  = COALESCE(remarks || ' · ', '') || 'Table transfer'
         WHERE  order_session_id = $2",
    )
    .bind(target_table_id)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move KOTs: {e}"))?;

    sqlx::query(
        "UPDATE bill_master SET table_id = $1
         WHERE  order_session_id = $2 AND bill_status NOT IN ('PAID', 'CANCELLED')",
    )
    .bind(target_table_id)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move bill: {e}"))?;

    sqlx::query(
        "UPDATE reservation_master SET table_id = $1, updated_at = NOW()
         WHERE  order_session_id = $2 AND is_active = 1",
    )
    .bind(target_table_id)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move reservation: {e}"))?;

    tx.commit().await.map_err(|e| format!("Transaction commit failed: {e}"))?;

    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'TABLE_SHIFTED', $2)",
    )
    .bind(session_id)
    .bind(format!("Session moved to table {target_table_id}"))
    .execute(&pool)
    .await
    .ok();

    Ok(())
}

/// Partial item transfer — move selected order items from one session to a
/// different table. If the target has a live session the items merge into it,
/// otherwise a fresh session is opened on the target. Items already sent to
/// the kitchen are regrouped under a new "transfer" KOT on the destination so
/// the KOT belongs to the new table. Prices are kept as snapshots.
/// If the source ends up empty it is cancelled and its table freed.
#[tauri::command]
pub async fn transfer_order_items(
    app:               tauri::AppHandle,
    state:             tauri::State<'_, AppState>,
    source_session_id: i32,
    target_table_id:   i32,
    item_ids:          Vec<i32>,
) -> Result<i32, String> {
    if item_ids.is_empty() {
        return Err("No items selected to move.".into());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // Source session — must be live
    let src = sqlx::query(
        "SELECT table_id, order_type, session_status
         FROM   order_session
         WHERE  id = $1 AND is_active = 1",
    )
    .bind(source_session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Source session lookup failed: {e}"))?
    .ok_or_else(|| "Source session not found.".to_string())?;

    let source_table_id: Option<i32> = src.try_get("table_id").ok().flatten();
    let order_type:      String      = src.try_get("order_type").ok().flatten().unwrap_or_else(|| "DINE_IN".to_string());
    let src_status:      String      = src.try_get("session_status").unwrap_or_default();

    if matches!(src_status.as_str(), "SETTLED" | "CANCELLED") {
        return Err("This order is already closed — nothing to move.".into());
    }
    if source_table_id == Some(target_table_id) {
        return Err("Source and destination are the same table.".into());
    }

    // Validate the selected items belong to the source session and are active
    let valid_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  id = ANY($1) AND order_session_id = $2 AND item_status = 'ACTIVE'",
    )
    .bind(&item_ids)
    .bind(source_session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Item validation failed: {e}"))?;

    if valid_count as usize != item_ids.len() {
        return Err("Some selected items are no longer available on the source table.".into());
    }

    // Target table + group + any live session
    let target = sqlx::query(
        "SELECT table_group_id, current_order_session_id
         FROM   restaurant_table
         WHERE  id = $1 AND is_active = TRUE",
    )
    .bind(target_table_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Target table lookup failed: {e}"))?
    .ok_or_else(|| "Destination table not found.".to_string())?;

    let target_group_id: Option<i32> = target.try_get("table_group_id").ok().flatten();
    let existing_dest:   Option<i32> = target.try_get("current_order_session_id").ok().flatten();

    let mut tx = pool.begin().await.map_err(|e| format!("Transaction start failed: {e}"))?;

    // Resolve / create the destination session
    let dest_session_id: i32 = if let Some(dest) = existing_dest {
        dest
    } else {
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO order_session (order_type, table_id, table_group_id, session_status)
             VALUES ($1, $2, $3, 'OPEN') RETURNING id",
        )
        .bind(&order_type)
        .bind(target_table_id)
        .bind(target_group_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to open destination session: {e}"))?;

        let order_no = format!("ORD-{new_id}");
        sqlx::query("UPDATE order_session SET order_no = $1, token_no = $1 WHERE id = $2")
            .bind(&order_no)
            .bind(new_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to assign order number: {e}"))?;

        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'OCCUPIED',
                    current_order_session_id = $1,
                    occupied_since = NOW()
             WHERE  id = $2",
        )
        .bind(new_id)
        .bind(target_table_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to occupy destination table: {e}"))?;

        new_id
    };

    // Classify every KOT the moved (already-sent) items belong to: how many of
    // its active items are moving versus its total. This decides per-KOT
    // whether the whole ticket follows or only part of it splits off.
    let kot_rows = sqlx::query(
        "SELECT km.id AS kot_id,
                COUNT(*) FILTER (WHERE oi.id = ANY($1)) AS moving,
                COUNT(*)                                AS total
         FROM   kot_master km
         JOIN   order_item oi ON oi.kot_id = km.id AND oi.item_status = 'ACTIVE'
         WHERE  km.id IN (SELECT DISTINCT kot_id FROM order_item
                          WHERE id = ANY($1) AND kot_id IS NOT NULL)
         GROUP  BY km.id",
    )
    .bind(&item_ids)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("KOT classification failed: {e}"))?;

    for row in &kot_rows {
        let kot_id: i32 = row.try_get("kot_id").unwrap_or(0);
        let moving: i64 = row.try_get("moving").unwrap_or(0);
        let total:  i64 = row.try_get("total").unwrap_or(0);

        if moving >= total {
            // Whole KOT follows the order — re-point the existing ticket to the
            // new table/session. No new KOT number is minted.
            sqlx::query(
                "UPDATE kot_master
                 SET    table_id = $1, order_session_id = $2, updated_at = NOW(),
                        remarks  = COALESCE(remarks || ' · ', '') || 'Table transfer'
                 WHERE  id = $3",
            )
            .bind(target_table_id)
            .bind(dest_session_id)
            .bind(kot_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to move KOT: {e}"))?;
        } else {
            // Split: only part of this ticket moves. Open a fresh transfer KOT
            // on the destination so the kitchen has a clear "these items → new
            // table" slip, and re-link just the moved items to it. The rest
            // stay on the original KOT at the source table.
            let new_kot: i32 = sqlx::query_scalar(
                "INSERT INTO kot_master (order_session_id, table_id, kot_status, remarks)
                 VALUES ($1, $2, 'PENDING', 'Table transfer') RETURNING id",
            )
            .bind(dest_session_id)
            .bind(target_table_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to create transfer KOT: {e}"))?;

            sqlx::query("UPDATE kot_master SET kot_no = $1 WHERE id = $2")
                .bind(format!("KOT-{new_kot}"))
                .bind(new_kot)
                .execute(&mut *tx)
                .await
                .ok();

            sqlx::query(
                "UPDATE kot_item SET kot_id = $1
                 WHERE  kot_id = $2 AND order_item_id = ANY($3)",
            )
            .bind(new_kot)
            .bind(kot_id)
            .bind(&item_ids)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to regroup KOT items: {e}"))?;

            sqlx::query(
                "UPDATE order_item SET kot_id = $1
                 WHERE  kot_id = $2 AND id = ANY($3)",
            )
            .bind(new_kot)
            .bind(kot_id)
            .bind(&item_ids)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to relink moved items: {e}"))?;
        }
    }

    // Move the order items to the destination session. Pending items (no KOT)
    // simply change table; sent items keep their now-correct kot_id.
    sqlx::query(
        "UPDATE order_item SET order_session_id = $1, updated_at = NOW()
         WHERE  id = ANY($2)",
    )
    .bind(dest_session_id)
    .bind(&item_ids)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to move items: {e}"))?;

    // Destination status: KOT_SENT if it now holds any sent item, else leave OPEN
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'KOT_SENT', updated_at = NOW()
         WHERE  id = $1
           AND  session_status = 'OPEN'
           AND  EXISTS (SELECT 1 FROM order_item
                        WHERE order_session_id = $1
                          AND item_status = 'ACTIVE' AND kot_status = 'SENT')",
    )
    .bind(dest_session_id)
    .execute(&mut *tx)
    .await
    .ok();

    // Did the source run dry?
    let remaining: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(source_session_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Remaining-item check failed: {e}"))?;

    if remaining == 0 {
        sqlx::query(
            "UPDATE order_session
             SET    session_status = 'CANCELLED', settled_at = NOW(), updated_at = NOW(),
                    total_occupancy_minutes = GREATEST(
                        0, FLOOR(EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60)::integer)
             WHERE  id = $1",
        )
        .bind(source_session_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to close empty source session: {e}"))?;

        if let Some(src_id) = source_table_id {
            sqlx::query(
                "UPDATE restaurant_table
                 SET    current_status = 'AVAILABLE',
                        current_order_session_id = NULL,
                        occupied_since = NULL
                 WHERE  id = $1",
            )
            .bind(src_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to free emptied source table: {e}"))?;
        }
    }

    tx.commit().await.map_err(|e| format!("Transaction commit failed: {e}"))?;

    // Audit both sides — non-critical
    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'ITEMS_TRANSFERRED', $2)",
    )
    .bind(source_session_id)
    .bind(format!("{} item(s) moved to table {target_table_id}", item_ids.len()))
    .execute(&pool)
    .await
    .ok();

    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'ITEMS_RECEIVED', $2)",
    )
    .bind(dest_session_id)
    .bind(format!("{} item(s) received from session {source_session_id}", item_ids.len()))
    .execute(&pool)
    .await
    .ok();

    Ok(dest_session_id)
}

/// Item-quantity transfer request — one entry per order_item row to move.
#[derive(Debug, Deserialize)]
pub struct TransferQtyItem {
    pub item_id: i32,
    pub qty:     f64,
}

/// Like transfer_order_items but supports moving a partial quantity of a row.
/// When qty == item.quantity the row is moved wholesale; when qty < item.quantity
/// the source row is reduced in-place and a new cloned row is inserted on the
/// destination with the partial amount (amounts are scaled proportionally).
#[tauri::command]
pub async fn transfer_order_items_with_qty(
    app:               tauri::AppHandle,
    state:             tauri::State<'_, AppState>,
    source_session_id: i32,
    target_table_id:   i32,
    items:             Vec<TransferQtyItem>,
) -> Result<i32, String> {
    if items.is_empty() {
        return Err("No items selected to move.".into());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // Source session — must be live
    let src = sqlx::query(
        "SELECT table_id, order_type, session_status
         FROM   order_session
         WHERE  id = $1 AND is_active = 1",
    )
    .bind(source_session_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Source session lookup failed: {e}"))?
    .ok_or_else(|| "Source session not found.".to_string())?;

    let source_table_id: Option<i32> = src.try_get("table_id").ok().flatten();
    let order_type:      String      = src.try_get("order_type").ok().flatten().unwrap_or_else(|| "DINE_IN".to_string());
    let src_status:      String      = src.try_get("session_status").unwrap_or_default();

    if matches!(src_status.as_str(), "SETTLED" | "CANCELLED") {
        return Err("This order is already closed — nothing to move.".into());
    }
    if source_table_id == Some(target_table_id) {
        return Err("Source and destination are the same table.".into());
    }

    let item_ids: Vec<i32> = items.iter().map(|i| i.item_id).collect();

    // Validate that all selected items belong to this session and are active
    let valid_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  id = ANY($1) AND order_session_id = $2 AND item_status = 'ACTIVE'",
    )
    .bind(&item_ids)
    .bind(source_session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Item validation failed: {e}"))?;

    if valid_count as usize != item_ids.len() {
        return Err("Some selected items are no longer available on the source table.".into());
    }

    // Target table + group + any live session
    let target = sqlx::query(
        "SELECT table_group_id, current_order_session_id
         FROM   restaurant_table
         WHERE  id = $1 AND is_active = TRUE",
    )
    .bind(target_table_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Target table lookup failed: {e}"))?
    .ok_or_else(|| "Destination table not found.".to_string())?;

    let target_group_id: Option<i32> = target.try_get("table_group_id").ok().flatten();
    let existing_dest:   Option<i32> = target.try_get("current_order_session_id").ok().flatten();

    let mut tx = pool.begin().await.map_err(|e| format!("Transaction start failed: {e}"))?;

    // Resolve / create the destination session
    let dest_session_id: i32 = if let Some(dest) = existing_dest {
        dest
    } else {
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO order_session (order_type, table_id, table_group_id, session_status)
             VALUES ($1, $2, $3, 'OPEN') RETURNING id",
        )
        .bind(&order_type)
        .bind(target_table_id)
        .bind(target_group_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to open destination session: {e}"))?;

        let order_no = format!("ORD-{new_id}");
        sqlx::query("UPDATE order_session SET order_no = $1, token_no = $1 WHERE id = $2")
            .bind(&order_no)
            .bind(new_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to assign order number: {e}"))?;

        sqlx::query(
            "UPDATE restaurant_table
             SET    current_status = 'OCCUPIED',
                    current_order_session_id = $1,
                    occupied_since = NOW()
             WHERE  id = $2",
        )
        .bind(new_id)
        .bind(target_table_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to occupy destination table: {e}"))?;

        new_id
    };

    // For each item: if partial qty requested, split the row; collect the final
    // set of item_ids that will actually move to the destination.
    let mut dest_item_ids: Vec<i32> = Vec::new();

    for req in &items {
        let row = sqlx::query(
            "SELECT quantity, rate, gross_amount, discount_percent, discount_amount,
                    tax_name, tax_percentage, tax_amount, taxable_amount, final_amount,
                    menu_id, item_name, food_type_id, kitchen_section_id,
                    special_instruction, kot_id, kot_status
             FROM   order_item
             WHERE  id = $1 AND item_status = 'ACTIVE'",
        )
        .bind(req.item_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| format!("Item fetch failed: {e}"))?
        .ok_or_else(|| format!("Item {} not found", req.item_id))?;

        let full_qty: f64 = row.try_get::<f64, _>("quantity").unwrap_or(1.0);
        let move_qty = req.qty.min(full_qty).max(0.001);

        if (move_qty - full_qty).abs() < 0.001 {
            // Whole row moves — no split needed
            dest_item_ids.push(req.item_id);
        } else {
            // Partial — scale amounts proportionally
            let ratio = move_qty / full_qty;
            let remain_qty = full_qty - move_qty;
            let remain_ratio = remain_qty / full_qty;

            let gross:    f64 = row.try_get::<f64, _>("gross_amount").unwrap_or(0.0);
            let disc_pct: f64 = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
            let disc_amt: f64 = row.try_get::<f64, _>("discount_amount").unwrap_or(0.0);
            let tax_amt:  f64 = row.try_get::<f64, _>("tax_amount").unwrap_or(0.0);
            let taxable:  f64 = row.try_get::<f64, _>("taxable_amount").unwrap_or(0.0);
            let final_a:  f64 = row.try_get::<f64, _>("final_amount").unwrap_or(0.0);

            let tax_name:   Option<String> = row.try_get("tax_name").ok().flatten();
            let tax_pct:    f64            = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);
            let menu_id:    Option<i32>    = row.try_get("menu_id").ok().flatten();
            let item_name:  String         = row.try_get("item_name").unwrap_or_default();
            let ft_id:      Option<i32>    = row.try_get("food_type_id").ok().flatten();
            let ks_id:      Option<i32>    = row.try_get("kitchen_section_id").ok().flatten();
            let special:    Option<i32>    = row.try_get("special_instruction").ok().flatten();
            let kot_id:     Option<i32>    = row.try_get("kot_id").ok().flatten();
            let kot_status: String         = row.try_get("kot_status").unwrap_or_else(|_| "PENDING".to_string());

            // Reduce source row in-place
            sqlx::query(
                "UPDATE order_item
                 SET    quantity       = $1,
                        gross_amount   = $2,
                        discount_amount= $3,
                        tax_amount     = $4,
                        taxable_amount = $5,
                        final_amount   = $6,
                        updated_at     = NOW()
                 WHERE  id = $7",
            )
            .bind(remain_qty)
            .bind(gross    * remain_ratio)
            .bind(disc_amt * remain_ratio)
            .bind(tax_amt  * remain_ratio)
            .bind(taxable  * remain_ratio)
            .bind(final_a  * remain_ratio)
            .bind(req.item_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to reduce source item qty: {e}"))?;

            // Insert cloned row for the moved portion
            let new_item_id: i32 = sqlx::query_scalar(
                "INSERT INTO order_item
                     (order_session_id, menu_id, item_name, quantity, rate,
                      gross_amount, discount_percent, discount_amount,
                      tax_name, tax_percentage, tax_amount, taxable_amount, final_amount,
                      food_type_id, kitchen_section_id, special_instruction,
                      kot_status, item_status, kot_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'ACTIVE',$18)
                 RETURNING id",
            )
            .bind(dest_session_id)
            .bind(menu_id)
            .bind(&item_name)
            .bind(move_qty)
            .bind(row.try_get::<f64, _>("rate").unwrap_or(0.0))
            .bind(gross    * ratio)
            .bind(disc_pct)
            .bind(disc_amt * ratio)
            .bind(&tax_name)
            .bind(tax_pct)
            .bind(tax_amt  * ratio)
            .bind(taxable  * ratio)
            .bind(final_a  * ratio)
            .bind(ft_id)
            .bind(ks_id)
            .bind(special)
            .bind(&kot_status)
            .bind(kot_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to insert split item: {e}"))?;

            dest_item_ids.push(new_item_id);
        }
    }

    // KOT re-assignment for whole-row moves (same logic as transfer_order_items)
    let whole_ids: Vec<i32> = items.iter()
        .filter_map(|req| {
            // only items that were moved wholesale are in both item_ids and dest_item_ids at same position
            if dest_item_ids.contains(&req.item_id) { Some(req.item_id) } else { None }
        })
        .collect();

    if !whole_ids.is_empty() {
        let kot_rows = sqlx::query(
            "SELECT km.id AS kot_id,
                    COUNT(*) FILTER (WHERE oi.id = ANY($1)) AS moving,
                    COUNT(*)                                AS total
             FROM   kot_master km
             JOIN   order_item oi ON oi.kot_id = km.id AND oi.item_status = 'ACTIVE'
             WHERE  km.id IN (SELECT DISTINCT kot_id FROM order_item
                              WHERE id = ANY($1) AND kot_id IS NOT NULL)
             GROUP  BY km.id",
        )
        .bind(&whole_ids)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("KOT classification failed: {e}"))?;

        for row in &kot_rows {
            let kot_id: i32 = row.try_get("kot_id").unwrap_or(0);
            let moving: i64 = row.try_get("moving").unwrap_or(0);
            let total:  i64 = row.try_get("total").unwrap_or(0);

            if moving >= total {
                sqlx::query(
                    "UPDATE kot_master
                     SET    table_id = $1, order_session_id = $2, updated_at = NOW(),
                            remarks  = COALESCE(remarks || ' · ', '') || 'Table transfer'
                     WHERE  id = $3",
                )
                .bind(target_table_id)
                .bind(dest_session_id)
                .bind(kot_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to move KOT: {e}"))?;
            } else {
                let new_kot: i32 = sqlx::query_scalar(
                    "INSERT INTO kot_master (order_session_id, table_id, kot_status, remarks)
                     VALUES ($1, $2, 'PENDING', 'Table transfer') RETURNING id",
                )
                .bind(dest_session_id)
                .bind(target_table_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| format!("Failed to create transfer KOT: {e}"))?;

                sqlx::query("UPDATE kot_master SET kot_no = $1 WHERE id = $2")
                    .bind(format!("KOT-{new_kot}"))
                    .bind(new_kot)
                    .execute(&mut *tx)
                    .await
                    .ok();

                sqlx::query(
                    "UPDATE kot_item SET kot_id = $1
                     WHERE  kot_id = $2 AND order_item_id = ANY($3)",
                )
                .bind(new_kot)
                .bind(kot_id)
                .bind(&whole_ids)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to regroup KOT items: {e}"))?;

                sqlx::query(
                    "UPDATE order_item SET kot_id = $1
                     WHERE  kot_id = $2 AND id = ANY($3)",
                )
                .bind(new_kot)
                .bind(kot_id)
                .bind(&whole_ids)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Failed to relink moved items: {e}"))?;
            }
        }

        // Move whole-row items to destination session
        sqlx::query(
            "UPDATE order_item SET order_session_id = $1, updated_at = NOW()
             WHERE  id = ANY($2)",
        )
        .bind(dest_session_id)
        .bind(&whole_ids)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to move items: {e}"))?;
    }

    // Destination status: KOT_SENT if it holds any sent item
    sqlx::query(
        "UPDATE order_session
         SET    session_status = 'KOT_SENT', updated_at = NOW()
         WHERE  id = $1
           AND  session_status = 'OPEN'
           AND  EXISTS (SELECT 1 FROM order_item
                        WHERE order_session_id = $1
                          AND item_status = 'ACTIVE' AND kot_status = 'SENT')",
    )
    .bind(dest_session_id)
    .execute(&mut *tx)
    .await
    .ok();

    // Did the source run dry?
    let remaining: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(source_session_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Remaining-item check failed: {e}"))?;

    if remaining == 0 {
        sqlx::query(
            "UPDATE order_session
             SET    session_status = 'CANCELLED', settled_at = NOW(), updated_at = NOW(),
                    total_occupancy_minutes = GREATEST(
                        0, FLOOR(EXTRACT(EPOCH FROM (NOW() - opened_at)) / 60)::integer)
             WHERE  id = $1",
        )
        .bind(source_session_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to close empty source session: {e}"))?;

        if let Some(src_id) = source_table_id {
            sqlx::query(
                "UPDATE restaurant_table
                 SET    current_status = 'AVAILABLE',
                        current_order_session_id = NULL,
                        occupied_since = NULL
                 WHERE  id = $1",
            )
            .bind(src_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to free emptied source table: {e}"))?;
        }
    }

    tx.commit().await.map_err(|e| format!("Transaction commit failed: {e}"))?;

    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'ITEMS_TRANSFERRED', $2)",
    )
    .bind(source_session_id)
    .bind(format!("{} item(s) moved to table {target_table_id}", items.len()))
    .execute(&pool)
    .await
    .ok();

    sqlx::query(
        "INSERT INTO order_status_history (order_session_id, status_name, remarks)
         VALUES ($1, 'ITEMS_RECEIVED', $2)",
    )
    .bind(dest_session_id)
    .bind(format!("{} item(s) received from session {source_session_id}", items.len()))
    .execute(&pool)
    .await
    .ok();

    Ok(dest_session_id)
}
