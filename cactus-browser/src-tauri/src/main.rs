// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod runtime;
mod signalm;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize)]
struct CachedFile {
    content: String,
    sha: String,
    cached_at: u64,
    url: String,
}

/// Read a file from the cache
#[tauri::command]
fn read_cache(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let cache_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("cactus-cache")
        .join(format!("{}.json", key));

    if !cache_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(cache_path).map_err(|e| e.to_string())?;

    Ok(Some(content))
}

/// Write a file to the cache
#[tauri::command]
fn write_cache(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("cactus-cache");

    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let cache_path = cache_dir.join(format!("{}.json", key));

    fs::write(cache_path, value).map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear all cache files
#[tauri::command]
fn clear_cache(app: tauri::AppHandle) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("cactus-cache");

    if cache_dir.exists() {
        fs::remove_dir_all(cache_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Read a local TSX file
#[tauri::command]
fn read_local_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_cache,
            write_cache,
            clear_cache,
            read_local_file,
            runtime::execute_component,
            signalm::signalm_invoke
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
