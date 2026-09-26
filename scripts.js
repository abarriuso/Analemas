(function () {
  'use strict';

  const A = Astro;
  const { TAU, DEG } = A;

  // ── Text drawn from JavaScript. The language comes from <html lang>, so a
  // translated copy of index.html reuses this script unchanged. ─────────────
  const I18N = {
    es: {
      play: 'Reproducir', pause: 'Pausar', replay: 'Repetir',
      menuOpen: 'Abrir menú', menuClose: 'Cerrar menú',
      au: 'ua', days: 'días', d: 'd',
      today: 'HOY',
      heroToday: (date, eot, fast) => `Hoy, ${date}, un reloj de sol va ${eot} ${fast ? 'adelantado' : 'atrasado'} respecto a la hora solar media del lugar.`,
      perihelion: 'PERIHELIO', aphelion: 'AFELIO',
      eqMar: 'EQUINOCCIO', eqSep: 'EQUINOCCIO', solJun: 'SOLSTICIO', solDec: 'SOLSTICIO',
      solarTitle: y => `ANALEMA SOLAR · ${y}`,
      eotAxis: 'ECUACIÓN DEL TIEMPO E (min)',
      eastSlow: '← E · reloj de sol atrasado', westFast: 'adelantado · O →',
      declAxis: 'DECLINACIÓN δ',
      onlyExc: 'solo excentricidad', onlyObl: 'solo oblicuidad',
      fast: 'adelantado', slow: 'atrasado', lmt: 'HSM',
      evOpp: 'Oposición', evConj: 'Conjunción inferior',
      stRetro: 'Estacionario: empieza la retrogradación', stDirect: 'Estacionario: vuelve el movimiento directo',
      direct: 'Directo', retro: 'Retrógrado',
      above: 'VISTO DESDE ARRIBA · eclíptica J2000',
      skyEcl: 'VISTO DESDE LA TIERRA · eclíptica verdadera de la fecha',
      skyEqu: 'VISTO DESDE LA TIERRA · ecuador verdadero de la fecha',
      toward: n => `hacia ${n}`,
      stretch: k => `escala vertical ×${k}`,
      loopTitle: (n, ev, date) => `${n.toUpperCase()} · ${ev.toLowerCase()} ${date}`,
      venusTitle: 'PENTAGRAMA DE VENUS',
      venusAbove: 'VISTO DESDE ARRIBA · línea Tierra–Venus cada 3 días',
      venusDrift: d => `6.ª conjunción: Δλ = ${d}° — la estrella no cierra`,
      cycle: (a, b) => `Ciclo ${a}–${b}`,
      evening: 'Lucero vespertino (al este del Sol)', morning: 'Lucero matutino (al oeste del Sol)',
      months: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
      planets: {
        mercury: ['Mercurio', 'Bucles rápidos', 'Retrograda tres veces al año, unos 22 días cada vez, cerca de la conjunción inferior. Por su órbita inclinada 7° y muy excéntrica, el bucle cambia mucho de una vez a otra: de 8.5° a 16° de arco.'],
        venus: ['Venus', 'Bucle cada 19 meses', 'Retrograda unos 42 días alrededor de la conjunción inferior, con 16° de arco. Cinco conjunciones seguidas dibujan el pentagrama de la sección 05.'],
        mars: ['Marte', 'Bucle variable', 'La órbita excéntrica hace que cada oposición sea distinta. Contra lo que se suele pensar, el bucle más largo y amplio llega en las oposiciones afélicas, con Marte lejos (81 días, 19.5°); en las perihélicas, como 2003 o 2018, se queda en 60 días y 10°.'],
        jupiter: ['Júpiter', 'Bucles regulares', 'Una retrogradación al año, de unos 121 días y 10° de arco, casi idénticas entre sí. Avanza ~30° por año sobre el zodíaco.'],
        saturn: ['Saturno', 'Bucles regulares', 'Retrograda unos 138 días al año recorriendo ~7°. Tarda 29.5 años en dar la vuelta al zodíaco.'],
        uranus: ['Urano', 'Bucles pequeños', 'Unos 152 días de retrogradación al año, pero solo ~4° de arco: la Tierra apenas lo desplaza visto a 19 ua.'],
        neptune: ['Neptuno', 'Bucles mínimos', 'Retrograda ~158 días al año con apenas 2.8° de arco. Tarda 165 años en recorrer el zodíaco.']
      }
    },
    en: {
      play: 'Play', pause: 'Pause', replay: 'Replay',
      menuOpen: 'Open menu', menuClose: 'Close menu',
      au: 'au', days: 'days', d: 'd',
      today: 'TODAY',
      heroToday: (date, eot, fast) => `Today, ${date}, a sundial runs ${eot} ${fast ? 'ahead of' : 'behind'} local mean solar time.`,
      perihelion: 'PERIHELION', aphelion: 'APHELION',
      eqMar: 'EQUINOX', eqSep: 'EQUINOX', solJun: 'SOLSTICE', solDec: 'SOLSTICE',
      solarTitle: y => `SOLAR ANALEMMA · ${y}`,
      eotAxis: 'EQUATION OF TIME E (min)',
      eastSlow: '← E · sundial slow', westFast: 'fast · W →',
      declAxis: 'DECLINATION δ',
      onlyExc: 'eccentricity only', onlyObl: 'obliquity only',
      fast: 'fast', slow: 'slow', lmt: 'LMT',
      evOpp: 'Opposition', evConj: 'Inferior conjunction',
      stRetro: 'Stationary: retrograde motion begins', stDirect: 'Stationary: direct motion resumes',
      direct: 'Direct', retro: 'Retrograde',
      above: 'SEEN FROM ABOVE · J2000 ecliptic',
      skyEcl: 'SEEN FROM EARTH · true ecliptic of date',
      skyEqu: 'SEEN FROM EARTH · true equator of date',
      toward: n => `towards ${n}`,
      stretch: k => `vertical scale ×${k}`,
      loopTitle: (n, ev, date) => `${n.toUpperCase()} · ${ev.toLowerCase()} ${date}`,
      venusTitle: 'PENTAGRAM OF VENUS',
      venusAbove: 'SEEN FROM ABOVE · Earth–Venus line every 3 days',
      venusDrift: d => `6th conjunction: Δλ = ${d}° — the star does not close`,
      cycle: (a, b) => `Cycle ${a}–${b}`,
      evening: 'Evening star (east of the Sun)', morning: 'Morning star (west of the Sun)',
      months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      planets: {
        mercury: ['Mercury', 'Quick loops', 'Retrograde three times a year, about 22 days each time, around inferior conjunction. Its orbit, tilted 7° and very eccentric, makes every loop different: from 8.5° to 16° of arc.'],
        venus: ['Venus', 'A loop every 19 months', 'Retrograde for about 42 days around inferior conjunction, over 16° of arc. Five conjunctions in a row draw the pentagram of section 05.'],
        mars: ['Mars', 'Variable loop', 'Its eccentric orbit makes every opposition different. Against intuition, the longest and widest loop comes at aphelic oppositions, with Mars far away (81 days, 19.5°); at perihelic ones such as 2003 or 2018 it shrinks to 60 days and 10°.'],
        jupiter: ['Jupiter', 'Regular loops', 'One retrograde episode a year, about 121 days and 10° of arc, nearly identical. It moves ~30° a year along the zodiac.'],
        saturn: ['Saturn', 'Regular loops', 'Retrograde for about 138 days a year over ~7°. It takes 29.5 years to go round the zodiac.'],
        uranus: ['Uranus', 'Small loops', 'About 152 days of retrograde motion a year but only ~4° of arc: seen from 19 au, Earth barely shifts it.'],
        neptune: ['Neptune', 'Tiny loops', 'Retrograde for ~158 days a year over barely 2.8° of arc. It takes 165 years to cross the zodiac.']
      }
    }
  };
  const LANG = document.documentElement.lang.slice(0, 2) in I18N ? document.documentElement.lang.slice(0, 2) : 'es';
  const S = I18N[LANG];
  // Numbers use a decimal point in both languages, as in the page text.
  const nf = (min, max) => new Intl.NumberFormat('en', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: false });
  const fmtInt = nf(0, 0).format, fmt1 = nf(1, 1).format, fmt2 = nf(2, 2).format, fmt3 = nf(3, 3).format;
  const dateFmt = new Intl.DateTimeFormat(LANG, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fmtDate = d => dateFmt.format(A.toDate(d));
  // Date and nearest hour, for events the Keplerian elements only place to
  // within tens of minutes (perihelion, oppositions…).
  const fmtDateHour = d => { const t = A.toDate(d + 1 / 48); return `${dateFmt.format(t)} · ≈${t.getUTCHours()} h UT`; };
  const minus = s => s.replace('-', '−');
  const fmtDeg = (x, k) => minus((k === 2 ? fmt2 : k === 0 ? fmtInt : fmt1)(x)) + '°';
  // Seconds of time as "−14 min 13 s".
  const fmtMinSec = (sec, signed) => {
    const a = Math.round(Math.abs(sec)), m = Math.floor(a / 60), s = a % 60;
    const sign = signed ? (sec < 0 ? '−' : '+') : '';
    return m ? `${sign}${m} min ${s} s` : `${sign}${s} s`;
  };
  const SEC_PER_RAD = 86400 / TAU;

  const PLANET_COLOR = {
    mercury: '#a3a3ad', venus: '#e8b04a', mars: '#d4643c', jupiter: '#cfa973',
    saturn: '#bfa062', uranus: '#6cc7b8', neptune: '#5f86d8'
  };

  // One accent (the Sun), one cool tone for geometry and one alert colour for
  // retrograde motion. Everything else is grey.
  const C = {
    bg: '#0b0d12',
    grid: 'rgba(170,185,210,0.07)',
    axis: 'rgba(170,185,210,0.18)',
    label: 'rgba(190,200,215,0.78)',
    faint: 'rgba(190,200,215,0.45)',
    title: 'rgba(215,222,232,0.9)',
    sun: '#f2b75b',
    acc: a => `rgba(242,183,91,${a})`,
    cool: a => `rgba(150,176,214,${a})`,
    alert: a => `rgba(236,88,74,${a})`
  };

  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MONO = '"JetBrains Mono", monospace';
  const font = (px, weight) => `${weight || 400} ${px}px ${MONO}`;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const TODAY = clamp((Date.now() - Date.UTC(2000, 0, 1, 12)) / 864e5, A.RANGE.from, A.RANGE.to);
  const THIS_YEAR = A.toDate(TODAY).getUTCFullYear();
  const yearStart = y => A.fromDate(y, 1, 1);
  const daysIn = y => Math.round(yearStart(y + 1) - yearStart(y));

  // ── Canvas helpers ──────────────────────────────────────────────────────

  // Keeps the canvas buffer at the width of its container and the current
  // DPR. ratio(w) gives height/width, so a layout can change with the width.
  function fitCanvas(cv, ratio, onResize) {
    const ctx = cv.getContext('2d');
    const apply = () => {
      const w = cv.parentElement.clientWidth;
      if (!w) return;
      const h = Math.round(w * ratio(w)), dpr = window.devicePixelRatio || 1;
      cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onResize(w, h);
    };
    new ResizeObserver(apply).observe(cv.parentElement);
    apply();
    return ctx;
  }

  // Runs frame(dt) on every animation frame, only while the element is visible.
  function whileVisible(el, frame) {
    let id = null, last = 0;
    const loop = ts => {
      frame(last ? Math.min(ts - last, 100) : 0);
      last = ts;
      id = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && id === null) { last = 0; id = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && id !== null) { cancelAnimationFrame(id); id = null; }
    }).observe(el);
  }

  function dot(ctx, x, y, r, fill, halo) {
    if (halo) { ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fillStyle = halo; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  }

  function text(ctx, s, x, y, o) {
    ctx.font = font(o.size || 10, o.weight);
    ctx.fillStyle = o.color || C.label;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  // Label on a dark plate so it stays readable over the curves.
  function tag(ctx, s, x, y, color, size) {
    ctx.font = font(size || 10, 500);
    const w = ctx.measureText(s).width + 10, h = (size || 10) + 7;
    ctx.fillStyle = 'rgba(11,13,18,0.86)';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    text(ctx, s, x, y + 0.5, { size: size || 10, weight: 500, color, align: 'center', base: 'middle' });
  }

  // Polyline through pts[0..end], one path per run of the same colour.
  function trail(ctx, pts, end, proj, colorOf, width, skip) {
    if (end < 1) return;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    let color = colorOf(1);
    ctx.strokeStyle = color;
    ctx.beginPath();
    let pen = false;
    for (let i = 1; i <= end; i++) {
      const c = colorOf(i);
      if (c !== color) { ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = color = c; pen = false; }
      if (skip && skip(i)) { pen = false; continue; }
      const [x2, y2] = proj(pts[i]);
      if (!pen) { const [x1, y1] = proj(pts[i - 1]); ctx.moveTo(x1, y1); pen = true; }
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  // Tick positions for an axis from a to b, about n of them.
  function ticks(a, b, n) {
    const raw = (b - a) / n, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    const out = [];
    for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Math.abs(v) < 1e-9 ? 0 : v);
    out.decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return out;
  }

  // Nearest point of pts (projected) to (mx, my), within r pixels.
  function nearest(pts, end, proj, mx, my, r) {
    let best = -1, bd = r * r;
    for (let i = 0; i <= end; i++) {
      const [x, y] = proj(pts[i]), dd = (x - mx) ** 2 + (y - my) ** 2;
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  // ── Timeline: play, scrub, speed, keyboard and hover for one canvas ────────
  //   total(): length in days; rate: days per second at speed 1
  //   draw(ctx, W, H, t, hover) → optional tooltip { x, y, lines }
  //   label(t): text next to the scrubber (the date)
  function timeline(prefix, o) {
    const cv = $(prefix + '-canvas');
    if (!cv) return null;
    const play = $(prefix + '-play'), again = $(prefix + '-reset'), all = $(prefix + '-complete');
    const scrub = $(prefix + '-scrub'), when = $(prefix + '-when'), spd = $(prefix + '-spd'), spdLbl = $(prefix + '-spd-lbl');
    const tip = $(prefix + '-tip');
    const st = { t: 0, playing: false, dirty: true, W: 0, H: 0, hover: null };
    const done = () => st.t >= o.total();

    const sync = () => {
      play.textContent = done() ? S.replay : st.playing ? S.pause : S.play;
      play.classList.toggle('on', st.playing);
      play.setAttribute('aria-pressed', String(st.playing));
      scrub.max = String(Math.round(o.total()));
      scrub.value = String(Math.round(st.t));
      const label = o.label(st.t);
      when.textContent = label;
      scrub.setAttribute('aria-valuetext', label);
      st.dirty = true;
    };
    const set = (t, playing) => { st.t = clamp(t, 0, o.total()); st.playing = playing; sync(); };
    const restart = () => set(reducedMotion.matches ? o.total() : 0, !reducedMotion.matches);

    const toggle = () => { if (done()) set(0, true); else set(st.t, !st.playing); };
    play.addEventListener('click', toggle);
    again.addEventListener('click', () => set(0, true));
    all.addEventListener('click', () => set(o.total(), false));
    scrub.addEventListener('input', () => set(Number(scrub.value), false));
    spd.addEventListener('input', () => { spdLbl.textContent = spd.value + '×'; });
    cv.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowRight') set(Math.floor(st.t) + step, false);
      else if (e.key === 'ArrowLeft') set(Math.ceil(st.t) - step, false);
      else if (e.key === 'Home') set(0, false);
      else if (e.key === 'End') set(o.total(), false);
      else if (e.key === ' ' || e.key === 'k') toggle();
      else return;
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      st.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      st.dirty = true;
    });
    cv.addEventListener('pointerleave', () => { st.hover = null; st.dirty = true; });

    const ctx = fitCanvas(cv, o.ratio, (w, h) => { st.W = w; st.H = h; st.dirty = true; });

    whileVisible(cv, dt => {
      if (st.playing) {
        st.t = Math.min(st.t + dt / 1000 * o.rate * Number(spd.value), o.total());
        if (done()) st.playing = false;
        sync();
      } else if (!st.dirty) {
        return;
      }
      st.dirty = false;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, st.W, st.H);
      const info = o.draw(ctx, st.W, st.H, st.t, st.hover);
      if (tip) {
        if (info) {
          tip.textContent = '';
          info.lines.forEach((l, k) => { const s = document.createElement(k ? 'span' : 'strong'); s.textContent = l; tip.append(s); });
          tip.hidden = false;
          const left = info.x + 14 + 190 > st.W ? info.x - 14 - 190 : info.x + 14;
          tip.style.left = Math.max(4, left) + 'px';
          tip.style.top = Math.max(4, info.y - 10) + 'px';
        } else tip.hidden = true;
      }
    });

    spdLbl.textContent = spd.value + '×';
    restart();
    return { restart, redraw: sync, get t() { return st.t; } };
  }

  // Runs init() once, when the section comes near the viewport, so that the
  // page does not compute every simulation before its first paint.
  function lazy(id, init) {
    const el = $(id);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      init();
    }, { rootMargin: '400px 0px' });
    io.observe(el);
  }

  // Makes a group of buttons behave as a single choice (aria-pressed).
  function choice(group, onPick) {
    const btns = [...group.querySelectorAll('button')];
    const pick = v => {
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      onPick(v);
    };
    btns.forEach(b => b.addEventListener('click', () => pick(b.dataset.v)));
    return pick;
  }

  // ── Solar analemma of a calendar year (one point per day at 12:00 UT) ─────
  const yearCache = new Map();
  function solarYear(y) {
    if (yearCache.has(y)) return yearCache.get(y);
    const d0 = yearStart(y), n = daysIn(y), pts = [];
    for (let k = 0; k <= n; k++) {
      const s = A.sun(d0 + k);
      pts.push({ d: d0 + k, x: s.eqTime * SEC_PER_RAD / 60, y: s.dec / DEG, exc: s.exc * SEC_PER_RAD / 60, obl: s.obl * SEC_PER_RAD / 60, lon: s.lon, dist: s.dist });
    }
    // Events from the model itself: perihelion and aphelion as the extremes of
    // the Earth–Sun distance, equinoxes and solstices as λ☉ = 0°, 90°, 180°, 270°.
    const at = f => A.crossings(f, d0 - 1, d0 + n + 1, 1)[0];
    const lonAt = deg => at(d => A.wrapPi(A.sun(d).lon - deg * DEG));
    // The Moon makes the Earth–Sun distance wobble, so the extremes are taken
    // globally: coarse daily scan, then a fine scan of ±2 days.
    const extreme = sign => {
      let best = 0;
      pts.forEach((p, k) => { if (sign * p.dist > sign * pts[best].dist) best = k; });
      let bd = d0 + best, bv = sign * pts[best].dist;
      for (let d = d0 + best - 2; d <= d0 + best + 2; d += 0.01) {
        const v = sign * A.sun(d).dist;
        if (v > bv) { bv = v; bd = d; }
      }
      return bd;
    };
    const events = {
      peri: extreme(-1), aph: extreme(1),
      eqMar: lonAt(0), solJun: lonAt(90), eqSep: lonAt(180), solDec: lonAt(270)
    };
    const r = { y, d0, n, pts, events, index: d => clamp(Math.round(d - d0), 0, n) };
    yearCache.set(y, r);
    return r;
  }
  // Fixed plot window (minutes, degrees) so that years can be compared.
  const SOLAR_BOX = { x0: -18, x1: 19, y0: -26.5, y1: 26.5 };

  // ── Background: static star field ────────────────────────────────────────
  (function () {
    const cv = $('starfield');
    const ctx = cv.getContext('2d');
    const draw = () => {
      const W = window.innerWidth, H = window.innerHeight, dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 7000);
      for (let i = 0; i < n; i++) {
        const r = Math.random() < 0.85 ? 0.35 + Math.random() * 0.45 : 0.8 + Math.random() * 0.7;
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, r, 0, TAU);
        ctx.fillStyle = `rgba(175,190,215,${0.12 + Math.random() * 0.35})`;
        ctx.fill();
      }
    };
    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
    draw();
  })();

  // ── Hero: this year's analemma, its orbital events and today ─────────────
  (function () {
    const cv = $('hero-canvas');
    const Y = solarYear(THIS_YEAR), P = Y.pts;
    let W = 0, H = 0, progress = reducedMotion.matches ? 1 : 0;
    const iToday = Y.index(TODAY);

    const sToday = A.sun(TODAY), eToday = sToday.eqTime * SEC_PER_RAD;
    const heroToday = $('hero-today');
    if (heroToday) heroToday.textContent = S.heroToday(fmtDate(TODAY), fmtMinSec(eToday), eToday > 0);

    const ev = Y.events;
    const events = [
      { name: S.solJun, d: ev.solJun, color: C.sun, dx: 1, dy: -0.6 },
      { name: S.solDec, d: ev.solDec, color: C.sun, dx: -1, dy: 0.7 },
      { name: S.eqMar, d: ev.eqMar, color: C.sun, dx: -1, dy: 0 },
      { name: S.eqSep, d: ev.eqSep, color: C.sun, dx: 1, dy: 0 },
      { name: S.perihelion, d: ev.peri, color: C.cool(0.95), dx: 1, dy: 0.9 },
      { name: S.aphelion, d: ev.aph, color: C.cool(0.95), dx: -1, dy: -0.8 }
    ];

    // True proportions on the sky: an hour angle of E minutes is 0.25°·E,
    // and a parallel at declination δ shrinks by cos δ.
    function render() {
      const ref = Math.min(W, H);
      const sc = ref * 0.8 / 47; // pixels per degree
      const k = clamp(ref / 560, 0.62, 1.25);
      const px = p => W / 2 + (p.x - 0.5) * 0.25 * Math.cos(p.y * DEG) * sc, py = p => H / 2 - p.y * sc;
      ctx.clearRect(0, 0, W, H);

      ctx.beginPath();
      P.forEach((p, i) => i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p)));
      ctx.strokeStyle = C.cool(0.22); ctx.lineWidth = 1.1; ctx.stroke();

      const end = Math.floor(progress * Y.n);
      trail(ctx, P, end, p => [px(p), py(p)], () => C.acc(0.85), 1.8);

      for (const e of events) {
        const p = P[Y.index(e.d)], x = px(p), y = py(p);
        const lx = x + e.dx * 78 * k, ly = y + e.dy * 30 * k;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx - e.dx * 36 * k, ly);
        ctx.strokeStyle = C.axis; ctx.lineWidth = 0.8; ctx.stroke();
        dot(ctx, x, y, 3.2, e.color);
        tag(ctx, e.name, lx, ly - 5 * k, e.color, Math.round(9.5 * k));
        text(ctx, fmtDate(e.d), lx, ly + 9 * k, { size: Math.round(8.5 * k), color: C.faint, align: 'center' });
      }

      const pt = P[iToday];
      ctx.beginPath(); ctx.arc(px(pt), py(pt), 7.5 * k, 0, TAU);
      ctx.strokeStyle = C.acc(0.9); ctx.lineWidth = 1.2; ctx.stroke();
      text(ctx, S.today, px(pt) - 11 * k, py(pt) + 19 * k, { size: Math.round(9 * k), weight: 500, color: C.sun, align: 'right' });

      const cp = P[end];
      dot(ctx, px(cp), py(cp), 4.5 * k, '#fbe3b8', C.acc(0.18));
    }

    // fitCanvas runs its resize callback once before returning, when ctx is
    // not assigned yet: the first static frame is drawn right after instead.
    let ctx = null;
    ctx = fitCanvas(cv, () => 1, (w, h) => { W = w; H = h; if (reducedMotion.matches && ctx) render(); });
    if (reducedMotion.matches && W) render();
    whileVisible(cv, dt => {
      if (reducedMotion.matches || !W) return;
      progress = (progress + dt * 0.00009) % 1;
      render();
    });
  })();

  // ── 03 · Solar analemma ──────────────────────────────────────────────────
  lazy('solar', function () {
    const yearIn = $('solar-year'), comp = $('solar-comp');
    const out = { date: $('sol-date'), eq: $('sol-eq'), noon: $('sol-noon'), exc: $('sol-exc'), obl: $('sol-obl'), decl: $('sol-decl'),
      e: $('sol-e'), eps: $('sol-eps'), peri: $('sol-peri'), aph: $('sol-aph'), eqx: $('sol-eqx') };
    if (!yearIn) return;
    let Y = solarYear(clamp(THIS_YEAR, 1800, 2050));
    yearIn.value = String(Y.y);

    const setYear = y => {
      Y = solarYear(clamp(Math.round(y) || THIS_YEAR, 1800, 2050));
      yearIn.value = String(Y.y);
      const el = A.elements('earth', Y.d0 + 182), f = A.frame(Y.d0 + 182);
      out.e.textContent = nf(6, 6).format(el.e);
      out.eps.textContent = fmt3(f.eps / DEG) + '°';
      out.peri.textContent = fmtDateHour(Y.events.peri);
      out.aph.textContent = fmtDateHour(Y.events.aph);
      out.eqx.textContent = fmtDateHour(Y.events.eqMar);
      if (sim) sim.redraw();
    };

    const sim = timeline('solar', {
      ratio: w => w < 520 ? 1.12 : 0.93,
      total: () => Y.n - 1,
      rate: 2.4,
      label: t => fmtDate(Y.d0 + t),
      draw(ctx, W, H, t, hover) {
        const small = W < 480;
        const xm = small ? 40 : 58, ym = small ? 34 : 44, top = small ? 30 : 38;
        const { x0, x1, y0, y1 } = SOLAR_BOX;
        const MX = v => xm + (v - x0) / (x1 - x0) * (W - xm - 18);
        const MY = v => top + (y1 - v) / (y1 - y0) * (H - ym - top);
        const P = Y.pts, end = Y.index(Y.d0 + t);

        // Grid with labelled ticks.
        ctx.lineWidth = 1;
        for (const v of ticks(x0, x1, small ? 5 : 8)) {
          ctx.strokeStyle = v === 0 ? C.axis : C.grid;
          ctx.beginPath(); ctx.moveTo(MX(v), top); ctx.lineTo(MX(v), H - ym); ctx.stroke();
          text(ctx, minus(fmtInt(v)), MX(v), H - ym + 13, { size: 9, color: C.faint, align: 'center' });
        }
        for (const v of ticks(y0, y1, 5)) {
          ctx.strokeStyle = v === 0 ? C.axis : C.grid;
          ctx.beginPath(); ctx.moveTo(xm, MY(v)); ctx.lineTo(W - 18, MY(v)); ctx.stroke();
          text(ctx, minus(fmtInt(v)) + '°', xm - 6, MY(v) + 3, { size: 9, color: C.faint, align: 'right' });
        }
        text(ctx, S.eotAxis, (xm + W - 18) / 2, H - 8, { size: small ? 8.5 : 9.5, color: C.label, align: 'center' });
        if (!small) {
          text(ctx, S.eastSlow, xm, H - 8, { size: 9, color: C.faint });
          text(ctx, S.westFast, W - 18, H - 8, { size: 9, color: C.faint, align: 'right' });
        }
        ctx.save(); ctx.translate(12, (top + H - ym) / 2); ctx.rotate(-Math.PI / 2);
        text(ctx, S.declAxis, 0, 0, { size: small ? 8.5 : 9.5, align: 'center' });
        ctx.restore();

        // The two effects on their own: same declination, each term of E alone.
        if (comp.checked) {
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(MX(p.exc), MY(p.y)) : ctx.moveTo(MX(p.exc), MY(p.y)));
          ctx.strokeStyle = C.cool(0.55); ctx.lineWidth = 1.2; ctx.stroke();
          ctx.setLineDash([1.5, 3.5]);
          ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(MX(p.obl), MY(p.y)) : ctx.moveTo(MX(p.obl), MY(p.y)));
          ctx.strokeStyle = C.cool(0.8); ctx.stroke();
          ctx.setLineDash([]);
          const pe = P[Y.index(Y.d0 + 95)], po = P[Y.index(Y.d0 + 130)];
          tag(ctx, S.onlyExc, MX(pe.exc) - 10, MY(pe.y) - 16, C.cool(0.9), 9);
          tag(ctx, S.onlyObl, MX(po.obl) + 66, MY(po.y), C.cool(0.9), 9);
        }

        ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(MX(p.x), MY(p.y)) : ctx.moveTo(MX(p.x), MY(p.y)));
        ctx.strokeStyle = C.cool(0.13); ctx.lineWidth = 1; ctx.stroke();
        trail(ctx, P, end, p => [MX(p.x), MY(p.y)], () => C.acc(0.9), 1.8);

        // First day of each month.
        for (let m = 0; m < 12; m++) {
          const i = Y.index(A.fromDate(Y.y, m + 1, 1));
          if (i > end) continue;
          const p = P[i];
          dot(ctx, MX(p.x), MY(p.y), 2.6, C.acc(0.9));
          text(ctx, S.months[m], MX(p.x) + (p.x > 0.5 ? 8 : -8), MY(p.y) + 3, { size: 8.5, color: C.faint, align: p.x > 0.5 ? 'left' : 'right' });
        }

        const cp = P[end];
        ctx.setLineDash([2, 3]); ctx.strokeStyle = C.acc(0.35); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(MX(0), MY(cp.y)); ctx.lineTo(MX(cp.x), MY(cp.y)); ctx.stroke();
        ctx.setLineDash([]);
        dot(ctx, MX(cp.x), MY(cp.y), 5.5, '#fbe3b8', C.acc(0.2));

        const eSec = cp.x * 60;
        out.date.textContent = fmtDate(cp.d);
        out.eq.textContent = `${fmtMinSec(eSec, true)} (${eSec >= 0 ? S.fast : S.slow})`;
        const noon = 43200 - eSec, hh = Math.floor(noon / 3600), mm = Math.floor(noon % 3600 / 60), ss = Math.round(noon % 60);
        out.noon.textContent = `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')} ${S.lmt}`;
        out.exc.textContent = fmtMinSec(cp.exc * 60, true);
        out.obl.textContent = fmtMinSec(cp.obl * 60, true);
        out.decl.textContent = fmtDeg(cp.y, 2);

        text(ctx, S.solarTitle(Y.y), xm, small ? 18 : 24, { size: small ? 9.5 : 11, weight: 500, color: C.title });

        if (hover) {
          const i = nearest(P, Y.n, p => [MX(p.x), MY(p.y)], hover.x, hover.y, 14);
          if (i >= 0) {
            const p = P[i];
            ctx.beginPath(); ctx.arc(MX(p.x), MY(p.y), 6, 0, TAU); ctx.strokeStyle = C.title; ctx.lineWidth = 1; ctx.stroke();
            return { x: MX(p.x), y: MY(p.y), lines: [fmtDate(p.d), `E ${fmtMinSec(p.x * 60, true)}`, `δ ${fmtDeg(p.y, 2)}`] };
          }
        }
        return null;
      }
    });

    yearIn.addEventListener('change', () => setYear(Number(yearIn.value)));
    $('solar-prev').addEventListener('click', () => setYear(Y.y - 1));
    $('solar-next').addEventListener('click', () => setYear(Y.y + 1));
    comp.addEventListener('change', () => sim.redraw());
    setYear(Y.y);
  });

  // ── 04 · Retrograde loops ────────────────────────────────────────────────
  // For an event (opposition of an outer planet, inferior conjunction of an
  // inner one): the stationary points around it and the path from one
  // retrograde duration before the first to one after the second.
  function loopEvent(id, near) {
    const inner = id === 'mercury' || id === 'venus';
    const S2 = A.synodic(id) / 2;
    const found = inner ? A.inferiorConjunctions(id, near - S2 - 2, near + S2 + 2, 1)
      : A.oppositions(id, near - S2 - 4, near + S2 + 4, 4);
    if (!found.length) return null;
    const ev = found.reduce((b, x) => Math.abs(x.day - near) < Math.abs(b.day - near) ? x : b);
    const st = A.stations(id, ev.day - 0.3 * 2 * S2, ev.day + 0.3 * 2 * S2, inner ? 0.5 : 2);
    const s1 = st.filter(s => s.type === 'retro' && s.day < ev.day).pop();
    const s2 = st.find(s => s.type === 'direct' && s.day > ev.day);
    if (!s1 || !s2) return null;
    const dur = s2.day - s1.day, from = s1.day - dur, to = s2.day + dur;
    const step = inner ? 0.25 : 0.5, pts = [];
    for (let d = from; d <= to + 1e-9; d += step) {
      const g = A.geo(id, d);
      pts.push({ d, lon: g.lon, lat: g.lat, ra: g.ra, dec: g.dec, elong: g.elong, dist: g.dist, sunLon: g.sunLon,
        east: g.east, retro: d > s1.day && d < s2.day, px: g.helio.x, py: g.helio.y, ex: g.earthPos.x, ey: g.earthPos.y });
    }
    const closest = pts.reduce((b, p) => p.dist < b.dist ? p : b);
    let arc = (s1.lon - s2.lon) / DEG;
    arc = ((arc % 360) + 360) % 360;
    return { id, inner, ev, s1, s2, dur, arc, from, pts, step, closest,
      earthOrbit: A.orbit('earth', ev.day, 180), orbit: A.orbit(id, ev.day, 360) };
  }

  lazy('planetas', function () {
    const bar = $('planet-bar');
    if (!bar) return;
    const info = { head: $('pl-head'), ev: $('pl-ev'), s1: $('pl-s1'), s2: $('pl-s2'), dur: $('pl-dur'), arc: $('pl-arc'),
      near: $('pl-near'), shname: $('pl-shname'), shdesc: $('pl-shdesc') };
    const out = { lon: $('pl-lon'), lat: $('pl-lat'), elong: $('pl-elong'), dist: $('pl-dist'), motion: $('pl-motion') };
    const evLbl = $('pl-evlbl'), fan = $('pl-fan');
    let selected = 'mars', E = null, frameEq = false;

    const sim = timeline('pl', {
      ratio: w => w < 640 ? 1.9 : 0.5,
      total: () => E ? (E.pts.length - 1) * E.step : 1,
      rate: 2.2,
      label: t => E ? fmtDate(E.from + t) : '',
      draw(ctx, W, H, t, hover) {
        if (!E) return null;
        const stacked = W < 640, small = W < 480;
        const P = E.pts, end = clamp(Math.round(t / E.step), 0, P.length - 1), cp = P[end];
        const color = PLANET_COLOR[selected], name = S.planets[selected][0];

        // Panel geometry: two squares side by side, or stacked.
        const side = stacked ? W : W / 2;
        const oA = { x: 0, y: 0, s: side }, oB = stacked ? { x: 0, y: side * 0.9, s: side, h: H - side * 0.9 } : { x: side, y: 0, s: side, h: H };

        // ── Panel A: orbits from above (J2000 ecliptic, x to the vernal equinox) ──
        const cx = oA.x + oA.s / 2, cy = oA.y + (stacked ? oA.s * 0.46 : oA.s / 2);
        const maxR = Math.max(1.02, ...E.orbit.map(p => Math.hypot(p.x, p.y)));
        const fits = maxR < 2;
        const R = (stacked ? oA.s * 0.44 : oA.s * 0.42);
        const sc = fits ? R / maxR : R * 0.36; // far planets: the Earth's orbit fills ~1/3
        const hx = x => cx + x * sc, hy = y => cy - y * sc;
        ctx.save();
        ctx.beginPath(); ctx.rect(oA.x, oA.y, oA.s, stacked ? oA.s * 0.9 : H); ctx.clip();

        // Sight lines from the Earth through the planet, out to the edge.
        const ray = p => {
          const dx = p.px - p.ex, dy = p.py - p.ey, n = Math.hypot(dx, dy);
          const L = oA.s * 1.6 / sc;
          return [hx(p.ex), hy(p.ey), hx(p.ex + dx / n * L), hy(p.ey + dy / n * L)];
        };
        if (fan.checked) {
          const every = Math.max(1, Math.round(E.dur / 18 / E.step));
          ctx.lineWidth = 0.7;
          for (let i = 0; i <= end; i += every) {
            const [x1, y1, x2, y2] = ray(P[i]);
            ctx.strokeStyle = P[i].retro ? C.alert(0.28) : C.cool(0.13);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
        const orbitPath = (pts, stroke) => {
          ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(hx(p.x), hy(p.y)) : ctx.moveTo(hx(p.x), hy(p.y)));
          ctx.strokeStyle = stroke; ctx.lineWidth = 0.9; ctx.stroke();
        };
        orbitPath(E.earthOrbit, C.cool(0.3));
        orbitPath(E.orbit, C.cool(0.3));
        trail(ctx, P, end, p => [hx(p.ex), hy(p.ey)], () => 'rgba(143,180,255,0.8)', 1.6);
        trail(ctx, P, end, p => [hx(p.px), hy(p.py)], i => P[i].retro ? C.alert(0.9) : C.faint, 1.6);
        dot(ctx, cx, cy, 6, C.sun, C.acc(0.16));
        const [rx1, ry1, rx2, ry2] = ray(cp);
        ctx.strokeStyle = cp.retro ? C.alert(0.95) : C.acc(0.8); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(rx1, ry1); ctx.lineTo(rx2, ry2); ctx.stroke();
        dot(ctx, hx(cp.ex), hy(cp.ey), 4.5, '#8fb4ff', 'rgba(143,180,255,0.18)');
        const inView = Math.abs(hx(cp.px) - cx) < oA.s / 2 - 4 && Math.abs(hy(cp.py) - cy) < oA.s / 2 - 4;
        if (inView) dot(ctx, hx(cp.px), hy(cp.py), 4.5, color, color + '33');
        else {
          // Planet beyond the frame: label where its sight line leaves it.
          const dx = rx2 - rx1, dy = ry2 - ry1, n = Math.hypot(dx, dy);
          const lim = (stacked ? oA.s * 0.44 : oA.s * 0.46);
          const k = Math.min((dx ? Math.abs((dx > 0 ? cx + lim : cx - lim) - rx1) / Math.abs(dx) : Infinity),
            (dy ? Math.abs((dy > 0 ? cy + lim : cy - lim) - ry1) / Math.abs(dy) : Infinity)) * n;
          const lx = rx1 + dx / n * k, ly = ry1 + dy / n * k;
          tag(ctx, `${S.toward(name)} · ${fmt1(cp.dist)} ${S.au}`, clamp(lx, oA.x + 70, oA.x + oA.s - 70), clamp(ly, oA.y + 44, oA.y + oA.s - 20), color, 9);
        }
        ctx.restore();
        text(ctx, S.above, oA.x + 14, oA.y + 20, { size: small ? 8 : 9, color: C.faint });

        // ── Panel B: the path on the sky ──
        const lonOf = p => frameEq ? p.ra : p.lon, latOf = p => frameEq ? p.dec : p.lat;
        const lon0 = lonOf(P[Math.floor(P.length / 2)]);
        const X = p => A.wrapPi(lonOf(p) - lon0) / DEG, Yv = p => latOf(p) / DEG;
        let xa = Infinity, xb = -Infinity, ya = Infinity, yb = -Infinity;
        for (const p of P) { xa = Math.min(xa, X(p)); xb = Math.max(xb, X(p)); ya = Math.min(ya, Yv(p)); yb = Math.max(yb, Yv(p)); }
        const bx = oB.x + (small ? 34 : 48), by = oB.y + 44, bw = oB.s - (small ? 50 : 70), bh = oB.h - 44 - 40;
        const spanX = (xb - xa) * 1.12 || 1;
        // Same angular scale on both axes unless the loop is too flat to see.
        let kV = 1;
        const needY = (yb - ya) * 1.3 || 0.1, scaleX = bw / spanX;
        if (needY * scaleX < bh * 0.18) kV = Math.min(10, Math.max(1, Math.floor(bh * 0.4 / (needY * scaleX))));
        const scale = Math.min(scaleX, bh / (needY * kV));
        const midX = (xa + xb) / 2, midY = (ya + yb) / 2;
        // East (increasing longitude) to the left, as on a sky chart facing south.
        const SX = v => bx + bw / 2 - (v - midX) * scale, SY = v => by + bh / 2 - (v - midY) * scale * kV;
        ctx.save();
        ctx.beginPath(); ctx.rect(oB.x, oB.y, oB.s, oB.h); ctx.clip();
        ctx.lineWidth = 1;
        const lonTicks = ticks(midX - bw / 2 / scale, midX + bw / 2 / scale, small ? 4 : 6);
        for (const v of lonTicks) {
          ctx.strokeStyle = C.grid;
          ctx.beginPath(); ctx.moveTo(SX(v), by); ctx.lineTo(SX(v), by + bh); ctx.stroke();
          const deg = ((lon0 / DEG + v) % 360 + 360) % 360;
          text(ctx, frameEq ? fmt1(deg / 15) + 'h' : fmtDeg(deg, 0), SX(v), by + bh + 13, { size: 9, color: C.faint, align: 'center' });
        }
        const latTicks = ticks(midY - bh / 2 / scale / kV, midY + bh / 2 / scale / kV, 4);
        for (const v of latTicks) {
          ctx.strokeStyle = Math.abs(v) < 1e-9 ? C.axis : C.grid;
          ctx.beginPath(); ctx.moveTo(bx, SY(v)); ctx.lineTo(bx + bw, SY(v)); ctx.stroke();
          text(ctx, minus(nf(latTicks.decimals, latTicks.decimals).format(v)) + '°', bx - 5, SY(v) + 3, { size: 9, color: C.faint, align: 'right' });
        }
        // The Sun's track, when it crosses the window (inner planets).
        if (E.inner && !frameEq) {
          ctx.beginPath();
          P.forEach((p, i) => { const x = SX(A.wrapPi(p.sunLon - lon0) / DEG), y = SY(0); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.strokeStyle = C.acc(0.2); ctx.lineWidth = 3; ctx.stroke();
          const sx = SX(A.wrapPi(cp.sunLon - lon0) / DEG);
          if (sx > bx && sx < bx + bw) dot(ctx, sx, SY(0), 6, C.sun, C.acc(0.16));
        }
        ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(SX(X(p)), SY(Yv(p))) : ctx.moveTo(SX(X(p)), SY(Yv(p))));
        ctx.strokeStyle = C.cool(0.14); ctx.lineWidth = 1; ctx.stroke();
        trail(ctx, P, end, p => [SX(X(p)), SY(Yv(p))], i => P[i].retro ? C.alert(0.95) : C.cool(0.9), 2);
        for (const [s, lbl] of [[E.s1, 'S1'], [E.s2, 'S2']]) {
          if (s.day > E.from + t) continue;
          const p = { lon: s.lon, lat: s.lat, ra: s.ra, dec: s.dec };
          dot(ctx, SX(X(p)), SY(Yv(p)), 3.2, C.alert(1));
          text(ctx, lbl, SX(X(p)), SY(Yv(p)) - 9, { size: 9, weight: 500, color: C.alert(1), align: 'center' });
        }
        if (E.ev.day <= E.from + t) {
          const p = { lon: E.ev.lon, lat: E.ev.lat, ra: E.ev.ra, dec: E.ev.dec };
          ctx.beginPath(); ctx.arc(SX(X(p)), SY(Yv(p)), 6, 0, TAU); ctx.strokeStyle = C.acc(0.9); ctx.lineWidth = 1.1; ctx.stroke();
        }
        dot(ctx, SX(X(cp)), SY(Yv(cp)), 5, color, color + '40');
        ctx.restore();
        text(ctx, frameEq ? S.skyEqu : S.skyEcl, bx, oB.y + 20, { size: small ? 8 : 9, color: C.faint });
        text(ctx, frameEq ? '← E   α   W →' : '← E   λ   W →', bx + bw / 2, oB.y + oB.h - 8, { size: 9, color: C.label, align: 'center' });
        if (kV > 1) text(ctx, S.stretch(kV), bx + bw, oB.y + (small ? 48 : 20), { size: 9, color: C.acc(0.9), align: 'right' });
        text(ctx, S.loopTitle(name, E.inner ? S.evConj : S.evOpp, fmtDate(E.ev.day)), bx, oB.y + 34, { size: small ? 9 : 10, weight: 500, color: C.title });

        if (!stacked) { ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(side, 16); ctx.lineTo(side, H - 16); ctx.stroke(); }

        out.lon.textContent = fmtDeg(cp.lon / DEG, 2);
        out.lat.textContent = fmtDeg(cp.lat / DEG, 2);
        out.elong.textContent = fmtDeg(cp.elong, 1) + (E.inner ? (cp.east ? ' E' : ' W') : '');
        out.dist.textContent = fmt3(cp.dist) + ' ' + S.au;
        out.motion.textContent = cp.retro ? S.retro : S.direct;
        out.motion.classList.toggle('retro', cp.retro);

        if (hover && hover.x > oB.x && hover.y > oB.y) {
          const i = nearest(P, P.length - 1, p => [SX(X(p)), SY(Yv(p))], hover.x, hover.y, 12);
          if (i >= 0) {
            const p = P[i];
            ctx.beginPath(); ctx.arc(SX(X(p)), SY(Yv(p)), 6, 0, TAU); ctx.strokeStyle = C.title; ctx.lineWidth = 1; ctx.stroke();
            return { x: SX(X(p)), y: SY(Yv(p)), lines: [fmtDate(p.d), `λ ${fmtDeg(p.lon / DEG, 2)} · β ${fmtDeg(p.lat / DEG, 2)}`, p.retro ? S.retro : S.direct] };
          }
        }
        return null;
      }
    });

    function load(near) {
      E = loopEvent(selected, near);
      if (!E) return;
      const [name, shape, desc] = S.planets[selected];
      info.head.textContent = name;
      info.ev.textContent = fmtDateHour(E.ev.day);
      info.s1.textContent = fmtDate(E.s1.day);
      info.s2.textContent = fmtDate(E.s2.day);
      info.dur.textContent = fmt1(E.dur) + ' ' + S.days;
      info.arc.textContent = fmtDeg(E.arc, 1);
      info.near.textContent = `${fmt3(E.closest.dist)} ${S.au} · ${fmtDate(E.closest.d)}`;
      info.shname.textContent = shape;
      info.shdesc.textContent = desc;
      evLbl.textContent = `${E.inner ? S.evConj : S.evOpp} · ${fmtDate(E.ev.day)}`;
      if (sim) sim.restart();
    }

    function select(id) {
      selected = id;
      bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      // The next event from today.
      load(TODAY + A.synodic(id) / 2 - 1);
    }

    for (const id of A.PLANET_IDS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pbtn';
      b.dataset.id = id;
      const swatch = document.createElement('span');
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.color = PLANET_COLOR[id];
      swatch.textContent = '●';
      b.append(swatch, S.planets[id][0]);
      b.addEventListener('click', () => select(id));
      bar.appendChild(b);
    }
    const hop = dir => {
      if (!E) return;
      const next = E.ev.day + dir * A.synodic(selected);
      if (next > A.RANGE.from + 400 && next < A.RANGE.to - 400) load(next);
    };
    $('pl-prev').addEventListener('click', () => hop(-1));
    $('pl-next').addEventListener('click', () => hop(1));
    $('pl-today').addEventListener('click', () => select(selected));
    fan.addEventListener('change', () => sim.redraw());
    choice($('pl-frame'), v => { frameEq = v === 'equ'; if (sim) sim.redraw(); });
    select(selected);
  });

  // ── 05 · Pentagram of Venus ──────────────────────────────────────────────
  lazy('venus', function () {
    const CYCLE = 8 * 365.25;
    const MAX_ELONG = 48;   // elongation at the edge of the chart (°)
    const out = { date: $('ven-date'), yr: $('ven-yr'), elong: $('ven-elong'), side: $('ven-side'), dist: $('ven-dist') };
    const cycLbl = $('ven-cyclbl'), overlay = $('ven-overlay'), overlayLbl = $('ven-overlay-lbl');
    let view = 'sky', V = null;

    // Starts the 8-year cycle at the inferior conjunction nearest to `near`
    // (kept inside the valid range) and lists the conjunctions of the next
    // four cycles for the overlays.
    function build(near) {
      near = clamp(near, A.RANGE.from + 300, A.RANGE.to - CYCLE - 700);
      const ics = A.inferiorConjunctions('venus', near - 300, Math.min(A.RANGE.to, near + 4 * CYCLE + 700), 3);
      const i0 = ics.reduce((b, q, i) => Math.abs(q.day - near) < Math.abs(ics[b].day - near) ? i : b, 0);
      const d0 = ics[i0].day, path = [];
      for (let d = d0; d <= d0 + CYCLE; d += 1) {
        const g = A.geo('venus', d);
        path.push({ d, lon: g.lon, elong: g.elong, east: g.east, dist: g.dist, vx: g.helio.x, vy: g.helio.y, ex: g.earthPos.x, ey: g.earthPos.y });
      }
      const maxElongs = path.filter((q, i) => i > 0 && i < path.length - 1 &&
        q.elong > 20 && q.elong > path[i - 1].elong && q.elong >= path[i + 1].elong);
      V = { i0, d0, path, maxElongs, ics, earthOrbit: A.orbit('earth', d0 + CYCLE / 2, 180), venusOrbit: A.orbit('venus', d0 + CYCLE / 2, 180) };
      const y0 = A.toDate(d0).getUTCFullYear();
      cycLbl.textContent = S.cycle(y0, y0 + 8);
    }

    const sim = timeline('ven', {
      ratio: () => 1,
      total: () => CYCLE,
      rate: 9,
      label: t => V ? fmtDate(V.d0 + t) : '',
      draw(ctx, W, H, t) {
        if (!V) return null;
        const small = W < 480;
        const cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) * (small ? 0.4 : 0.36), RZ = R * 1.07;
        const P = V.path, end = clamp(Math.round(t), 0, P.length - 1), cp = P[end];
        const nOver = Number(overlay.value);
        const cyc = k => V.ics.slice(V.i0 + 5 * k, V.i0 + 5 * k + 5);
        const star = cyc(0).filter(q => q.day <= V.d0 + t + 1e-6);

        if (view === 'sky') {
          const polar = (lon, r) => [cx + r * Math.sin(lon), cy - r * Math.cos(lon)];
          const inner = q => polar(q.lon, q.elong / MAX_ELONG * R);
          const ring = q => polar(q.lon, RZ);
          ctx.lineWidth = 0.6;
          for (const deg of [12, 24, 36, 47]) {
            const r = deg / MAX_ELONG * R;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.strokeStyle = C.grid; ctx.stroke();
            text(ctx, deg + '°', cx + r + 3, cy + 3, { size: 8.5, color: C.faint });
          }
          ctx.beginPath(); ctx.arc(cx, cy, RZ, 0, TAU); ctx.strokeStyle = C.axis; ctx.stroke();
          for (let k = 0; k < 12; k++) {
            const [x1, y1] = polar(k * 30 * DEG, RZ - 4), [x2, y2] = polar(k * 30 * DEG, RZ + 4);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            const [lx, ly] = polar(k * 30 * DEG, RZ + 13);
            text(ctx, k * 30 + '°', lx, ly + 3, { size: 8, color: C.faint, align: 'center' });
          }
          dot(ctx, cx, cy, 4, C.sun, C.acc(0.15));
          trail(ctx, P, end, inner, i => P[i].east ? C.acc(0.4) : C.cool(0.35), 1);

          // Later cycles, fainter, to show the drift.
          for (let k = nOver - 1; k >= 1; k--) {
            const q = cyc(k);
            if (q.length < 5) continue;
            ctx.beginPath(); q.forEach((c, i) => { const [x, y] = ring(c); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.closePath();
            ctx.strokeStyle = C.cool(0.5 - 0.1 * k); ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.beginPath();
          star.forEach((q, i) => { const [x, y] = ring(q); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.strokeStyle = C.acc(0.75); ctx.lineWidth = 1.6; ctx.stroke();
          ctx.setLineDash([2, 4]);
          for (const q of star) {
            const [rx, ry] = ring(q), [ix, iy] = inner(q);
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ix, iy); ctx.strokeStyle = C.acc(0.25); ctx.lineWidth = 0.7; ctx.stroke();
          }
          ctx.setLineDash([]);
          star.forEach((q, i) => {
            const [x, y] = ring(q);
            dot(ctx, x, y, 4.5, C.sun);
            const [lx, ly] = polar(q.lon, RZ + 28);
            if (!small) text(ctx, `${i + 1} · ${A.toDate(q.day).getUTCFullYear()}`, lx, ly + 3, { size: 8.5, color: C.acc(0.9), align: 'center' });
          });
          for (const q of V.maxElongs) if (q.d <= V.d0 + t) dot(ctx, ...inner(q), 3, q.east ? C.acc(0.9) : C.cool(0.85));
          if (t >= CYCLE - 0.5 && star.length === 5) {
            const c6 = V.ics[V.i0 + 5], [x6, y6] = ring(c6), [x5, y5] = ring(star[4]);
            ctx.beginPath(); ctx.moveTo(x5, y5); ctx.lineTo(x6, y6); ctx.strokeStyle = C.acc(0.75); ctx.lineWidth = 1.6; ctx.stroke();
            ctx.beginPath(); ctx.arc(x6, y6, 5, 0, TAU); ctx.strokeStyle = C.alert(0.95); ctx.lineWidth = 1.4; ctx.stroke();
            let drift = (c6.lon - star[0].lon) / DEG;
            drift -= 360 * Math.round(drift / 360);
            text(ctx, '○ ' + S.venusDrift(minus(fmt2(drift))), small ? 8 : 14, H - 12, { size: small ? 9 : 10.5, color: C.alert(0.95) });
          }
          dot(ctx, ...inner(cp), 4.5, '#fbe3b8', C.acc(0.15));
          text(ctx, S.venusTitle, small ? 8 : 14, small ? 16 : 22, { size: small ? 9 : 11, weight: 500, color: C.title });
        } else {
          // From above: the Earth–Venus line every 3 days (heliocentric, J2000).
          const sc = R * 1.02 / 1.017;
          const hx = x => cx + x * sc, hy = y => cy - y * sc;
          const orbitPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(hx(p.x), hy(p.y)) : ctx.moveTo(hx(p.x), hy(p.y))); ctx.strokeStyle = C.cool(0.28); ctx.lineWidth = 0.9; ctx.stroke(); };
          orbitPath(V.earthOrbit); orbitPath(V.venusOrbit);
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = C.acc(0.16);
          ctx.beginPath();
          for (let i = 0; i <= end; i += 3) { const p = P[i]; ctx.moveTo(hx(p.ex), hy(p.ey)); ctx.lineTo(hx(p.vx), hy(p.vy)); }
          ctx.stroke();
          // Earth at each inferior conjunction: the same five-pointed star.
          const atIC = star.map(q => P[clamp(Math.round(q.day - V.d0), 0, P.length - 1)]);
          ctx.beginPath(); atIC.forEach((p, i) => i ? ctx.lineTo(hx(p.ex), hy(p.ey)) : ctx.moveTo(hx(p.ex), hy(p.ey)));
          ctx.strokeStyle = C.acc(0.8); ctx.lineWidth = 1.4; ctx.stroke();
          atIC.forEach(p => dot(ctx, hx(p.ex), hy(p.ey), 3.5, C.sun));
          dot(ctx, cx, cy, 6, C.sun, C.acc(0.16));
          ctx.strokeStyle = C.acc(0.9); ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(hx(cp.ex), hy(cp.ey)); ctx.lineTo(hx(cp.vx), hy(cp.vy)); ctx.stroke();
          dot(ctx, hx(cp.ex), hy(cp.ey), 4.5, '#8fb4ff', 'rgba(143,180,255,0.18)');
          dot(ctx, hx(cp.vx), hy(cp.vy), 4.5, PLANET_COLOR.venus, 'rgba(232,176,74,0.2)');
          text(ctx, S.venusAbove, small ? 8 : 14, small ? 16 : 22, { size: small ? 8.5 : 10, weight: 500, color: C.title });
        }

        out.date.textContent = fmtDate(cp.d);
        out.yr.textContent = fmt2(t / 365.25);
        out.elong.textContent = fmtDeg(cp.elong, 1);
        out.side.textContent = cp.east ? S.evening : S.morning;
        out.dist.textContent = fmt3(cp.dist) + ' ' + S.au;
        return null;
      }
    });

    const shift = k => { build(V.d0 + k * CYCLE); sim.restart(); };
    $('ven-prev').addEventListener('click', () => shift(-1));
    $('ven-next').addEventListener('click', () => shift(1));
    overlay.addEventListener('input', () => { overlayLbl.textContent = overlay.value; sim.redraw(); });
    choice($('ven-view'), v => { view = v; if (sim) sim.redraw(); });
    // Start at the last inferior conjunction before today.
    build(TODAY - A.synodic('venus') / 2);
    sim.restart();
  });

  // ── Mobile navigation menu ───────────────────────────────────────────────
  (function () {
    const links = $('nav-links-list'), toggle = $('nav-toggle');
    const setOpen = open => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? S.menuClose : S.menuOpen);
      toggle.textContent = open ? '✕' : '☰';
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  })();
})();
