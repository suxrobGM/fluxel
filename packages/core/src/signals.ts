/**
 * A function that is automatically re-executed when the signals it reads change.
 */
export type EffectFn = () => void;

/** Reactive container object holding a value of type `T`. */
export interface Signal<T> {
  /** read / write value */
  value: T;
}

/* ------------------------------------------------------------------
   Internal dependency graph implementation
   ------------------------------------------------------------------*/

/** Map of signal → set of dependent effect functions. */
const deps: Map<Signal<any>, Set<EffectFn>> = new Map();

/** The effect currently being executed (for dependency collection). */
let active: EffectFn | null = null;

/** Stack of nested effects (supports effect inside effect). */
const stack: EffectFn[] = [];

/** Flag and queue used for micro‑task batching. */
let queued = false;
const pending = new Set<EffectFn>();

/*-------------------------------------------------------------------
   Utility functions
  ------------------------------------------------------------------*/

/**
 * Add all effects of a signal to the global pending queue and
 *  schedule a micro‑task flush (if not already queued).
 * @param effects set of effects to schedule
 */
function schedule(effects: Set<EffectFn>): void {
  effects.forEach((e) => pending.add(e));
  if (!queued) {
    queued = true;
    queueMicrotask(() => {
      queued = false;
      // snapshot to avoid mutations during iteration
      const run = Array.from(pending);
      pending.clear();
      run.forEach((fn) => fn());
    });
  }
}

/**
 * Remove an effect from every dependency set it appeared in last run.
 * @param fn effect function to remove
 */
function cleanup(fn: EffectFn): void {
  deps.forEach((set) => set.delete(fn));
}

/*-------------------------------------------------------------------
   Public API
  ------------------------------------------------------------------*/

/**
 * Create a reactive signal.
 * @param initial initial value of the signal
 * @returns a signal
 * @example
 *   const count = signal(0);
 *   count.value++; // triggers subscribers
 */
export function signal<T>(initial: T): Signal<T> {
  let state = initial;
  const sig = Object.defineProperty({} as Signal<T>, "value", {
    enumerable: true,
    get() {
      // Collect dependency if inside an active effect.
      if (active) {
        let set = deps.get(sig);
        if (!set) deps.set(sig, (set = new Set()));
        set.add(active);
      }
      return state;
    },
    set(v: T) {
      if (Object.is(state, v)) return; // no change
      state = v;
      const set = deps.get(sig);
      if (set) schedule(set);
    },
  });
  return sig;
}

/**
 * Run a function once and again whenever **any** of the signals it reads change.
 * Returns nothing. Effects are automatically batched.
 * @param fn function to run
 * @example
 *  const count = signal(0);
 *  count(1); // triggers subscribers
 *  count(2); // triggers subscribers
 *
 *  effect(() => {
 *    console.log(count.value);
 *  });
 */
export function effect(fn: EffectFn): void {
  const runner: EffectFn = () => {
    cleanup(runner);
    stack.push(runner);
    active = runner;
    try {
      fn();
    } finally {
      stack.pop();
      active = stack[stack.length - 1] || null;
    }
  };
  runner();
}

/**
 * Derived signal whose value is the result of the `derive` function.
 * Re‑computes lazily whenever its dependencies change.
 * @param derive function to compute the value of the signal
 * @returns a signal
 * @example
 *   const count = signal(0);
 *   const double = computed(() => count.value * 2);
 */
export function computed<T>(derive: () => T): Signal<T> {
  const out = signal<T>(undefined as unknown as T);
  effect(() => (out.value = derive()));
  return out;
}

/**
 * Execute `fn` while deferring signal updates until it finishes. Useful
 * for performing several writes and triggering observers only once.
 * @param fn function to run
 * @example
 *  batch(() => {
 *    count1.value++;
 *    count2.value++;
 *  });
 */
export function batch(fn: () => void): void {
  const prev = queued;
  queued = true;
  try {
    fn();
  } finally {
    queued = prev;
    if (!queued && pending.size) {
      schedule(new Set()); // flush queue now
    }
  }
}

/**
 * Run a block of code **without** collecting dependencies — reading
 * signals inside will not link the current effect to them.
 * @param fn function to run
 * @returns return value of the function
 * @example
 *  const count = signal(0);
 *  count.value = untracked(() => {
 *    return count.value + 1; // no effect
 *  });
 *
 *  effect(() => {
 *   console.log(count.value); // will not run
 *  });
 */
export function untracked<T>(fn: () => T): T {
  const prev = active;
  active = null;
  try {
    return fn();
  } finally {
    active = prev;
  }
}

/**
 * Type guard to check if an arbitrary value is a `Signal`.
 * @param x value to check
 * @returns true if `x` is a signal
 */
export function isSignal(x: any): x is Signal<any> {
  return x && typeof x === "object" && "value" in x;
}
