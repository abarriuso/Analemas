(function () {
  'use strict';

  // =========================================================================
  // 0. Constantes globales, utilidades y detección de dispositivo
  // =========================================================================
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // Parámetros orbitales terrestres J2000.0 (Meeus 1998, Williams 2024)
  const EPS0 = 23.4392911 * DEG;    // oblicuidad del eje terrestre (rad)
  const ECC0 = 0.016708634;          // excentricidad orbital terrestre
  // Longitud geocéntrica del Sol en el perihelio = ϖ⊕ + 180° ≈ 282.94°
  // (ϖ⊕ ≈ 102.94° heliocéntrico; el Sol se ve desde la Tierra a 282.94° en ene. 3)
  const LON_PERIHELION = 282.9372 * DEG;

  // Potencias de tan(ε/2) para la ecuación del tiempo (término de oblicuidad)
  const _t2 = Math.tan(EPS0 / 2);
  const TE2 = _t2;                   // tan(ε/2)
  const TE4 = _t2 * _t2 * _t2 * _t2; // tan⁴(ε/2)
  const TE6 = TE4 * _t2 * _t2;       // tan⁶(ε/2)

  // Rendimiento y dispositivo
  const FRAME_TIME = 1000 / 60;      // ~16.67 ms → cap a 60 fps
  const isMobile = window.innerWidth < 768;
  const hasLowMemory = (navigator.deviceMemory !== undefined) && (navigator.deviceMemory < 4);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Paleta de colores (modo oscuro fijo) ─────────────────────────────────
  const CBG    = ()      => '#12141a';
  const CGRID  = ()      => 'rgba(180,190,210,0.06)';
  const CAXIS  = ()      => 'rgba(180,190,210,0.14)';
  const CBLUE  = (a = 1) => `rgba(160,180,210,${a})`;
  const CWARM  = (a = 1) => `rgba(196,155,114,${a})`;
  const CDOT   = ()      => '#dbb48a';
  const CTTL   = ()      => 'rgba(176,185,200,0.45)';
  const CMON   = (a = 1) => `rgba(160,175,200,${a})`;
  const CLBL   = ()      => 'rgba(138,146,163,0.6)';
  const CRETRO = (a = 1) => `rgba(192,48,48,${a})`;

  // =========================================================================
  // 1. Utilidades astronómicas
  // =========================================================================

  // Ecuación de Kepler — Newton-Raphson, |ΔE| < 1e-12 (Meeus 1998, cap. 30)
  function keplerE(M, e) {
    let E = M;
    for (let i = 0; i < 10; i++) {
      const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-12) break;
    }
    return E;
  }

  // Posición en órbita kepleriana (heliocéntrica en el plano orbital)
  function orbPos(a, e, T, t, L0) {
    const M = (L0 + TAU * t / T) % TAU;
    const E = keplerE(M, e);
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
    return { x: r * Math.cos(nu), y: r * Math.sin(nu), nu };
  }

  // Ecuación del tiempo E(t) en radianes (Meeus 1998, cap. 27)
  // E(t) = E_exc(t) + E_obl(t)
  // E_exc: serie en e (excentricidad)
  // E_obl: serie en tan(ε/2) (oblicuidad)
  function equationOfTime(M, nu, e) {
    const lam = (nu + LON_PERIHELION) % TAU;
    const exc =
      -2 * e * Math.sin(M) +
      (5 * e * e / 4) * Math.sin(2 * M) -
      (13 * e * e * e / 12) * Math.sin(3 * M);
    const obl =
      TE2 * TE2 * Math.sin(2 * lam) -
      (TE4 / 2) * Math.sin(4 * lam) +
      (TE6 / 3) * Math.sin(6 * lam);
    return exc + obl;
  }

  // Genera los puntos del analema solar (2001 pasos = un año completo)
  function generateSolarAnalemaPoints(epsRad = EPS0, ecc = ECC0) {
    const pts = [];
    const steps = 2000;
    const T = 365.25;
    const t2 = Math.tan(epsRad / 2);
    const t4 = t2 * t2 * t2 * t2;
    const t6 = t4 * t2 * t2;
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * T;
      const M = TAU * d / T;
      const E = keplerE(M, ecc);
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + ecc) * Math.sin(E / 2),
        Math.sqrt(1 - ecc) * Math.cos(E / 2)
      );
      const lam = (nu + LON_PERIHELION) % TAU;
      const exc =
        -2 * ecc * Math.sin(M) +
        (5 * ecc * ecc / 4) * Math.sin(2 * M) -
        (13 * ecc * ecc * ecc / 12) * Math.sin(3 * M);
      const obl =
        t2 * t2 * Math.sin(2 * lam) -
        (t4 / 2) * Math.sin(4 * lam) +
        (t6 / 3) * Math.sin(6 * lam);
      const eqT = exc + obl;
      const decl = Math.asin(Math.sin(epsRad) * Math.sin(lam));
      pts.push({
        x: eqT,
        y: decl,
        em: eqT * (180 / Math.PI) * 4, // minutos de tiempo
        dd: decl * 180 / Math.PI,
        day: d
      });
    }
    return pts;
  }

  // Precalculo del analema solar con parámetros J2000.0
  const SOLAR_PTS = generateSolarAnalemaPoints();

  // =========================================================================
  // 2. Starfield (fondo estelar animado)
  // =========================================================================
  (function () {
    const cv = document.getElementById('starfield');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H;
    let stars = [];
    let shootingStars = [];
    let mouseX = null, mouseY = null;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let animationId = null;
    let lastFrame = 0;

    if (!isTouchDevice && !prefersReducedMotion) {
      window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
      window.addEventListener('mouseleave', () => { mouseX = mouseY = null; });
    }

    function initStars() {
      let count = isMobile || hasLowMemory ? 80 : 250;
      if (prefersReducedMotion) count = 20;
      stars = [];
      for (let i = 0; i < count; i++) {
        const sizeRand = Math.random();
        let radius;
        if (sizeRand < 0.7) radius = 0.4 + Math.random() * 0.5;
        else if (sizeRand < 0.92) radius = 0.9 + Math.random() * 0.5;
        else radius = 1.2 + Math.random() * 0.6;
        const z = Math.random();
        const brightness = 0.15 + (1 - z) * 0.5;
        stars.push({
          x: Math.random() * W, y: Math.random() * H, radius,
          baseBrightness: brightness, z,
          speedX: (Math.random() - 0.5) * (isMobile ? 0.04 : 0.1),
          speedY: (Math.random() - 0.5) * (isMobile ? 0.03 : 0.08),
          twinkleSpeed: 0.002 + Math.random() * 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          colorShift: Math.random() * 0.2
        });
      }
    }

    function addShootingStar() {
      if (prefersReducedMotion) return;
      const prob = isMobile || hasLowMemory ? 0.0008 : 0.0025;
      if (Math.random() < prob) {
        shootingStars.push({
          x: Math.random() * W, y: Math.random() * H * 0.3,
          vx: (isMobile ? 2 : 3.5) + Math.random() * (isMobile ? 1 : 2.5),
          vy: (isMobile ? 1 : 1.8) + Math.random() * (isMobile ? 0.6 : 1.2),
          life: 0, maxLife: (isMobile ? 25 : 40) + Math.random() * 15, trail: []
        });
      }
    }

    function updateStars() {
      for (let s of stars) {
        s.x += s.speedX; s.y += s.speedY;
        if (!isTouchDevice && mouseX !== null && mouseY !== null && !prefersReducedMotion) {
          const dx = s.x - mouseX, dy = s.y - mouseY;
          const distSq = dx * dx + dy * dy;
          if (distSq < 10000) { // 100² — evita Math.sqrt
            const dist = Math.sqrt(distSq);
            const force = (100 - dist) / 100;
            const angle = Math.atan2(dy, dx);
            s.x += Math.cos(angle) * force * 0.5;
            s.y += Math.sin(angle) * force * 0.5;
          }
        }
        if (s.x < -20) s.x = W + 20;
        if (s.x > W + 20) s.x = -20;
        if (s.y < -20) s.y = H + 20;
        if (s.y > H + 20) s.y = -20;
      }
    }

    function drawStars(now) {
      const baseColor = [170, 185, 210];
      for (let s of stars) {
        const twinkle = prefersReducedMotion ? 1 : (0.7 + 0.3 * Math.sin(now * s.twinkleSpeed + s.twinklePhase));
        let brightness = s.baseBrightness * twinkle * (1 - s.z * 0.3);
        if (isMobile || hasLowMemory) brightness *= 0.6;
        const r = baseColor[0] + s.colorShift * 30;
        const g = baseColor[1] + s.colorShift * 20;
        const b = baseColor[2] + s.colorShift * 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, TAU);
        if (!isMobile && !hasLowMemory && !prefersReducedMotion && s.radius > 1.0 && brightness > 0.5) {
          ctx.shadowBlur = 2;
          ctx.shadowColor = `rgba(200,210,230,${brightness * 0.3})`;
        } else ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${r},${g},${b},${brightness * 0.7})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function updateShootingStars() {
      if (prefersReducedMotion) return;
      for (let i = 0; i < shootingStars.length; i++) {
        const s = shootingStars[i];
        s.x += s.vx; s.y += s.vy; s.life++;
        s.trail.unshift({ x: s.x, y: s.y });
        if (s.trail.length > (isMobile ? 4 : 6)) s.trail.pop();
        if (s.life > s.maxLife) { shootingStars.splice(i, 1); i--; continue; }
        for (let j = 0; j < s.trail.length; j++) {
          const t = s.trail[j];
          const alpha = 1 - (j / s.trail.length) * 0.7;
          const size = (isMobile ? 0.7 : 1.0) * (1 - j / s.trail.length);
          ctx.beginPath();
          ctx.arc(t.x, t.y, size, 0, TAU);
          ctx.fillStyle = `rgba(220,210,200,${alpha * 0.4})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, isMobile ? 1.0 : 1.5, 0, TAU);
        ctx.fillStyle = `rgba(230,215,190,${1 - s.life / s.maxLife})`;
        ctx.fill();
      }
    }

    function animate(ts) {
      if (!cv.parentElement) return;
      if (ts - lastFrame < FRAME_TIME) { animationId = requestAnimationFrame(animate); return; }
      lastFrame = ts;
      ctx.clearRect(0, 0, W, H);
      updateStars();
      addShootingStar();
      updateShootingStars();
      drawStars(ts);
      animationId = requestAnimationFrame(animate);
    }

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      initStars();
    }
    resize();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
    animate(0);
  })();

  // =========================================================================
  // 3. Hero Canvas — analema interactivo
  // =========================================================================
  (function () {
    const cv = document.getElementById('hero-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let currentEpsDeg = 23.44, currentEps = currentEpsDeg * DEG;
    let currentEcc = ECC0;
    let currentPoints = [];
    let xc = 0, yc = 0, xRange = 1, yRange = 1;
    let animProgress = 0;
    const ANIM_SPEED = 0.004;
    let lastTimestamp = 0;
    let baseWidth = 0, baseHeight = 0;
    const dpr = window.devicePixelRatio || 1;
    let animationId = null;

    function generateAnalemaPoints(epsRad, ecc) {
      const pts = [];
      const steps = 2000;
      const T = 365.25;
      const t2 = Math.tan(epsRad / 2);
      const t4 = t2 * t2 * t2 * t2;
      const t6 = t4 * t2 * t2;
      for (let i = 0; i <= steps; i++) {
        const d = (i / steps) * T;
        const M = TAU * d / T;
        const E = keplerE(M, ecc);
        const nu = 2 * Math.atan2(
          Math.sqrt(1 + ecc) * Math.sin(E / 2),
          Math.sqrt(1 - ecc) * Math.cos(E / 2)
        );
        const lam = (nu + LON_PERIHELION) % TAU;
        const exc = -2 * ecc * Math.sin(M) + (5 * ecc * ecc / 4) * Math.sin(2 * M) - (13 * ecc * ecc * ecc / 12) * Math.sin(3 * M);
        const obl = t2 * t2 * Math.sin(2 * lam) - (t4 / 2) * Math.sin(4 * lam) + (t6 / 3) * Math.sin(6 * lam);
        const eqT = exc + obl;
        const decl = Math.asin(Math.sin(epsRad) * Math.sin(lam));
        pts.push({ x: eqT, y: decl, em: eqT * (180 / Math.PI) * 4, dd: decl * 180 / Math.PI, day: d });
      }
      return pts;
    }

    function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
    function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }

    function updateAnalema() {
      currentPoints = generateAnalemaPoints(currentEps, currentEcc);
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

    function resizeCanvas() {
      const container = cv.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { setTimeout(resizeCanvas, 50); return; }
      const cssW = rect.width, cssH = rect.height;
      const bufferW = Math.round(cssW * dpr), bufferH = Math.round(cssH * dpr);
      if (cv.width !== bufferW || cv.height !== bufferH) {
        cv.width = bufferW; cv.height = bufferH;
        baseWidth = cssW; baseHeight = cssH;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      } else { baseWidth = cssW; baseHeight = cssH; }
    }

    window.addEventListener('load', () => { resizeCanvas(); setTimeout(resizeCanvas, 200); });
    window.addEventListener('resize', resizeCanvas);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resizeCanvas);
    else resizeCanvas();

    updateAnalema();

    const events = [
      { name: 'PERIHELIO', day: 3.5, color: '#6b9e6b', xOff: -70, yOff: -10 },
      { name: 'AFELIO', day: 186.5, color: '#6b9e6b', xOff: 70, yOff: 20 },
      { name: 'EQUINOCCIO MAR', day: 79.5, color: '#2a9d8f', xOff: -80, yOff: 6 },
      { name: 'EQUINOCCIO SEP', day: 266.5, color: '#2a9d8f', xOff: 80, yOff: -6 },
      { name: 'SOLSTICIO JUN', day: 172.5, color: '#e9c46a', xOff: 75, yOff: -10 },
      { name: 'SOLSTICIO DIC', day: 355.5, color: '#e9c46a', xOff: -75, yOff: 16 }
    ];

    function draw(ts) {
      if (baseWidth === 0 || baseHeight === 0) { animationId = requestAnimationFrame(draw); return; }
      if (ts - lastTimestamp < FRAME_TIME) { animationId = requestAnimationFrame(draw); return; }
      lastTimestamp = ts;
      if (currentPoints.length === 0) { animationId = requestAnimationFrame(draw); return; }

      animProgress += ANIM_SPEED;
      if (animProgress > 1) animProgress = 0;
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
      currentPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(px(p), py(p)); else ctx.lineTo(px(p), py(p));
      });
      ctx.closePath();
      ctx.strokeStyle = CBLUE(0.25); ctx.lineWidth = 1.2; ctx.stroke();

      const endIdx = Math.floor(currentPoint);
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
      ctx.font = `${Math.max(6, Math.round(6 * dpr))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('J2000.0 · Parámetros dinámicos', baseWidth * 0.47, -baseHeight * 0.47 + 14);
      ctx.restore();
      animationId = requestAnimationFrame(draw);
    }
    animationId = requestAnimationFrame(draw);
  })();

  // =========================================================================
  // 4. Solar Analema Canvas
  // =========================================================================
  const solarState = { day: 0, playing: false, started: false };
  (function () {
    const cv = document.getElementById('solar-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let animationId = null;
    let lastFrame = 0;

    function setSize() {
      const w = Math.min(560, window.innerWidth - 32);
      const h = Math.round(w * 520 / 560);
      cv.width = w; cv.height = h;
    }
    setSize();
    let solarResizeTimer;
    window.addEventListener('resize', () => { clearTimeout(solarResizeTimer); solarResizeTimer = setTimeout(setSize, 200); });

    // Precomputa los rangos del analema solar (solo una vez, evita spread en arrays grandes)
    function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
    function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }
    const sXs = SOLAR_PTS.map(p => p.x), sYs = SOLAR_PTS.map(p => p.y);
    const sXmin = arrayMin(sXs), sXmax = arrayMax(sXs);
    const sYmin = arrayMin(sYs), sYmax = arrayMax(sYs);
    const sXr = sXmax - sXmin, sYr = sYmax - sYmin;
    const X0 = sXmin - sXr * 0.18, X1 = sXmax + sXr * 0.18;
    const Y0 = sYmin - sYr * 0.14, Y1 = sYmax + sYr * 0.14;

    const MONTHS = [['ENE', 0], ['FEB', 31], ['MAR', 59], ['ABR', 90], ['MAY', 120],
      ['JUN', 151], ['JUL', 181], ['AGO', 212], ['SEP', 243], ['OCT', 273], ['NOV', 304], ['DIC', 334]];

    function updatePlayBtn(btn) {
      if (!btn) return;
      const done = solarState.day >= SOLAR_PTS.length - 1;
      if (done) {
        btn.textContent = 'Reanudar'; btn.className = ''; btn.classList.add('ended');
      } else if (solarState.playing) {
        btn.textContent = 'Pausar'; btn.className = 'on';
      } else {
        btn.textContent = 'Reanudar'; btn.className = '';
      }
    }

    function draw(ts) {
      if (ts - lastFrame < FRAME_TIME) { animationId = requestAnimationFrame(draw); return; }
      lastFrame = ts;
      const W = cv.width, H = cv.height;
      const xm = isMobile ? 36 : 56, ym = isMobile ? 32 : 42;
      const MX = v => xm + (v - X0) / (X1 - X0) * (W - 2 * xm);
      const MY = v => H - ym - (v - Y0) / (Y1 - Y0) * (H - 2 * ym);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = CBG(); ctx.fillRect(0, 0, W, H);

      // Grid
      for (let i = 0; i <= 4; i++) {
        ctx.strokeStyle = CGRID(); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(MX(X0 + i * (X1 - X0) / 4), ym); ctx.lineTo(MX(X0 + i * (X1 - X0) / 4), H - ym); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xm, MY(Y0 + i * (Y1 - Y0) / 4)); ctx.lineTo(W - xm, MY(Y0 + i * (Y1 - Y0) / 4)); ctx.stroke();
      }
      ctx.strokeStyle = CAXIS(); ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(MX(0), ym - 2); ctx.lineTo(MX(0), H - ym + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm - 2, MY(0)); ctx.lineTo(W - xm + 2, MY(0)); ctx.stroke();
      ctx.setLineDash([]);

      // Analema completo (guía tenue)
      ctx.beginPath();
      SOLAR_PTS.forEach((p, i) => i === 0 ? ctx.moveTo(MX(p.x), MY(p.y)) : ctx.lineTo(MX(p.x), MY(p.y)));
      ctx.closePath(); ctx.strokeStyle = CBLUE(0.07); ctx.lineWidth = 1; ctx.stroke();

      // Avance de la animación
      const playBtn = document.getElementById('solar-play');
      if (solarState.playing && solarState.day < SOLAR_PTS.length - 1) {
        const s = parseInt(document.getElementById('solar-spd').value);
        solarState.day += s * 0.12;
        if (solarState.day >= SOLAR_PTS.length - 1) {
          solarState.day = SOLAR_PTS.length - 1;
          solarState.playing = false;
          updatePlayBtn(playBtn);
        }
      }

      // Estela animada
      const end = Math.min(Math.round(solarState.day), SOLAR_PTS.length - 1);
      for (let i = 1; i <= end; i++) {
        ctx.beginPath();
        ctx.moveTo(MX(SOLAR_PTS[i - 1].x), MY(SOLAR_PTS[i - 1].y));
        ctx.lineTo(MX(SOLAR_PTS[i].x), MY(SOLAR_PTS[i].y));
        ctx.strokeStyle = CBLUE(0.85); ctx.lineWidth = 1.7; ctx.stroke();
      }

      // Marcadores mensuales
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

      // Punto actual
      if (end > 0) {
        const cp = SOLAR_PTS[end];
        ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 6, 0, TAU); ctx.fillStyle = CDOT(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 11, 0, TAU);
        ctx.strokeStyle = CWARM(0.16); ctx.lineWidth = 1.5; ctx.stroke();
        const dayEl = document.getElementById('sol-day');
        const eqEl = document.getElementById('sol-eq');
        const declEl = document.getElementById('sol-decl');
        const pctEl = document.getElementById('sol-pct');
        if (dayEl) dayEl.textContent = Math.floor(cp.day + 1);
        if (eqEl) eqEl.textContent = cp.em.toFixed(1) + ' min';
        if (declEl) declEl.textContent = cp.dd.toFixed(2) + '°';
        if (pctEl) pctEl.textContent = Math.round(100 * end / (SOLAR_PTS.length - 1)) + '%';
      }

      // Etiquetas de ejes
      ctx.fillStyle = CLBL();
      ctx.font = `${lblSize} JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('← O   ECUACIÓN DEL TIEMPO E(t)   E →', W / 2, H - 5);
      ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('DECLINACIÓN δ', 0, 0); ctx.restore();
      ctx.fillStyle = CTTL();
      ctx.font = '500 10px JetBrains Mono,monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ANALEMA SOLAR TERRESTRE · J2000.0', xm, isMobile ? 14 : 20);

      animationId = requestAnimationFrame(draw);
    }

    // Lazy start via IntersectionObserver
    const solarSection = document.getElementById('solar');
    const solarObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !solarState.started) {
          solarState.started = true; solarState.playing = true;
          const btn = document.getElementById('solar-play');
          if (btn) { btn.textContent = 'Pausar'; btn.className = 'on'; }
          animationId = requestAnimationFrame(draw);
          solarObs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    if (solarSection) solarObs.observe(solarSection);

    const spdSlider = document.getElementById('solar-spd');
    if (spdSlider) spdSlider.addEventListener('input', function () {
      const lbl = document.getElementById('solar-spd-lbl');
      if (lbl) lbl.textContent = this.value + '×';
    });

    const playBtn = document.getElementById('solar-play');
    if (playBtn) playBtn.addEventListener('click', () => {
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      solarState.playing = !solarState.playing;
      updatePlayBtn(playBtn);
    });

    const resetBtn = document.getElementById('solar-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      solarState.day = 0; solarState.playing = true;
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(playBtn);
    });

    const completeBtn = document.getElementById('solar-complete');
    if (completeBtn) completeBtn.addEventListener('click', () => {
      solarState.day = SOLAR_PTS.length - 1; solarState.playing = false;
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(playBtn);
    });
  })();

  // =========================================================================
  // 5. Planetas — analemas geocéntricos
  // =========================================================================
  const planetsData = [
    { id: 'mercury', name: 'Mercurio', color: '#909098', a: 0.387, e: 0.2056, T: 87.97,  syn: 115.9,  L0: 0.40,  synStr: '115.9 d',  rDur: '~22 d',   eccS: '0.2056', shape: 'Lazo compacto',      shapeD: 'Elongación máx. 18°–28° por la alta excentricidad. Nunca más de 28° del Sol (Meeus, 1998, cap. 36).' },
    { id: 'venus',   name: 'Venus',    color: '#e8a030', a: 0.723, e: 0.0067, T: 224.701,syn: 583.92, L0: 3.176, synStr: '583.9 d',  rDur: '~40 d',   eccS: '0.0067', shape: 'Pentagrama (8 años)', shapeD: 'Cinco elongaciones en 8 años forman una estrella de 5 puntas por la resonancia 8:13:5 (Bretagnon & Simon, 1986).' },
    { id: 'mars',    name: 'Marte',    color: '#c85830', a: 1.524, e: 0.0934, T: 686.97, syn: 779.94, L0: 1.20,  synStr: '779.9 d',  rDur: '~72 d',   eccS: '0.0934', shape: 'Bucle variable',      shapeD: 'Retrogradaciones muy variables según oposición perihélica o afélica. La excentricidad moderada genera bucles irregulares (Meeus, 1998).' },
    { id: 'jupiter', name: 'Júpiter',  color: '#c0a060', a: 5.203, e: 0.0489, T: 4332.6, syn: 398.88, L0: 0.80,  synStr: '398.9 d',  rDur: '~121 d',  eccS: '0.0489', shape: 'Bucles uniformes',    shapeD: '~1 retrogradación/año. Bucles casi idénticos por la baja excentricidad. ~30°/año en el zodíaco (P ≈ 12 años).' },
    { id: 'saturn',  name: 'Saturno',  color: '#a88848', a: 9.537, e: 0.0565, T: 10759,  syn: 378.09, L0: 3.50,  synStr: '378.1 d',  rDur: '~138 d',  eccS: '0.0565', shape: 'Bucles regulares',    shapeD: 'P ≈ 29.5 años. Retrogradaciones anuales (~138 días) predecibles y casi idénticas.' },
    { id: 'uranus',  name: 'Urano',    color: '#40c0a8', a: 19.19, e: 0.0472, T: 30589,  syn: 369.66, L0: 5.10,  synStr: '369.7 d',  rDur: '~151 d',  eccS: '0.0472', shape: 'Bucles densos',      shapeD: 'Mag +5.7. 84 años para completar el zodíaco. ε = 97.77° invertiría el analema solar.' },
    { id: 'neptune', name: 'Neptuno',  color: '#2858b8', a: 30.07, e: 0.0086, T: 60182,  syn: 367.49, L0: 2.20,  synStr: '367.5 d',  rDur: '~158 d',  eccS: '0.0086', shape: 'Bucles estáticos',   shapeD: 'Mag +7.8. 165 años para analema completo. Movimiento propio ~2°/año. Excentricidad mínima.' }
  ];

  let selectedPlanet = planetsData[2]; // Marte por defecto
  const planetState = { day: 0, playing: false, started: false };
  const planetCache = new Map();

  function getPlanetPoints(p) {
    if (planetCache.has(p.id)) return planetCache.get(p.id);
    const pts = computePlanetPoints(p);
    planetCache.set(p.id, pts);
    return pts;
  }

  function computePlanetPoints(p) {
    const ee = ECC0, Te = 365.25;
    const steps = isMobile ? 400 : 600;
    const totalDays = Math.min(p.syn * 2, 1800);
    const dt = totalDays / steps;
    const pts = [];
    let prevLon = null, prevDelta = null;

    for (let i = 0; i <= steps; i++) {
      const d = i * dt;
      const pe = orbPos(1, ee, Te, d, 0);
      const pp = orbPos(p.a, p.e, p.T, d, p.L0);
      const dx = pp.x - pe.x, dy = pp.y - pe.y;
      const lon = Math.atan2(dy, dx);
      const decl = Math.asin(Math.sin(EPS0) * Math.sin(lon));
      const ra = Math.atan2(Math.cos(EPS0) * Math.sin(lon), Math.cos(lon));
      const Me = TAU * d / Te;
      const Eke = keplerE(Me, ee);
      const nue = 2 * Math.atan2(
        Math.sqrt(1 + ee) * Math.sin(Eke / 2),
        Math.sqrt(1 - ee) * Math.cos(Eke / 2)
      );
      const sunLon = (nue + LON_PERIHELION) % TAU;
      const sunRA = Math.atan2(Math.cos(EPS0) * Math.sin(sunLon), Math.cos(sunLon));
      let dRA = ra - sunRA;
      if (dRA > Math.PI) dRA -= TAU;
      if (dRA < -Math.PI) dRA += TAU;

      // Retrogradación robusta: movimiento retrógrado cuando δlon < 0 dos frames seguidos
      let retro = false;
      if (prevLon !== null) {
        let delta = lon - prevLon;
        if (delta > Math.PI) delta -= TAU;
        if (delta < -Math.PI) delta += TAU;
        if (prevDelta !== null) retro = (delta < 0 && prevDelta < 0);
        prevDelta = delta;
      }
      prevLon = lon;

      const earthToSun = { x: -pe.x, y: -pe.y };
      const earthToPlanet = { x: dx, y: dy };
      const dot = earthToSun.x * earthToPlanet.x + earthToSun.y * earthToPlanet.y;
      const mag1 = Math.hypot(earthToSun.x, earthToSun.y);
      const mag2 = Math.hypot(earthToPlanet.x, earthToPlanet.y);
      const elong = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180 / Math.PI;

      pts.push({ x: dRA, y: decl, day: d, retro, elong });
    }
    return pts;
  }

  function updatePlanetInfo(p) {
    const ids = ['pl-head', 'pl-syn', 'pl-retdur', 'pl-ecc', 'pl-shv', 'pl-shname', 'pl-shdesc', 'leg-pdot', 'leg-pname'];
    const [head, syn, retdur, ecc, shv, shname, shdesc, legDot, legName] = ids.map(id => document.getElementById(id));
    if (head) head.textContent = p.name.toUpperCase();
    if (syn) syn.textContent = p.synStr;
    if (retdur) retdur.textContent = p.rDur;
    if (ecc) ecc.textContent = p.eccS;
    if (shv) shv.textContent = p.shape;
    if (shname) shname.textContent = p.shape;
    if (shdesc) shdesc.textContent = p.shapeD;
    if (legDot) legDot.style.background = p.color;
    if (legName) legName.textContent = p.name;
  }

  window.selPlan = function (id) {
    selectedPlanet = planetsData.find(p => p.id === id);
    planetCache.delete(id); // solo invalida el planeta seleccionado
    document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on'));
    const activeBtn = document.getElementById('pb-' + id);
    if (activeBtn) activeBtn.classList.add('on');
    planetState.day = 0; planetState.playing = true;
    const playBtn = document.getElementById('pl-play');
    if (playBtn) { playBtn.textContent = 'Pausar'; playBtn.className = 'on'; playBtn.classList.remove('ended'); }
    updatePlanetInfo(selectedPlanet);
  };

  // Botones de selección de planeta
  (function () {
    const bar = document.getElementById('planet-bar');
    if (!bar) return;
    planetsData.forEach(p => {
      const b = document.createElement('button');
      b.className = 'pbtn' + (p.id === selectedPlanet.id ? ' on' : '');
      b.id = 'pb-' + p.id;
      b.setAttribute('aria-label', `Ver analema de ${p.name}`);
      b.innerHTML = `<span style="color:${p.color};margin-right:4px" aria-hidden="true">●</span>${p.name}`;
      b.onclick = () => selPlan(p.id);
      bar.appendChild(b);
    });
    updatePlanetInfo(selectedPlanet);
  })();

  // Canvas de planetas
  (function () {
    const cv = document.getElementById('planet-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let animationId = null;
    let lastFrame = 0;

    function setSize() {
      const w = Math.min(620, window.innerWidth - 32);
      const h = Math.round(w * 480 / 620);
      cv.width = w; cv.height = h;
    }
    setSize();
    let plResizeTimer;
    window.addEventListener('resize', () => { clearTimeout(plResizeTimer); plResizeTimer = setTimeout(setSize, 200); });

    function updatePlayBtn(btn, pts) {
      if (!btn) return;
      const done = planetState.day >= (pts ? pts.length - 1 : 0);
      if (done) { btn.textContent = 'Reanudar'; btn.className = ''; btn.classList.add('ended'); }
      else if (planetState.playing) { btn.textContent = 'Pausar'; btn.className = 'on'; }
      else { btn.textContent = 'Reanudar'; btn.className = ''; }
    }

    function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
    function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }

    function draw(ts) {
      if (ts - lastFrame < FRAME_TIME) { animationId = requestAnimationFrame(draw); return; }
      lastFrame = ts;
      const p = selectedPlanet;
      const pts = getPlanetPoints(p);
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = CBG(); ctx.fillRect(0, 0, W, H);

      // Rango local del planeta seleccionado (corregido: no usa xs/ys del solar canvas)
      const pXs = pts.map(q => q.x), pYs = pts.map(q => q.y);
      const minX = arrayMin(pXs), maxX = arrayMax(pXs);
      const minY = arrayMin(pYs), maxY = arrayMax(pYs);
      const xr = maxX - minX, yr = maxY - minY;
      const xpad = Math.max(xr * 0.15, 0.001), ypad = Math.max(yr * 0.15, 0.001);
      const X0 = minX - xpad, X1 = maxX + xpad;
      const Y0 = minY - ypad, Y1 = maxY + ypad;

      const xm = isMobile ? 36 : 48, ym = isMobile ? 30 : 40;
      const MX = v => xm + (v - X0) / (X1 - X0) * (W - 2 * xm);
      const MY = v => H - ym - (v - Y0) / (Y1 - Y0) * (H - 2 * ym);

      for (let i = 0; i <= 4; i++) {
        ctx.strokeStyle = CGRID(); ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(MX(X0 + i * (X1 - X0) / 4), ym); ctx.lineTo(MX(X0 + i * (X1 - X0) / 4), H - ym); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xm, MY(Y0 + i * (Y1 - Y0) / 4)); ctx.lineTo(W - xm, MY(Y0 + i * (Y1 - Y0) / 4)); ctx.stroke();
      }
      ctx.strokeStyle = CAXIS(); ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(MX((X0 + X1) / 2), ym); ctx.lineTo(MX((X0 + X1) / 2), H - ym); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm, MY((Y0 + Y1) / 2)); ctx.lineTo(W - xm, MY((Y0 + Y1) / 2)); ctx.stroke();
      ctx.setLineDash([]);

      // Guía completa del analema
      ctx.beginPath();
      pts.forEach((q, i) => i === 0 ? ctx.moveTo(MX(q.x), MY(q.y)) : ctx.lineTo(MX(q.x), MY(q.y)));
      ctx.strokeStyle = p.color + '18'; ctx.lineWidth = 1; ctx.stroke();

      // Avance
      const playBtn = document.getElementById('pl-play');
      if (planetState.playing && planetState.day < pts.length - 1) {
        const s = parseInt(document.getElementById('pl-spd').value);
        planetState.day += s * 0.11;
        if (planetState.day >= pts.length - 1) {
          planetState.day = pts.length - 1;
          planetState.playing = false;
          updatePlayBtn(playBtn, pts);
        }
      }

      const end = Math.min(Math.round(planetState.day), pts.length - 1);
      for (let i = 1; i <= end; i++) {
        ctx.beginPath();
        ctx.moveTo(MX(pts[i - 1].x), MY(pts[i - 1].y));
        ctx.lineTo(MX(pts[i].x), MY(pts[i].y));
        ctx.strokeStyle = pts[i].retro ? CRETRO(0.85) : CBLUE(0.85);
        ctx.lineWidth = 1.7; ctx.stroke();
      }

      if (end > 0) {
        const cp = pts[end];
        ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 5.5, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 10, 0, TAU);
        ctx.strokeStyle = p.color + '28'; ctx.lineWidth = 1.5; ctx.stroke();
        const dayEl = document.getElementById('pl-day');
        const elongEl = document.getElementById('pl-elong');
        const pctEl = document.getElementById('pl-pct');
        const retroEl = document.getElementById('pl-retro');
        if (dayEl) dayEl.textContent = Math.round(cp.day).toLocaleString('es-ES');
        if (elongEl) elongEl.textContent = cp.elong.toFixed(1) + '°';
        if (pctEl) pctEl.textContent = Math.round(100 * end / (pts.length - 1)) + '%';
        if (retroEl) { retroEl.textContent = cp.retro ? 'Sí' : 'No'; retroEl.style.color = cp.retro ? '#e05555' : ''; }
      }

      const lblSize = isMobile ? '7px' : '10px';
      ctx.fillStyle = CLBL();
      ctx.font = `${lblSize} JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('← O   ASCENSIÓN RECTA   E →', W / 2, H - 5);
      ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('DECLINACIÓN δ', 0, 0); ctx.restore();
      ctx.fillStyle = CTTL();
      ctx.font = `500 ${lblSize} JetBrains Mono,monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`ANALEMA DE ${p.name.toUpperCase()} · GEOCÉNTRICO`, xm, isMobile ? 14 : 19);

      animationId = requestAnimationFrame(draw);
    }

    const planetSection = document.getElementById('planetas');
    const planetObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !planetState.started) {
          planetState.started = true; planetState.playing = true;
          const btn = document.getElementById('pl-play');
          if (btn) { btn.textContent = 'Pausar'; btn.className = 'on'; }
          animationId = requestAnimationFrame(draw);
          planetObs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    if (planetSection) planetObs.observe(planetSection);

    const spdSlider = document.getElementById('pl-spd');
    if (spdSlider) spdSlider.addEventListener('input', function () {
      const lbl = document.getElementById('pl-spd-lbl');
      if (lbl) lbl.textContent = this.value + '×';
    });

    const playBtn = document.getElementById('pl-play');
    if (playBtn) playBtn.addEventListener('click', () => {
      if (!planetState.started) { planetState.started = true; requestAnimationFrame(draw); }
      planetState.playing = !planetState.playing;
      updatePlayBtn(playBtn, getPlanetPoints(selectedPlanet));
    });

    const resetBtn = document.getElementById('pl-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      planetState.day = 0; planetState.playing = true;
      if (!planetState.started) { planetState.started = true; requestAnimationFrame(draw); }
      updatePlayBtn(playBtn, getPlanetPoints(selectedPlanet));
    });

    const completeBtn = document.getElementById('pl-complete');
    if (completeBtn) completeBtn.addEventListener('click', () => {
      const pts = getPlanetPoints(selectedPlanet);
      planetState.day = pts.length - 1; planetState.playing = false;
      if (!planetState.started) { planetState.started = true; requestAnimationFrame(draw); }
      updatePlayBtn(playBtn, pts);
    });
  })();

  // =========================================================================
  // 6. Venus — Pentagrama (ciclo de 8 años)
  // =========================================================================
  (function () {
    const cv = document.getElementById('venus-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let animationId = null;
    let lastFrame = 0;
    const TOTAL_DAYS = Math.round(8 * 365.25); // 2922 días
    const venusState = { day: 0, playing: false, started: false };

    function setSize() {
      const w = Math.min(540, window.innerWidth - 32);
      cv.width = w; cv.height = w;
    }
    setSize();
    let venResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(venResizeTimer);
      venResizeTimer = setTimeout(() => { setSize(); precompute(); }, 200);
    });

    // Precalcula las posiciones diarias de Venus (elongación + longitud eclíptica geocéntrica)
    let vPts = [];
    let maxElongs = [];

    function precompute() {
      vPts = [];
      for (let d = 0; d <= TOTAL_DAYS; d++) {
        const pe = orbPos(1, ECC0, 365.25, d, 0);
        const pv = orbPos(0.723, 0.0067, 224.701, d, 3.176);
        const dx = pv.x - pe.x, dy = pv.y - pe.y;
        const lon = Math.atan2(dy, dx); // longitud eclíptica geocéntrica de Venus
        const earthToSun = { x: -pe.x, y: -pe.y };
        const earthToPlanet = { x: dx, y: dy };
        const dot = earthToSun.x * earthToPlanet.x + earthToSun.y * earthToPlanet.y;
        const mag1 = Math.hypot(earthToSun.x, earthToSun.y);
        const mag2 = Math.hypot(earthToPlanet.x, earthToPlanet.y);
        const elong = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180 / Math.PI;
        const cross = earthToSun.x * earthToPlanet.y - earthToSun.y * earthToPlanet.x;
        const isEast = cross > 0;
        vPts.push({ day: d, lon, elong, isEast });
      }

      // Detecta máximas elongaciones (máximos locales con elongación > 20°)
      maxElongs = [];
      for (let i = 1; i < vPts.length - 1; i++) {
        if (vPts[i].elong > vPts[i - 1].elong &&
          vPts[i].elong > vPts[i + 1].elong &&
          vPts[i].elong > 20) {
          maxElongs.push(vPts[i]);
        }
      }
    }

    precompute();

    // Convierte un punto (lon, elong) a coordenadas canvas polares
    // Radio = elongación normalizada; ángulo = longitud eclíptica geocéntrica
    function toCanvas(lon, elong, cx, cy, R, maxElong) {
      const r = (elong / maxElong) * R;
      return {
        px: cx + r * Math.cos(lon - Math.PI / 2),
        py: cy + r * Math.sin(lon - Math.PI / 2)
      };
    }

    function updatePlayBtn(btn) {
      if (!btn) return;
      const done = venusState.day >= TOTAL_DAYS;
      if (done) { btn.textContent = 'Reanudar'; btn.className = ''; btn.classList.add('ended'); }
      else if (venusState.playing) { btn.textContent = 'Pausar'; btn.className = 'on'; }
      else { btn.textContent = 'Reanudar'; btn.className = ''; }
    }

    function draw(ts) {
      if (ts - lastFrame < FRAME_TIME) { animationId = requestAnimationFrame(draw); return; }
      lastFrame = ts;

      const W = cv.width, H = cv.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.42;
      const MAX_ELONG = 48;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = CBG(); ctx.fillRect(0, 0, W, H);

      // Avance de animación
      const playBtn = document.getElementById('ven-play');
      if (venusState.playing && venusState.day < TOTAL_DAYS) {
        const spd = parseInt(document.getElementById('ven-spd')?.value || 30);
        venusState.day = Math.min(venusState.day + spd * 0.15, TOTAL_DAYS);
        if (venusState.day >= TOTAL_DAYS) {
          venusState.playing = false;
          updatePlayBtn(playBtn);
        }
      }
      const endDay = Math.min(Math.round(venusState.day), TOTAL_DAYS);

      // Círculos de referencia de elongación
      [12, 24, 36, 47].forEach(deg => {
        const r = (deg / MAX_ELONG) * R;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = CGRID(); ctx.lineWidth = 0.5; ctx.stroke();
        ctx.fillStyle = CLBL();
        ctx.font = `${isMobile ? '6px' : '7px'} JetBrains Mono,monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`${deg}°`, cx + r + 3, cy + 3);
      });

      // Líneas radiales de referencia (cada 30°)
      for (let a = 0; a < 12; a++) {
        const angle = a * Math.PI / 6 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * R * 0.97, cy + Math.sin(angle) * R * 0.97);
        ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
        ctx.strokeStyle = CGRID(); ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Sol en el centro
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fillStyle = 'rgba(240,192,64,0.15)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = '#f0c040'; ctx.fill();

      // Estela diaria (paso adaptativo según dispositivo)
      const step = isMobile || hasLowMemory ? 3 : 1;
      for (let i = 0; i <= endDay; i += step) {
        const q = vPts[i];
        const { px, py } = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
        ctx.beginPath(); ctx.arc(px, py, 0.9, 0, TAU);
        ctx.fillStyle = q.isEast ? CWARM(0.35) : CBLUE(0.28); ctx.fill();
      }

      // Pentagram: líneas entre máximas elongaciones visibles
      const visMaxElongs = maxElongs.filter(q => q.day <= endDay);
      if (visMaxElongs.length >= 2) {
        ctx.beginPath();
        visMaxElongs.forEach((q, i) => {
          const { px, py } = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        if (visMaxElongs.length === maxElongs.length) ctx.closePath();
        ctx.strokeStyle = CWARM(0.55); ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Puntos de máxima elongación (vértices del pentagrama)
      visMaxElongs.forEach(q => {
        const { px, py } = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
        ctx.beginPath(); ctx.arc(px, py, 5.5, 0, TAU);
        ctx.fillStyle = q.isEast ? CWARM(1) : CBLUE(1); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      });

      // Punto actual de Venus
      if (endDay > 0 && endDay < vPts.length) {
        const cp = vPts[endDay];
        const { px, py } = toCanvas(cp.lon, cp.elong, cx, cy, R, MAX_ELONG);
        ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fillStyle = CWARM(0.12); ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = CDOT(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();

        // Actualiza estadísticas
        const dayEl = document.getElementById('ven-day');
        const yrEl = document.getElementById('ven-yr');
        const elongEl = document.getElementById('ven-elong');
        const cycEl = document.getElementById('ven-cyc');
        if (dayEl) dayEl.textContent = endDay;
        if (yrEl) yrEl.textContent = (endDay / 365.25).toFixed(2);
        if (elongEl) elongEl.textContent = cp.elong.toFixed(1) + '°';
        if (cycEl) cycEl.textContent = Math.round(100 * endDay / TOTAL_DAYS) + '%';
      }

      // Título
      ctx.fillStyle = CTTL();
      ctx.font = `500 ${isMobile ? '7px' : '10px'} JetBrains Mono,monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('PENTAGRAMA DE VENUS · 8 AÑOS', isMobile ? 8 : 14, isMobile ? 14 : 19);

      animationId = requestAnimationFrame(draw);
    }

    // Controles
    const spdSlider = document.getElementById('ven-spd');
    if (spdSlider) spdSlider.addEventListener('input', function () {
      const lbl = document.getElementById('ven-spd-lbl');
      if (lbl) lbl.textContent = this.value + '×';
    });

    const playBtn = document.getElementById('ven-play');
    if (playBtn) playBtn.addEventListener('click', () => {
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      venusState.playing = !venusState.playing;
      updatePlayBtn(playBtn);
    });

    const resetBtn = document.getElementById('ven-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      venusState.day = 0; venusState.playing = true;
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(playBtn);
    });

    const completeBtn = document.getElementById('ven-complete');
    if (completeBtn) completeBtn.addEventListener('click', () => {
      venusState.day = TOTAL_DAYS; venusState.playing = false;
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(playBtn);
    });

    // Lazy start
    const venusSection = document.getElementById('venus');
    const venusObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !venusState.started) {
          venusState.started = true; venusState.playing = true;
          const btn = document.getElementById('ven-play');
          if (btn) { btn.textContent = 'Pausar'; btn.className = 'on'; }
          animationId = requestAnimationFrame(draw);
          venusObs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    if (venusSection) venusObs.observe(venusSection);
  })();

  // =========================================================================
  // 7. Visibility API — pausa todos los canvas cuando la pestaña está oculta
  // =========================================================================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (solarState.started) solarState.playing = false;
      if (planetState.started) planetState.playing = false;
    }
  });

  // =========================================================================
  // 8. Fade-in al hacer scroll (elementos con clase .fi)
  // =========================================================================
  const fadeObs = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('v'); }),
    { threshold: 0.02 }
  );
  document.querySelectorAll('.fi').forEach(el => fadeObs.observe(el));

  // =========================================================================
  // 9. Menú de navegación móvil
  // =========================================================================
  (function () {
    const links = document.querySelector('.nav-links');
    const toggle = document.getElementById('nav-toggle');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? '✕' : '☰';
    });
    links.querySelectorAll('li a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '☰';
    }));
  })();

}());
