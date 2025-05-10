# Fluxel

**Fluxel** is a **compile‑time, signal‑driven UI framework** that lets you author components with ergonomic **TSX / JSX** functions and ships **zero‑runtime, native Web Components**. Think _Solid JSX + Stencil compile output + Lit‑style Shadow DOM_—but with fine‑grained reactivity and a micro‑sized core.

---

## Why Fluxel?

- **Web‑standards first** → outputs Custom Elements you can drop into any stack (React, Vue, plain HTML).
- **Signals, not VDOM** → sub‑millisecond updates; no diffing, no component re‑renders.
- **Rust ⚙️ + SWC speed** → compilation in tens of milliseconds; HMR is near‑instant.
- **Scoped by default** → Shadow DOM & Constructable StyleSheets give you bullet‑proof style isolation.
- **Batteries included** → optional router, global state via signals, declarative Shadow DOM SSR.

---

## Project Goals

| Goal                        | Success criteria                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| **Zero‑runtime** components | Core (`@fluxel/core`) ≤ 2 kB gzipped; no framework code shipped inside each element.            |
| **Fine‑grained reactivity** | Updating one signal writes to exactly the DOM nodes that depend on it—never more.               |
| **First‑class DX**          | < 100 ms Cold start, HMR ≤ 50 ms with SWC + WASM plugin. IDE type‑safe props via TS.            |
| **Interoperability**        | Works inside any host framework; no special adapters required (React wrapper optional).         |
| **SSR‑ready**               | Server build emits Declarative Shadow DOM and hydration script passes 100 % consistency checks. |
| **Progressive**             | Start with runtime wrapper → graduate to compile step without rewriting code.                   |

---

## Framework Comparison

| Feature       | **Fluxel**                 | SolidJS         | Stencil           | Lit                              | Svelte                        | React              |
| ------------- | -------------------------- | --------------- | ----------------- | -------------------------------- | ----------------------------- | ------------------ |
| Output target | **Native WC**              | DOM (WC opt‑in) | Native WC         | Native WC                        | DOM + optional custom‑element | DOM                |
| Reactivity    | **Signals** (fine‑grained) | Signals         | VDOM diff         | Template re‑eval + lit‑html diff | Compiler‑generated statements | Virtual DOM diff   |
| Runtime size  | \~2 kB                     | \~8 kB          | 10 kB + polyfills | 6 kB                             | 0 (compiled)                  | 30 kB              |
| Compiler lang | **Rust + SWC**             | Babel / SWC     | TS (TSX)          | none (runtime)                   | custom                        | Babel              |
| SSR story     | Declarative Shadow DOM     | Streaming       | Hydrate script    | Experimental                     | Hydrate                       | Hydrate            |
| Style scoping | Shadow DOM / AdoptedSheets | CSS Modules     | Shadow DOM        | Shadow DOM                       | Scoped CSS                    | CSS‑in‑JS / global |

---

## Feature Roadmap

- [x] **Core signals** (`signal`, `computed`, `effect`, batching)
- [ ] **SWC WASM compiler** (function → WC class, Shadow DOM attach)
- [ ] **`fluxel-unplugin` universal adapter** (Vite/Rollup/Webpack/esbuild)
- [ ] **HMR** (component replacement without page reload)
- [ ] **Router** (`<FluxRouter>` with nested routes & lazy imports)
- [ ] **Global store helpers** (derived signals, SSR state hydration)
- [ ] **SSR/SSG renderer** (`renderToString`, CLI prerender)
- [ ] **DevTools extension** (signal graph inspector, component tree)
- [ ] **CLI scaffolder** (`npm create fluxel-app my-app`)
- [ ] **DX polish** (VS Code snippets, ESLint rules, playground REPL)

---

## Core Concepts & What the Compiler Really Spits Out

### 1 . Authoring ⟶ Signals + TSX

```tsx
// Counter.tsx – what you write
import {signal} from "@fluxel/core";

export interface CounterProps {
  initial?: number;
}

export default function Counter({initial = 0}: CounterProps) {
  const count = signal(initial);
  return (
    <div class="counter">
      <p>Count: {count}</p>
      <button onclick={() => (count.value += 1)}>+</button>
    </div>
  );
}
```

| Concept                                      | Why it matters                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Signals** (`signal`, `computed`, `effect`) | Fine-grained reactive primitives—changing `count.value` only patches one `<p>` text node. |
| **Plain functions**                          | No classes or decorators; the compiler lifts your function into a Custom Element.         |
| **Direct DOM events**                        | `onclick={…}` compiles to `addEventListener("click", ...)`, no synthetic wrappers.        |
| **Shadow DOM by default**                    | Styles are scoped; global CSS can be adopted via `:host` custom props.                    |

---

### 2 . Compile-Time Magick ⟶ Zero-Runtime Web Component

```js
// ➜ Generated JS (simplified)
import {effect, signal} from "@fluxel/core";

class CounterElement extends HTMLElement {
  static observedAttributes = ["initial"];

  constructor() {
    super();
    const root = this.attachShadow({mode: "open"});

    const div = document.createElement("div");
    div.className = "counter";

    const p = document.createElement("p");
    const txt = document.createTextNode("");
    p.append("Count: ", txt);

    const btn = document.createElement("button");
    btn.textContent = "+";

    div.append(p, btn);
    root.append(div);

    const count = signal(Number(this.getAttribute("initial") ?? 0));
    btn.addEventListener("click", () => (count.value += 1));
    effect(() => (txt.data = String(count.value)));
  }
}
customElements.define("flux-counter", CounterElement);
```

➡ **No framework runtime bundled**—just your logic plus a tiny (\~2 kB gz) signal engine imported once.
➡ Works in _any_ host app: drop `<script type="module" src="dist/counter.js"></script>` and use

```html
<flux-counter initial="5"></flux-counter>
```

---

### 3 . Bigger Building Blocks

| Feature          | Authoring                                                  | Output                                                                        |
| ---------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Routing**      | `<FluxRouter>` with `<Route path="/foo" component={Foo}/>` | History API listener + lazy element instantiation                             |
| **Global state** | `import { theme } from "~/store";` (a signal)              | Shared singleton signal—no Redux boilerplate                                  |
| **SSR**          | `renderToString(<App/>)` in Node                           | HTML with `<template shadowroot="open">…</template>` (Declarative Shadow DOM) |

---

### 4 . Mental Model

1. **Write**: ergonomic TSX + signals (looks like React/Solid).
2. **Compile** (SWC → Rust WASM plugin): emits raw, standards-compliant Custom Elements.
3. **Ship**: zero-runtime components that slot into any tech stack or static HTML.

## License

Fluxel is MIT‑licensed. See [LICENSE](LICENSE) for details.
