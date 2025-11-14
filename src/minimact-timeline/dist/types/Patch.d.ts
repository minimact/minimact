/**
 * DOM Patch types (from Minimact core reconciliation)
 */
export type PatchType = 'CreateElement' | 'UpdateText' | 'SetAttribute' | 'RemoveAttribute' | 'InsertNode' | 'RemoveNode' | 'ReplaceNode';
export interface Patch {
    type: PatchType;
    path: number[];
    [key: string]: any;
}
//# sourceMappingURL=Patch.d.ts.map