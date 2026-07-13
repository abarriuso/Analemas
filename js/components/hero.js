import { TAU, DEG, FRAME_TIME, prefersReducedMotion, isMobile, ECC0, EPS0 } from '../core/constants.js';
import { arrayMin, arrayMax, generateSolarAnalemaPoints } from '../core/math.js';
import { CBG, CGRID, CAXIS, CBLUE, CWARM, CDOT, CTTL } from '../core/colors.js';
import { createCanvasResizer } from '../core/resize.js';

let currentEpsDeg = 23.44, currentEps = currentEpsDeg * DEG;
let currentEcc = ECC0;
let currentPoints = [];
let xc = 0, yc = 0, xRange = 1, yRange = 1;
let animProgress = 0;
const ANIM_SPEED = 0.004;
let lastTimestamp = 0;
let baseWidth = 0, baseHeight = 0;
let animationId = null;
let heroInView = true;

const events = [
  { name: 'PERIHELIO', day: 3.5, color: '#6b9e6b', xOff: -70, yOff: -10 },
  { name: 'AFELIO', day: 186.5, color: '#6b9e6b', xOff: 70, yOff: 20 },
  { name: 'EQUINOCCIO MAR', day: 79.5, color: '#2a9d8f', xOff: -80, yOff: 6 },
  { name: 'EQUINOCCIO SEP', day: 266.5, color: '#2a9d8f', xOff: 80, yOff: -6 },
  { name: 'SOLSTICIO JUN', day: 172.5, color: '#e9c46a', xOff: 75, yOff: -10 },
  { name: 'SOLSTICIO DIC', day: 355.5, color: '#e9c46a', xOff: -75, yOff: 16 }
];

function updateAnalema() {
  currentPoints = generateSolarAnalemaPoints(currentEps, currentEcc);
  const xs = currentPoints.map(p => p.x);
  const ys = currentPoints.map(p => p.y);
  xc = (arrayMin(xs) + arrayMax(xs)) / 2;
  yc = (arrayMin(ys) + arrayMax(ys)) / 2;
  xRange = (arrayMax(xs) - arrayMin(xs)) || 1;
  yRange = (arrayMax(ys) - arrayMin(ys)) || 1;
  const oblSpan = document.getElementById('hero-obl-val');
  if (oblSpan) oblSpan.textContent = currentEpsDeg.toFixed(2) + '°';
  const eccSpan = document.getElementById('hero-ecc-val');
  if (eccSpan) eccSpan.textContent = currentEcc.toFixed(5);
}

export function initHero(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  createCanvasResizer(canvas, (w, h) => {
    baseWidth = w; baseHeight = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }, { aspectRatio: 1, maxWidth: 560 });

  updateAnalema();

  const heroObs = new IntersectionObserver(es => {
    es.forEach(e => { heroInView = e.isIntersecting; if (heroInView && !animationId) animationId = requestAnimationFrame(draw); });
  }, { threshold: 0 });
  heroObs.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }
    else if (heroInView && !animationId) { animationId = requestAnimationFrame(draw); }
  });

  function draw(ts) {
    if (!heroInView) { animationId = requestAnimationFrame(draw); return; }
    animationId = requestAnimationFrame(draw);
    if (baseWidth === 0 || baseHeight === 0) return;
    if (ts - lastTimestamp < FRAME_TIME) return;
    lastTimestamp = ts;
    if (currentPoints.length === 0) return;

    if (!prefersReducedMotion) {
      animProgress += ANIM_SPEED;
      if (animProgress > 1) animProgress = 0;
    } else if (animProgress === 0) {
      animProgress = 1;
    }
    const currentPoint = animProgress * currentPoints.length;

    ctx.clearRect(0, 0, baseWidth, baseHeight);
    ctx.save();
    ctx.translate(baseWidth / 2, baseHeight / 2);
    const ref = Math.min(baseWidth, baseHeight);
    const scaleX = ref * 0.20 / xRange;
    const scaleY = ref * 0.42 / yRange;
    const px = p => (p.x - xc) * scaleX;
    const py = p => -(p.y - yc) * scaleY;

    ctx.beginPath();
    currentPoints.forEach((p, i) => { if (i === 0) ctx.moveTo(px(p), py(p)); else ctx.lineTo(px(p), py(p)); });
    ctx.closePath();
    ctx.strokeStyle = CBLUE(0.25); ctx.lineWidth = 1.2; ctx.stroke();

    const endIdx = Math.min(Math.floor(currentPoint), currentPoints.length - 1);
    for (let i = 1; i <= endIdx; i++) {
      const p1 = currentPoints[i - 1], p2 = currentPoints[i];
      ctx.beginPath(); ctx.moveTo(px(p1), py(p1)); ctx.lineTo(px(p2), py(p2));
      ctx.strokeStyle = CWARM(0.8); ctx.lineWidth = 1.5; ctx.stroke();
    }

    events.forEach(ev => {
      const idx = Math.floor((ev.day / 365.25) * currentPoints.length);
      if (idx >= currentPoints.length) return;
      const p = currentPoints[idx];
      const x = px(p), y = py(p);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + ev.xOff * 0.75, y + ev.yOff * 0.75);
      ctx.strokeStyle = `${ev.color}55`; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = ev.color; ctx.fill();
      const fontSize = isMobile ? 7 : 8;
      const lblW = ev.name.length * (isMobile ? 4 : 5.5) + 10;
      ctx.fillStyle = 'rgba(24,27,36,0.82)';
      ctx.fillRect(x + ev.xOff - lblW / 2, y + ev.yOff - 13, lblW, 16);
      ctx.fillStyle = ev.color;
      ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ev.name, x + ev.xOff, y + ev.yOff - 2);
    });

    const cpIndex = Math.floor(currentPoint) % currentPoints.length;
    const cp = currentPoints[cpIndex];
    const cx = px(cp), cy = py(cp);
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.fillStyle = CWARM(0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = CDOT(); ctx.fill();

    ctx.fillStyle = CTTL();
    ctx.font = `${isMobile ? 7 : 9}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('J2000.0 \u00b7 Par\u00e1metros din\u00e1micos', baseWidth * 0.47, -baseHeight * 0.47 + 14);
    ctx.restore();
  }

  animationId = requestAnimationFrame(draw);
}