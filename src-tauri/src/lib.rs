// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_settings_table",
            sql: "CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "insert_settings_production_url",
            sql: "INSERT INTO settings (key, value) VALUES ('shopifyProductionStoreUrl', '');",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "insert_settings_production_access_token",
            sql: "INSERT INTO settings (key, value) VALUES ('shopifyProductionAccessToken', '');",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "insert_settings_staging_url",
            sql: "INSERT INTO settings (key, value) VALUES ('shopifyStagingStoreUrl', '');",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "insert_settings_staging_access_token",
            sql: "INSERT INTO settings (key, value) VALUES ('shopifyStagingAccessToken', '');",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_collections_table",
            sql: "CREATE TABLE IF NOT EXISTS collections (
                handle TEXT PRIMARY KEY,
                production_id TEXT,
                staging_id TEXT,
                title TEXT NOT NULL,
                differences TEXT,
                updated_at TIMESTAMP NOT NULL,
                compared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_pages_table",
            sql: "CREATE TABLE IF NOT EXISTS pages (
                handle TEXT PRIMARY KEY,
                production_id TEXT,
                staging_id TEXT,
                title TEXT NOT NULL,
                differences TEXT,
                updated_at TIMESTAMP NOT NULL,
                compared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_products_table",
            sql: "CREATE TABLE IF NOT EXISTS products (
                handle TEXT PRIMARY KEY,
                production_id TEXT,
                staging_id TEXT,
                title TEXT NOT NULL,
                differences TEXT,
                updated_at TIMESTAMP NOT NULL,
                compared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_ui_settings_table",
            sql: "CREATE TABLE IF NOT EXISTS ui_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_collections_to_products",
            sql: "ALTER TABLE products ADD COLUMN collections TEXT NOT NULL DEFAULT '';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "create_files_table",
            sql: "CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                production_id TEXT,
                staging_id TEXT,
                alt TEXT,
                url TEXT,
                differences TEXT,
                updated_at TIMESTAMP NOT NULL,
                compared_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:settings.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
