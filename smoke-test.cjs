/**
 * Smoke test: carga scripts.js en un DOM stub de Node.js
 * y verifica que no lanza errores de runtime.
 *
 * Uso: node smoke-test.cjs
 * Exit 0 = OK, Exit 1 = error
 */
'use strict';

const noop = () => {};

function makeEl() {
  const el = {
    style: {},
    classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
    dataset: {},
    setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    appendChild: noop, removeChild: noop, insertBefore: noop,
    querySelector: () => el,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    getContext: () => ({
      clearRect: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      arc: noop, fill: noop, stroke: noop, arcTo: noop, ellipse: noop,
      save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
      drawImage: noop, measureText: () => ({ width: 0 }),
      fillRect: noop, strokeRect: noop, fillText: noop, strokeText: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      setTransform: noop, resetTransform: noop, clip: noop, rect: noop,
      quadraticCurveTo: noop, bezierCurveTo: noop,
      font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
      globalAlpha: 1, textAlign: '', textBaseline: '',
      canvas: { width: 0, height: 0, style: {} },
    }),
    width: 0, height: 0,
    scrollIntoView: noop, closest: () => null, focus: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 1024, height: 768, right: 1024, bottom: 768 }),
    parentElement: null, children: [], childNodes: [],
    firstChild: null, lastChild: null, nextSibling: null,
    innerHTML: '', outerHTML: '', textContent: '',
  };
  el.parentElement = el;
  return el;
}

const fakeEl = makeEl();

const doc = {
  getElementById: () => fakeEl,
  querySelector: () => fakeEl,
  querySelectorAll: () => [],
  getElementsByTagName: () => [],
  getElementsByClassName: () => [],
  createElement: () => makeEl(),
  createTextNode: () => makeEl(),
  createDocumentFragment: () => makeEl(),
  addEventListener: noop, removeEventListener: noop,
  documentElement: fakeEl,
  head: fakeEl, body: fakeEl,
};

globalThis.document = doc;
globalThis.window = new Proxy({}, {
  get: (_, key) => {
    if (key === 'navigator') return { userAgent: 'node', platform: 'win32', maxTouchPoints: 0, hardwareConcurrency: 4, devicePixelRatio: 1 };
    if (key === 'matchMedia') return () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    if (key === 'getComputedStyle') return () => ({ getPropertyValue: () => '' });
    if (key === 'location') return { href: '', origin: '', pathname: '/' };
    return noop;
  }
});
let _rafCount = 0;
const _rafCallbacks = [];
globalThis.requestAnimationFrame = (fn) => {
  if (_rafCount < 5) { _rafCount++; _rafCallbacks.push(fn); }
  return _rafCount;
};
globalThis.cancelAnimationFrame = noop;
globalThis.performance = { now: () => Date.now() };
globalThis.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'scripts.js'), 'utf8');

try {
  const fn = new Function(code);
  fn();
  // Flush rAF callbacks (one frame)
  while (_rafCallbacks.length > 0) {
    const cb = _rafCallbacks.shift();
    cb(performance.now());
  }
  console.log('LOAD + DRAW OK — scripts.js se ejecuta sin errores de runtime');
  process.exit(0);
} catch (err) {
  console.error('SMOKE TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
}
