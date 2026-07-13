import { TAU, DEG, FRAME_TIME, prefersReducedMotion, isMobile } from '../core/constants.js';
import { arrayMin, arrayMax, safeSpeed } from '../core/math.js';
import { CBG, CGRID, CAXIS, CBLUE, CWARM, CDOT, CTTL, CMON, CLBL } from '../core/colors.js';
import { createCanvasResizer } from '../core/resize.js';
import { SOLAR_PTS, MONTHS, SX0p, SX1p, SY0p, SY1p, SXR, SYR } from './solarData.js';

const state = { day: 0, playing: false, started: false };

function updatePlayBtn(btn) {
  if (!btn) return;
  const done = state.day >= SOLAR_PTS.length - 1;
  if (done) { btn.textContent = 'Reanudar'; btn.className = ''; btn.classList.add('ended'); }
  else if (state.playing) { btn.textContent = 'Pausar'; btn.className = 'on'; }
  else { btn.textContent = 'Reanudar'; btn.className = ''; }
}

export function initSolar(canvas) {
  const ctx = canvas.getContext('2d');
  let logicW = 0, logicH = 0;
  let animationId = null;
  let lastFrame = 0;
  let inView = false;

  const refs = {
    spd: document.getElementById('solar-spd'),
    spdLbl: document.getElementById('solar-spd-lbl'),
    play: document.getElementById('solar-play'),
    reset: document.getElementById('solar-reset'),
    complete: document.getElementById('solar-complete'),
    day: document.getElementById('sol-day'),
    eq: document.getElementById('sol-eq'),
    decl: document.getElementById('sol-decl'),
    pct: document.getElementById('sol-pct')
  };

  createCanvasResizer(canvas, (w, h) => {
    logicW = w; logicH = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
  }, { aspectRatio: 560/520, maxWidth: 560 });

  function draw(ts) {
    animationId = requestAnimationFrame(draw);
    if (!inView) return;
    if (ts - lastFrame < FRAME_TIME) return;
    lastFrame = ts;

    if (state.playing && state.day < SOLAR_PTS.length - 1) {
      const s = safeSpeed(refs.spd?.value, 10);
      state.day += s * 0.12;
      if (state.day >= SOLAR_PTS.length - 1) { state.day = SOLAR_PTS.length - 1; state.playing = false; updatePlayBtn(refs.play); }
    }

    const end = Math.min(Math.round(state.day), SOLAR_PTS.length - 1);
    const W = logicW, H = logicH;
    const xm = isMobile ? 36 : 56, ym = isMobile ? 32 : 42;
    const MX = v => xm + (v - SX0p) / (SX1p - SX0p) * (W - 2 * xm);
    const MY = v => H - ym - (v - SY0p) / (SY1p - SY0p) * (H - 2 * ym);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = CBG(); ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      ctx.strokeStyle = CGRID(); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(MX(SX0p + i * (SX1p - SX0p) / 4), ym); ctx.lineTo(MX(SX0p + i * (SX1p - SX0p) / 4), H - ym); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm, MY(SY0p + i * (SY1p - SY0p) / 4)); ctx.lineTo(W - xm, MY(SY0p + i * (SY1p - SY0p) / 4)); ctx.stroke();
    }
    ctx.strokeStyle = CAXIS(); ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(MX(0), ym - 2); ctx.lineTo(MX(0), H - ym + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xm - 2, MY(0)); ctx.lineTo(W - xm + 2, MY(0)); ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    SOLAR_PTS.forEach((p, i) => i === 0 ? ctx.moveTo(MX(p.x), MY(p.y)) : ctx.lineTo(MX(p.x), MY(p.y)));
    ctx.closePath(); ctx.strokeStyle = CBLUE(0.07); ctx.lineWidth = 1; ctx.stroke();

    for (let i = 1; i <= end; i++) {
      ctx.beginPath();
      ctx.moveTo(MX(SOLAR_PTS[i - 1].x), MY(SOLAR_PTS[i - 1].y));
      ctx.lineTo(MX(SOLAR_PTS[i].x), MY(SOLAR_PTS[i].y));
      ctx.strokeStyle = CBLUE(0.85); ctx.lineWidth = 1.7; ctx.stroke();
    }

    const lblSize = isMobile ? '7px' : '9.5px';
    MONTHS.forEach(([n, d]) => {
      const idx = Math.floor((d / 365.25) * SOLAR_PTS.length);
      if (idx > end) return;
      const p = SOLAR_PTS[idx];
      ctx.beginPath(); ctx.arc(MX(p.x), MY(p.y), 3.5, 0, TAU);
      ctx.fillStyle = CMON(0.75); ctx.fill();
      ctx.fillStyle = CMON(0.7);
      ctx.font = `${lblSize} JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(n, MX(p.x), MY(p.y) - 8);
    });

    if (end > 0) {
      const cp = SOLAR_PTS[end];
      ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 6, 0, TAU); ctx.fillStyle = CDOT(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 11, 0, TAU);
      ctx.strokeStyle = CWARM(0.16); ctx.lineWidth = 1.5; ctx.stroke();
      if (refs.day)  refs.day.textContent  = Math.floor(cp.day + 1);
      if (refs.eq)   refs.eq.textContent   = cp.em.toFixed(1) + ' min';
      if (refs.decl) refs.decl.textContent = cp.dd.toFixed(2) + '°';
      if (refs.pct)  refs.pct.textContent  = Math.round(100 * end / (SOLAR_PTS.length - 1)) + '%';
    }

    ctx.fillStyle = CLBL();
    ctx.font = `${lblSize} JetBrains Mono,monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('\u2190 E   ECUACI\u00d3N DEL TIEMPO E(t)   O \u2192', W / 2, H - 5);
    ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('DECLINACI\u00d3N \u03b4', 0, 0); ctx.restore();
    ctx.fillStyle = CTTL();
    ctx.font = '500 10px JetBrains Mono,monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ANALEMA SOLAR TERRESTRE \u00b7 J2000.0', xm, isMobile ? 14 : 20);
  }

  const section = document.getElementById('solar');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      inView = entry.isIntersecting;
      if (inView && !state.started) {
        state.started = true;
        if (prefersReducedMotion) {
          state.day = SOLAR_PTS.length - 1;
          state.playing = false;
          updatePlayBtn(refs.play);
        } else {
          state.playing = true;
          if (refs.play) { refs.play.textContent = 'Pausar'; refs.play.className = 'on'; }
        }
        animationId = requestAnimationFrame(draw);
      }
    });
  }, { threshold: 0.25 });
  if (section) obs.observe(section);

  if (refs.spd) refs.spd.addEventListener('input', function () { if (refs.spdLbl) refs.spdLbl.textContent = this.value + '\u00d7'; });

  if (refs.play) refs.play.addEventListener('click', () => {
    if (!state.started) { state.started = true; animationId = requestAnimationFrame(draw); }
    state.playing = !state.playing;
    updatePlayBtn(refs.play);
  });

  if (refs.reset) refs.reset.addEventListener('click', () => {
    state.day = 0; state.playing = true;
    if (!state.started) { state.started = true; animationId = requestAnimationFrame(draw); }
    updatePlayBtn(refs.play);
  });

  if (refs.complete) refs.complete.addEventListener('click', () => {
    state.day = SOLAR_PTS.length - 1; state.playing = false;
    if (!state.started) { state.started = true; animationId = requestAnimationFrame(draw); }
    updatePlayBtn(refs.play);
  });
}