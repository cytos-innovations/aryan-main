use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::Serialize;
use sqlx::Row;
use std::time::{SystemTime, UNIX_EPOCH};

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CustomerInfoRow {
    pub id: i32,
    pub code: i64,
    pub prefix: Option<String>,
    pub customer_name: String,
    pub dob: Option<String>,
    pub nationality: Option<String>,
    pub address_line1: Option<String>,
    pub address_line2: Option<String>,
    pub address_line3: Option<String>,
    pub mobile_no1: Option<String>,
    pub mobile_no2: Option<String>,
    pub email_id: Option<String>,
    pub pan_card: Option<String>,
    pub passport_no: Option<String>,
    pub passport_issue_date: Option<String>,
    pub passport_expiry_date: Option<String>,
    pub visa_no: Option<String>,
    pub visa_issue_date: Option<String>,
    pub visa_expiry_date: Option<String>,
    pub state_id: Option<i32>,
    pub state_name: Option<String>,
    pub city_id: Option<i32>,
    pub city_name: Option<String>,
    pub zip_code: Option<String>,
    pub ledger_id: Option<i64>,
    pub segment_name: Option<String>,
    pub customer_type: Option<String>,
    pub is_active: i32,
    pub has_documents: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedCustomerInfos {
    pub data: Vec<CustomerInfoRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StateSimple {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct CitySimple {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct CustomerDocRow {
    pub document_id: String,
    pub file_name: String,
    pub content_type: String,
    pub size: i64,
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

fn gen_doc_id() -> String {
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", t)
}

fn opt_str(s: Option<String>) -> Option<String> {
    s.and_then(|v| {
        let t = v.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    })
}

// Parse "YYYY-MM-DD" → NaiveDate for binding to TIMESTAMP columns
fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok()
}

#[allow(dead_code)]
fn fmt_ts(dt: Option<DateTime<Utc>>) -> Option<String> {
    dt.map(|d| d.format("%Y-%m-%d").to_string())
}

// ─────────────────────────────────────────────────────────────
// State / City — search & auto-create helpers
// ─────────────────────────────────────────────────────────────

/// Search state_master by partial name (max 20 results).
#[tauri::command]
pub async fn search_states(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    q: String,
) -> Result<Vec<StateSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", q.trim());
    let rows = sqlx::query(
        "SELECT id, name FROM state_master WHERE name ILIKE $1 AND is_active = 1 \
         ORDER BY name ASC LIMIT 20",
    )
    .bind(&pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("State search failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| StateSimple {
            id: r.try_get("id").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

/// Search city_master by partial name (max 20 results).
#[tauri::command]
pub async fn search_cities(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    q: String,
) -> Result<Vec<CitySimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", q.trim());
    let rows = sqlx::query(
        "SELECT id, name FROM city_master WHERE name ILIKE $1 AND is_active = 1 \
         ORDER BY name ASC LIMIT 20",
    )
    .bind(&pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("City search failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| CitySimple {
            id: r.try_get("id").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

/// Resolve state name → id. Creates a new state_master row if not found.
async fn resolve_state(pool: &sqlx::PgPool, name: &str) -> Result<i32, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("State name must not be empty".to_string());
    }
    // Try to find existing
    let existing: Option<i32> = sqlx::query_scalar(
        "SELECT id FROM state_master WHERE LOWER(name) = LOWER($1) LIMIT 1",
    )
    .bind(trimmed)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("State lookup failed: {e}"))?;

    if let Some(id) = existing {
        return Ok(id);
    }
    // Insert new
    let id: i32 = sqlx::query_scalar(
        "INSERT INTO state_master (name) VALUES ($1) RETURNING id",
    )
    .bind(trimmed)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to create state: {e}"))?;
    Ok(id)
}

/// Resolve city name → id. Creates a new city_master row if not found.
async fn resolve_city(pool: &sqlx::PgPool, name: &str) -> Result<i32, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("City name must not be empty".to_string());
    }
    let existing: Option<i32> = sqlx::query_scalar(
        "SELECT id FROM city_master WHERE LOWER(name) = LOWER($1) LIMIT 1",
    )
    .bind(trimmed)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("City lookup failed: {e}"))?;

    if let Some(id) = existing {
        return Ok(id);
    }
    let id: i32 = sqlx::query_scalar(
        "INSERT INTO city_master (name) VALUES ($1) RETURNING id",
    )
    .bind(trimmed)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to create city: {e}"))?;
    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// List / Get
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_customer_informations(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
    customer_type: String,
) -> Result<PagedCustomerInfos, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;
    let ctype = customer_type.trim().to_uppercase();

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "ci.code",
        Some("customer_name") => "ci.customer_name",
        Some("mobile_no1") => "ci.mobile_no1",
        Some("email_id") => "ci.email_id",
        _ => "ci.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM customer_information ci \
         WHERE ci.customer_type = $2 \
           AND (ci.customer_name ILIKE $1 OR ci.mobile_no1 ILIKE $1 OR ci.email_id ILIKE $1)",
    )
    .bind(&search_pattern)
    .bind(&ctype)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;

    let sql = format!(
        "SELECT ci.id, ci.code, ci.prefix, ci.customer_name, ci.dob, ci.nationality, \
                ci.address_line1, ci.address_line2, ci.address_line3, \
                ci.mobile_no1, ci.mobile_no2, ci.email_id, \
                ci.pan_card, ci.passport_no, ci.passport_issue_date, ci.passport_expiry_date, \
                ci.visa_no, ci.visa_issue_date, ci.visa_expiry_date, \
                ci.state_id, sm.name AS state_name, \
                ci.city_id, cm.name AS city_name, \
                ci.zip_code, ci.ledger_id, ms.name AS segment_name, ci.customer_type, ci.is_active, \
                EXISTS(SELECT 1 FROM customer_detail cd WHERE cd.cust_id = ci.id AND cd.is_active = 1) AS has_documents \
         FROM customer_information ci \
         LEFT JOIN state_master sm ON sm.id = ci.state_id \
         LEFT JOIN city_master cm ON cm.id = ci.city_id \
         LEFT JOIN market_segment ms ON ms.id = ci.ledger_id \
         WHERE ci.customer_type = $2 \
           AND (ci.customer_name ILIKE $1 OR ci.mobile_no1 ILIKE $1 OR ci.email_id ILIKE $1) \
         ORDER BY {} {} LIMIT $3 OFFSET $4",
        order_col, dir
    );

    let rows = sqlx::query(&sql)
        .bind(&search_pattern)
        .bind(&ctype)
        .bind(qs.per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| CustomerInfoRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            prefix: r.try_get("prefix").ok().flatten(),
            customer_name: r.try_get("customer_name").unwrap_or_default(),
            dob: r
                .try_get::<Option<NaiveDateTime>, _>("dob")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string()),
            nationality: r.try_get("nationality").ok().flatten(),
            address_line1: r.try_get("address_line1").ok().flatten(),
            address_line2: r.try_get("address_line2").ok().flatten(),
            address_line3: r.try_get("address_line3").ok().flatten(),
            mobile_no1: r.try_get("mobile_no1").ok().flatten(),
            mobile_no2: r.try_get("mobile_no2").ok().flatten(),
            email_id: r.try_get("email_id").ok().flatten(),
            pan_card: r.try_get("pan_card").ok().flatten(),
            passport_no: r.try_get("passport_no").ok().flatten(),
            passport_issue_date: r
                .try_get::<Option<NaiveDateTime>, _>("passport_issue_date")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string()),
            passport_expiry_date: r
                .try_get::<Option<NaiveDateTime>, _>("passport_expiry_date")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string()),
            visa_no: r.try_get("visa_no").ok().flatten(),
            visa_issue_date: r
                .try_get::<Option<NaiveDateTime>, _>("visa_issue_date")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string()),
            visa_expiry_date: r
                .try_get::<Option<NaiveDateTime>, _>("visa_expiry_date")
                .ok()
                .flatten()
                .map(|d| d.format("%Y-%m-%d").to_string()),
            state_id: r.try_get("state_id").ok().flatten(),
            state_name: r.try_get("state_name").ok().flatten(),
            city_id: r.try_get("city_id").ok().flatten(),
            city_name: r.try_get("city_name").ok().flatten(),
            zip_code: r.try_get("zip_code").ok().flatten(),
            ledger_id: r.try_get("ledger_id").ok().flatten(),
            segment_name: r.try_get("segment_name").ok().flatten(),
            customer_type: r.try_get("customer_type").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
            has_documents: r.try_get("has_documents").unwrap_or(false),
        })
        .collect();

    Ok(PagedCustomerInfos { data, total })
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_customer_information(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    prefix: Option<String>,
    customer_name: String,
    ledger_id: Option<i64>,
    dob: Option<String>,
    nationality: Option<String>,
    address_line1: Option<String>,
    address_line2: Option<String>,
    address_line3: Option<String>,
    state_name: Option<String>,
    city_name: Option<String>,
    zip_code: Option<String>,
    mobile_no1: Option<String>,
    mobile_no2: Option<String>,
    email_id: Option<String>,
    pan_card: Option<String>,
    passport_no: Option<String>,
    passport_issue_date: Option<String>,
    passport_expiry_date: Option<String>,
    visa_no: Option<String>,
    visa_issue_date: Option<String>,
    visa_expiry_date: Option<String>,
    customer_type: String,
) -> Result<i32, String> {
    let customer_name = customer_name.trim().to_string();
    if customer_name.is_empty() {
        return Err("Customer name is required".to_string());
    }
    let ctype = customer_type.trim().to_uppercase();
    if ctype != "LODGE" && ctype != "RESTAURANT" {
        return Err("Customer type must be LODGE or RESTAURANT".to_string());
    }
    if ledger_id.is_none() {
        return Err("Market segment is required".to_string());
    }
    if dob.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Date of birth is required".to_string());
    }
    if nationality.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Nationality is required".to_string());
    }
    if address_line1.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Address line 1 is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let state_id = match state_name.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Some(resolve_state(&pool, name).await?),
        None => None,
    };
    let city_id = match city_name.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Some(resolve_city(&pool, name).await?),
        None => None,
    };

    let dob_date = dob
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));

    let _pid = dob.as_deref().filter(|s| !s.trim().is_empty()).and(dob_date.as_ref());
    if dob.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false) && dob_date.is_none() {
        return Err("Invalid date of birth format. Use YYYY-MM-DD.".to_string());
    }

    let pp_issue = passport_issue_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let pp_expiry = passport_expiry_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let visa_issue = visa_issue_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let visa_expiry = visa_expiry_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));

    let new_id: i32 = sqlx::query_scalar(
        "INSERT INTO customer_information \
         (prefix, customer_name, ledger_id, dob, nationality, \
          address_line1, address_line2, address_line3, \
          state_id, city_id, zip_code, \
          mobile_no1, mobile_no2, email_id, \
          pan_card, passport_no, passport_issue_date, passport_expiry_date, \
          visa_no, visa_issue_date, visa_expiry_date, customer_type) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) \
         RETURNING id",
    )
    .bind(opt_str(prefix))
    .bind(&customer_name)
    .bind(ledger_id)
    .bind(dob_date)
    .bind(opt_str(nationality))
    .bind(opt_str(address_line1))
    .bind(opt_str(address_line2))
    .bind(opt_str(address_line3))
    .bind(state_id)
    .bind(city_id)
    .bind(opt_str(zip_code))
    .bind(opt_str(mobile_no1))
    .bind(opt_str(mobile_no2))
    .bind(opt_str(email_id))
    .bind(opt_str(pan_card))
    .bind(opt_str(passport_no))
    .bind(pp_issue)
    .bind(pp_expiry)
    .bind(opt_str(visa_no))
    .bind(visa_issue)
    .bind(visa_expiry)
    .bind(&ctype)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to create customer: {e}"))?;

    Ok(new_id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_customer_information(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    prefix: Option<String>,
    customer_name: String,
    ledger_id: Option<i64>,
    dob: Option<String>,
    nationality: Option<String>,
    address_line1: Option<String>,
    address_line2: Option<String>,
    address_line3: Option<String>,
    state_name: Option<String>,
    city_name: Option<String>,
    zip_code: Option<String>,
    mobile_no1: Option<String>,
    mobile_no2: Option<String>,
    email_id: Option<String>,
    pan_card: Option<String>,
    passport_no: Option<String>,
    passport_issue_date: Option<String>,
    passport_expiry_date: Option<String>,
    visa_no: Option<String>,
    visa_issue_date: Option<String>,
    visa_expiry_date: Option<String>,
) -> Result<(), String> {
    let customer_name = customer_name.trim().to_string();
    if customer_name.is_empty() {
        return Err("Customer name is required".to_string());
    }
    if ledger_id.is_none() {
        return Err("Market segment is required".to_string());
    }
    if dob.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Date of birth is required".to_string());
    }
    if nationality.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Nationality is required".to_string());
    }
    if address_line1.as_deref().map(|s| s.trim()).unwrap_or("").is_empty() {
        return Err("Address line 1 is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let state_id = match state_name.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Some(resolve_state(&pool, name).await?),
        None => None,
    };
    let city_id = match city_name.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Some(resolve_city(&pool, name).await?),
        None => None,
    };

    let dob_date = dob
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    if dob.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false) && dob_date.is_none() {
        return Err("Invalid date of birth format. Use YYYY-MM-DD.".to_string());
    }

    let pp_issue = passport_issue_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let pp_expiry = passport_expiry_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let visa_issue = visa_issue_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));
    let visa_expiry = visa_expiry_date
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| parse_date(s));

    sqlx::query(
        "UPDATE customer_information SET \
         prefix=$1, customer_name=$2, ledger_id=$3, dob=$4, nationality=$5, \
         address_line1=$6, address_line2=$7, address_line3=$8, \
         state_id=$9, city_id=$10, zip_code=$11, \
         mobile_no1=$12, mobile_no2=$13, email_id=$14, \
         pan_card=$15, passport_no=$16, passport_issue_date=$17, passport_expiry_date=$18, \
         visa_no=$19, visa_issue_date=$20, visa_expiry_date=$21, updated_at=NOW() \
         WHERE id=$22",
    )
    .bind(opt_str(prefix))
    .bind(&customer_name)
    .bind(ledger_id)
    .bind(dob_date)
    .bind(opt_str(nationality))
    .bind(opt_str(address_line1))
    .bind(opt_str(address_line2))
    .bind(opt_str(address_line3))
    .bind(state_id)
    .bind(city_id)
    .bind(opt_str(zip_code))
    .bind(opt_str(mobile_no1))
    .bind(opt_str(mobile_no2))
    .bind(opt_str(email_id))
    .bind(opt_str(pan_card))
    .bind(opt_str(passport_no))
    .bind(pp_issue)
    .bind(pp_expiry)
    .bind(opt_str(visa_no))
    .bind(visa_issue)
    .bind(visa_expiry)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update customer: {e}"))?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_customer_information_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE customer_information SET is_active=$1, updated_at=NOW() WHERE id=$2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to toggle customer: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_customer_information(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    // Delete documents first (no FK cascade defined)
    sqlx::query("DELETE FROM customer_detail WHERE cust_id=$1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete customer documents: {e}"))?;
    sqlx::query("DELETE FROM customer_information WHERE id=$1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete customer: {e}"))?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Document upload / list / fetch / delete
// ─────────────────────────────────────────────────────────────

/// Save a document. `document_data_b64` is raw base64 (no data-URL prefix).
#[tauri::command]
pub async fn save_customer_document(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    cust_id: i32,
    file_name: String,
    content_type: String,
    document_data_b64: String,
    size: i64,
) -> Result<String, String> {
    if file_name.trim().is_empty() {
        return Err("File name is required".to_string());
    }
    let bytes = B64
        .decode(document_data_b64.trim())
        .map_err(|e| format!("Invalid base64 data: {e}"))?;

    let pool = acquire_pool(&state.pool, &app).await?;
    let doc_id = gen_doc_id();

    sqlx::query(
        "INSERT INTO customer_detail (cust_id, document_id, file_name, content_type, size, document_detail) \
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(cust_id)
    .bind(&doc_id)
    .bind(file_name.trim())
    .bind(content_type.trim())
    .bind(size)
    .bind(&bytes)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to save document: {e}"))?;

    Ok(doc_id)
}

/// List document metadata for a customer (no binary data).
#[tauri::command]
pub async fn get_customer_documents(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    cust_id: i32,
) -> Result<Vec<CustomerDocRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT document_id, file_name, content_type, \
                CAST(size AS BIGINT) AS size \
         FROM customer_detail WHERE cust_id=$1 AND is_active=1 \
         ORDER BY created_at ASC",
    )
    .bind(cust_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch documents: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| CustomerDocRow {
            document_id: r.try_get("document_id").unwrap_or_default(),
            file_name: r.try_get("file_name").unwrap_or_default(),
            content_type: r.try_get("content_type").unwrap_or_default(),
            size: r.try_get("size").unwrap_or(0),
        })
        .collect())
}

/// Return the file contents as base64 (for preview / download).
#[tauri::command]
pub async fn get_customer_document_data(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    cust_id: i32,
    document_id: String,
) -> Result<String, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let bytes: Vec<u8> = sqlx::query_scalar(
        "SELECT document_detail FROM customer_detail \
         WHERE cust_id=$1 AND document_id=$2 AND is_active=1",
    )
    .bind(cust_id)
    .bind(&document_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Failed to fetch document data: {e}"))?;

    Ok(B64.encode(&bytes))
}

/// Soft-delete a document by marking is_active=0.
#[tauri::command]
pub async fn delete_customer_document(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    cust_id: i32,
    document_id: String,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE customer_detail SET is_active=0 WHERE cust_id=$1 AND document_id=$2",
    )
    .bind(cust_id)
    .bind(&document_id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to delete document: {e}"))?;
    Ok(())
}
