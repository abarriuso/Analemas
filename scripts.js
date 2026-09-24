(function () {
  'use strict';

  const { TAU, DEG, EARTH, PLANETS, sun, geo, inferiorConjunctions } = Astro;

  // ── Textos generados desde JS. El idioma sale de <html lang>, así que una
  // versión traducida de index.html reutiliza este script sin cambios. ──────
  const I18N = {
    es: {
      pause: 'Pausar', resume: 'Reanudar', replay: 'Repetir',
      menuOpen: 'Abrir menú', menuClose: 'Cerrar menú',
      yes: 'Sí', no: 'No',
      perihelion: 'PERIHELIO', aphelion: 'AFELIO',
      eqMar: 'EQUINOCCIO MAR', eqSep: 'EQUINOCCIO SEP', solJun: 'SOLSTICIO JUN', solDec: 'SOLSTICIO DIC',
      months: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
      solarX: '← E   ECUACIÓN DEL TIEMPO   O →',
      planetX: '← O   Δα PLANETA − SOL   E →',
      declY: 'DECLINACIÓN δ',
      solarTitle: 'ANALEMA SOLAR TERRESTRE',
      planetTitle: n => `ANALEMA GEOCÉNTRICO DE ${n.toUpperCase()}`,
      venusTitle: 'PENTAGRAMA DE VENUS · 8 AÑOS',
      venusDrift: d => `6.ª conjunción: Δλ ≈ ${d}° — no cierra`,
      planets: {
        mercury: ['Mercurio', 'Lazo compacto', 'Elongación máxima entre 17.9° y 27.8°: el rango varía por la alta excentricidad. Nunca se aleja más de ~28° del Sol.'],
        venus:   ['Venus', 'Pentagrama (8 años)', 'Cinco conjunciones inferiores en ~8 años dibujan un pentagrama aproximado por la casi-resonancia 8:13:5; el patrón deriva ~2.3° por ciclo.'],
        mars:    ['Marte', 'Bucle variable', 'La retrogradación cambia mucho entre oposiciones perihélicas y afélicas: la excentricidad moderada genera bucles irregulares.'],
        jupiter: ['Júpiter', 'Bucles uniformes', 'Una retrogradación al año, casi idénticas por la baja excentricidad. Avanza ~30° al año por el zodíaco (P ≈ 12 años).'],
        saturn:  ['Saturno', 'Bucles regulares', 'P ≈ 29.5 años. Retrogradaciones anuales de ~138 días, casi idénticas.'],
        uranus:  ['Urano', 'Bucles densos', 'Magnitud +5.7. Tarda 84 años en recorrer el zodíaco.'],
        neptune: ['Neptuno', 'Bucles estáticos', 'Magnitud +7.8. Tarda 165 años en recorrer el zodíaco: apenas ~2° de movimiento propio al año.']
      }
    },
    en: {
      pause: 'Pause', resume: 'Resume', replay: 'Replay',
      menuOpen: 'Open menu', menuClose: 'Close menu',
      yes: 'Yes', no: 'No',
      perihelion: 'PERIHELION', aphelion: 'APHELION',
      eqMar: 'MAR EQUINOX', eqSep: 'SEP EQUINOX', solJun: 'JUN SOLSTICE', solDec: 'DEC SOLSTICE',
      months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      solarX: '← E   EQUATION OF TIME   W →',
      planetX: '← W   Δα PLANET − SUN   E →',
      declY: 'DECLINATION δ',
      solarTitle: "EARTH'S SOLAR ANALEMMA",
      planetTitle: n => `GEOCENTRIC ANALEMMA OF ${n.toUpperCase()}`,
      venusTitle: 'PENTAGRAM OF VENUS · 8 YEARS',
      venusDrift: d => `6th conjunction: Δλ ≈ ${d}° — does not close`,
      planets: {
        mercury: ['Mercury', 'Compact loop', 'Greatest elongation between 17.9° and 27.8°, varying with the high eccentricity. Never more than ~28° from the Sun.'],
        venus:   ['Venus', 'Pentagram (8 years)', 'Five inferior conjunctions in ~8 years trace an approximate pentagram through the 8:13:5 near-resonance; the pattern drifts ~2.3° per cycle.'],
        mars:    ['Mars', 'Variable loop', 'Retrograde motion changes a lot between perihelic and aphelic oppositions: the moderate eccentricity makes irregular loops.'],
        jupiter: ['Jupiter', 'Uniform loops', 'One retrograde loop per year, nearly identical thanks to the low eccentricity. Moves ~30° per year through the zodiac (P ≈ 12 years).'],
        saturn:  ['Saturn', 'Regular loops', 'P ≈ 29.5 years. Yearly retrograde periods of ~138 days, nearly identical.'],
        uranus:  ['Uranus', 'Dense loops', 'Magnitude +5.7. Takes 84 years to cross the zodiac.'],
        neptune: ['Neptune', 'Static loops', 'Magnitude +7.8. Takes 165 years to cross the zodiac: barely ~2° of proper motion per year.']
      }
    }
  };
  const LANG = document.documentElement.lang.slice(0, 2) in I18N ? document.documentElement.lang.slice(0, 2) : 'es';
  const S = I18N[LANG];
  const fmtInt = new Intl.NumberFormat(LANG).format;

  // Colores del planeta y duración típica de su retrogradación.
  const PLANET_UI = {
    mercury: { color: '#909098', retro: '~22 d' },
    venus:   { color: '#e8a030', retro: '~40 d' },
    mars:    { color: '#c85830', retro: '~72 d' },
    jupiter: { color: '#c0a060', retro: '~121 d' },
    saturn:  { color: '#a88848', retro: '~138 d' },
    uranus:  { color: '#40c0a8', retro: '~151 d' },
    neptune: { color: '#2858b8', retro: '~158 d' }
  };

  const $ = id => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MONO = '"JetBrains Mono", monospace';

  const C = {
    bg: '#12141a',
    grid: 'rgba(180,190,210,0.06)',
    axis: 'rgba(180,190,210,0.14)',
    label: 'rgba(180,190,210,0.85)',
    title: 'rgba(190,200,215,0.8)',
    dot: '#dbb48a',
    sun: '#f0c040',
    blue: a => `rgba(160,180,210,${a})`,
    warm: a => `rgba(196,155,114,${a})`,
    retro: a => `rgba(192,48,48,${a})`
  };

  // ── Canvas ────────────────────────────────────────────────────────────────

  // Ajusta el buffer del canvas al ancho de su contenedor y al DPR actual.
  function fitCanvas(cv, aspect, onResize) {
    const ctx = cv.getContext('2d');
    const apply = () => {
      const w = cv.parentElement.clientWidth;
      if (!w) return;
      const h = w / aspect, dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onResize(w, h);
    };
    new ResizeObserver(apply).observe(cv.parentElement);
    apply();
    return ctx;
  }

  // Ejecuta frame(dt) en cada animation frame solo mientras el canvas es visible.
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

  // Plano cartesiano con márgenes: devuelve las funciones de proyección.
  function plotArea(W, H, xm, ym, X0, X1, Y0, Y1) {
    return {
      MX: v => xm + (v - X0) / (X1 - X0) * (W - 2 * xm),
      MY: v => H - ym - (v - Y0) / (Y1 - Y0) * (H - 2 * ym)
    };
  }

  function drawGrid(ctx, W, H, xm, ym) {
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const x = xm + i * (W - 2 * xm) / 4, y = ym + i * (H - 2 * ym) / 4;
      ctx.moveTo(x, ym); ctx.lineTo(x, H - ym);
      ctx.moveTo(xm, y); ctx.lineTo(W - xm, y);
    }
    ctx.stroke();
  }

  function drawAxisLabels(ctx, W, H, xLabel, small) {
    ctx.fillStyle = C.label;
    ctx.font = `${small ? 9 : 10}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, W / 2, H - 8);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(S.declY, 0, 0);
    ctx.restore();
  }

  function drawTitle(ctx, text, x, small) {
    ctx.fillStyle = C.title;
    ctx.font = `500 ${small ? 9 : 11}px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, small ? 16 : 22);
  }

  // Traza pts[0..end] agrupando en una sola ruta los tramos del mismo color.
  // skip(i) omite el tramo i-1 → i (saltos de envoltura angular).
  function drawTrail(ctx, pts, end, proj, colorOf, width, skip) {
    if (end < 1) return;
    ctx.lineWidth = width;
    let color = colorOf(1);
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 1; i <= end; i++) {
      const c = colorOf(i);
      if (c !== color) { ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = color = c; }
      if (skip && skip(i)) continue;
      const [x1, y1] = proj(pts[i - 1]), [x2, y2] = proj(pts[i]);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  function dot(ctx, x, y, r, fill, halo) {
    if (halo) { ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fillStyle = halo; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  }

  // Simulación con controles de velocidad, reproducción, reinicio y final.
  //   total(): duración en unidades de avance;  rate: unidades/s a velocidad 1
  //   draw(ctx, W, H, t): pinta el estado t
  function simulation(prefix, { aspect, total, rate, draw }) {
    const cv = $(prefix + '-canvas');
    if (!cv) return null;
    const spd = $(prefix + '-spd'), spdLbl = $(prefix + '-spd-lbl'), play = $(prefix + '-play');
    const st = { t: 0, playing: false, dirty: true, W: 0, H: 0 };
    const done = () => st.t >= total();
    const sync = () => {
      play.textContent = done() ? S.replay : st.playing ? S.pause : S.resume;
      play.classList.toggle('on', st.playing);
      st.dirty = true;
    };
    const restart = () => {
      st.t = reducedMotion.matches ? total() : 0;
      st.playing = !reducedMotion.matches;
      sync();
    };
    const ctx = fitCanvas(cv, aspect, (w, h) => { st.W = w; st.H = h; st.dirty = true; });

    play.addEventListener('click', () => {
      if (done()) { st.t = 0; st.playing = true; } else st.playing = !st.playing;
      sync();
    });
    $(prefix + '-reset').addEventListener('click', () => { st.t = 0; st.playing = true; sync(); });
    $(prefix + '-complete').addEventListener('click', () => { st.t = total(); st.playing = false; sync(); });
    spd.addEventListener('input', () => { spdLbl.textContent = spd.value + '×'; });

    whileVisible(cv, dt => {
      if (st.playing) {
        st.t = Math.min(st.t + dt / 1000 * rate * Number(spd.value), total());
        if (done()) { st.playing = false; sync(); }
      } else if (!st.dirty) {
        return;
      }
      st.dirty = false;
      ctx.clearRect(0, 0, st.W, st.H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, st.W, st.H);
      draw(ctx, st.W, st.H, st.t);
    });

    restart();
    return { restart };
  }

  const isSmall = W => W < 480;

  // ── Analema solar precalculado (un año anomalístico) ─────────────────────
  const SOLAR_STEPS = 2000;
  const SOLAR_PTS = [];
  for (let i = 0; i <= SOLAR_STEPS; i++) {
    const d = i / SOLAR_STEPS * EARTH.T;
    const s = sun(d);
    SOLAR_PTS.push({ x: s.eqTime, y: s.decl, d, min: s.eqTime / DEG * 4, deg: s.decl / DEG });
  }
  const solarIndex = d => Math.min(SOLAR_STEPS, Math.max(0, Math.round(d / EARTH.T * SOLAR_STEPS)));
  const bounds = pts => pts.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
    minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const SOLAR_B = bounds(SOLAR_PTS);

  // ── Fondo estelar estático ────────────────────────────────────────────────
  (function () {
    const cv = $('starfield');
    const ctx = cv.getContext('2d');
    const draw = () => {
      const W = window.innerWidth, H = window.innerHeight, dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 6000);
      for (let i = 0; i < n; i++) {
        const r = Math.random() < 0.85 ? 0.4 + Math.random() * 0.5 : 0.9 + Math.random() * 0.8;
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, r, 0, TAU);
        ctx.fillStyle = `rgba(175,190,215,${0.15 + Math.random() * 0.4})`;
        ctx.fill();
      }
    };
    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
    draw();
  })();

  // ── Hero: analema con los eventos orbitales del año ──────────────────────
  (function () {
    const cv = $('hero-canvas');
    let W = 0, H = 0, progress = reducedMotion.matches ? 1 : 0;

    // Eventos calculados con el propio modelo: perihelio por M = 0 y
    // equinoccios/solsticios por los ceros y extremos de la declinación.
    const iPeri = solarIndex((TAU - EARTH.M0) / TAU * EARTH.T);
    const iAph = solarIndex(((TAU - EARTH.M0) / TAU + 0.5) * EARTH.T);
    const zeroUp = SOLAR_PTS.findIndex((p, i) => i > 0 && SOLAR_PTS[i - 1].y < 0 && p.y >= 0);
    const zeroDown = SOLAR_PTS.findIndex((p, i) => i > 0 && SOLAR_PTS[i - 1].y > 0 && p.y <= 0);
    const iMax = SOLAR_PTS.reduce((m, p, i) => p.y > SOLAR_PTS[m].y ? i : m, 0);
    const iMin = SOLAR_PTS.reduce((m, p, i) => p.y < SOLAR_PTS[m].y ? i : m, 0);
    const events = [
      { name: S.perihelion, i: iPeri, color: '#6b9e6b', dx: -70, dy: -10 },
      { name: S.aphelion, i: iAph, color: '#6b9e6b', dx: 70, dy: 20 },
      { name: S.eqMar, i: zeroUp, color: '#2a9d8f', dx: -80, dy: 6 },
      { name: S.eqSep, i: zeroDown, color: '#2a9d8f', dx: 80, dy: -6 },
      { name: S.solJun, i: iMax, color: '#e9c46a', dx: 75, dy: -10 },
      { name: S.solDec, i: iMin, color: '#e9c46a', dx: -75, dy: 16 }
    ];
    const xc = (SOLAR_B.minX + SOLAR_B.maxX) / 2, yc = (SOLAR_B.minY + SOLAR_B.maxY) / 2;

    function render() {
      const ref = Math.min(W, H);
      const sx = ref * 0.34 / (SOLAR_B.maxX - SOLAR_B.minX), sy = ref * 0.72 / (SOLAR_B.maxY - SOLAR_B.minY);
      const k = Math.min(1.3, Math.max(0.6, ref / 560));
      const px = p => W / 2 + (p.x - xc) * sx, py = p => H / 2 - (p.y - yc) * sy;
      ctx.clearRect(0, 0, W, H);

      ctx.beginPath();
      SOLAR_PTS.forEach((p, i) => i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p)));
      ctx.strokeStyle = C.blue(0.25); ctx.lineWidth = 1.2; ctx.stroke();

      const end = Math.floor(progress * SOLAR_STEPS);
      drawTrail(ctx, SOLAR_PTS, end, p => [px(p), py(p)], () => C.warm(0.8), 1.8);

      ctx.font = `500 ${Math.max(9, Math.round(10 * k))}px ${MONO}`;
      ctx.textAlign = 'center';
      for (const ev of events) {
        const p = SOLAR_PTS[ev.i], x = px(p), y = py(p);
        const lx = x + ev.dx * k, ly = y + ev.dy * k;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ev.dx * k * 0.75, y + ev.dy * k * 0.75);
        ctx.strokeStyle = ev.color + '55'; ctx.lineWidth = 0.8; ctx.stroke();
        dot(ctx, x, y, 4, ev.color);
        const w = ctx.measureText(ev.name).width + 10, h = Math.max(14, 16 * k);
        ctx.fillStyle = 'rgba(24,27,36,0.85)';
        ctx.fillRect(lx - w / 2, ly - h + 4, w, h);
        ctx.fillStyle = ev.color;
        ctx.fillText(ev.name, lx, ly);
      }

      const cp = SOLAR_PTS[end % SOLAR_STEPS];
      dot(ctx, px(cp), py(cp), 5 * k, C.dot, C.warm(0.15));
    }

    const ctx = fitCanvas(cv, 1, (w, h) => { W = w; H = h; if (reducedMotion.matches) render(); });
    whileVisible(cv, dt => {
      if (reducedMotion.matches || !W) return;
      progress = (progress + dt * 0.00024) % 1;
      render();
    });
  })();

  // ── 03 · Analema solar ───────────────────────────────────────────────────
  (function () {
    const { minX, maxX, minY, maxY } = SOLAR_B;
    const X0 = minX - (maxX - minX) * 0.18, X1 = maxX + (maxX - minX) * 0.18;
    const Y0 = minY - (maxY - minY) * 0.14, Y1 = maxY + (maxY - minY) * 0.14;
    const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const out = { day: $('sol-day'), eq: $('sol-eq'), decl: $('sol-decl'), pct: $('sol-pct') };

    simulation('solar', {
      aspect: 560 / 520,
      total: () => EARTH.T,
      rate: 2.4,
      draw(ctx, W, H, t) {
        const small = isSmall(W);
        const xm = small ? 36 : 56, ym = small ? 32 : 44;
        const { MX, MY } = plotArea(W, H, xm, ym, X0, X1, Y0, Y1);
        drawGrid(ctx, W, H, xm, ym);

        ctx.beginPath();
        SOLAR_PTS.forEach((p, i) => i ? ctx.lineTo(MX(p.x), MY(p.y)) : ctx.moveTo(MX(p.x), MY(p.y)));
        ctx.strokeStyle = C.blue(0.08); ctx.lineWidth = 1; ctx.stroke();

        const end = solarIndex(t);
        drawTrail(ctx, SOLAR_PTS, end, p => [MX(p.x), MY(p.y)], () => C.blue(0.85), 1.7);

        ctx.font = `${small ? 9 : 10}px ${MONO}`;
        ctx.textAlign = 'center';
        S.months.forEach((name, m) => {
          const i = solarIndex(MONTH_START[m]);
          if (i > end) return;
          const p = SOLAR_PTS[i];
          dot(ctx, MX(p.x), MY(p.y), 3.5, C.blue(0.75));
          ctx.fillStyle = C.blue(0.75);
          ctx.fillText(name, MX(p.x), MY(p.y) - 8);
        });

        const cp = SOLAR_PTS[end];
        dot(ctx, MX(cp.x), MY(cp.y), 6, C.dot, C.warm(0.15));
        out.day.textContent = Math.min(365, Math.floor(cp.d) + 1);
        out.eq.textContent = cp.min.toFixed(1) + ' min';
        out.decl.textContent = cp.deg.toFixed(2) + '°';
        out.pct.textContent = Math.round(100 * end / SOLAR_STEPS) + '%';

        drawAxisLabels(ctx, W, H, S.solarX, small);
        drawTitle(ctx, S.solarTitle, xm, small);
      }
    });
  })();

  // ── 04 · Analemas planetarios geocéntricos ───────────────────────────────
  const PLANET_STEPS = 600;
  const planetCache = new Map();

  // Dos períodos sinódicos (máx. 1800 d) de Δα = α − α☉ frente a δ.
  function planetPoints(id) {
    if (planetCache.has(id)) return planetCache.get(id);
    const el = PLANETS[id];
    const dt = Math.min(el.syn * 2, 1800) / PLANET_STEPS;
    const pts = [];
    let prevRa = null, prevDRa = null, prevX = null;
    for (let i = 0; i <= PLANET_STEPS; i++) {
      const d = i * dt, g = geo(el, d);
      let x = g.ra - g.sunRa;
      x -= TAU * Math.round(x / TAU);
      // Retrógrado si la AR decrece en dos pasos seguidos (evita falsos
      // positivos junto a los puntos estacionarios).
      let retro = false;
      if (prevRa !== null) {
        let dRa = g.ra - prevRa;
        dRa -= TAU * Math.round(dRa / TAU);
        retro = prevDRa !== null && dRa < 0 && prevDRa < 0;
        prevDRa = dRa;
      }
      // Salto de ±180° en Δα: no se une con el punto anterior.
      const wrap = prevX !== null && Math.abs(x - prevX) > Math.PI;
      pts.push({ x, y: g.dec, d, retro, elong: g.elong, wrap });
      prevRa = g.ra; prevX = x;
    }
    const result = { pts, b: bounds(pts) };
    planetCache.set(id, result);
    return result;
  }

  (function () {
    const bar = $('planet-bar');
    const info = { head: $('pl-head'), syn: $('pl-syn'), retdur: $('pl-retdur'), ecc: $('pl-ecc'),
      shname: $('pl-shname'), shdesc: $('pl-shdesc'), legDot: $('leg-pdot'), legName: $('leg-pname') };
    const out = { day: $('pl-day'), elong: $('pl-elong'), pct: $('pl-pct'), retro: $('pl-retro') };
    let selected = 'mars';

    const sim = simulation('pl', {
      aspect: 620 / 480,
      total: () => PLANET_STEPS,
      rate: 2.4,
      draw(ctx, W, H, t) {
        const { pts, b } = planetPoints(selected);
        const color = PLANET_UI[selected].color;
        const small = isSmall(W);
        const xpad = (b.maxX - b.minX) * 0.15 || 0.001, ypad = (b.maxY - b.minY) * 0.15 || 0.001;
        const xm = small ? 36 : 48, ym = small ? 30 : 42;
        const { MX, MY } = plotArea(W, H, xm, ym, b.minX - xpad, b.maxX + xpad, b.minY - ypad, b.maxY + ypad);
        drawGrid(ctx, W, H, xm, ym);

        ctx.beginPath();
        pts.forEach((q, i) => (i === 0 || q.wrap) ? ctx.moveTo(MX(q.x), MY(q.y)) : ctx.lineTo(MX(q.x), MY(q.y)));
        ctx.strokeStyle = color + '20'; ctx.lineWidth = 1; ctx.stroke();

        const end = Math.round(t);
        drawTrail(ctx, pts, end, q => [MX(q.x), MY(q.y)], i => pts[i].retro ? C.retro(0.85) : C.blue(0.85), 1.7, i => pts[i].wrap);

        const cp = pts[end];
        dot(ctx, MX(cp.x), MY(cp.y), 5.5, color, color + '30');
        out.day.textContent = fmtInt(Math.round(cp.d));
        out.elong.textContent = cp.elong.toFixed(1) + '°';
        out.pct.textContent = Math.round(100 * end / PLANET_STEPS) + '%';
        out.retro.textContent = cp.retro ? S.yes : S.no;
        out.retro.classList.toggle('retro', cp.retro);

        drawAxisLabels(ctx, W, H, S.planetX, small);
        drawTitle(ctx, S.planetTitle(S.planets[selected][0]), xm, small);
      }
    });

    function select(id) {
      selected = id;
      const el = PLANETS[id], [name, shape, desc] = S.planets[id];
      bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      info.head.textContent = name;
      info.syn.textContent = el.syn.toFixed(1) + ' d';
      info.retdur.textContent = PLANET_UI[id].retro;
      info.ecc.textContent = el.e.toFixed(4);
      info.shname.textContent = shape;
      info.shdesc.textContent = desc;
      info.legDot.style.background = PLANET_UI[id].color;
      info.legName.textContent = name;
      if (sim) sim.restart();
    }

    for (const id of Object.keys(PLANETS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pbtn';
      b.dataset.id = id;
      const swatch = document.createElement('span');
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.color = PLANET_UI[id].color;
      swatch.textContent = '●';
      b.append(swatch, S.planets[id][0]);
      b.addEventListener('click', () => select(id));
      bar.appendChild(b);
    }
    select(selected);
  })();

  // ── 05 · Pentagrama de Venus ─────────────────────────────────────────────
  (function () {
    const VENUS = PLANETS.venus;
    const CYCLE = Math.round(8 * 365.25);
    const STEP = 0.5;       // días entre muestras de la trayectoria
    const MAX_ELONG = 48;   // elongación en el borde del gráfico (°)
    const out = { day: $('ven-day'), yr: $('ven-yr'), elong: $('ven-elong'), cyc: $('ven-cyc') };

    const path = [];
    for (let d = 0; d <= CYCLE; d += STEP) path.push(Object.assign({ d }, geo(VENUS, d)));
    // Incluye la 6.ª conjunción (fuera del ciclo) para mostrar que no cierra.
    const conjs = inferiorConjunctions(VENUS, 0, CYCLE + 600);
    const maxElongs = path.filter((q, i) => i > 0 && i < path.length - 1 &&
      q.elong > 20 && q.elong > path[i - 1].elong && q.elong >= path[i + 1].elong);

    simulation('ven', {
      aspect: 1,
      total: () => CYCLE,
      rate: 9,
      draw(ctx, W, H, t) {
        const small = isSmall(W);
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42, RZ = R * 1.06;
        const polar = (lon, r) => [cx + r * Math.sin(lon), cy - r * Math.cos(lon)];
        const inner = q => polar(q.lon, q.elong / MAX_ELONG * R);
        const ring = q => polar(q.lon, RZ);

        ctx.font = `${small ? 8 : 9}px ${MONO}`;
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = C.grid;
        ctx.fillStyle = C.label;
        ctx.textAlign = 'left';
        for (const deg of [12, 24, 36, 47]) {
          const r = deg / MAX_ELONG * R;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
          ctx.fillText(deg + '°', cx + r + 3, cy + 3);
        }
        ctx.beginPath(); ctx.arc(cx, cy, RZ, 0, TAU);
        ctx.strokeStyle = C.axis; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - RZ + 4); ctx.lineTo(cx, cy - RZ - 4); ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textAlign = 'right';
        ctx.fillText('λ = 0°', cx - 8, cy - RZ - 6);
        dot(ctx, cx, cy, 4, C.sun, 'rgba(240,192,64,0.15)');

        const end = Math.min(Math.round(t / STEP), path.length - 1);
        drawTrail(ctx, path, end, inner, i => path[i].east ? C.warm(0.35) : C.blue(0.3), 1);

        const star = conjs.filter(q => q.day <= t).slice(0, 5);
        ctx.beginPath();
        star.forEach((q, i) => { const [x, y] = ring(q); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.strokeStyle = C.warm(0.6); ctx.lineWidth = 1.5; ctx.stroke();

        if (t >= CYCLE && star.length === 5 && conjs.length >= 6) {
          const c6 = conjs[5], [x6, y6] = ring(c6), [x5, y5] = ring(star[4]);
          ctx.beginPath(); ctx.moveTo(x5, y5); ctx.lineTo(x6, y6); ctx.stroke();
          ctx.beginPath(); ctx.arc(x6, y6, 4.5, 0, TAU);
          ctx.strokeStyle = C.retro(0.9); ctx.lineWidth = 1.4; ctx.stroke();
          let drift = (c6.lon - conjs[0].lon) / DEG;
          drift -= 360 * Math.round(drift / 360);
          ctx.fillStyle = C.retro(0.9);
          ctx.font = `${small ? 9 : 11}px ${MONO}`;
          ctx.textAlign = 'left';
          ctx.fillText('○ ' + S.venusDrift(drift.toFixed(1)), small ? 8 : 14, H - 12);
        }

        ctx.setLineDash([2, 4]);
        for (const q of star) {
          const [rx, ry] = ring(q), [ix, iy] = inner(q);
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ix, iy);
          ctx.strokeStyle = C.warm(0.2); ctx.lineWidth = 0.7; ctx.stroke();
        }
        ctx.setLineDash([]);
        for (const q of star) dot(ctx, ...ring(q), 5, '#e8a030');
        for (const q of maxElongs) if (q.d <= t) dot(ctx, ...inner(q), 3.5, q.east ? C.warm(0.85) : C.blue(0.7));

        const cp = path[end];
        dot(ctx, ...inner(cp), 5, C.dot, C.warm(0.12));
        out.day.textContent = fmtInt(Math.round(t));
        out.yr.textContent = (t / 365.25).toFixed(2);
        out.elong.textContent = cp.elong.toFixed(1) + '°';
        out.cyc.textContent = Math.round(100 * t / CYCLE) + '%';

        drawTitle(ctx, S.venusTitle, small ? 8 : 14, small);
      }
    });
  })();

  // ── Menú de navegación móvil ─────────────────────────────────────────────
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
