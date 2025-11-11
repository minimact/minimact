# Stop Lifting. Start Building.

> **The Minimact Philosophy: State is Already Lifted**™

---

## The Problem with Traditional React

For over a decade, React developers have been told to **"lift state up"** when components need to share data. This manual process has become one of the most tedious and error-prone aspects of React development.

### The Traditional "Lifting State Up" Dance

```tsx
// Step 1: Child has local state
function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  return <button onClick={() => setIsEditing(true)}>Edit</button>;
}

// Step 2: Parent needs to know about editing state
// → Refactor: Move state to parent
function Dashboard() {
  const [isEditing, setIsEditing] = useState(false);  // ← Lifted manually
  return <UserProfile isEditing={isEditing} onEditingChange={setIsEditing} />;
}

function UserProfile({ isEditing, onEditingChange }) {  // ← Props added
  return <button onClick={() => onEditingChange(true)}>Edit</button>;
}

// Step 3: Sibling needs editing state too
// → Add more props...
function Sidebar({ userIsEditing }) {  // ← More prop drilling
  return userIsEditing ? <div>User is editing...</div> : null;
}

// Step 4: Three levels deep?
// → Context or Redux (even more boilerplate)
const EditingContext = createContext();  // ← Complexity explosion
```

### The Pain Points

❌ **Manual refactoring** - Move state up, add props, change signatures
❌ **Prop drilling** - Pass through intermediate components that don't care
❌ **Callback hell** - `onEditingChange`, `onValidChange`, `onItemsChange`...
❌ **Context boilerplate** - Provider wrappers, consumer hooks, type definitions
❌ **Redux ceremony** - Actions, reducers, selectors, middleware...
❌ **Decision fatigue** - "Should this be local or lifted? How far up?"
❌ **Scattered state** - State lives everywhere, debugging is nightmare

---

## The Minimact Solution

### Core Insight: State is Already Lifted

In Minimact, **all component state automatically lives in the parent**. You don't lift it—it's already there.

```tsx
// Minimact: State is automatically lifted
import { state, setState, Component } from '@minimact/core';

function Dashboard() {
  // Child state is just... there. No lifting needed.
  const userEditing = state["UserProfile.isEditing"];
  const cartItems = state["ShoppingCart.items"];

  // Parent can read and write child state directly
  const handleCancelEdit = () => {
    setState("UserProfile.isEditing", false);  // ← Parent controls child
  };

  return (
    <div>
      {/* Parent reacts to child state */}
      {userEditing && (
        <div className="overlay">
          <button onClick={handleCancelEdit}>Cancel Edit</button>
        </div>
      )}

      {/* No props needed! */}
      <Component name="UserProfile" state={{ isEditing: false }}>
        <UserProfile />
      </Component>

      <Component name="ShoppingCart" state={{ items: [] }}>
        <ShoppingCart />
      </Component>
    </div>
  );
}

// Child components remain simple - they think they're autonomous
function UserProfile() {
  const isEditing = state.isEditing;  // ← Uses local key (auto-namespaced)

  return (
    <button onClick={() => setState("isEditing", !isEditing)}>
      {isEditing ? 'Cancel' : 'Edit'}
    </button>
  );
}
```

### What Just Happened?

1. **No manual lifting** - State is in parent by default
2. **No prop drilling** - Parent reads `state["Child.key"]` directly
3. **No callbacks** - Parent writes `setState("Child.key", value)` directly
4. **Children are simple** - Use `state.key` as if it's local
5. **Zero refactoring** - Need parent control? Just use it. No changes needed.

---

## The Philosophy Shift

### React's Mental Model

> "Components are autonomous entities. When they need to share state, manually lift it to a common parent and pass it down through props."

**This leads to:**
- Constant refactoring as requirements change
- Prop drilling through intermediate components
- Context/Redux when drilling gets painful
- State scattered across many locations

### Minimact's Mental Model

> "Parent owns the entire subtree's state. Children are just views into that state."

**This enables:**
- State is lifted by default (automatic)
- Parent has full visibility and control
- Children remain simple and focused
- Single source of truth (parent's State dictionary)

---

## Real-World Examples

### Example 1: Form Validation Summary

**React (Traditional):**
```tsx
function RegistrationPage() {
  const [personalValid, setPersonalValid] = useState(false);
  const [addressValid, setAddressValid] = useState(false);
  const [paymentValid, setPaymentValid] = useState(false);

  const allValid = personalValid && addressValid && paymentValid;

  return (
    <>
      <PersonalInfoForm onValidChange={setPersonalValid} />
      <AddressForm onValidChange={setAddressValid} />
      <PaymentForm onValidChange={setPaymentValid} />
      <button disabled={!allValid}>Submit</button>
    </>
  );
}
```

**Minimact:**
```tsx
function RegistrationPage() {
  // Just read child validation state
  const personalValid = state["PersonalInfoForm.isValid"];
  const addressValid = state["AddressForm.isValid"];
  const paymentValid = state["PaymentForm.isValid"];

  const allValid = personalValid && addressValid && paymentValid;

  return (
    <>
      <Component name="PersonalInfoForm" state={{ isValid: false }}>
        <PersonalInfoForm />
      </Component>
      <Component name="AddressForm" state={{ isValid: false }}>
        <AddressForm />
      </Component>
      <Component name="PaymentForm" state={{ isValid: false }}>
        <PaymentForm />
      </Component>
      <button disabled={!allValid}>Submit</button>
    </>
  );
}
```

**Difference:**
- ❌ No callback props (`onValidChange`)
- ❌ No manual state declarations in parent
- ✅ Parent just reads what it needs
- ✅ Children manage their own validation
- ✅ No refactoring when adding new forms

---

### Example 2: Cross-Component Coordination

**React (Traditional):**
```tsx
function ChatPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSend = () => {
    setMessages([...messages, { text: draft, author: "Me" }]);
    setDraft("");  // Clear input
  };

  return (
    <>
      <MessageList messages={messages} />
      <MessageInput value={draft} onChange={setDraft} onSend={handleSend} />
    </>
  );
}
```

**Minimact:**
```tsx
function ChatPage() {
  const draft = state["MessageInput.draft"];
  const messages = state["MessageList.messages"];

  const handleSend = () => {
    setState("MessageList.messages", [...messages, { text: draft, author: "Me" }]);
    setState("MessageInput.draft", "");  // Clear input
  };

  return (
    <>
      <Component name="MessageList" state={{ messages: [] }}>
        <MessageList />
      </Component>
      <Component name="MessageInput" state={{ draft: "" }}>
        <MessageInput onSend={handleSend} />
      </Component>
    </>
  );
}
```

**Difference:**
- ❌ No value/onChange props for every field
- ✅ Parent coordinates state between siblings
- ✅ Single action (`handleSend`) updates multiple components
- ✅ Children remain decoupled

---

### Example 3: Parent Enforcing Rules

**React (Traditional):**
```tsx
function EmailComposer() {
  const [recipients, setRecipients] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [totalSize, setTotalSize] = useState(0);

  const MAX_SIZE = 25 * 1024 * 1024;
  const canSend = recipients.length > 0 && totalSize <= MAX_SIZE;

  const handleAttachmentAdd = (file) => {
    const newSize = totalSize + file.size;
    if (newSize > MAX_SIZE) {
      alert("File too large!");
      return;
    }
    setAttachments([...attachments, file]);
    setTotalSize(newSize);
  };

  return (
    <>
      <RecipientList value={recipients} onChange={setRecipients} />
      <AttachmentPanel
        files={attachments}
        onAdd={handleAttachmentAdd}
        maxSize={MAX_SIZE}
      />
      <button disabled={!canSend}>Send</button>
    </>
  );
}
```

**Minimact:**
```tsx
function EmailComposer() {
  // Observe child state
  const recipients = state["RecipientList.recipients"];
  const totalSize = state["AttachmentPanel.totalSize"];

  const MAX_SIZE = 25 * 1024 * 1024;
  const canSend = recipients.length > 0 && totalSize <= MAX_SIZE;

  // Enforce rules from parent
  const handleClearAttachments = () => {
    setState("AttachmentPanel.files", []);
    setState("AttachmentPanel.totalSize", 0);
  };

  return (
    <>
      {totalSize > MAX_SIZE * 0.8 && (
        <div className="warning">
          Approaching limit!
          <button onClick={handleClearAttachments}>Clear</button>
        </div>
      )}

      <Component name="RecipientList" state={{ recipients: [] }}>
        <RecipientList />
      </Component>
      <Component name="AttachmentPanel" state={{ files: [], totalSize: 0 }}>
        <AttachmentPanel maxSize={MAX_SIZE} />
      </Component>
      <button disabled={!canSend}>Send</button>
    </>
  );
}
```

**Difference:**
- ❌ No complex callback props for validation
- ✅ Parent observes and enforces business rules
- ✅ Parent can intervene (clear attachments)
- ✅ Children remain simple (just UI)

---

## The Benefits

### 1. Zero Decision Fatigue

You don't have to decide:
- "Should this state be local or lifted?"
- "What's the common parent?"
- "How many levels of props?"

**It's already lifted. Focus on building features instead.**

---

### 2. Trivial Refactoring

Need parent to control child state?

```tsx
// Before: Parent just observes
const isEditing = state["UserProfile.isEditing"];

// After: Parent wants control too
setState("UserProfile.isEditing", false);  // ← Just write it

// No refactoring! No props added! No signatures changed!
```

---

### 3. Perfect for Predictive Rendering

Because all state lives in one place (parent's State dictionary), the predictor sees **everything**:

```rust
// Rust predictor sees full state tree (flat structure)
let parent_state = {
  "UserProfile.isEditing": false,
  "ShoppingCart.items": [],
  "ContactForm.isValid": true
};

// Generates patches for ANY state change
// With 100% accuracy, zero learning phase
```

Traditional React's scattered state makes prediction impossible. Minimact's lifted state makes it trivial.

---

### 4. Trivial Debugging

```tsx
// DevTools: inspect parent's State dictionary
{
  "theme": "dark",
  "UserProfile.username": "Alice",
  "UserProfile.isEditing": false,
  "ShoppingCart.items": [...],
  "ShoppingCart.total": 150.00,
  "ContactForm.isValid": true
}

// Single source of truth
// Flat structure
// Easy to inspect, easy to debug
```

Compare to React:
- State scattered across dozens of components
- Hidden in Context providers
- Buried in Redux stores
- Good luck debugging! 🤷

---

### 5. No More Boilerplate

| Pattern | React | Minimact |
|---------|-------|----------|
| **Local state** | `useState()` | `state.key` |
| **Lifted state** | Manual lifting + props | `state["Child.key"]` (automatic) |
| **Update child** | Callback props | `setState("Child.key", value)` |
| **Cross-component** | Context/Redux | `state["Sibling.key"]` |
| **Validation** | Callback props | Read child state directly |

**Result:** 10x less code for the same functionality.

---

## Comparison to Other Approaches

### React Context

```tsx
// React Context (boilerplate)
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Dashboard />
    </UserContext.Provider>
  );
}

function Dashboard() {
  return <UserProfile />;  // Intermediate component
}

function UserProfile() {
  const { user, setUser } = useContext(UserContext);  // Consumer
  return <div>{user?.name}</div>;
}
```

```tsx
// Minimact (no context needed)
function App() {
  return (
    <Component name="UserProfile" state={{ user: null }}>
      <Dashboard />
    </Component>
  );
}

function Dashboard() {
  return <UserProfile />;
}

function UserProfile() {
  const user = state.user;  // Just read it
  return <div>{user?.name}</div>;
}
```

---

### Redux

```tsx
// Redux (ceremony)
const userSlice = createSlice({
  name: 'user',
  initialState: { isEditing: false },
  reducers: {
    setEditing: (state, action) => {
      state.isEditing = action.payload;
    }
  }
});

function UserProfile() {
  const isEditing = useSelector(state => state.user.isEditing);
  const dispatch = useDispatch();
  return (
    <button onClick={() => dispatch(setEditing(true))}>
      Edit
    </button>
  );
}
```

```tsx
// Minimact (direct)
function UserProfile() {
  const isEditing = state.isEditing;
  return (
    <button onClick={() => setState("isEditing", true)}>
      Edit
    </button>
  );
}
```

**No actions. No reducers. No dispatch. Just read and write.**

---

### Zustand / Jotai / Recoil

These libraries try to solve React's state management problems with external stores. But they're still **workarounds** for React's fundamental limitation: lack of built-in state lifting.

**Minimact doesn't need workarounds.** State lifting is built into the architecture.

---

## Why This Works

### It's How Hierarchical Systems Actually Work

Minimact's model mirrors how real hierarchical systems work:

**Game Engines:**
```cpp
// Parent transform affects all children
parentNode.position = {x: 10, y: 20};
childNode.globalPosition();  // Automatically includes parent transform
```

**Databases:**
```sql
-- Parent row contains child rows
SELECT * FROM parent
JOIN children ON parent.id = children.parent_id
```

**The DOM:**
```js
// Parent element owns children
parentElement.children;  // Access all children
parentElement.querySelector('.child');  // Query children
```

**Why fight against hierarchy?** Embrace it. Parents own children. It's natural.

---

## The Technical Implementation

### How It Works (Simple Explanation)

1. **Parent owns State dictionary:**
   ```csharp
   State = {
     "theme": "dark",
     "UserProfile.isEditing": false,
     "ShoppingCart.items": []
   }
   ```

2. **Child state keys are namespaced:**
   ```tsx
   <Component name="UserProfile" state={{ isEditing: false }}>
   ```
   Creates key: `"UserProfile.isEditing"` in parent's State

3. **Child reads with local key:**
   ```tsx
   const isEditing = state.isEditing;  // Inside UserProfile
   ```
   Transpiles to: `State["UserProfile.isEditing"]` (automatic namespacing)

4. **Parent reads with full key:**
   ```tsx
   const isEditing = state["UserProfile.isEditing"];  // Inside Dashboard
   ```
   Transpiles to: `State["UserProfile.isEditing"]` (explicit namespacing)

5. **Anyone can write:**
   ```tsx
   setState("UserProfile.isEditing", true);
   ```
   Updates: `State["UserProfile.isEditing"] = true`

**It's elegant. It's simple. It just works.** ✨

---

## Migration from React

Minimact's lifted state is **opt-in**. You can mix traditional patterns with lifted state:

```tsx
// Traditional (still works)
function OldComponent() {
  const [count, setCount] = useState(0);  // Local state
  return <div>{count}</div>;
}

// Lifted state (new pattern)
function NewComponent() {
  return (
    <div>
      <Component name="Counter" state={{ count: 0 }}>
        <OldComponent />  {/* Reuse existing component! */}
      </Component>

      {/* Parent can now observe: */}
      <p>Count: {state["Counter.count"]}</p>
    </div>
  );
}
```

**Migration path:**
1. Wrap existing components with `<Component>`
2. Move `useState` declarations to `state` attribute
3. Update component to use `state.key` instead of local variables
4. Done! Parent can now read/write child state

---

## The Taglines

> **Minimact: State is Already Lifted**™

> **Stop Lifting. Start Building.**™

> **Zero Props. Zero Drilling. Zero Refactoring.**

> **Parent Owns State. Children Own UI.**

> **One State Dictionary. Infinite Possibilities.**

---

## Conclusion

For over a decade, React developers have manually lifted state, passed props, and written callbacks. We've accepted this as "the cost of doing business."

**But it doesn't have to be this way.**

Minimact proves that state management can be:
- ✅ Automatic (state is already lifted)
- ✅ Simple (just read/write what you need)
- ✅ Refactor-proof (no props to change)
- ✅ Type-safe (with TypeScript support)
- ✅ Debuggable (flat state structure)
- ✅ Predictable (perfect for caching/prediction)

**Stop lifting state. Start building features.**

That's the Minimact way. 🚀

---

**Ready to try it?**

```bash
npm install minimact
```

```tsx
import { state, setState, Component } from '@minimact/core';

// State is already lifted. Just use it.
```

**Welcome to the future of component state management.** 🎉
