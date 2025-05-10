// The automatic JSX runtime functions required by React 17+/SWC / Babel
// "jsxImportSource: 'fluxel-core'" will import these.
import {Signal, effect, isSignal} from "./signals";

/** Marker for JSX Fragments (`<>...</>`). */
export const Fragment = Symbol("Fluxel.Fragment");

type Props = Record<string, any> & {children?: any};

/*---------------------------------------------------------------
  Internal helpers
 ---------------------------------------------------------------*/

/**
 * Convert arbitrary value to a text node, wiring reactivity for signals.
 * @param val value to convert
 * @returns text node
 * @internal
 */
function createText(val: any): Node {
  // Support signals directly in JSX children: <p>{count}</p>
  if (isSignal(val)) {
    const text = document.createTextNode(String(val.value));
    effect(() => (text.data = String(val.value)));
    return text;
  }
  return document.createTextNode(String(val ?? ""));
}

/**
 * Append different kinds of children to a parent node.
 * @param parent parent node
 * @param child child to append
 * @internal
 */
function appendChildren(parent: Node, child: any): void {
  if (Array.isArray(child)) {
    child.forEach((c) => appendChildren(parent, c));
  } else if (child == null || typeof child === "boolean") {
    // ignore null / undefined / boolean
    return;
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    parent.appendChild(createText(child));
  }
}

/**
 * Set attribute or event listener on an element, handling booleans & signals.
 * @param el element to set
 * @param key attribute name
 * @param value attribute value
 * @internal
 */
function setProp(el: HTMLElement | SVGElement, key: string, value: any): void {
  if (key === "className") key = "class";
  if (key.startsWith("on") && typeof value === "function") {
    const evt = key.slice(2).toLowerCase();
    el.addEventListener(evt, value as EventListener);
  } else if (value === false || value == null) {
    el.removeAttribute(key);
  } else if (value === true) {
    el.setAttribute(key, "");
  } else {
    el.setAttribute(key, String(value));
  }
}

/*---------------------------------------------------------------
  The automatic JSX runtime exports (React 17+, SWC, Babel `automatic`)
 ---------------------------------------------------------------*/

/**
 * Create a JSX element (single or multiple children).
 * This matches the signature required by the automatic JSX runtime.
 * @param type element type (string or function)
 * @param props element properties
 * @param key optional key
 * @returns DOM element
 */
export function jsx(type: any, props: Props, key?: any): Node {
  return _jsx(type, props);
}

/** Same as {@link jsx} but for multiple children arrays (React “jsxs”). */
export const jsxs = jsx;

/** Development variant (ignored for production builds). */
export const jsxDEV = jsx as typeof jsx;

/**
 * Internal element/fragment/component factory.
 * @param type element type (string or function)
 * @param props element properties
 * @returns DOM element
 * @internal
 */
function _jsx(type: any, props: Props = {}): Node {
  // Functional component
  if (typeof type === "function") {
    return type(props);
  }

  // Fragment
  if (type === Fragment) {
    const frag = document.createDocumentFragment();
    appendChildren(frag, props.children);
    return frag;
  }

  // Regular DOM element
  const el = document.createElement(type);

  // Apply props / attributes / events
  Object.keys(props).forEach((k) => {
    if (k === "children") return;
    const v = props[k];
    if (isSignal(v)) {
      // reactive attribute
      setProp(el, k, v.value);
      effect(() => setProp(el, k, v.value));
    } else {
      setProp(el, k, v);
    }
  });

  appendChildren(el, props.children);
  return el;
}
