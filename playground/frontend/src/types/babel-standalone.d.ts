declare module '@babel/standalone' {
  export function transform(code: string, options?: any): {
    code: string;
    map: any;
    metadata?: any;
  };

  export function registerPlugin(name: string, plugin: any): void;
  export function registerPreset(name: string, preset: any): void;
  export function availablePlugins(): Record<string, any>;
  export function availablePresets(): Record<string, any>;
}
