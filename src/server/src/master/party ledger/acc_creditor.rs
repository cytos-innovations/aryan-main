use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CreditorRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub mobile_no1: Option<String>,
    pub mobile_no2: Option<String>,
    pub email_id: Option<String>,
    pub opening_bal: f64,
    pub opening_crdr: String,
    pub closing_bal: f64,
    pub closing_crdr: String,
    pub tally_id: Option<i32>,
    pub tally_code: Option<i64>,
    pub tally_name: Option<String>,
    pub market_id: Option<i32>,
    pub market_name: Option<String>,
    pub gst_percent: f64,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedCreditors {
    pub data: Vec<CreditorRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_creditors(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedCreditors, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "sm.code",
        Some("name") => "sm.name",
        _ => "sm.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM supplier_master sm \
         WHERE sm.cust_type = 'C' AND sm.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT sm.id, sm.code, sm.name, sm.address1, sm.address2, \
                sm.mobile_no1, sm.mobile_no2, sm.email_id, \
                CAST(sm.opening_bal AS FLOAT8) AS opening_bal, sm.opening_crdr, \
                CAST(sm.closing_bal AS FLOAT8) AS closing_bal, sm.closing_crdr, \
                sm.tally_id, sm.market_id, sm.is_active, \
                CAST(sm.gst_percent AS FLOAT8) AS gst_percent, \
                tal.code AS tally_code, tal.name AS tally_name, \
                ms.name AS market_name \
         FROM supplier_master sm \
         LEFT JOIN tally_master tal ON tal.id = sm.tally_id \
         LEFT JOIN market_segment ms ON ms.id = sm.market_id \
         WHERE sm.cust_type = 'C' AND sm.name ILIKE $1 \
         ORDER BY {} {} LIMIT $2 OFFSET $3",
        order_col, dir
    );

    let rows = sqlx::query(&sql)
        .bind(&pattern)
        .bind(qs.per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| CreditorRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            address1: r.try_get("address1").ok().flatten(),
            address2: r.try_get("address2").ok().flatten(),
            mobile_no1: r.try_get("mobile_no1").ok().flatten(),
            mobile_no2: r.try_get("mobile_no2").ok().flatten(),
            email_id: r.try_get("email_id").ok().flatten(),
            opening_bal: r.try_get::<f64, _>("opening_bal").unwrap_or(0.0),
            opening_crdr: r.try_get("opening_crdr").unwrap_or_else(|_| "D".to_string()),
            closing_bal: r.try_get::<f64, _>("closing_bal").unwrap_or(0.0),
            closing_crdr: r.try_get("closing_crdr").unwrap_or_else(|_| "D".to_string()),
            tally_id: r.try_get("tally_id").ok().flatten(),
            tally_code: r.try_get("tally_code").ok().flatten(),
            tally_name: r.try_get("tally_name").ok().flatten(),
            market_id: r.try_get("market_id").ok().flatten(),
            market_name: r.try_get("market_name").ok().flatten(),
            gst_percent: r.try_get::<f64, _>("gst_percent").unwrap_or(0.0),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedCreditors { data, total })
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_creditor(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    address1: Option<String>,
    address2: Option<String>,
    mobile_no1: Option<String>,
    mobile_no2: Option<String>,
    email_id: Option<String>,
    opening_bal: f64,
    opening_crdr: String,
    closing_bal: f64,
    closing_crdr: String,
    tally_id: Option<i32>,
    market_id: Option<i32>,
    gst_percent: f64,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Party name is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Party code or name already exists".to_string()
        } else {
            format!("Failed to create creditor: {e}")
        }
    };

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO supplier_master \
             (code, name, address1, address2, mobile_no1, mobile_no2, email_id, \
              opening_bal, opening_crdr, closing_bal, closing_crdr, \
              cust_type, tally_id, market_id, gst_percent) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'C', $12, $13, $14) \
             RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(address1.as_deref())
        .bind(address2.as_deref())
        .bind(mobile_no1.as_deref())
        .bind(mobile_no2.as_deref())
        .bind(email_id.as_deref())
        .bind(opening_bal)
        .bind(&opening_crdr)
        .bind(closing_bal)
        .bind(&closing_crdr)
        .bind(tally_id)
        .bind(market_id)
        .bind(gst_percent)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO supplier_master \
             (name, address1, address2, mobile_no1, mobile_no2, email_id, \
              opening_bal, opening_crdr, closing_bal, closing_crdr, \
              cust_type, tally_id, market_id, gst_percent) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'C', $11, $12, $13) \
             RETURNING id",
        )
        .bind(&name)
        .bind(address1.as_deref())
        .bind(address2.as_deref())
        .bind(mobile_no1.as_deref())
        .bind(mobile_no2.as_deref())
        .bind(email_id.as_deref())
        .bind(opening_bal)
        .bind(&opening_crdr)
        .bind(closing_bal)
        .bind(&closing_crdr)
        .bind(tally_id)
        .bind(market_id)
        .bind(gst_percent)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    };

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_creditor(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    address1: Option<String>,
    address2: Option<String>,
    mobile_no1: Option<String>,
    mobile_no2: Option<String>,
    email_id: Option<String>,
    opening_bal: f64,
    opening_crdr: String,
    closing_bal: f64,
    closing_crdr: String,
    tally_id: Option<i32>,
    market_id: Option<i32>,
    gst_percent: f64,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Party name is required".to_string());
    }
    if code <= 0 {
        return Err("Party code is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE supplier_master SET \
         code = $1, name = $2, address1 = $3, address2 = $4, \
         mobile_no1 = $5, mobile_no2 = $6, email_id = $7, \
         opening_bal = $8, opening_crdr = $9, \
         closing_bal = $10, closing_crdr = $11, \
         tally_id = $12, market_id = $13, gst_percent = $14, \
         updated_at = NOW() \
         WHERE id = $15 AND cust_type = 'C'",
    )
    .bind(code)
    .bind(&name)
    .bind(address1.as_deref())
    .bind(address2.as_deref())
    .bind(mobile_no1.as_deref())
    .bind(mobile_no2.as_deref())
    .bind(email_id.as_deref())
    .bind(opening_bal)
    .bind(&opening_crdr)
    .bind(closing_bal)
    .bind(&closing_crdr)
    .bind(tally_id)
    .bind(market_id)
    .bind(gst_percent)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Party code or name already exists".to_string()
        } else {
            format!("Failed to update creditor: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_creditor_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE supplier_master SET is_active = $1, updated_at = NOW() \
         WHERE id = $2 AND cust_type = 'C'",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update creditor: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_creditor(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM supplier_master WHERE id = $1 AND cust_type = 'C'")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete creditor: {e}"))?;
    Ok(())
}
