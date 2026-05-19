use crate::{acquire_pool, ApplicationInfo, AppState, AuthResult, UserInfo};
use bcrypt;
use sqlx::Row;

const SUPER_USERNAME: &str = "superadmin";
const SUPER_PASSWORD: &str = "superadmin";
pub const SUPER_USER_ID: i32 = 0; // sentinel – never a real DB row

#[tauri::command]
pub async fn get_accessible_applications(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    username: String,
) -> Result<Vec<ApplicationInfo>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Hardcoded superuser sees every active application
    if username.trim() == SUPER_USERNAME {
        let rows = sqlx::query(
            "SELECT id, code, application_name FROM applications \
             WHERE is_active = 1 ORDER BY application_name",
        )
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch applications: {e}"))?;

        return Ok(rows
            .iter()
            .map(|r| ApplicationInfo {
                id: r.try_get("id").unwrap_or(0),
                code: r.try_get("code").unwrap_or_default(),
                application_name: r.try_get("application_name").unwrap_or_default(),
            })
            .collect());
    }

    // Normal users – check user_applications
    let user_row = sqlx::query(
        "SELECT id FROM users WHERE user_name = $1 AND is_active = 1",
    )
    .bind(username.trim())
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    let Some(user_row) = user_row else {
        return Ok(vec![]);
    };
    let user_id: i32 = user_row.try_get("id").unwrap_or(0);

    let rows = sqlx::query(
        r#"
        SELECT a.id, a.code, a.application_name
        FROM applications a
        INNER JOIN user_applications ua ON ua.application_id = a.id
        WHERE ua.user_id   = $1
          AND a.is_active  = 1
          AND ua.is_active = 1
        ORDER BY a.application_name
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch applications: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| ApplicationInfo {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or_default(),
            application_name: r.try_get("application_name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn login(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    username: String,
    password: String,
    application_id: i32,
) -> Result<AuthResult, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    // Hardcoded superuser – no DB row required
    if username.trim() == SUPER_USERNAME {
        if password != SUPER_PASSWORD {
            return Err("Invalid username or password".to_string());
        }

        let app_row = sqlx::query(
            "SELECT id, code, application_name FROM applications \
             WHERE id = $1 AND is_active = 1",
        )
        .bind(application_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Failed to fetch application: {e}"))?
        .ok_or_else(|| "Application not found".to_string())?;

        return Ok(AuthResult {
            user: UserInfo {
                id: SUPER_USER_ID,
                username: SUPER_USERNAME.to_string(),
                is_super: true,
            },
            application: ApplicationInfo {
                id: app_row.try_get("id").map_err(|e| e.to_string())?,
                code: app_row.try_get("code").map_err(|e| e.to_string())?,
                application_name: app_row
                    .try_get("application_name")
                    .map_err(|e| e.to_string())?,
            },
            permissions: vec!["*".to_string()],
        });
    }

    // Normal user
    let user_row = sqlx::query(
        "SELECT id, user_name, password_hash FROM users \
         WHERE user_name = $1 AND is_active = 1",
    )
    .bind(username.trim())
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Database error: {e}"))?
    .ok_or_else(|| "Invalid username or password".to_string())?;

    let user_id: i32 = user_row.try_get("id").map_err(|e| e.to_string())?;
    let user_name: String = user_row.try_get("user_name").map_err(|e| e.to_string())?;
    let password_hash: String = user_row
        .try_get("password_hash")
        .map_err(|e| e.to_string())?;

    let valid = bcrypt::verify(&password, &password_hash)
        .map_err(|_| "Password verification failed".to_string())?;
    if !valid {
        return Err("Invalid username or password".to_string());
    }

    let app_row = sqlx::query(
        "SELECT id, code, application_name FROM applications \
         WHERE id = $1 AND is_active = 1",
    )
    .bind(application_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Failed to fetch application: {e}"))?
    .ok_or_else(|| "Application not found".to_string())?;

    let app_id: i32 = app_row.try_get("id").map_err(|e| e.to_string())?;
    let app_code: String = app_row.try_get("code").map_err(|e| e.to_string())?;
    let app_name: String = app_row
        .try_get("application_name")
        .map_err(|e| e.to_string())?;

    // Verify the user actually has access to this application
    let access = sqlx::query(
        "SELECT id FROM user_applications \
         WHERE user_id = $1 AND application_id = $2 AND is_active = 1",
    )
    .bind(user_id)
    .bind(application_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    if access.is_none() {
        return Err("You do not have access to this application".to_string());
    }

    // Fetch permissions — all apps so cross-app grants work
    let perm_rows = sqlx::query(
        r#"
        SELECT DISTINCT p.permission_name
        FROM permissions p
        INNER JOIN user_permissions up ON up.permission_id = p.id
        WHERE up.user_id   = $1
          AND p.is_active  = 1
          AND up.is_active = 1
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch permissions: {e}"))?;

    let permissions: Vec<String> = perm_rows
        .iter()
        .filter_map(|r| r.try_get::<String, _>("permission_name").ok())
        .collect();

    let _ = sqlx::query("UPDATE users SET last_login = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;

    Ok(AuthResult {
        user: UserInfo {
            id: user_id,
            username: user_name,
            is_super: false,
        },
        application: ApplicationInfo {
            id: app_id,
            code: app_code,
            application_name: app_name,
        },
        permissions,
    })
}

#[tauri::command]
pub async fn current_permissions(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
    _application_id: i32,
) -> Result<Vec<String>, String> {
    // Sentinel ID means hardcoded superuser
    if user_id == SUPER_USER_ID {
        return Ok(vec!["*".to_string()]);
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        r#"
        SELECT DISTINCT p.permission_name
        FROM permissions p
        INNER JOIN user_permissions up ON up.permission_id = p.id
        WHERE up.user_id   = $1
          AND p.is_active  = 1
          AND up.is_active = 1
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch permissions: {e}"))?;

    Ok(rows
        .iter()
        .filter_map(|r| r.try_get::<String, _>("permission_name").ok())
        .collect())
}
