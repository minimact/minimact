use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};
use crate::runtime::{ExecuteRequest, execute_component};

#[derive(Serialize, Deserialize, Clone)]
struct SignalMMessage {
    method: String,
    args: Vec<serde_json::Value>,
}

/// Main SignalM² entry point - routes messages to appropriate handlers
#[tauri::command]
pub async fn signalm_invoke(
    app: AppHandle,
    method: String,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    println!("[SignalM²] Received: {} with {} args", method, args.len());

    // Route to appropriate handler based on method name
    match method.as_str() {
        // ========================================
        // Component Initialization
        // ========================================
        "Initialize" => handle_initialize(app, args).await,

        // ========================================
        // State Management
        // ========================================
        "UpdateComponentState" => handle_update_component_state(app, args).await,
        "UpdateDomElementState" => handle_update_dom_element_state(app, args).await,

        // ========================================
        // Event Handling
        // ========================================
        "TriggerEvent" => handle_trigger_event(app, args).await,

        // ========================================
        // Component Registration
        // ========================================
        "RegisterComponent" => handle_register_component(args).await,
        "InvokeComponentMethod" => handle_invoke_component_method(args).await,

        // ========================================
        // Unknown Method
        // ========================================
        _ => {
            eprintln!("[SignalM²] Unknown method: {}", method);
            Err(format!("Unknown SignalM method: {}", method))
        }
    }
}

// ========================================
// Component Initialization
// ========================================

async fn handle_initialize(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let csharp = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing C# source")?;

    let templates = args.get(1).cloned().unwrap_or(serde_json::json!({}));
    let initial_state = args.get(2).cloned().unwrap_or(serde_json::json!({}));

    println!("[SignalM²] Initializing component ({} bytes C#)", csharp.len());

    // Call existing execute_component from Phase 3
    let request = ExecuteRequest {
        csharp: csharp.to_string(),
        templates,
        initial_state,
    };

    let response = execute_component(app, request).await?;

    if !response.success {
        return Err(response.error.unwrap_or_else(|| "Unknown error".to_string()));
    }

    Ok(serde_json::json!({
        "success": true,
        "componentId": "component-1", // TODO: Generate unique ID
        "html": response.html,
        "vnodeJson": response.vnode_json
    }))
}

// ========================================
// State Management
// ========================================

async fn handle_update_component_state(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let state_key = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing stateKey")?;

    let value = args.get(2)
        .ok_or("Missing value")?;

    println!("[SignalM²] UpdateComponentState: {} {} = {:?}", component_id, state_key, value);

    // TODO: Implement state update in runtime
    // For now, return success
    // In full implementation:
    // 1. Find component instance by ID
    // 2. Update state via SetStateFromClient()
    // 3. Re-render component
    // 4. Generate patches
    // 5. Emit patches back to client

    // Emit patches event (stub for now)
    app.emit("signalm-message", SignalMMessage {
        method: "ApplyPatches".to_string(),
        args: vec![serde_json::json!([
            {
                "type": "UpdateText",
                "path": [0],
                "content": format!("State updated: {} = {:?}", state_key, value)
            }
        ])]
    }).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

async fn handle_update_dom_element_state(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let state_key = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing stateKey")?;

    let snapshot = args.get(2)
        .ok_or("Missing snapshot")?;

    println!("[SignalM²] UpdateDomElementState: {} {} = {:?}", component_id, state_key, snapshot);

    // TODO: Implement DOM state update in runtime
    // For now, return success

    Ok(serde_json::json!({ "success": true }))
}

// ========================================
// Event Handling
// ========================================

async fn handle_trigger_event(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let event_name = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing eventName")?;

    let event_data = args.get(2);

    println!("[SignalM²] TriggerEvent: {} {} {:?}", component_id, event_name, event_data);

    // TODO: Implement event execution in runtime
    // For now, send stub patches

    // Emit patches back to client
    app.emit("signalm-message", SignalMMessage {
        method: "ApplyPatches".to_string(),
        args: vec![serde_json::json!([
            {
                "type": "UpdateText",
                "path": [0, 1],
                "content": format!("Event {} triggered!", event_name)
            }
        ])]
    }).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

// ========================================
// Component Registration
// ========================================

async fn handle_register_component(
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    println!("[SignalM²] RegisterComponent: {}", component_id);

    // TODO: Add component to registry

    Ok(serde_json::json!({ "success": true }))
}

async fn handle_invoke_component_method(
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let method_name = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing methodName")?;

    let method_args = args.get(2);

    println!("[SignalM²] InvokeComponentMethod: {} {} {:?}", component_id, method_name, method_args);

    // TODO: Invoke method via runtime

    Ok(serde_json::json!({ "success": true }))
}
