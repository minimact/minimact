/**
 * DOM Patch types (from Minimact core reconciliation)
 */

export type PatchType =
  | 'CreateElement'
  | 'UpdateText'
  | 'SetAttribute'
  | 'RemoveAttribute'
  | 'InsertNode'
  | 'RemoveNode'
  | 'ReplaceNode';

export interface Patch {
  type: PatchType;
  path: number[]; // DOM index path
  [key: string]: any; // Additional patch data
}
