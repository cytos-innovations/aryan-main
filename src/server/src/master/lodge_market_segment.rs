use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — market_segment table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MarketSegmentRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub segment_type: String,
    pub discount_percent: f64,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct MarketSegmentSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub discount_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct PagedMarketSegments {
    pub data: Vec<MarketSegmentRow>,
    pub total: i64,
}

// Normalise an optional segment_type arg to a known value. Defaults to LODGE so
// the lodge master (which passes nothing) keeps its existing behaviour; the
// restaurant master passes "RESTAURANT".
fn norm_segment_type(t: Option<String>) -> String {
    match t.as_deref().map(|s| s.trim().to_uppercase()).as_deref() {
        Some("RESTAURANT") => "RESTAURANT".to_string(),
        _ => "LODGE".to_string(),
    }
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_market_segments(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
    segment_type: Option<String>,
) -> Result<PagedMarketSegments, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let seg_type = norm_segment_type(segment_type);

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM market_segment WHERE name ILIKE $1 AND segment_type = $2",
    )
    .bind(&search_pattern)
    .bind(&seg_type)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, segment_type, \
                CAST(discount_percent AS FLOAT8) AS discount_percent, is_active \
         FROM market_segment WHERE name ILIKE $1 AND segment_type = $2 \
         ORDER BY {} {} LIMIT $3 OFFSET $4",
        order_col, dir
    );

    let rows = sqlx::query(&sql)
        .bind(&search_pattern)
        .bind(&seg_type)
        .bind(qs.per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| MarketSegmentRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            segment_type: r.try_get("segment_type").unwrap_or_else(|_| "LODGE".to_string()),
            discount_percent: r.try_get::<f64, _>("discount_percent").unwrap_or(0.0),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedMarketSegments { data, total })
}

#[tauri::command]
pub async fn get_all_market_segments(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    segment_type: Option<String>,
) -> Result<Vec<MarketSegmentSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let seg_type = norm_segment_type(segment_type);

    let rows = sqlx::query(
        "SELECT id, code, name, \
                CAST(discount_percent AS FLOAT8) AS discount_percent \
         FROM market_segment \
         WHERE is_active = TRUE AND segment_type = $1 ORDER BY name ASC",
    )
    .bind(&seg_type)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| MarketSegmentSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            discount_percent: r.try_get::<f64, _>("discount_percent").unwrap_or(0.0),
        })
        .collect())
}

#[tauri::command]
pub async fn create_market_segment(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    name: String,
    segment_type: Option<String>,
    discount_percent: Option<f64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Segment name is required".to_string());
    }
    let seg_type = norm_segment_type(segment_type);
    let disc = discount_percent.unwrap_or(0.0);
    if !(0.0..=100.0).contains(&disc) {
        return Err("Discount % must be between 0 and 100".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Code or market segment name already exists".to_string()
        } else {
            format!("Failed to create market segment: {e}")
        }
    };

    if let Some(code_val) = code {
        sqlx::query("INSERT INTO market_segment (code, name, segment_type, discount_percent) VALUES ($1, $2, $3, $4)")
            .bind(code_val)
            .bind(&name)
            .bind(&seg_type)
            .bind(disc)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    } else {
        sqlx::query("INSERT INTO market_segment (name, segment_type, discount_percent) VALUES ($1, $2, $3)")
            .bind(&name)
            .bind(&seg_type)
            .bind(disc)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_market_segment(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    discount_percent: Option<f64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Segment name is required".to_string());
    }
    let disc = discount_percent.unwrap_or(0.0);
    if !(0.0..=100.0).contains(&disc) {
        return Err("Discount % must be between 0 and 100".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE market_segment SET name = $1, discount_percent = $2, updated_at = NOW() WHERE id = $3",
    )
    .bind(&name)
    .bind(disc)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Market segment name already exists".to_string()
        } else {
            format!("Failed to update market segment: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_market_segment_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE market_segment SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update market segment: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_market_segment(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM market_segment WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete market segment: {e}"))?;

    Ok(())
}
