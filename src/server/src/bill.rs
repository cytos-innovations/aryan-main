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
    pub rate_1:               f64,
    pub rate_2:               f64,
    pub rate_3:               f64,
    pub rate_4:               f64,
    pub rate_5:               f64,
    pub tax_name:             Option<String>,
    pub tax_percentage:       f64,
    pub allow_discount:       bool,
    pub max_discount_percent: f64,
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
    pub kot_status:           String,
    pub item_status:          String,
    pub special_instruction:  Option<String>,
    pub ordered_at:           Option<String>,
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

#[tauri::command]
pub async fn get_menu_for_billing(
    app:   tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuItemForBilling>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT mc.id, mc.code, mc.name AS item_name, mc.menu_alias,
                mc.menu_group_id AS group_id, mg.name AS group_name,
                mg.category_id, cat.name AS category_name,
                cat.allow_discount, cat.max_discount_percent,
                mc.food_type_id, ft.name AS food_type,
                mc.kitchen_section_id,
                (mc.liquor_group_id IS NOT NULL) AS is_liquor,
                mc.rate_1::float8, mc.rate_2::float8,
                mc.rate_3::float8, mc.rate_4::float8, mc.rate_5::float8,
                COALESCE(tax_info.tax_name, '')         AS tax_name,
                COALESCE(tax_info.tax_percentage, 0)::float8 AS tax_percentage
         FROM   menu_card mc
         JOIN   menu_group mg  ON mg.id  = mc.menu_group_id
         JOIN   menu_category cat ON cat.id = mg.category_id
         LEFT JOIN food_type ft ON ft.id = mc.food_type_id
         LEFT JOIN LATERAL (
             SELECT mctd.tax_percentage, tm.name AS tax_name
             FROM   menu_category_tax_detail mctd
             LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
             WHERE  mctd.category_id = cat.id
             ORDER  BY mctd.id
             LIMIT  1
         ) tax_info ON true
         WHERE  mc.is_active = TRUE
         ORDER  BY cat.name, mg.name, mc.name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load menu: {e}"))?;

    Ok(rows.iter().map(|r| {
        let tax_name_raw: String = r.try_get("tax_name").unwrap_or_default();
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
            rate_1:               r.try_get::<f64, _>("rate_1").unwrap_or(0.0),
            rate_2:               r.try_get::<f64, _>("rate_2").unwrap_or(0.0),
            rate_3:               r.try_get::<f64, _>("rate_3").unwrap_or(0.0),
            rate_4:               r.try_get::<f64, _>("rate_4").unwrap_or(0.0),
            rate_5:               r.try_get::<f64, _>("rate_5").unwrap_or(0.0),
            tax_name:             if tax_name_raw.is_empty() { None } else { Some(tax_name_raw) },
            tax_percentage:       r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
            allow_discount:       r.try_get("allow_discount").unwrap_or(false),
            max_discount_percent: r.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
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
                oi.kot_status, oi.item_status,
                oi.special_instruction, oi.ordered_at
         FROM   order_item oi
         LEFT JOIN food_type ft  ON ft.id  = oi.food_type_id
         LEFT JOIN menu_card mc  ON mc.id  = oi.menu_id
         WHERE  oi.order_session_id = $1
         ORDER  BY oi.ordered_at, oi.id",
    )
    .bind(session_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load order items: {e}"))?;

    Ok(rows.iter().map(|r| OrderItemRow {
        id:                   r.try_get("id").unwrap_or(0),
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
        kot_status:           r.try_get("kot_status").unwrap_or_else(|_| "PENDING".to_string()),
        item_status:          r.try_get("item_status").unwrap_or_else(|_| "ACTIVE".to_string()),
        special_instruction:  r.try_get("special_instruction").ok().flatten(),
        ordered_at:           r.try_get::<Option<chrono::NaiveDateTime>, _>("ordered_at")
                               .ok().flatten()
                               .map(|d| d.format("%Y-%m-%d %H:%M:%S").to_string()),
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
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

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
             SELECT mctd.tax_percentage, tm.name AS tax_name
             FROM   menu_category_tax_detail mctd
             LEFT JOIN tax_master tm ON tm.id = mctd.tax_id
             WHERE  mctd.category_id = cat.id
             ORDER  BY mctd.id
             LIMIT  1
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

    // Calculate amounts
    let gross_amount   = round2(rate * quantity);
    let taxable_amount = gross_amount;          // no discount at add time
    let tax_amount     = round2(taxable_amount * tax_pct / 100.0);
    let final_amount   = round2(taxable_amount + tax_amount);
    let tax_name_opt: Option<String> = if tax_name.is_empty() { None } else { Some(tax_name) };

    // ── Merge: if a PENDING item with same menu + instruction already exists, increment qty ──
    let existing = sqlx::query(
        "SELECT id, quantity::float8 AS quantity
         FROM   order_item
         WHERE  order_session_id = $1
           AND  menu_id          = $2
           AND  item_status      = 'ACTIVE'
           AND  kot_status       = 'PENDING'
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
    .map_err(|e| format!("Merge check failed: {e}"))?;

    if let Some(row) = existing {
        let existing_id:  i32 = row.try_get("id").unwrap_or(0);
        let existing_qty: f64 = row.try_get::<f64, _>("quantity").unwrap_or(0.0);
        let new_qty       = existing_qty + quantity;
        let g             = round2(rate * new_qty);
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

    let item_id: i32 = sqlx::query_scalar(
        "INSERT INTO order_item
            (order_session_id, menu_id, item_name, quantity, rate,
             gross_amount, discount_percent, discount_amount,
             tax_name, tax_percentage, tax_amount, taxable_amount, final_amount,
             food_type_id, kitchen_section_id, special_instruction,
             kot_status, item_status)
         VALUES ($1,$2,$3,$4,$5, $6,0,0, $7,$8,$9,$10,$11, $12,$13,$14, 'PENDING','ACTIVE')
         RETURNING id",
    )
    .bind(session_id)
    .bind(menu_id)
    .bind(&item_name)
    .bind(quantity)
    .bind(rate)
    .bind(gross_amount)
    .bind(tax_name_opt)
    .bind(tax_pct)
    .bind(tax_amount)
    .bind(taxable_amount)
    .bind(final_amount)
    .bind(food_type_id)
    .bind(kitchen_section_id)
    .bind(special_instruction)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to add order item: {e}"))?;

    Ok(item_id)
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
        "SELECT rate::float8, discount_percent::float8, tax_percentage::float8
         FROM   order_item WHERE id = $1",
    )
    .bind(order_item_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Order item not found: {e}"))?;

    let rate:     f64 = row.try_get::<f64, _>("rate").unwrap_or(0.0);
    let disc_pct: f64 = row.try_get::<f64, _>("discount_percent").unwrap_or(0.0);
    let tax_pct:  f64 = row.try_get::<f64, _>("tax_percentage").unwrap_or(0.0);

    let gross_amount   = round2(rate * quantity);
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

    // Tax breakdown
    let tax_rows = sqlx::query(
        "SELECT COALESCE(tax_name, 'No Tax')     AS tax_name,
                MAX(tax_percentage)::float8       AS tax_percentage,
                SUM(taxable_amount)::float8       AS taxable_amount,
                SUM(tax_amount)::float8           AS tax_amount
         FROM   order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'
         GROUP  BY tax_name",
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
    app:        tauri::AppHandle,
    state:      tauri::State<'_, AppState>,
    session_id: i32,
) -> Result<i32, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Validate: must have at least one active item
    let item_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM order_item
         WHERE  order_session_id = $1 AND item_status = 'ACTIVE'",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Item count failed: {e}"))?;

    if item_count == 0 {
        return Err("No active items to bill".to_string());
    }

    // Aggregate totals from active items
    let totals = sqlx::query(
        "SELECT COALESCE(SUM(gross_amount),    0)::float8 AS gross_amount,
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
    .map_err(|e| format!("Totals failed: {e}"))?;

    let gross_amount:    f64 = totals.try_get::<f64, _>("gross_amount").unwrap_or(0.0);
    let discount_amount: f64 = totals.try_get::<f64, _>("discount_amount").unwrap_or(0.0);
    let taxable_amount:  f64 = totals.try_get::<f64, _>("taxable_amount").unwrap_or(0.0);
    let tax_amount:      f64 = totals.try_get::<f64, _>("tax_amount").unwrap_or(0.0);
    let final_amount:    f64 = totals.try_get::<f64, _>("final_amount").unwrap_or(0.0);
    let round_off        = round2(final_amount.round() - final_amount);
    let net_amount       = round2(final_amount + round_off);

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

    // Copy order_items → bill_items
    sqlx::query(
        "INSERT INTO bill_item
            (bill_id, order_item_id, menu_id, item_name, quantity, rate,
             gross_amount, discount_amount, tax_amount, final_amount, kitchen_section_id)
         SELECT $1, id, menu_id, item_name, quantity, rate,
                gross_amount, discount_amount, tax_amount, final_amount, kitchen_section_id
         FROM   order_item
         WHERE  order_session_id = $2 AND item_status = 'ACTIVE'",
    )
    .bind(bill_id)
    .bind(session_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to copy bill items: {e}"))?;

    // Insert tax breakdown → bill_tax_detail
    sqlx::query(
        "INSERT INTO bill_tax_detail (bill_id, tax_name, tax_percentage, taxable_amount, tax_amount)
         SELECT $1,
                COALESCE(tax_name, 'No Tax'),
                MAX(tax_percentage),
                SUM(taxable_amount),
                SUM(tax_amount)
         FROM   order_item
         WHERE  order_session_id = $2 AND item_status = 'ACTIVE'
         GROUP  BY tax_name",
    )
    .bind(bill_id)
    .bind(session_id)
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
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Get net_amount and table_id
    let bill_row = sqlx::query(
        "SELECT bm.net_amount, os.table_id, os.customer_id
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

    // Insert payment_master
    let pay_id: i32 = sqlx::query_scalar(
        "INSERT INTO payment_master (bill_id, payment_type, payment_amount, reference_no)
         VALUES ($1, $2, $3, $4) RETURNING id",
    )
    .bind(bill_id)
    .bind(&payment_type)
    .bind(payment_amount)
    .bind(reference_no.as_deref())
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
    let total_paid   = round2(payment_amount);
    let pending      = round2((net_amount - total_paid - write_off_amount).max(0.0));
    let is_due       = payment_type == "DUE" || pending > 0.5;
    let settlement_type = if write_off_amount > 0.0 { "WRITE_OFF" }
                          else if is_due            { "DUE" }
                          else                      { "FULL" };

    sqlx::query(
        "INSERT INTO settlement_master
            (bill_id, settlement_type, settled_amount, pending_amount, write_off_amount)
         VALUES ($1,$2,$3,$4,$5)",
    )
    .bind(bill_id)
    .bind(settlement_type)
    .bind(total_paid)
    .bind(pending)
    .bind(write_off_amount)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to record settlement: {e}"))?;

    // If DUE, add to customer_due_ledger
    if is_due {
        if let Some(cid) = customer_id {
            sqlx::query(
                "INSERT INTO customer_due_ledger
                    (customer_id, bill_id, total_amount, paid_amount, pending_amount, due_status)
                 VALUES ($1,$2,$3,$4,$5,'PENDING')",
            )
            .bind(cid)
            .bind(bill_id)
            .bind(net_amount)
            .bind(total_paid)
            .bind(pending)
            .execute(&pool)
            .await
            .ok();
        }
    }

    // Update bill_master
    let new_bill_status = if is_due { "DUE" } else { "PAID" };
    sqlx::query(
        "UPDATE bill_master
         SET    paid_amount = $1, due_amount = $2, write_off_amount = $3,
                bill_status = $4, settled_at = NOW(), updated_at = NOW()
         WHERE  id = $5",
    )
    .bind(total_paid)
    .bind(pending)
    .bind(write_off_amount)
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
           AND  (reservation_date::date + reservation_time::time) + INTERVAL '15 minutes' < NOW()",
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
        "SELECT id, name FROM employee_information ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load employees: {e}"))?;

    Ok(rows.iter().map(|r| EmployeeForBilling {
        id:   r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}
