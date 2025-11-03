# Hot Reload Component ID Mismatch Problem

## The Issue

Hot reload template maps are not being applied to the DOM because of a component ID mismatch between what the server sends and what the client expects.

## Current Behavior

### Server Side

1. **Template File Naming**: Templates are generated at build time with filenames based on the component **class name**:
   ```
   ProductDetailsPage.templates.json
   ```

2. **Template Map Distribution**: When a template file changes, the server extracts the component ID from the filename:
   ```csharp
   // TemplateHotReloadManager.cs:154
   var componentId = Path.GetFileNameWithoutExtension(e.Name ?? "")
       .Replace(".templates", "");
   // Result: componentId = "ProductDetailsPage"
   ```

3. **SignalR Message**: Server sends template map to all clients:
   ```json
   {
     "type": "template-map",
     "componentId": "ProductDetailsPage",
     "templateMap": { ... },
     "timestamp": 1762199164461
   }
   ```

### Client Side

1. **HTML Structure**: Components are rendered with **instance GUIDs** as IDs:
   ```html
   <div id="minimact-root"
        data-minimact-component="e11850fd-9898-4fca-8991-5c4065601284"
        data-minimact-component-id="e11850fd-9898-4fca-8991-5c4065601284">
   ```

2. **Component Lookup**: Client tries to find component by the ID from the template map:
   ```javascript
   // hot-reload.ts:359
   const component = this.minimact.getComponent(componentId);
   // Looks for: "ProductDetailsPage"
   // Actual IDs in DOM: "e11850fd-9898-4fca-8991-5c4065601284"
   // Result: undefined (not found!)
   ```

3. **Console Output**:
   ```
   [HotReload] 🔍 Component lookup for "ProductDetailsPage": ❌ Not found
   [HotReload] 🔍 Available elements with data-component-id: Array(0)
   ```

## The Core Problem

**Server uses component TYPE name (class name) for template organization.**
**Client uses component INSTANCE IDs (GUIDs) for component tracking.**

These two systems don't talk to each other!

## Why This Architecture Exists

### Templates Are Type-Based
- Templates are **shared across all instances** of a component type
- A component class `ProductDetailsPage` has ONE set of templates
- Multiple instances of `ProductDetailsPage` would share the same templates
- Templates are generated at **build time** from TSX → cannot know runtime instance IDs

### Components Are Instance-Based
- Each rendered component gets a unique GUID
- Multiple instances of the same component can exist on a page
- Server tracks each instance separately for state management
- Client needs unique IDs to apply patches to specific DOM elements

## Solution Options

### Option 1: Add Component Type Attribute to HTML ❌
**Rejected**: Bloats HTML with redundant data

```html
<div data-minimact-component-id="e11850fd-..."
     data-component-type="ProductDetailsPage">  <!-- NO! -->
```

### Option 2: Client-Side Type Registry ✅ (RECOMMENDED)
Track component type → instance ID mapping on the client.

**Implementation**:
1. When component is hydrated, register its type:
   ```javascript
   // hydration.ts
   const componentType = this.getComponentTypeName(element);
   this.componentsByType.set(componentType, [...instanceIds]);
   ```

2. Get type name from component metadata (embedded in page or derived from class)

3. Template map handler looks up instances by type:
   ```javascript
   // hot-reload.ts
   const instances = this.minimact.getComponentsByType(componentId);
   for (const instance of instances) {
     // Apply templates to each instance
   }
   ```

### Option 3: Server Sends Instance IDs ❌
**Rejected**: Server doesn't know which instances exist on each client

The server would need to:
- Track which components are on which pages
- Track which clients are viewing which pages
- Send templates with instance-specific IDs

This is overly complex and breaks the stateless nature of templates.

### Option 4: Apply Templates to All Components ❌
**Rejected**: Wasteful and potentially incorrect

```javascript
// Apply template map to EVERY component, regardless of type
for (const component of allComponents) {
  applyTemplates(component);
}
```

This would try to apply `ProductDetailsPage` templates to `UserProfile` components, causing errors or wasted cycles.

## Recommended Solution Design

### Server Side (No Changes Needed)
Continue sending templates with component type name:
```json
{
  "componentId": "ProductDetailsPage",  // Type name
  "templateMap": { ... }
}
```

### Client Side Changes

#### 1. Track Component Type in Hydration
```typescript
// hydration.ts
interface ComponentMetadata {
  componentId: string;          // Instance GUID
  componentType: string;         // Class name
  element: HTMLElement;
  context: ComponentContext;
}

private componentsByType = new Map<string, Set<string>>();  // Type → Instance IDs

registerComponent(id: string, type: string, element: HTMLElement) {
  // Existing registration...

  // Track by type
  if (!this.componentsByType.has(type)) {
    this.componentsByType.set(type, new Set());
  }
  this.componentsByType.get(type)!.add(id);
}
```

#### 2. Add Type Lookup Method
```typescript
// index.ts (Minimact class)
getComponentsByType(typeName: string): ComponentMetadata[] {
  return this.hydration.getComponentsByType(typeName);
}
```

#### 3. Update Hot Reload Handler
```typescript
// hot-reload.ts
private handleTemplateMap(message: HotReloadMessage): void {
  const componentType = message.componentId;  // This is actually the TYPE name
  const instances = this.minimact.getComponentsByType(componentType);

  console.log(`[HotReload] Found ${instances.length} instances of ${componentType}`);

  // Load templates once (shared across instances)
  templateState.loadTemplateMap(componentType, message.templateMap);

  // Apply to each instance
  for (const instance of instances) {
    const patches = this.createPatchesFromTemplateChanges(
      componentType,
      instance.componentId,
      message.templateMap
    );

    if (patches.length > 0) {
      this.minimact.domPatcher.applyPatches(instance.element, patches);
    }
  }
}
```

### How to Get Component Type Name?

**Problem**: The HTML doesn't currently include the component type name, only the instance GUID.

**Solutions**:

#### A. Embed in JavaScript (Minimal HTML Bloat)
```html
<script>
window.__MINIMACT_COMPONENTS__ = {
  "e11850fd-9898-4fca-8991-5c4065601284": "ProductDetailsPage"
};
</script>
```

Client reads this on hydration to build the type registry.

#### B. Derive from ViewModel Metadata
The ViewModel already has component info:
```json
{
  "data": { ... },
  "_mutability": { ... },
  "_componentType": "ProductDetailsPage"  // Add this
}
```

#### C. Server Sends on Initial Connection
When client connects via SignalR, server sends component registry:
```json
{
  "type": "component-registry",
  "components": [
    { "id": "e11850fd-...", "type": "ProductDetailsPage" }
  ]
}
```

**Recommended**: Option A or B - embed in existing page data structures.

## Implementation Steps

1. ✅ Identify the problem (completed)
2. ⬜ Choose component type embedding strategy (A, B, or C above)
3. ⬜ Update server to include component type in page metadata
4. ⬜ Update client hydration to build type → instance registry
5. ⬜ Update `HotReloadManager.handleTemplateMap()` to use type lookup
6. ⬜ Test with multiple instances of same component type
7. ⬜ Test with mixed component types on same page

## Expected Outcome

After fix:
```
[HotReload] 🔍 Processing template map for ProductDetailsPage
[HotReload] 📋 Found 0 existing templates
[HotReload] 🔍 Component lookup for "ProductDetailsPage": ✅ Found 1 instance(s)
[HotReload] 🔥 Template changed: "Widget" → "Widget9"
[HotReload] 📦 Created UpdateText patch
[HotReload] 🎯 Applying 1 patches to DOM...
[HotReload] ✅ Patches applied successfully!
```

And the DOM updates instantly with the new text!
