use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct EmployeeRow {
    pub id: i32,
    pub code: Option<String>,
    pub name: String,
    pub add1: Option<String>,
    pub add2: Option<String>,
    pub add3: Option<String>,
    pub desig_id: Option<i32>,
    pub desig_name: Option<String>,
    pub department: Option<String>,
    pub esi_no: Option<String>,
    pub pf_no: Option<String>,
    pub doj: Option<String>,
    pub dol: Option<String>,
    pub sl_total: f64,
    pub sl_bal: f64,
    pub cl_total: f64,
    pub cl_bal: f64,
    pub spl_total: f64,
    pub spl_bal: f64,
    pub con_person_no: Option<String>,
    pub emer_ph_no: Option<String>,
    pub resi_ph_no: Option<String>,
    pub advance_tot: f64,
    pub target: f64,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedEmployees {
    pub data: Vec<EmployeeRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_employees(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedEmployees, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "ei.code",
        Some("name") => "ei.name",
        _ => "ei.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM employee_information ei WHERE ei.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT ei.id, ei.code, ei.name, ei.add1, ei.add2, ei.add3, \
                ei.desig_id, ed.name AS desig_name, ei.department, \
                ei.esi_no, ei.pf_no, \
                ei.doj::TEXT AS doj, ei.dol::TEXT AS dol, \
                CAST(ei.sl_total AS FLOAT8) AS sl_total, \
                CAST(ei.sl_bal AS FLOAT8) AS sl_bal, \
                CAST(ei.cl_total AS FLOAT8) AS cl_total, \
                CAST(ei.cl_bal AS FLOAT8) AS cl_bal, \
                CAST(ei.spl_total AS FLOAT8) AS spl_total, \
                CAST(ei.spl_bal AS FLOAT8) AS spl_bal, \
                ei.con_person_no, ei.emer_ph_no, ei.resi_ph_no, \
                CAST(ei.advance_tot AS FLOAT8) AS advance_tot, \
                CAST(ei.target AS FLOAT8) AS target, \
                ei.is_active \
         FROM employee_information ei \
         LEFT JOIN employee_designation ed ON ed.id = ei.desig_id \
         WHERE ei.name ILIKE $1 \
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
        .map(|r| EmployeeRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").ok().flatten(),
            name: r.try_get("name").unwrap_or_default(),
            add1: r.try_get("add1").ok().flatten(),
            add2: r.try_get("add2").ok().flatten(),
            add3: r.try_get("add3").ok().flatten(),
            desig_id: r.try_get("desig_id").ok().flatten(),
            desig_name: r.try_get("desig_name").ok().flatten(),
            department: r.try_get("department").ok().flatten(),
            esi_no: r.try_get("esi_no").ok().flatten(),
            pf_no: r.try_get("pf_no").ok().flatten(),
            doj: r.try_get("doj").ok().flatten(),
            dol: r.try_get("dol").ok().flatten(),
            sl_total: r.try_get::<f64, _>("sl_total").unwrap_or(0.0),
            sl_bal: r.try_get::<f64, _>("sl_bal").unwrap_or(0.0),
            cl_total: r.try_get::<f64, _>("cl_total").unwrap_or(0.0),
            cl_bal: r.try_get::<f64, _>("cl_bal").unwrap_or(0.0),
            spl_total: r.try_get::<f64, _>("spl_total").unwrap_or(0.0),
            spl_bal: r.try_get::<f64, _>("spl_bal").unwrap_or(0.0),
            con_person_no: r.try_get("con_person_no").ok().flatten(),
            emer_ph_no: r.try_get("emer_ph_no").ok().flatten(),
            resi_ph_no: r.try_get("resi_ph_no").ok().flatten(),
            advance_tot: r.try_get::<f64, _>("advance_tot").unwrap_or(0.0),
            target: r.try_get::<f64, _>("target").unwrap_or(0.0),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedEmployees { data, total })
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_employee(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    add1: Option<String>,
    add2: Option<String>,
    add3: Option<String>,
    desig_id: Option<i32>,
    department: Option<String>,
    esi_no: Option<String>,
    pf_no: Option<String>,
    doj: Option<String>,
    dol: Option<String>,
    sl_total: f64,
    sl_bal: f64,
    cl_total: f64,
    cl_bal: f64,
    spl_total: f64,
    spl_bal: f64,
    con_person_no: Option<String>,
    emer_ph_no: Option<String>,
    resi_ph_no: Option<String>,
    advance_tot: f64,
    target: f64,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Employee name is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Employee code already exists".to_string()
        } else {
            format!("Failed to create employee: {e}")
        }
    };

    // `code` is a BIGSERIAL column. When the caller supplies one, insert it;
    // otherwise omit the column so the sequence assigns the next value.
    let columns = "name, add1, add2, add3, desig_id, department, esi_no, pf_no, \
                   doj, dol, sl_total, sl_bal, cl_total, cl_bal, spl_total, spl_bal, \
                   con_person_no, emer_ph_no, resi_ph_no, advance_tot, target";
    let placeholders = "$1, $2, $3, $4, $5, $6, $7, $8, \
                        $9::DATE, $10::DATE, $11, $12, $13, $14, $15, $16, \
                        $17, $18, $19, $20, $21";
    let sql = match code {
        Some(_) => format!(
            "INSERT INTO employee_information (code, {columns}) \
             VALUES ($22, {placeholders}) RETURNING id"
        ),
        None => format!(
            "INSERT INTO employee_information ({columns}) \
             VALUES ({placeholders}) RETURNING id"
        ),
    };

    let mut q = sqlx::query_scalar::<_, i32>(&sql)
        .bind(&name)
        .bind(add1.as_deref())
        .bind(add2.as_deref())
        .bind(add3.as_deref())
        .bind(desig_id)
        .bind(department.as_deref())
        .bind(esi_no.as_deref())
        .bind(pf_no.as_deref())
        .bind(doj.as_deref())
        .bind(dol.as_deref())
        .bind(sl_total)
        .bind(sl_bal)
        .bind(cl_total)
        .bind(cl_bal)
        .bind(spl_total)
        .bind(spl_bal)
        .bind(con_person_no.as_deref())
        .bind(emer_ph_no.as_deref())
        .bind(resi_ph_no.as_deref())
        .bind(advance_tot)
        .bind(target);
    if let Some(code_val) = code {
        q = q.bind(code_val);
    }

    let id: i32 = q.fetch_one(&pool).await.map_err(map_err)?;

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_employee(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: Option<i64>,
    name: String,
    add1: Option<String>,
    add2: Option<String>,
    add3: Option<String>,
    desig_id: Option<i32>,
    department: Option<String>,
    esi_no: Option<String>,
    pf_no: Option<String>,
    doj: Option<String>,
    dol: Option<String>,
    sl_total: f64,
    sl_bal: f64,
    cl_total: f64,
    cl_bal: f64,
    spl_total: f64,
    spl_bal: f64,
    con_person_no: Option<String>,
    emer_ph_no: Option<String>,
    resi_ph_no: Option<String>,
    advance_tot: f64,
    target: f64,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Employee name is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE employee_information SET \
         code = COALESCE($1, code), name = $2, add1 = $3, add2 = $4, add3 = $5, \
         desig_id = $6, department = $7, esi_no = $8, pf_no = $9, \
         doj = $10::DATE, dol = $11::DATE, \
         sl_total = $12, sl_bal = $13, cl_total = $14, cl_bal = $15, \
         spl_total = $16, spl_bal = $17, \
         con_person_no = $18, emer_ph_no = $19, resi_ph_no = $20, \
         advance_tot = $21, target = $22, updated_at = NOW() \
         WHERE id = $23",
    )
    .bind(code)
    .bind(&name)
    .bind(add1.as_deref())
    .bind(add2.as_deref())
    .bind(add3.as_deref())
    .bind(desig_id)
    .bind(department.as_deref())
    .bind(esi_no.as_deref())
    .bind(pf_no.as_deref())
    .bind(doj.as_deref())
    .bind(dol.as_deref())
    .bind(sl_total)
    .bind(sl_bal)
    .bind(cl_total)
    .bind(cl_bal)
    .bind(spl_total)
    .bind(spl_bal)
    .bind(con_person_no.as_deref())
    .bind(emer_ph_no.as_deref())
    .bind(resi_ph_no.as_deref())
    .bind(advance_tot)
    .bind(target)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Employee code already exists".to_string()
        } else {
            format!("Failed to update employee: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_employee_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE employee_information SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update employee: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_employee(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM employee_information WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete employee: {e}"))?;
    Ok(())
}
