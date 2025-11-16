use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug)]
pub struct ExecuteRequest {
    pub csharp: String,
    pub templates: serde_json::Value,
    pub initial_state: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ExecuteResponse {
    pub success: bool,
    pub vnode_json: Option<String>,
    pub html: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn execute_component(
    app: AppHandle,
    request: ExecuteRequest
) -> Result<ExecuteResponse, String> {
    println!("[Tauri] execute_component called");
    println!("[Tauri] C# code length: {} bytes", request.csharp.len());

    // 1. Get path to minimact-runtime.exe
    let runtime_path = get_runtime_path(&app)?;

    println!("[Tauri] Runtime path: {}", runtime_path.display());

    if !runtime_path.exists() {
        return Err(format!(
            "Runtime not found at: {}\nRun build-runtime.bat first!",
            runtime_path.display()
        ));
    }

    // 2. Write request to temp file
    let temp_dir = std::env::temp_dir();
    let request_id = uuid::Uuid::new_v4();
    let request_path = temp_dir.join(format!("cactus-request-{}.json", request_id));

    println!("[Tauri] Writing request to: {}", request_path.display());

    let request_json = serde_json::to_string_pretty(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    fs::write(&request_path, request_json)
        .map_err(|e| format!("Failed to write request file: {}", e))?;

    // 3. Execute runtime
    println!("[Tauri] Spawning runtime process...");

    let output = Command::new(&runtime_path)
        .arg(&request_path)
        .output()
        .map_err(|e| format!("Failed to execute runtime: {}\nPath: {}", e, runtime_path.display()))?;

    // 4. Clean up temp file
    let _ = fs::remove_file(&request_path);

    // 5. Check exit code
    let exit_code = output.status.code().unwrap_or(-1);
    println!("[Tauri] Runtime exit code: {}", exit_code);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);

        return Err(format!(
            "Runtime execution failed (exit code: {})\n\nSTDERR:\n{}\n\nSTDOUT:\n{}",
            exit_code,
            stderr,
            stdout
        ));
    }

    // 6. Parse response
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("[Tauri] Runtime stdout length: {} bytes", stdout.len());

    if stdout.trim().is_empty() {
        return Err("Runtime returned empty output".to_string());
    }

    let response: ExecuteResponse = serde_json::from_str(&stdout)
        .map_err(|e| {
            format!(
                "Failed to parse response: {}\n\nOutput:\n{}",
                e,
                stdout
            )
        })?;

    println!("[Tauri] Execution success: {}", response.success);

    Ok(response)
}

fn get_runtime_path(app: &AppHandle) -> Result<PathBuf, String> {
    // In development: use local build
    let dev_path = PathBuf::from("minimact-runtime/bin/Release/net8.0/win-x64/publish/minimact-runtime.exe");

    if dev_path.exists() {
        println!("[Tauri] Using development runtime");
        return Ok(dev_path);
    }

    // Try current directory (fallback)
    let current_dir_path = PathBuf::from("./minimact-runtime.exe");
    if current_dir_path.exists() {
        println!("[Tauri] Using current directory runtime");
        return Ok(current_dir_path);
    }

    // In production: runtime is bundled with app
    let resource_path = app.path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("minimact-runtime.exe");

    if resource_path.exists() {
        println!("[Tauri] Using bundled runtime");
        return Ok(resource_path);
    }

    Err(format!(
        "Runtime not found in any location:\n- {}\n- {}\n- {}",
        dev_path.display(),
        current_dir_path.display(),
        resource_path.display()
    ))
}
