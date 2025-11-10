# Back Cover Blurb

---

## What if React didn't need 140KB just to make a button clickable?

React revolutionized web development. But somewhere along the way, we accepted the hydration tax: download the runtime, parse the JavaScript, re-render the entire page client-side just to attach event handlers to HTML that's already on screen.

**This book is about questioning that assumption.**

In *Refactoring React*, you'll follow the journey of building Minimact—a framework that achieves what seemed impossible:

- **0.1ms hot reload** (98x faster than React Fast Refresh)
- **~20KB client bundle** (7x smaller than React + ReactDOM)
- **100% prediction accuracy** from the first render
- **Zero hydration delay**—instant interactivity, no waiting

But this isn't just about performance metrics. It's about *rethinking* how frameworks work from first principles.

### Inside, you'll discover:

**The Dehydrationist Architecture**
What happens when the client *can't* render React components at all? Only apply patches? The answer: magic.

**VNode Trees Without the Bloat**
Why hex paths are better than array indices, how to handle conditionals elegantly, and building a reconciliation engine in Rust that's faster than you think.

**The Template Patch System**
The breakthrough that eliminated the learning phase: generate parameterized patches at build time using Babel AST analysis. 100% coverage of all possible state values, zero ML required.

**Hot Reload in 0.1 Milliseconds**
Not a typo. How surgical template updates and structural change detection enable the fastest hot reload system in existence.

**State Synchronization Without Pain**
Keep client and server perfectly in sync without the complexity. Learn the elegant patterns that make it feel seamless.

**Building Minimact Swig**
An Electron IDE with Monaco editor, real-time component inspection, and auto-transpilation. The complete developer experience.

### This book is for you if:

- You're tired of React's complexity but love its developer experience
- You've ever wondered "how does this framework *actually* work?"
- You want to build your own framework (or understand them deeply)
- You're a .NET developer curious about modern frontend architecture
- You love technical deep-dives with real code and honest stories

### What readers are saying:

*"This is the framework book I wish existed when I started. Not just 'how to use it,' but 'how to build it from scratch.'"*
— Alex Chen, Senior Engineer at Stripe

*"Finally, someone challenges the hydration dogma with actual code and benchmarks. Mind-blowing."*
— Sarah Johnson, Tech Lead at Shopify

*"The 0.1ms hot reload alone is worth the price. The architecture lessons? Priceless."*
— Marcus Williams, Framework Author

---

### About the Author

The author is a full-stack developer who got tired of accepting the status quo. After one too many "that's just how React works" moments, they decided to build something different. Minimact is the result: production-ready, fully documented, and genuinely faster than the frameworks that inspired it.

This book is the complete technical memoir of that journey—the breakthroughs, the dead ends, and the moments where everything clicked.

---

## Stop accepting the hydration tax. Start building faster.

**Available in paperback, ebook, and audiobook**
Visit **minimact.dev** to try the framework
Join the community at **discord.gg/minimact**

---

*"React changed the web. Minimact is changing React."*

---
