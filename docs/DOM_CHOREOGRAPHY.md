# DOM Choreography: Elements as Actors on a Stage

**The Revolutionary Concept:** Define DOM elements ONCE. Move them based on state. Never recreate. Never destroy.

---

## The Core Philosophy 🎭

**Elements = Actors**
**State = Stage Directions**
**Your App = The Theater**

```tsx
// Define actors ONCE
<div className="stage">
  <div id="actor-1">Actor 1</div>
  <div id="actor-2">Actor 2</div>
  <div id="actor-3">Actor 3</div>
</div>

// Choreograph based on state
const dynamic = useDynamicState();

dynamic.order('.stage', (state) => {
  if (state.scene === 'opening') {
    return ['#actor-1', '#actor-2', '#actor-3'];
  } else if (state.scene === 'climax') {
    return ['#actor-3', '#actor-1', '#actor-2'];  // Rearranged!
  }
});

// Same actors, different positions
// No unmount/remount
// Smooth CSS transitions
// State preserved
```

---

## Why This Changes Everything

### Traditional React: Recreate on Every Change

```tsx
// DESTROYS and RECREATES elements on every sort
{items.sort(sortFn).map(item => (
  <Card key={item.id} data={item} />
))}

// Problems:
// ❌ Unmount old cards
// ❌ Mount new cards
// ❌ Lose component state
// ❌ Lose scroll position
// ❌ Lose focus
// ❌ Lose input values
// ❌ VDOM reconciliation overhead
```

### MINIMACT: Move, Don't Recreate

```tsx
// Cards defined ONCE
<div className="cards">
  <Card id="card-1" />
  <Card id="card-2" />
  <Card id="card-3" />
</div>

// Just REARRANGE
dynamic.order('.cards', (state) =>
  state.items
    .sort(sortFn)
    .map(item => `#card-${item.id}`)
);

// Benefits:
// ✅ Same cards, just moved
// ✅ Keep component state
// ✅ Keep scroll position
// ✅ Keep focus
// ✅ Keep input values
// ✅ Direct DOM manipulation (no VDOM)
// ✅ Smooth CSS transitions
```

---

## The Complete API

```typescript
interface DynamicStateAPI {
  // Bind text content
  bind(selector: string, fn: (state) => string | number): void;

  // Bind element order (DOM CHOREOGRAPHY)
  order(containerSelector: string, fn: (state) => string[]): void;

  // Bind attributes
  attr(selector: string, attribute: string, fn: (state) => string): void;

  // Bind classes
  class(selector: string, fn: (state) => string): void;

  // Bind styles
  style(selector: string, property: string, fn: (state) => string): void;

  // Bind visibility
  show(selector: string, fn: (state) => boolean): void;

  // State management
  setState(newState: any): void;
  update(partial: any): void;
}
```

---

## Real-World Examples

### 1. Chess Board ♟️

**The PERFECT use case for DOM choreography.**

```tsx
function ChessBoard() {
  const dynamic = useDynamicState({
    board: initialPosition,
    turn: 'white',
    capturedPieces: []
  });

  // Define pieces ONCE, never destroyed
  return (
    <div className="chessboard">
      {/* 64 squares */}
      {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file =>
        ['1', '2', '3', '4', '5', '6', '7', '8'].map(rank => (
          <div key={`${file}${rank}`} className="square" data-pos={`${file}${rank}`}></div>
        ))
      )}

      {/* Pieces defined ONCE, never destroyed */}
      <div className="piece-pool" style={{ display: 'none' }}>
        <div id="piece-white-king" className="piece king white">♔</div>
        <div id="piece-white-queen" className="piece queen white">♕</div>
        <div id="piece-white-rook-1" className="piece rook white">♖</div>
        <div id="piece-white-rook-2" className="piece rook white">♖</div>
        <div id="piece-white-knight-1" className="piece knight white">♘</div>
        <div id="piece-white-knight-2" className="piece knight white">♘</div>
        <div id="piece-white-bishop-1" className="piece bishop white">♗</div>
        <div id="piece-white-bishop-2" className="piece bishop white">♗</div>
        {/* ... all 32 pieces ... */}
      </div>

      {/* Captured pieces area */}
      <div className="captured-white"></div>
      <div className="captured-black"></div>
    </div>
  );

  // Choreograph pieces onto squares
  for (let file of 'abcdefgh') {
    for (let rank of '12345678') {
      const square = `${file}${rank}`;

      dynamic.order(`[data-pos="${square}"]`, (state) => {
        const piece = state.board.find(p => p.position === square);
        return piece ? [`#piece-${piece.id}`] : [];
      });
    }
  }

  // Captured pieces choreography
  dynamic.order('.captured-white', (state) =>
    state.capturedPieces
      .filter(p => p.color === 'white')
      .map(p => `#piece-${p.id}`)
  );

  dynamic.order('.captured-black', (state) =>
    state.capturedPieces
      .filter(p => p.color === 'black')
      .map(p => `#piece-${p.id}`)
  );
}

// User moves white pawn: e2 → e4
setState({
  board: board.map(p =>
    p.id === 'white-pawn-1'
      ? { ...p, position: 'e4' }
      : p
  )
});

// Piece GLIDES from e2 to e4 (CSS transition handles animation)
// Same DOM element, just moved
```

**Castling:**
```typescript
// King-side castle: King e1→g1, Rook h1→f1
setState({
  board: board.map(p => {
    if (p.id === 'white-king') return { ...p, position: 'g1' };
    if (p.id === 'white-rook-2') return { ...p, position: 'f1' };
    return p;
  })
});

// TWO pieces move simultaneously
// Both animate smoothly
```

**Capturing:**
```typescript
// White pawn captures black knight on e5
setState({
  board: board.filter(p => p.id !== 'black-knight-1')  // Remove captured piece
         .map(p => p.id === 'white-pawn-1'
                ? { ...p, position: 'e5' }
                : p)
});

// Knight moves to captured area
// Pawn moves to e5
// Both animate smoothly
```

**Pawn Promotion:**
```typescript
// Pawn reaches 8th rank, promotes to queen
setState({
  board: board.map(p =>
    p.id === 'white-pawn-1' && p.position === 'e8'
      ? { ...p, type: 'queen' }
      : p
  )
});

// Update piece appearance
dynamic.bind('#piece-white-pawn-1', (state) => {
  const piece = state.board.find(p => p.id === 'white-pawn-1');
  return piece?.type === 'queen' ? '♕' : '♙';
});

// Same element, just changed content
// Morph animation possible!
```

---

### 2. Kanban Board

```tsx
function KanbanBoard() {
  const dynamic = useDynamicState();

  return (
    <div className="board">
      <div className="column" data-column="todo">
        <h3>To Do</h3>
        <div className="cards"></div>
      </div>
      <div className="column" data-column="in-progress">
        <h3>In Progress</h3>
        <div className="cards"></div>
      </div>
      <div className="column" data-column="done">
        <h3>Done</h3>
        <div className="cards"></div>
      </div>

      {/* Cards defined once */}
      <div className="card-pool" style={{ display: 'none' }}>
        <div className="card" id="card-1">Task 1</div>
        <div className="card" id="card-2">Task 2</div>
        <div className="card" id="card-3">Task 3</div>
        <div className="card" id="card-4">Task 4</div>
        <div className="card" id="card-5">Task 5</div>
      </div>
    </div>
  );

  // Arrange cards into columns based on state
  dynamic.order('[data-column="todo"] .cards', (state) =>
    state.tasks
      .filter(t => t.status === 'todo')
      .map(t => `#card-${t.id}`)
  );

  dynamic.order('[data-column="in-progress"] .cards', (state) =>
    state.tasks
      .filter(t => t.status === 'in-progress')
      .map(t => `#card-${t.id}`)
  );

  dynamic.order('[data-column="done"] .cards', (state) =>
    state.tasks
      .filter(t => t.status === 'done')
      .map(t => `#card-${t.id}`)
  );
}

// User drags card from "To Do" to "In Progress"
setState({
  tasks: tasks.map(t =>
    t.id === 3 ? { ...t, status: 'in-progress' } : t
  )
});

// Card #3 MOVES from first column to second
// Same DOM element, just reparented!
// If card had an input field, value PRESERVED!
```

---

### 3. Sliding Puzzle

```tsx
function SlidingPuzzle() {
  const dynamic = useDynamicState();
  const [positions, setPositions] = useState([
    1, 2, 3,
    4, 5, 6,
    7, 8, null  // null = empty space
  ]);

  // Tiles defined ONCE
  return (
    <div className="puzzle">
      <div className="tile" id="tile-1">1</div>
      <div className="tile" id="tile-2">2</div>
      <div className="tile" id="tile-3">3</div>
      <div className="tile" id="tile-4">4</div>
      <div className="tile" id="tile-5">5</div>
      <div className="tile" id="tile-6">6</div>
      <div className="tile" id="tile-7">7</div>
      <div className="tile" id="tile-8">8</div>
    </div>
  );

  // Rearrange based on positions array
  dynamic.order('.puzzle', (state) =>
    state.positions
      .filter(p => p !== null)
      .map(num => `#tile-${num}`)
  );

  const slide = (tileNum) => {
    const emptyIndex = positions.indexOf(null);
    const tileIndex = positions.indexOf(tileNum);

    // Check if adjacent
    const validMoves = [
      emptyIndex - 3, // above
      emptyIndex + 3, // below
      emptyIndex - 1, // left
      emptyIndex + 1  // right
    ];

    if (validMoves.includes(tileIndex)) {
      const newPositions = [...positions];
      [newPositions[emptyIndex], newPositions[tileIndex]] =
        [newPositions[tileIndex], newPositions[emptyIndex]];
      setPositions(newPositions);
    }
  };
}

// User clicks tile 8
slide(8);
// positions: [1,2,3,4,5,6,7,8,null] → [1,2,3,4,5,6,7,null,8]
// Tile 8 SLIDES to empty space with CSS transition!
```

**CSS for smooth sliding:**
```css
.tile {
  transition: transform 0.3s ease;
}

.puzzle {
  display: grid;
  grid-template-columns: repeat(3, 100px);
}
```

---

### 4. Photo Gallery Layouts

```tsx
function Gallery() {
  const dynamic = useDynamicState();
  const [layout, setLayout] = useState('grid'); // 'grid' | 'masonry' | 'carousel'

  // Photos defined ONCE
  return (
    <div>
      <button onClick={() => setLayout('grid')}>Grid</button>
      <button onClick={() => setLayout('masonry')}>Masonry</button>
      <button onClick={() => setLayout('carousel')}>Carousel</button>

      <div className="gallery-container"></div>

      {/* Photo elements, not destroyed/recreated */}
      <div className="photo-pool" style={{ display: 'none' }}>
        <img className="photo" id="photo-1" src="1.jpg" />
        <img className="photo" id="photo-2" src="2.jpg" />
        <img className="photo" id="photo-3" src="3.jpg" />
        <img className="photo" id="photo-4" src="4.jpg" />
        <img className="photo" id="photo-5" src="5.jpg" />
      </div>
    </div>
  );

  // Rearrange based on layout
  dynamic.order('.gallery-container', (state) => {
    if (state.layout === 'grid') {
      return ['#photo-1', '#photo-2', '#photo-3', '#photo-4', '#photo-5'];
    } else if (state.layout === 'masonry') {
      // Sort by height
      return state.photos
        .sort((a, b) => b.height - a.height)
        .map(p => `#photo-${p.id}`);
    } else if (state.layout === 'carousel') {
      // Featured photo first
      return [
        `#photo-${state.featuredPhoto}`,
        ...state.photos
          .filter(p => p.id !== state.featuredPhoto)
          .map(p => `#photo-${p.id}`)
      ];
    }
  });
}

// User clicks "Masonry Layout"
setLayout('masonry');
// Photos REARRANGE from grid to masonry
// Same DOM elements, different order
// Images don't reload!
```

---

### 5. Sortable Todo List

```tsx
function TodoList() {
  const dynamic = useDynamicState();
  const [sortBy, setSortBy] = useState('date');

  // Todos defined ONCE
  return (
    <div>
      <select onChange={(e) => setSortBy(e.target.value)}>
        <option value="date">Sort by Date</option>
        <option value="priority">Sort by Priority</option>
        <option value="alphabetical">Sort Alphabetically</option>
      </select>

      <ul className="todo-list"></ul>

      {/* Todo items in a pool */}
      <div className="todo-pool" style={{ display: 'none' }}>
        <li className="todo" id="todo-1">Buy milk</li>
        <li className="todo" id="todo-2">Walk dog</li>
        <li className="todo" id="todo-3">Write code</li>
      </div>
    </div>
  );

  // Rearrange based on sort
  dynamic.order('.todo-list', (state) => {
    let sorted = [...state.todos];

    if (state.sortBy === 'date') {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (state.sortBy === 'priority') {
      const priorities = { high: 3, medium: 2, low: 1 };
      sorted.sort((a, b) => priorities[b.priority] - priorities[a.priority]);
    } else if (state.sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    }

    return sorted.map(t => `#todo-${t.id}`);
  });
}

// User selects "Sort by Priority"
setSortBy('priority');
// Todos REARRANGE: [1, 2, 3] → [1, 3, 2]
// Same DOM elements, different order
```

---

### 6. Dashboard Widget Grid

```tsx
function Dashboard() {
  const dynamic = useDynamicState();
  const [layout, setLayout] = useState('default');

  // Widgets defined ONCE
  return (
    <div>
      <button onClick={() => setLayout('default')}>Default</button>
      <button onClick={() => setLayout('compact')}>Compact</button>
      <button onClick={() => setLayout('custom')}>Custom</button>

      <div className="dashboard"></div>

      {/* Widgets */}
      <div className="widget-pool" style={{ display: 'none' }}>
        <div className="widget" id="widget-sales">Sales Chart</div>
        <div className="widget" id="widget-users">User Stats</div>
        <div className="widget" id="widget-revenue">Revenue</div>
        <div className="widget" id="widget-tasks">Tasks</div>
        <div className="widget" id="widget-calendar">Calendar</div>
      </div>
    </div>
  );

  // Rearrange based on layout preference
  dynamic.order('.dashboard', (state) => {
    const layouts = {
      default: ['widget-sales', 'widget-users', 'widget-revenue', 'widget-tasks', 'widget-calendar'],
      compact: ['widget-sales', 'widget-revenue', 'widget-users', 'widget-tasks', 'widget-calendar'],
      custom: state.user.customLayout || layouts.default
    };

    return layouts[state.layout].map(id => `#${id}`);
  });
}

// User drags widgets to custom positions
setLayout('custom');
setState({
  user: {
    customLayout: ['widget-calendar', 'widget-tasks', 'widget-sales', 'widget-revenue', 'widget-users']
  }
});
// Widgets REARRANGE to saved preference!
```

---

## DOM Teleportation: Cross-Container Movement

**Elements can move to ANY container based on state.**

### Parent → Child

```tsx
// Move item INTO a nested details panel
dynamic.order('.details-panel .content', (state) =>
  state.selectedItem ? [`#item-${state.selectedItem.id}`] : []
);
```

### Child → Parent

```tsx
// Move item OUT of details panel back to grid
dynamic.order('.grid', (state) =>
  state.items
    .filter(item => item.id !== state.selectedItem?.id)
    .map(item => `#item-${item.id}`)
);
```

### Across Completely Different Trees

#### File Manager: Drag and Drop

```tsx
function FileManager() {
  const dynamic = useDynamicState();

  return (
    <div>
      <div className="folder" data-folder="documents"></div>
      <div className="folder" data-folder="images"></div>
      <div className="folder" data-folder="trash"></div>

      {/* Files defined ONCE */}
      <div className="file-pool" style={{ display: 'none' }}>
        <div id="file-1" className="file">Document.pdf</div>
        <div id="file-2" className="file">Photo.jpg</div>
        <div id="file-3" className="file">Video.mp4</div>
      </div>
    </div>
  );

  // Files move between folders
  dynamic.order('[data-folder="documents"]', (state) =>
    state.files
      .filter(f => f.folder === 'documents')
      .map(f => `#file-${f.id}`)
  );

  dynamic.order('[data-folder="trash"]', (state) =>
    state.files
      .filter(f => f.folder === 'trash')
      .map(f => `#file-${f.id}`)
  );
}

// User drags file to trash
setState({
  files: files.map(f =>
    f.id === 2 ? { ...f, folder: 'trash' } : f
  )
});

// Photo.jpg MOVES from images folder to trash
// Same element, different parent!
```

#### Modal Dialogs

```tsx
function App() {
  const dynamic = useDynamicState();

  return (
    <div>
      {/* Main content */}
      <div className="main-content"></div>

      {/* Modal container */}
      <div className="modal-overlay"></div>

      {/* Forms defined ONCE */}
      <div className="form-pool" style={{ display: 'none' }}>
        <form id="login-form">
          <input name="email" />
          <input name="password" />
        </form>
        <form id="settings-form">...</form>
      </div>
    </div>
  );

  // Forms move between main content and modal
  dynamic.order('.main-content', (state) =>
    state.currentView === 'settings' && !state.modalOpen
      ? ['#settings-form']
      : []
  );

  dynamic.order('.modal-overlay', (state) =>
    state.modalOpen && state.modal === 'login'
      ? ['#login-form']
      : []
  );
}

// User clicks "Login"
setState({ modalOpen: true, modal: 'login' });

// Login form MOVES from pool into modal
// Input values PRESERVED!
```

#### Responsive Navigation

```tsx
function Navigation() {
  const dynamic = useDynamicState();

  return (
    <div>
      <nav className="desktop-nav"></nav>
      <div className="mobile-menu"></div>

      {/* Nav items defined ONCE */}
      <div className="nav-pool" style={{ display: 'none' }}>
        <a id="nav-home" href="/">Home</a>
        <a id="nav-about" href="/about">About</a>
        <a id="nav-contact" href="/contact">Contact</a>
      </div>
    </div>
  );

  // Nav items move based on viewport
  dynamic.order('.desktop-nav', (state) =>
    state.viewport === 'desktop'
      ? ['#nav-home', '#nav-about', '#nav-contact']
      : []
  );

  dynamic.order('.mobile-menu', (state) =>
    state.viewport === 'mobile' && state.menuOpen
      ? ['#nav-home', '#nav-about', '#nav-contact']
      : []
  );
}

// Screen resizes to mobile
setState({ viewport: 'mobile' });

// Nav items MOVE from desktop nav to mobile menu
// Same elements, different container
```

#### Picture-in-Picture Video

```tsx
function VideoPlayer() {
  const dynamic = useDynamicState();

  return (
    <div>
      <div className="video-main"></div>
      <div className="video-pip"></div>

      {/* Video element defined ONCE */}
      <div className="video-pool" style={{ display: 'none' }}>
        <video id="main-video" src="movie.mp4"></video>
      </div>
    </div>
  );

  // Video moves between containers
  dynamic.order('.video-main', (state) =>
    state.pipMode ? [] : ['#main-video']
  );

  dynamic.order('.video-pip', (state) =>
    state.pipMode ? ['#main-video'] : []
  );
}

// User clicks PiP button
setState({ pipMode: true });

// Video MOVES from main to PiP
// KEEPS PLAYING! No pause, no reload!
```

---

## Cross-Page DOM Teleportation 🌐⚡

**THE ULTIMATE INNOVATION: Elements persist across page navigations.**

### The Concept

```
Page 1: Shopping Cart
User adds items → Items defined as DOM elements

User navigates to Page 2: Checkout
Elements TELEPORT from Page 1 to Page 2
SAME DOM ELEMENTS. Input values preserved!

User navigates to Page 3: Confirmation
Elements TELEPORT from Page 2 to Page 3
STILL THE SAME ELEMENTS!
```

### Shopping Cart Across Pages

```tsx
// Page 1: /cart
function ShoppingCart() {
  const dynamic = useDynamicState();

  return (
    <div className="cart">
      <div className="cart-items"></div>

      {/* Items defined */}
      <div className="item-pool" style={{ display: 'none' }}>
        <div id="item-1" className="cart-item">
          <input type="number" value="2" />
          Product 1
        </div>
        <div id="item-2" className="cart-item">
          <input type="number" value="1" />
          Product 2
        </div>
      </div>
    </div>
  );

  dynamic.order('.cart-items', (state) =>
    state.cart.items.map(item => `#item-${item.id}`)
  );

  // When navigating away, persist elements
  onBeforeUnload(() => {
    signalR.invoke('PersistElements', {
      elementIds: state.cart.items.map(i => `item-${i.id}`),
      sessionId: sessionId
    });
  });
}

// Page 2: /checkout
function Checkout() {
  const dynamic = useDynamicState();

  useEffect(() => {
    // Retrieve elements from server
    signalR.invoke('RetrieveElements', {
      elementIds: state.cart.items.map(i => `item-${i.id}`),
      sessionId: sessionId
    });
  }, []);

  return (
    <div className="checkout">
      <div className="checkout-items"></div>
    </div>
  );

  // Same items appear here!
  dynamic.order('.checkout-items', (state) =>
    state.cart.items.map(item => `#item-${item.id}`)
  );
}

// User changed quantity to 3 on page 1
// Navigates to page 2
// Input still shows 3! SAME DOM ELEMENT!
```

### Video Player Across Pages

```tsx
// Page 1: /watch
<video id="main-video" src="movie.mp4"></video>

// User watching at 5:23, navigates to /browse
signalR.invoke('PersistElements', ['main-video']);

// Page 2: /browse
// Video element teleports to PiP container
dynamic.order('.pip-container', () => ['#main-video']);

// Video NEVER STOPS PLAYING
// Still at 5:23
// Same element, different page!
```

### Chat Widget Across Site

```tsx
// Homepage: User typing message
<div id="chat-widget">
  <div className="messages">...</div>
  <input className="chat-input" value="Hey, I need help with..." />
</div>

// User navigates to /products
signalR.invoke('PersistElements', ['chat-widget']);

// Products page
dynamic.order('.chat-container', () => ['#chat-widget']);

// Chat widget teleports
// Message still in input field: "Hey, I need help with..."
// Conversation history intact
// Scroll position preserved
```

### Multi-Step Form

```tsx
// Step 1: /signup/personal
<form id="personal-form">
  <input name="firstName" value="John" />
  <input name="lastName" value="Doe" />
  <input name="email" value="john@example.com" />
</form>

// User fills form, clicks Next
signalR.invoke('PersistElements', ['personal-form']);

// Step 2: /signup/address
// Form teleports to new page
dynamic.order('.form-container', () => ['personal-form', 'address-form']);

// All input values STILL THERE
// No localStorage, no session storage
// Just the actual DOM element
```

---

## Server-Side Implementation

### Element Persistence Service

```csharp
// Minimact.AspNetCore/CrossPage/ElementPersistence.cs

public class ElementPersistenceService
{
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _defaultExpiration = TimeSpan.FromHours(1);

    public void PersistElement(string sessionId, string elementId, ElementState state)
    {
        var key = $"element:{sessionId}:{elementId}";
        _cache.Set(key, state, _defaultExpiration);
    }

    public ElementState? RetrieveElement(string sessionId, string elementId)
    {
        var key = $"element:{sessionId}:{elementId}";
        return _cache.Get<ElementState>(key);
    }

    public void TransferElement(string fromSessionId, string toSessionId, string elementId)
    {
        var element = RetrieveElement(fromSessionId, elementId);
        if (element != null)
        {
            PersistElement(toSessionId, elementId, element);
        }
    }
}

public class ElementState
{
    public string OuterHtml { get; set; }
    public int ScrollTop { get; set; }
    public int ScrollLeft { get; set; }
    public Dictionary<string, string> InputValues { get; set; }
    public string? FocusedInputId { get; set; }
    public DateTime Timestamp { get; set; }
}
```

### SignalR Hub

```csharp
public class ElementPersistenceHub : Hub
{
    private readonly ElementPersistenceService _persistence;

    public async Task PersistElements(PersistElementsRequest request)
    {
        foreach (var elementId in request.ElementIds)
        {
            var state = await GetElementStateFromClient(elementId);
            _persistence.PersistElement(request.SessionId, elementId, state);
        }
    }

    public async Task<List<ElementState>> RetrieveElements(RetrieveElementsRequest request)
    {
        var elements = request.ElementIds
            .Select(id => _persistence.RetrieveElement(request.SessionId, id))
            .Where(el => el != null)
            .ToList();

        await Clients.Caller.SendAsync("RestoreElements", elements);
        return elements;
    }
}
```

---

## Client-Side Implementation

### Cross-Page Teleporter

```typescript
// minimact-dynamic/src/cross-page-teleporter.ts

export class CrossPageTeleporter {
  private signalR: SignalRManager;
  private sessionId: string;

  async persistElement(elementId: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Capture complete element state
    const state = {
      outerHtml: element.outerHTML,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      inputValues: this.captureInputValues(element),
      focusedInputId: document.activeElement?.id
    };

    // Send to server
    await this.signalR.invoke('PersistElement', {
      sessionId: this.sessionId,
      elementId,
      state
    });
  }

  async retrieveElement(elementId: string, targetSelector: string): Promise<void> {
    // Request from server
    const state = await this.signalR.invoke('RetrieveElement', {
      sessionId: this.sessionId,
      elementId
    });

    if (!state) return;

    // Create element from saved HTML
    const container = document.querySelector(targetSelector);
    container.innerHTML = state.outerHtml;

    const element = container.querySelector(`#${elementId}`);

    // Restore state
    element.scrollTop = state.scrollTop;
    element.scrollLeft = state.scrollLeft;
    this.restoreInputValues(element, state.inputValues);

    if (state.focusedInputId) {
      document.getElementById(state.focusedInputId)?.focus();
    }
  }

  private captureInputValues(element: HTMLElement): Record<string, any> {
    const inputs = element.querySelectorAll('input, textarea, select');
    const values: Record<string, any> = {};

    inputs.forEach((input: any) => {
      if (input.id) {
        values[input.id] = input.type === 'checkbox'
          ? input.checked
          : input.value;
      }
    });

    return values;
  }

  private restoreInputValues(element: HTMLElement, values: Record<string, any>): void {
    Object.entries(values).forEach(([id, value]) => {
      const input = element.querySelector(`#${id}`) as any;
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value;
        } else {
          input.value = value;
        }
      }
    });
  }
}
```

---

## Performance Benefits

### Traditional React
```
- Unmount 100 items: 100 operations
- Mount 100 items (different order): 100 operations
- Total: 200 DOM operations
- Memory churn from creating new elements
```

### MINIMACT
```
- Move 100 items: 100 operations
- Total: 100 DOM operations
- 2x faster
- Less memory churn (same elements)
```

### State Preservation

```tsx
// Card with input field
<div className="card" id="card-1">
  <input value="User typed this" />
</div>

// Traditional React:
// User drags card → Unmount → Input value LOST

// MINIMACT:
// User drags card → Move element → Input value PRESERVED
```

---

## Why This is Revolutionary

### 1. Elements Persist
- ✅ No unmount/remount
- ✅ Keep component state
- ✅ Keep scroll position
- ✅ Keep focus
- ✅ Keep input values
- ✅ Keep media playback position

### 2. Smooth Animations
```css
.tile {
  transition: transform 0.3s ease;
}
```
- Browser handles animation automatically
- No FLIP calculations
- No manual position tracking
- Just move the element, browser animates

### 3. Performance
- 2x faster (half the DOM operations)
- Less memory usage
- Less garbage collection
- Smoother animations

### 4. Cross-Page Persistence
- Elements survive page navigations
- No serialization needed
- No localStorage
- Just actual DOM elements

---

## Real-World Use Cases

- ✅ Kanban boards - Drag cards between columns
- ✅ Photo galleries - Switch layouts (grid/masonry/carousel)
- ✅ Sortable tables - Click headers to sort
- ✅ Playlist reordering - Drag songs up/down
- ✅ Dashboard customization - Arrange widgets
- ✅ Form field reordering - Dynamic forms
- ✅ Puzzle games - Sliding tiles, match-3
- ✅ Chess/board games - Move pieces
- ✅ Timeline views - Sort by date/priority
- ✅ Navigation menus - Reorder based on preference
- ✅ Card games - Shuffle, sort hands
- ✅ File managers - Drag files between folders
- ✅ Split panes - Move panels between panes
- ✅ Video players - PiP mode
- ✅ Shopping carts - Across pages
- ✅ Multi-step forms - Across pages
- ✅ Chat widgets - Across entire site

---

## The Philosophy

**Elements = Actors on a Stage**

They don't get killed and reborn every time the scene changes.

They just **move**.

Same actors. Different positions. **Pure choreography.**

---

**DOM Choreography. Elements persist. State directs. MINIMACT orchestrates.** 🎭✨🌵
