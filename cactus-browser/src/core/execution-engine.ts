import { invoke } from '@tauri-apps/api/core';

export interface ExecuteRequest {
  csharp: string;
  templates: any;
  initial_state: any;
}

export interface ExecuteResponse {
  success: boolean;
  vnode_json: string | null;
  html: string | null;
  error: string | null;
}

export async function executeComponent(
  csharp: string,
  templates: any,
  initialState: any = {}
): Promise<ExecuteResponse> {
  console.log('[Frontend] Executing component...');
  console.log('[Frontend] C# length:', csharp.length);
  console.log('[Frontend] Templates:', templates);

  try {
    const request: ExecuteRequest = {
      csharp,
      templates,
      initial_state: initialState
    };

    console.log('[Frontend] Invoking execute_component...');

    const response = await invoke<ExecuteResponse>('execute_component', {
      request
    });

    console.log('[Frontend] Execution result:', response);

    if (!response.success) {
      console.error('[Frontend] Execution failed:', response.error);
    }

    return response;
  } catch (err: any) {
    console.error('[Frontend] Execution error:', err);

    return {
      success: false,
      vnode_json: null,
      html: null,
      error: err.toString()
    };
  }
}
