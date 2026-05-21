use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CalIncentiveRow {
    pub id: i32,
    pub code: i64,
    pub menu_card_id: i32,
    pub menu_card_name: Option<String>,
    pub sunday_inc: f64,
    pub monday_inc: f64,
    pub tuesday_inc: f64,
    pub wednesday_inc: f64,
    pub thursday_inc: f64,
    pub friday_inc: f64,
    pub saturday_inc: f64,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedCalIncentives {
    pub data: Vec<CalIncentiveRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct MenuCardSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_cards_simple(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuCardSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM menu_card WHERE is_active = TRUE ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to load menu cards: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| MenuCardSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn get_cal_incentives(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
    menu_card_id: Option<i32>,
) -> Result<PagedCalIncentives, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "ci.code",
        Some("menu_card_name") => "mc.name",
        _ => "ci.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let select = "SELECT ci.id, ci.code, ci.menu_card_id, mc.name AS menu_card_name, \
                         CAST(ci.sunday_inc    AS FLOAT8) AS sunday_inc, \
                         CAST(ci.monday_inc    AS FLOAT8) AS monday_inc, \
                         CAST(ci.tuesday_inc   AS FLOAT8) AS tuesday_inc, \
                         CAST(ci.wednesday_inc AS FLOAT8) AS wednesday_inc, \
                         CAST(ci.thursday_inc  AS FLOAT8) AS thursday_inc, \
                         CAST(ci.friday_inc    AS FLOAT8) AS friday_inc, \
                         CAST(ci.saturday_inc  AS FLOAT8) AS saturday_inc, \
                         ci.is_active \
                  FROM cal_incentive ci \
                  LEFT JOIN menu_card mc ON mc.id = ci.menu_card_id";

    let (where_clause, extra_binds): (&str, Vec<i32>) = match menu_card_id {
        None => ("WHERE mc.name ILIKE $1", vec![]),
        Some(mid) => ("WHERE mc.name ILIKE $1 AND ci.menu_card_id = $4", vec![mid]),
    };

    let count_where = match menu_card_id {
        None => "WHERE mc.name ILIKE $1".to_string(),
        Some(_) => "WHERE mc.name ILIKE $1 AND ci.menu_card_id = $2".to_string(),
    };

    let count_sql = format!(
        "SELECT COUNT(*) AS count FROM cal_incentive ci \
         LEFT JOIN menu_card mc ON mc.id = ci.menu_card_id {}",
        count_where
    );
    let mut count_q = sqlx::query(&count_sql).bind(&search_pattern);
    for b in &extra_binds {
        count_q = count_q.bind(*b);
    }
    let total_row = count_q
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let data_sql = format!(
        "{} {} ORDER BY {} {} LIMIT $2 OFFSET $3",
        select, where_clause, order_col, dir
    );
    let mut data_q = sqlx::query(&data_sql)
        .bind(&search_pattern)
        .bind(qs.per_page)
        .bind(offset);
    for b in &extra_binds {
        data_q = data_q.bind(*b);
    }

    let rows = data_q
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| CalIncentiveRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            menu_card_id: r.try_get("menu_card_id").unwrap_or(0),
            menu_card_name: r.try_get("menu_card_name").ok().flatten(),
            sunday_inc: r.try_get::<f64, _>("sunday_inc").unwrap_or(0.0),
            monday_inc: r.try_get::<f64, _>("monday_inc").unwrap_or(0.0),
            tuesday_inc: r.try_get::<f64, _>("tuesday_inc").unwrap_or(0.0),
            wednesday_inc: r.try_get::<f64, _>("wednesday_inc").unwrap_or(0.0),
            thursday_inc: r.try_get::<f64, _>("thursday_inc").unwrap_or(0.0),
            friday_inc: r.try_get::<f64, _>("friday_inc").unwrap_or(0.0),
            saturday_inc: r.try_get::<f64, _>("saturday_inc").unwrap_or(0.0),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedCalIncentives { data, total })
}

#[tauri::command]
pub async fn create_cal_incentive(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    menu_card_id: i32,
    sunday_inc: f64,
    monday_inc: f64,
    tuesday_inc: f64,
    wednesday_inc: f64,
    thursday_inc: f64,
    friday_inc: f64,
    saturday_inc: f64,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "INSERT INTO cal_incentive \
         (menu_card_id, sunday_inc, monday_inc, tuesday_inc, wednesday_inc, \
          thursday_inc, friday_inc, saturday_inc) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(menu_card_id)
    .bind(sunday_inc)
    .bind(monday_inc)
    .bind(tuesday_inc)
    .bind(wednesday_inc)
    .bind(thursday_inc)
    .bind(friday_inc)
    .bind(saturday_inc)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Incentive entry already exists for this menu card".to_string()
        } else {
            format!("Failed to create cal incentive: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn update_cal_incentive(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    sunday_inc: f64,
    monday_inc: f64,
    tuesday_inc: f64,
    wednesday_inc: f64,
    thursday_inc: f64,
    friday_inc: f64,
    saturday_inc: f64,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE cal_incentive SET \
         sunday_inc = $1, monday_inc = $2, tuesday_inc = $3, wednesday_inc = $4, \
         thursday_inc = $5, friday_inc = $6, saturday_inc = $7, updated_at = NOW() \
         WHERE id = $8",
    )
    .bind(sunday_inc)
    .bind(monday_inc)
    .bind(tuesday_inc)
    .bind(wednesday_inc)
    .bind(thursday_inc)
    .bind(friday_inc)
    .bind(saturday_inc)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update cal incentive: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_cal_incentive_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE cal_incentive SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to toggle cal incentive: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_cal_incentive(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM cal_incentive WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete cal incentive: {e}"))?;

    Ok(())
}
