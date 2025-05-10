# Fluxel

**Fluxel** is a **compile‑time, signal‑driven UI framework** that lets you author components with ergonomic **TSX / JSX** functions and ships **zero‑runtime, native Web Components**. Think *Solid JSX + Stencil compile output + Lit‑style Shadow DOM*—but with fine‑grained reactivity and a micro‑sized core.

---

## Why Fluxel?

* **Web‑standards first** → outputs Custom Elements you can drop into any stack (React, Vue, plain HTML).
* **Signals, not VDOM** → sub‑millisecond updates; no diffing, no component re‑renders.
* **Rust ⚙️ + SWC speed** → compilation in tens of milliseconds; HMR is near‑instant.
* **Scoped by default** → Shadow DOM & Constructable StyleSheets give you bullet‑proof style isolation.
* **Batteries included** → optional router, global state via signals, declarative Shadow DOM SSR.

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

* [ ] **Core signals** (`signal`, `computed`, `effect`, batching)
* [ ] **SWC WASM compiler** (function → WC class, Shadow DOM attach)
* [ ] **`fluxel-unplugin` universal adapter** (Vite/Rollup/Webpack/esbuild)
* [ ] **HMR** (component replacement without page reload)
* [ ] **Router** (`<FluxRouter>` with nested routes & lazy imports)
* [ ] **Global store helpers** (derived signals, SSR state hydration)
* [ ] **SSR/SSG renderer** (`renderToString`, CLI prerender)
* [ ] **DevTools extension** (signal graph inspector, component tree)
* [ ] **CLI scaffolder** (`npm create fluxel-app my-app`)
* [ ] **DX polish** (VS Code snippets, ESLint rules, playground REPL)

---

## License

Fluxel is MIT‑licensed. See [LICENSE](LICENSE) for details.

---

> *Building tomorrow’s web, one custom element at a time.*
