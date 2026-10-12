import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function guard(dirty, busy, confirmed = false) {
  const handlers = new Map();
  let effect;
  let prompts = 0;
  class Element {
    closest() { return this; }
    hasAttribute() { return false; }
  }
  class Anchor extends Element {
    target = "";
    href = "/super-admin/organizations";
    getAttribute() { return this.href; }
  }
  const surface = { addEventListener(name, fn) { handlers.set(name, fn); }, removeEventListener(name) { handlers.delete(name); } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/super-admin/components/use-unsaved-changes.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: () => ({ useEffect(fn) { effect = fn; } }), Element, HTMLAnchorElement: Anchor,
    window: { ...surface, confirm() { prompts++; return confirmed; } }, document: surface,
  });
  exports.useUnsavedChanges(dirty, busy);
  const cleanup = effect();
  return { handlers, cleanup, Element, Anchor, prompts: () => prompts };
}
function click(target) {
  return { target, button: 0, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
}

test("changed forms protect links and tab navigation; accepted discard permits navigation", () => {
  for (const confirmed of [false, true]) {
    const current = guard(true, false, confirmed);
    for (const target of [new current.Element(), new current.Anchor()]) {
      const event = click(target);
      current.handlers.get("click")(event);
      assert.equal(event.prevented, !confirmed);
      assert.equal(event.stopped, !confirmed);
    }
    assert.equal(current.prompts(), 2);
    current.cleanup();
    assert.equal(current.handlers.size, 0);
  }
});
test("pending writes block navigation, clean forms do not prompt and hash links stay usable", () => {
  const pending = guard(false, true, true);
  const event = click(new pending.Anchor());
  pending.handlers.get("click")(event);
  assert.equal(event.prevented, true);
  assert.equal(pending.prompts(), 0);
  assert.equal(guard(false, false).handlers.size, 0);
  const dirty = guard(true, false);
  const anchor = new dirty.Anchor();
  anchor.href = "#details";
  const hash = click(anchor);
  dirty.handlers.get("click")(hash);
  assert.equal(hash.prevented, false);
  const modifiedTab = click(new dirty.Element());
  modifiedTab.ctrlKey = true;
  dirty.handlers.get("click")(modifiedTab);
  assert.equal(modifiedTab.prevented, true);
  let warned = false;
  dirty.handlers.get("beforeunload")({ preventDefault() { warned = true; } });
  assert.equal(warned, true);
});
