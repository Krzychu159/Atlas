import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function render(native, props = {}) {
  const api = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/ui/native-date-input.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: api, require: (name) => name === 'react' ? {
    forwardRef: fn => fn, useRef: () => ({ current: native }), useEffect: fn => fn(), useImperativeHandle: () => {},
  } : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { CalendarDays: 'calendar' } });
  return api.NativeDateInput({ type: 'date', ...props }, null).props.children;
}
test('each range icon opens its own native input', () => {
  for (const value of ['2026-08-31', '2026-09-06']) {
    let opened = 0;
    const native = { focus() {}, showPicker() { opened++; } };
    const [input, button] = render(native, { value });
    button.props.onClick({ preventDefault() {} });
    assert.equal(opened, 1);
    assert.equal(input.props.value, value);
    assert.equal(button.props.type, 'button');
    assert.equal(button.props['aria-label'], 'Otwórz kalendarz');
  }
});
test('input click opens picker and preserves keyboard change handler', () => {
  let opened = 0;
  const native = { focus() {}, showPicker() { opened++; } };
  const onChange = () => {};
  const [input] = render(native, { onChange });
  input.props.onClick({ currentTarget: native, defaultPrevented: false });
  assert.equal(opened, 1);
  assert.equal(input.props.onChange, onChange);
});
test('fallback keeps native click; picker rejection does not throw', () => {
  let clicked = 0;
  const native = { dataset: {}, focus() {}, click() { clicked++; } };
  const [, button] = render(native);
  button.props.onClick({ preventDefault() {} });
  assert.equal(clicked, 1);
  assert.equal(native.dataset.nativePickerFallback, '');
  const [, denied] = render({ focus() {}, showPicker() { throw new Error('NotAllowedError'); } });
  assert.doesNotThrow(() => denied.props.onClick({ preventDefault() {} }));
});
test('readonly and disabled controls do not open a picker', () => {
  for (const key of ['disabled', 'readOnly']) {
    const [, button] = render({ [key]: true, showPicker() { assert.fail('opened'); } }, { [key]: true });
    assert.equal(button.props.disabled, true);
    button.props.onClick({ preventDefault() {} });
  }
});
