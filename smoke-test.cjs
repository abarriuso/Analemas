// Loads astro.js + scripts.js on a minimal DOM, brings every simulation into
// view, runs frames and works every control (timeline, year, planets, events,
// views), once per language (index.html in English, es/index.html in Spanish)
// and once more per language with prefers-reduced-motion.
// Fails if anything throws or a readout is left empty.
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
const sources = ['astro.js', 'scripts.js'].map(f => [f, fs.readFileSync(path.join(__dirname, f), 'utf8')]);

function smoke(lang, reducedMotion) {
  const elements = new Map();
  const created = [];
  function el(id) {
    if (!elements.has(id)) {
      const listeners = {};
      elements.set(id, {
        id, dataset: {}, style: {}, textContent: '', value: '10', max: '100', checked: false, hidden: true,
        width: 0, height: 0,
        clientWidth: 800,
        parentElement: { clientWidth: 800 },
        classList: { toggle: noop, contains: () => false },
        setAttribute: noop, append: noop, appendChild: noop, focus: noop,
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        getContext: () => ctx2d,
        addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
        fire: (type, ev) => (listeners[type] || []).forEach(fn => fn(Object.assign(
          { target: { closest: () => null }, preventDefault: noop, key: '', shiftKey: false, clientX: 400, clientY: 300 }, ev)))
      });
    }
    return elements.get(id);
  }

  const frames = [];
  const sandbox = {
    document: {
      documentElement: { lang },
      getElementById: el,
      createElement: () => { const e = el('dyn-' + elements.size); created.push(e); return e; },
      addEventListener: noop
    },
    window: {
      innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2,
      matchMedia: () => ({ matches: reducedMotion }),
      addEventListener: noop
    },
    requestAnimationFrame: fn => frames.push(fn),
    cancelAnimationFrame: noop,
    IntersectionObserver: class {
      constructor(cb) { this.cb = cb; }
      observe() { this.cb([{ isIntersecting: true }]); }
      disconnect() {}
    },
    ResizeObserver: class { observe() {} },
    Intl, Math, Number, String, Object, Map, Date, Array, setTimeout, clearTimeout
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

  for (const [f, code] of sources) vm.runInContext(code, sandbox, { filename: f });
  runFrames(30);

  // Timelines: buttons, scrubber, keyboard and hover.
  for (const p of ['solar', 'pl', 'ven']) {
    for (const b of ['complete', 'play', 'reset', 'play', 'play']) el(`${p}-${b}`).fire('click');
    el(`${p}-scrub`).value = '40';
    el(`${p}-scrub`).fire('input');
    for (const key of ['ArrowRight', 'ArrowLeft', 'End', 'Home', ' ']) el(`${p}-canvas`).fire('keydown', { key });
    el(`${p}-canvas`).fire('pointermove');
    runFrames(5);
    el(`${p}-canvas`).fire('pointerleave');
    el(`${p}-spd`).fire('input');
    runFrames(3);
  }

  // Solar: years at both ends of the range and the two effects apart.
  el('solar-year').value = '1800'; el('solar-year').fire('change');
  el('solar-prev').fire('click');
  el('solar-year').value = '2050'; el('solar-year').fire('change');
  el('solar-next').fire('click');
  el('solar-comp').checked = true; el('solar-comp').fire('change');
  runFrames(3);

  // Planets: every planet button, previous/next event and back to today.
  const planetButtons = created.filter(e => e.dataset.id);
  if (planetButtons.length !== 7) throw new Error(`[${lang}] ${planetButtons.length} planet buttons, expected 7`);
  for (const b of planetButtons) {
    b.fire('click');
    el('pl-next').fire('click');
    el('pl-prev').fire('click');
    el('pl-fan').fire('change');
    runFrames(3);
    for (const id of ['pl-ev', 'pl-s1', 'pl-s2', 'pl-dur', 'pl-arc', 'pl-lon']) {
      if (!el(id).textContent || el(id).textContent === '—') throw new Error(`[${lang}] ${b.dataset.id}: ${id} is empty`);
    }
  }
  el('pl-today').fire('click');

  // Venus: cycles, overlays.
  el('ven-next').fire('click');
  el('ven-prev').fire('click');
  el('ven-overlay').value = '4'; el('ven-overlay').fire('input');
  runFrames(3);

  el('nav-toggle').fire('click');

  // Button text comes from the page language.
  const expected = lang === 'es' ? ['Reproducir', 'Pausar', 'Repetir'] : ['Play', 'Pause', 'Replay'];
  if (!expected.includes(el('solar-play').textContent)) {
    throw new Error(`[${lang}] solar-play shows "${el('solar-play').textContent}"`);
  }
  if (!el('hero-today').textContent) throw new Error(`[${lang}] hero "today" line is empty`);
  for (const id of ['sol-date', 'sol-eq', 'sol-noon', 'sol-peri', 'ven-date', 'ven-side', 'ven-cyclbl']) {
    if (!el(id).textContent) throw new Error(`[${lang}] ${id} is empty`);
  }
}

try {
  for (const lang of ['en', 'es']) {
    smoke(lang, false);
    // prefers-reduced-motion: static frames instead of animations.
    smoke(lang, true);
  }
  console.log('OK — load, drawing and controls without errors (en, es; with and without reduced motion)');
} catch (err) {
  console.error('SMOKE TEST FAILED:', err.stack);
  process.exit(1);
}
