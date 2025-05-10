import {Signal, signal} from "./signals";

export * from "./signals";
export {jsx, jsxs, jsxDEV, Fragment} from "./jsx-runtime";

/**
 * Helper used **inside** compiled custom elements to convert an incoming
 * prop (or attribute) into a signal with a default.
 * @param props incoming props
 * @param key prop name
 * @param fallback default value
 * @returns a signal
 */
export function useProp<T>(props: Record<string, any>, key: string, fallback: T): Signal<T> {
  return signal((props[key] as T) ?? fallback);
}
