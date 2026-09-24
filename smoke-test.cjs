// Carga astro.js + scripts.js sobre un DOM mínimo, pone todas las
// simulaciones a la vista, ejecuta varios fotogramas y pulsa sus controles.
// Falla si algo lanza una excepción.
//   node smoke-test.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const noop = () => {};
const ctx2d = new Proxy({ measureText: () => ({ width: 40 }) }, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: () => true
});

const elements = new Map();
function el(id) {
  if (!elements.has(id)) {
    const listeners = {};
    elements.set(id, {
      id, dataset: {}, style: {}, textContent: '', value: '10', width: 0, height: 0,
      clientWidth: 800,
      parentElement: { clientWidth: 800 },
      classList: { toggle: noop, contains: () => false },
      setAttribute: noop, append: noop, appendChild: noop, focus: noop,
      querySelectorAll: () => [],
      getContext: () => ctx2d,
      addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
      fire: (type, ev) => (listeners[type] || []).forEach(fn => fn(ev || { target: { closest: () => null } }))
    });
  }
  return elements.get(id);
}

const frames = [];
const sandbox = {
  document: {
    documentElement: { lang: 'es' },
    getElementById: el,
    createElement: () => el('dyn-' + elements.size),
    addEventListener: noop
  },
  window: {
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2,
    matchMedia: () => ({ matches: false }),
    addEventListener: noop
  },
  requestAnimationFrame: fn => frames.push(fn),
  cancelAnimationFrame: noop,
  IntersectionObserver: class {
    constructor(cb) { this.cb = cb; }
    observe() { this.cb([{ isIntersecting: true }]); }
  },
  ResizeObserver: class { observe() {} },
  Intl, Math, Number, String, Object, Map, setTimeout, clearTimeout
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let ts = 1000;
function runFrames(n) {
  for (let i = 0; i < n; i++) {
    const batch = frames.splice(0);
    ts += 16.7;
    batch.forEach(fn => fn(ts));
  }
}

try {
  for (const f of ['astro.js', 'scripts.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: f });
  }
  runFrames(30);
  for (const p of ['solar', 'pl', 'ven']) {
    for (const b of ['complete', 'play', 'reset', 'play', 'play']) el(`${p}-${b}`).fire('click');
    runFrames(5);
  }
  el('nav-toggle').fire('click');
  console.log('OK — carga, dibujo y controles sin errores');
} catch (err) {
  console.error('SMOKE TEST FAILED:', err.stack);
  process.exit(1);
}
