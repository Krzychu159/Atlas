import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const stub = () => null;
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: name => name in dependencies ? dependencies[name] : name.startsWith(".") || name.startsWith("@/") ? new Proxy({ __esModule: true, default: stub }, { get: (object, key) => object[key] ?? stub }) : nativeRequire(name),
    AbortController, AbortSignal, DOMException, URL, console, ...globals });
  return exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

// Execute component hooks deterministically, including effect cleanup and stale
// promises that deliberately ignore AbortSignal. This is not a browser renderer.
function hooks() {
  const slots = [], effects = [], pending = [], timers = new Map();
  let cursor = 0, timerId = 0;
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));
  const memo = (factory, deps) => {
    const index = cursor++;
    if (!slots[index] || changed(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
    return slots[index].value;
  };
  const react = {
    ...React,
    use: value => value,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef: initial => memo(() => ({ current: initial }), []),
    useMemo: memo,
    useCallback: (callback, deps) => memo(() => callback, deps),
    useEffect(effect, deps) {
      const index = cursor++;
      if (changed(effects[index]?.deps, deps)) pending.push(() => {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: effect() };
      });
    },
  };
  return {
    react,
    window: { setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } },
    render(Component, props = {}) { cursor = 0; return Component(props); },
    commit() { pending.splice(0).forEach(callback => callback()); },
    timers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}
function find(element, predicate) {
  if (!element || typeof element !== "object") return null;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props?.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}


export { load, hooks, find, deferred, settle };
