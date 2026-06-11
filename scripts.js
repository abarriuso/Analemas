(function () {
  'use strict';

  // =========================================================================
  // 0. Constantes globales, utilidades y detección de dispositivo
  // =========================================================================
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // Parámetros orbitales terrestres J2000.0 (Standish 1992, JPL/USNO)
  const EPS0 = 23.4392911 * DEG;    // oblicuidad del eje terrestre (rad)
  const ECC0 = 0.016708634;          // excentricidad orbital terrestre
  const OMEGA_EARTH = 102.9372 * DEG;  // longitud heliocéntrica del perihelio terrestre ϖ⊕
  const M0_EARTH = 357.5293 * DEG;     // anomalía media terrestre en J2000.0 (1.5 ene 2000)

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

  // Posición heliocéntrica en el sistema eclíptico (+x hacia el equinoccio vernal).
  //   a        semieje mayor (UA)
  //   e        excentricidad
  //   T        período sidéreo (días)
  //   M0       anomalía media en t = 0 (J2000.0)
  //   t        tiempo desde J2000.0 (días)
  //   lonPeri  longitud heliocéntrica del perihelio ϖ (rad)
  // Devuelve {x, y, M, nu, L} en coordenadas eclípticas heliocéntricas reales.
  function orbPos(a, e, T, M0, t, lonPeri) {
    let M = (M0 + TAU * t / T) % TAU;
    if (M < 0) M += TAU;
    const E = keplerE(M, e);
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
    const L = nu + lonPeri;
    return { x: r * Math.cos(L), y: r * Math.sin(L), M, nu, L };
  }

  // Posición heliocéntrica 3D con inclinación: rotación estándar del plano
  // orbital a la eclíptica con i (inclinación) y Ω (longitud del nodo
  // ascendente), Meeus 1998, cap. 33. el = {a, e, T, M0, lonPeri, i, O}.
  function orbPosInc(el, t) {
    let M = (el.M0 + TAU * t / el.T) % TAU;
    if (M < 0) M += TAU;
    const E = keplerE(M, el.e);
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + el.e) * Math.sin(E / 2),
      Math.sqrt(1 - el.e) * Math.cos(E / 2)
    );
    const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(nu));
    const u = (el.lonPeri - el.O) + nu; // argumento de la latitud ω + ν
    const cu = Math.cos(u), su = Math.sin(u);
    const cO = Math.cos(el.O), sO = Math.sin(el.O), ci = Math.cos(el.i);
    return {
      x: r * (cO * cu - sO * su * ci),
      y: r * (sO * cu + cO * su * ci),
      z: r * su * Math.sin(el.i)
    };
  }

  // Genera los puntos del analema solar (2001 pasos = un año completo)
  // E(t) = E_exc(t) + E_obl(t), con E = tiempo solar verdadero − tiempo medio
  // (Meeus 1998, cap. 28; Hughes, Yallop & Hohenkerk 1989):
  //   E_exc = −C (ecuación del centro, O(e³))
  //   E_obl: serie en y = tan²(ε/2): y·sin2λ − (y²/2)·sin4λ + (y³/3)·sin6λ
  // Validación reproducible frente al Astronomical Almanac: node validacion.mjs
  function generateSolarAnalemaPoints(epsRad = EPS0, ecc = ECC0) {
    const pts = [];
    const steps = 2000;
    const T = 365.25;
    const t2 = Math.tan(epsRad / 2);
    const t4 = t2 * t2 * t2 * t2;
    const t6 = t4 * t2 * t2;
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * T;
      const ep = orbPos(1, ecc, T, M0_EARTH, d, OMEGA_EARTH);
      const M = ep.M;
      // Longitud eclíptica geocéntrica del Sol = dirección Tierra → Sol
      let lam = Math.atan2(-ep.y, -ep.x);
      if (lam < 0) lam += TAU;
      const exc =
        -(2 * ecc - ecc * ecc * ecc / 4) * Math.sin(M) -
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

  // Min/max sobre arrays grandes sin spread (evita stack overflow y alocación temporal)
  function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
  function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }

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

    let heroInView = true;
    const heroObs = new IntersectionObserver(es => {
      es.forEach(e => { heroInView = e.isIntersecting; });
    }, { threshold: 0 });
    heroObs.observe(cv);

    function draw(ts) {
      animationId = requestAnimationFrame(draw);
      if (!heroInView) return;
      if (baseWidth === 0 || baseHeight === 0) return;
      if (ts - lastTimestamp < FRAME_TIME) return;
      lastTimestamp = ts;
      if (currentPoints.length === 0) return;

      if (!prefersReducedMotion) {
        animProgress += ANIM_SPEED;
        if (animProgress > 1) animProgress = 0;
      } else if (animProgress === 0) {
        // Mostrar la curva completa con el indicador en el perihelio
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
      ctx.font = `${isMobile ? 7 : 9}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText('J2000.0 · Parámetros dinámicos', baseWidth * 0.47, -baseHeight * 0.47 + 14);
      ctx.restore();
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
    const dpr = window.devicePixelRatio || 1;
    let animationId = null;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;

    function setSize() {
      const w = Math.min(560, window.innerWidth - 32);
      const h = Math.round(w * 520 / 560);
      logicW = w; logicH = h;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    setSize();
    let solarResizeTimer;
    window.addEventListener('resize', () => { clearTimeout(solarResizeTimer); solarResizeTimer = setTimeout(setSize, 200); });

    // Precomputa los rangos del analema solar (solo una vez)
    const sXs = SOLAR_PTS.map(p => p.x), sYs = SOLAR_PTS.map(p => p.y);
    const sXmin = arrayMin(sXs), sXmax = arrayMax(sXs);
    const sYmin = arrayMin(sYs), sYmax = arrayMax(sYs);
    const sXr = sXmax - sXmin, sYr = sYmax - sYmin;
    const X0 = sXmin - sXr * 0.18, X1 = sXmax + sXr * 0.18;
    const Y0 = sYmin - sYr * 0.14, Y1 = sYmax + sYr * 0.14;

    const MONTHS = [['ENE', 0], ['FEB', 31], ['MAR', 59], ['ABR', 90], ['MAY', 120],
      ['JUN', 151], ['JUL', 181], ['AGO', 212], ['SEP', 243], ['OCT', 273], ['NOV', 304], ['DIC', 334]];

    // Refs DOM cacheadas (A6)
    const ref = {
      spd:      document.getElementById('solar-spd'),
      spdLbl:   document.getElementById('solar-spd-lbl'),
      play:     document.getElementById('solar-play'),
      reset:    document.getElementById('solar-reset'),
      complete: document.getElementById('solar-complete'),
      day:      document.getElementById('sol-day'),
      eq:       document.getElementById('sol-eq'),
      decl:     document.getElementById('sol-decl'),
      pct:      document.getElementById('sol-pct')
    };
    let inView = false;

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
      animationId = requestAnimationFrame(draw);
      if (!inView) return;
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;
      const W = logicW, H = logicH;
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
      if (solarState.playing && solarState.day < SOLAR_PTS.length - 1) {
        const s = parseInt(ref.spd.value);
        solarState.day += s * 0.12;
        if (solarState.day >= SOLAR_PTS.length - 1) {
          solarState.day = SOLAR_PTS.length - 1;
          solarState.playing = false;
          updatePlayBtn(ref.play);
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
        if (ref.day)  ref.day.textContent  = Math.floor(cp.day + 1);
        if (ref.eq)   ref.eq.textContent   = cp.em.toFixed(1) + ' min';
        if (ref.decl) ref.decl.textContent = cp.dd.toFixed(2) + '°';
        if (ref.pct)  ref.pct.textContent  = Math.round(100 * end / (SOLAR_PTS.length - 1)) + '%';
      }

      // Etiquetas de ejes
      ctx.fillStyle = CLBL();
      ctx.font = `${lblSize} JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      // E > 0 (Sol adelantado): el Sol verdadero está al Oeste del meridiano
      // al mediodía medio, visto desde el hemisferio norte mirando al sur.
      ctx.fillText('← E   ECUACIÓN DEL TIEMPO E(t)   O →', W / 2, H - 5);
      ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('DECLINACIÓN δ', 0, 0); ctx.restore();
      ctx.fillStyle = CTTL();
      ctx.font = '500 10px JetBrains Mono,monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ANALEMA SOLAR TERRESTRE · J2000.0', xm, isMobile ? 14 : 20);
    }

    // Observer: pausa el trabajo pesado cuando el canvas sale del viewport (A5).
    // Si prefersReducedMotion, no auto-iniciar la animación: mostrar la curva completa.
    const solarSection = document.getElementById('solar');
    const solarObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView && !solarState.started) {
          solarState.started = true;
          if (prefersReducedMotion) {
            solarState.day = SOLAR_PTS.length - 1;
            solarState.playing = false;
            updatePlayBtn(ref.play);
          } else {
            solarState.playing = true;
            if (ref.play) { ref.play.textContent = 'Pausar'; ref.play.className = 'on'; }
          }
          animationId = requestAnimationFrame(draw);
        }
      });
    }, { threshold: 0.25 });
    if (solarSection) solarObs.observe(solarSection);

    if (ref.spd) ref.spd.addEventListener('input', function () {
      if (ref.spdLbl) ref.spdLbl.textContent = this.value + '×';
    });

    if (ref.play) ref.play.addEventListener('click', () => {
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      solarState.playing = !solarState.playing;
      updatePlayBtn(ref.play);
    });

    if (ref.reset) ref.reset.addEventListener('click', () => {
      solarState.day = 0; solarState.playing = true;
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play);
    });

    if (ref.complete) ref.complete.addEventListener('click', () => {
      solarState.day = SOLAR_PTS.length - 1; solarState.playing = false;
      if (!solarState.started) { solarState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play);
    });
  })();

  // =========================================================================
  // 5. Planetas — analemas geocéntricos
  // =========================================================================
  // Elementos orbitales J2000.0 (Standish 1992, Mean Elements EMB / JPL).
  //   lonPeri = ϖ longitud heliocéntrica del perihelio (rad)
  //   M0      = anomalía media en J2000.0 (rad) = L0 − ϖ
  const planetsData = [
    { id: 'mercury', name: 'Mercurio', color: '#909098', a: 0.38710, e: 0.20563, T: 87.969,   syn: 115.9,  lonPeri: 77.4561  * DEG, M0: 174.7948 * DEG, synStr: '115.9 d',  rDur: '~22 d',   eccS: '0.2056', shape: 'Lazo compacto',      shapeD: 'Elongación máx. 17.9°–27.8°: el rango varía por la alta excentricidad. Nunca se aleja más de ~28° del Sol (Meeus, 1998).' },
    { id: 'venus',   name: 'Venus',    color: '#e8a030', a: 0.72333, e: 0.00677, T: 224.701,  syn: 583.92, lonPeri: 131.5637 * DEG, M0:  50.4161 * DEG, synStr: '583.9 d',  rDur: '~40 d',   eccS: '0.0067', shape: 'Pentagrama (8 años)', shapeD: 'Cinco conjunciones inferiores en ~8 años dibujan un pentagrama aproximado por la casi-resonancia 8:13:5; el patrón deriva ~2.3° por ciclo (Aveni, 2001).' },
    { id: 'mars',    name: 'Marte',    color: '#c85830', a: 1.52366, e: 0.09339, T: 686.980,  syn: 779.94, lonPeri: 336.0408 * DEG, M0:  19.4125 * DEG, synStr: '779.9 d',  rDur: '~72 d',   eccS: '0.0934', shape: 'Bucle variable',      shapeD: 'Retrogradaciones muy variables según oposición perihélica o afélica. La excentricidad moderada genera bucles irregulares (Meeus, 1998).' },
    { id: 'jupiter', name: 'Júpiter',  color: '#c0a060', a: 5.20336, e: 0.04839, T: 4332.59,  syn: 398.88, lonPeri:  14.7283 * DEG, M0:  19.6761 * DEG, synStr: '398.9 d',  rDur: '~121 d',  eccS: '0.0484', shape: 'Bucles uniformes',    shapeD: '~1 retrogradación/año. Bucles casi idénticos por la baja excentricidad. ~30°/año en el zodíaco (P ≈ 12 años).' },
    { id: 'saturn',  name: 'Saturno',  color: '#a88848', a: 9.53707, e: 0.05415, T: 10759.22, syn: 378.09, lonPeri:  92.5984 * DEG, M0: 317.3460 * DEG, synStr: '378.1 d',  rDur: '~138 d',  eccS: '0.0542', shape: 'Bucles regulares',    shapeD: 'P ≈ 29.5 años. Retrogradaciones anuales (~138 días) predecibles y casi idénticas.' },
    { id: 'uranus',  name: 'Urano',    color: '#40c0a8', a: 19.19126, e: 0.04717, T: 30685.4, syn: 369.66, lonPeri: 170.9543 * DEG, M0: 142.2778 * DEG, synStr: '369.7 d',  rDur: '~151 d',  eccS: '0.0472', shape: 'Bucles densos',      shapeD: 'Mag +5.7. 84 años para recorrer el zodíaco. Su rotación es retrógrada (ε = 97.77°), lo que haría extremo su analema solar local.' },
    { id: 'neptune', name: 'Neptuno',  color: '#2858b8', a: 30.06896, e: 0.00859, T: 60189,   syn: 367.49, lonPeri:  44.9648 * DEG, M0: 259.9152 * DEG, synStr: '367.5 d',  rDur: '~158 d',  eccS: '0.0086', shape: 'Bucles estáticos',   shapeD: 'Mag +7.8. 165 años para recorrer el zodíaco. Movimiento propio ~2°/año. Excentricidad mínima.' }
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
    const Te = 365.25;
    const steps = isMobile ? 400 : 600;
    const totalDays = Math.min(p.syn * 2, 1800);
    const dt = totalDays / steps;
    const pts = [];
    let prevLon = null, prevDelta = null;

    for (let i = 0; i <= steps; i++) {
      const d = i * dt;
      const pe = orbPos(1, ECC0, Te, M0_EARTH, d, OMEGA_EARTH);
      const pp = orbPos(p.a, p.e, p.T, p.M0, d, p.lonPeri);
      const dx = pp.x - pe.x, dy = pp.y - pe.y;
      // Longitud y declinación eclípticas geocéntricas reales del planeta (β = 0)
      const lon = Math.atan2(dy, dx);
      const decl = Math.asin(Math.sin(EPS0) * Math.sin(lon));
      const ra = Math.atan2(Math.cos(EPS0) * Math.sin(lon), Math.cos(lon));
      // Posición eclíptica geocéntrica del Sol = −r_Tierra
      const sunLon = Math.atan2(-pe.y, -pe.x);
      const sunRA = Math.atan2(Math.cos(EPS0) * Math.sin(sunLon), Math.cos(sunLon));
      let dRA = ra - sunRA;
      if (dRA > Math.PI) dRA -= TAU;
      if (dRA < -Math.PI) dRA += TAU;

      // Retrogradación robusta: δlon < 0 dos frames seguidos
      let retro = false;
      if (prevLon !== null) {
        let delta = lon - prevLon;
        if (delta > Math.PI) delta -= TAU;
        if (delta < -Math.PI) delta += TAU;
        if (prevDelta !== null) retro = (delta < 0 && prevDelta < 0);
        prevDelta = delta;
      }
      prevLon = lon;

      const earthToSunX = -pe.x, earthToSunY = -pe.y;
      const dot = earthToSunX * dx + earthToSunY * dy;
      const mag1 = Math.hypot(earthToSunX, earthToSunY);
      const mag2 = Math.hypot(dx, dy);
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

  function selPlan(id) {
    selectedPlanet = planetsData.find(p => p.id === id);
    document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('on'));
    const activeBtn = document.getElementById('pb-' + id);
    if (activeBtn) activeBtn.classList.add('on');
    planetState.day = 0; planetState.playing = true;
    const playBtn = document.getElementById('pl-play');
    if (playBtn) { playBtn.textContent = 'Pausar'; playBtn.className = 'on'; playBtn.classList.remove('ended'); }
    updatePlanetInfo(selectedPlanet);
  }

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
    const dpr = window.devicePixelRatio || 1;
    let animationId = null;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;

    function setSize() {
      const w = Math.min(620, window.innerWidth - 32);
      const h = Math.round(w * 480 / 620);
      logicW = w; logicH = h;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    setSize();
    let plResizeTimer;
    window.addEventListener('resize', () => { clearTimeout(plResizeTimer); plResizeTimer = setTimeout(setSize, 200); });

    // Refs DOM cacheadas (A6)
    const ref = {
      spd:      document.getElementById('pl-spd'),
      spdLbl:   document.getElementById('pl-spd-lbl'),
      play:     document.getElementById('pl-play'),
      reset:    document.getElementById('pl-reset'),
      complete: document.getElementById('pl-complete'),
      day:      document.getElementById('pl-day'),
      elong:    document.getElementById('pl-elong'),
      pct:      document.getElementById('pl-pct'),
      retro:    document.getElementById('pl-retro')
    };
    let inView = false;

    function updatePlayBtn(btn, pts) {
      if (!btn) return;
      const done = planetState.day >= (pts ? pts.length - 1 : 0);
      if (done) { btn.textContent = 'Reanudar'; btn.className = ''; btn.classList.add('ended'); }
      else if (planetState.playing) { btn.textContent = 'Pausar'; btn.className = 'on'; }
      else { btn.textContent = 'Reanudar'; btn.className = ''; }
    }

    function draw(ts) {
      animationId = requestAnimationFrame(draw);
      if (!inView) return;
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;
      const p = selectedPlanet;
      const pts = getPlanetPoints(p);
      const W = logicW, H = logicH;
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
      if (planetState.playing && planetState.day < pts.length - 1) {
        const s = parseInt(ref.spd.value);
        planetState.day += s * 0.11;
        if (planetState.day >= pts.length - 1) {
          planetState.day = pts.length - 1;
          planetState.playing = false;
          updatePlayBtn(ref.play, pts);
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
        if (ref.day)   ref.day.textContent   = Math.round(cp.day).toLocaleString('es-ES');
        if (ref.elong) ref.elong.textContent = cp.elong.toFixed(1) + '°';
        if (ref.pct)   ref.pct.textContent   = Math.round(100 * end / (pts.length - 1)) + '%';
        if (ref.retro) { ref.retro.textContent = cp.retro ? 'Sí' : 'No'; ref.retro.style.color = cp.retro ? '#e05555' : ''; }
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
    }

    const planetSection = document.getElementById('planetas');
    const planetObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView && !planetState.started) {
          planetState.started = true;
          if (prefersReducedMotion) {
            const pts = getPlanetPoints(selectedPlanet);
            planetState.day = pts.length - 1;
            planetState.playing = false;
            updatePlayBtn(ref.play, pts);
          } else {
            planetState.playing = true;
            if (ref.play) { ref.play.textContent = 'Pausar'; ref.play.className = 'on'; }
          }
          animationId = requestAnimationFrame(draw);
        }
      });
    }, { threshold: 0.25 });
    if (planetSection) planetObs.observe(planetSection);

    if (ref.spd) ref.spd.addEventListener('input', function () {
      if (ref.spdLbl) ref.spdLbl.textContent = this.value + '×';
    });

    if (ref.play) ref.play.addEventListener('click', () => {
      if (!planetState.started) { planetState.started = true; animationId = requestAnimationFrame(draw); }
      planetState.playing = !planetState.playing;
      updatePlayBtn(ref.play, getPlanetPoints(selectedPlanet));
    });

    if (ref.reset) ref.reset.addEventListener('click', () => {
      planetState.day = 0; planetState.playing = true;
      if (!planetState.started) { planetState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play, getPlanetPoints(selectedPlanet));
    });

    if (ref.complete) ref.complete.addEventListener('click', () => {
      const pts = getPlanetPoints(selectedPlanet);
      planetState.day = pts.length - 1; planetState.playing = false;
      if (!planetState.started) { planetState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play, pts);
    });
  })();

  // =========================================================================
  // 6. Venus — Pentagrama (ciclo de 8 años)
  // =========================================================================
  (function () {
    const cv = document.getElementById('venus-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let animationId = null;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;
    const TOTAL_DAYS = Math.round(8 * 365.25); // 2922 días
    const venusState = { day: 0, playing: false, started: false };

    function setSize() {
      const w = Math.min(540, window.innerWidth - 32);
      logicW = w; logicH = w;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    setSize();
    let venResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(venResizeTimer);
      venResizeTimer = setTimeout(() => { setSize(); precompute(); }, 200);
    });

    // Precalcula las posiciones diarias de Venus en sistema eclíptico geocéntrico
    // 3D. Elementos J2000.0 (Standish et al. 1992): a = 0.72333 UA, e = 0.00677,
    // T = 224.701 d, ϖ = 131.5637°, M0 = 50.4161°, i = 3.39471°, Ω = 76.68069°.
    // Con la inclinación incluida, la elongación mínima en conjunción inferior
    // es 0.2°–8° (el modelo reproduce el tránsito del 8 jun 2004 con 0.18°), de
    // modo que la trayectoria ya no atraviesa artificialmente el disco solar.
    // Se calculan 600 días extra para localizar la 6.ª conjunción inferior y
    // mostrar la deriva del pentagrama (la resonancia 8:13:5 no es exacta).
    let vPts = [];
    let maxElongs = [];   // máximas elongaciones vespertinas/matutinas
    let infConjs = [];    // conjunciones inferiores: vértices del pentagrama
    const EXTRA_DAYS = 600;

    function precompute() {
      vPts = [];
      const V = {
        a: 0.72333, e: 0.00677, T: 224.701, M0: 50.4161 * DEG,
        lonPeri: 131.5637 * DEG, i: 3.39471 * DEG, O: 76.68069 * DEG
      };
      for (let d = 0; d <= TOTAL_DAYS + EXTRA_DAYS; d++) {
        const pe = orbPos(1, ECC0, 365.25, M0_EARTH, d, OMEGA_EARTH);
        const pv = orbPosInc(V, d);
        const dx = pv.x - pe.x, dy = pv.y - pe.y, dz = pv.z; // Tierra en z ≈ 0
        const lon = Math.atan2(dy, dx); // longitud eclíptica geocéntrica de Venus
        const sunX = -pe.x, sunY = -pe.y;
        const dot = sunX * dx + sunY * dy;
        const sunDist = Math.hypot(sunX, sunY);      // distancia Tierra–Sol
        const venDist = Math.hypot(dx, dy, dz);      // distancia Tierra–Venus
        const elong = Math.acos(Math.max(-1, Math.min(1, dot / (sunDist * venDist)))) * 180 / Math.PI;
        const cross = sunX * dy - sunY * dx;
        const isEast = cross > 0;
        const isInferior = venDist < sunDist;        // Venus entre Sol y Tierra
        vPts.push({ day: d, lon, elong, isEast, isInferior });
      }

      // Máximas elongaciones (máximos locales, rango del modelo: 45.4°–47.1°)
      maxElongs = [];
      for (let i = 1; i < vPts.length - 1; i++) {
        if (vPts[i].elong > vPts[i - 1].elong &&
          vPts[i].elong >= vPts[i + 1].elong &&
          vPts[i].elong > 20 && vPts[i].day <= TOTAL_DAYS) {
          maxElongs.push(vPts[i]);
        }
      }
      // Conjunciones inferiores (mínimos locales de elongación con Venus entre
      // Tierra y Sol). Incluye la 6.ª (fuera del ciclo de 8 años) para mostrar
      // el no-cierre del pentagrama: Δλ ≈ −2.25° por ciclo en este modelo.
      infConjs = [];
      for (let i = 1; i < vPts.length - 1; i++) {
        if (vPts[i].isInferior &&
          vPts[i].elong < vPts[i - 1].elong &&
          vPts[i].elong <= vPts[i + 1].elong) {
          infConjs.push(vPts[i]);
        }
      }
    }

    precompute();

    // Refs DOM cacheadas (A6)
    const ref = {
      spd:      document.getElementById('ven-spd'),
      spdLbl:   document.getElementById('ven-spd-lbl'),
      play:     document.getElementById('ven-play'),
      reset:    document.getElementById('ven-reset'),
      complete: document.getElementById('ven-complete'),
      day:      document.getElementById('ven-day'),
      yr:       document.getElementById('ven-yr'),
      elong:    document.getElementById('ven-elong'),
      cyc:      document.getElementById('ven-cyc')
    };
    let inView = false;

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
      animationId = requestAnimationFrame(draw);
      if (!inView) return;
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;

      const W = logicW, H = logicH;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.42;
      const MAX_ELONG = 48;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = CBG(); ctx.fillRect(0, 0, W, H);

      // Avance de animación
      if (venusState.playing && venusState.day < TOTAL_DAYS) {
        const spd = parseInt(ref.spd?.value || 30);
        venusState.day = Math.min(venusState.day + spd * 0.15, TOTAL_DAYS);
        if (venusState.day >= TOTAL_DAYS) {
          venusState.playing = false;
          updatePlayBtn(ref.play);
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

      // Anillo zodiacal (esquema): círculo exterior donde se proyecta la
      // longitud eclíptica geocéntrica de cada conjunción inferior. Separa
      // visualmente el pentagrama (esquemático) del gráfico polar de
      // elongación (físico).
      const RZ = R * 1.06;
      ctx.beginPath(); ctx.arc(cx, cy, RZ, 0, TAU);
      ctx.strokeStyle = CAXIS(); ctx.lineWidth = 0.6; ctx.stroke();
      // Marca del punto Aries (λ = 0°) para orientar el anillo
      ctx.beginPath();
      ctx.moveTo(cx, cy - RZ + 4); ctx.lineTo(cx, cy - RZ - 4);
      ctx.strokeStyle = CAXIS(); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = CLBL();
      ctx.font = `${isMobile ? '6px' : '7px'} JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('λ = 0°', cx + 22, cy - RZ + 13);

      const zx = q => cx + RZ * Math.cos(q.lon - Math.PI / 2);
      const zy = q => cy + RZ * Math.sin(q.lon - Math.PI / 2);

      // Estela diaria continua: radio = elongación, ángulo = λ geocéntrica
      const step = isMobile || hasLowMemory ? 2 : 1;
      let prevPt = null;
      for (let i = 0; i <= endDay; i += step) {
        const q = vPts[i];
        const p = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
        if (prevPt) {
          ctx.beginPath();
          ctx.moveTo(prevPt.px, prevPt.py);
          ctx.lineTo(p.px, p.py);
          ctx.strokeStyle = q.isEast ? CWARM(0.32) : CBLUE(0.26);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        prevPt = p;
      }

      // Pentagrama: cuerdas entre conjunciones inferiores CONSECUTIVAS en el
      // tiempo. Cada conjunción ocurre ~215.5° más adelante en longitud
      // (≡ 144.5° hacia atrás), de modo que el orden cronológico genera por sí
      // solo la estrella {5/2}. La figura emerge durante la animación.
      const visConjs = infConjs.filter(q => q.day <= endDay);
      const starConjs = visConjs.slice(0, 5);
      for (let i = 1; i < starConjs.length; i++) {
        ctx.beginPath();
        ctx.moveTo(zx(starConjs[i - 1]), zy(starConjs[i - 1]));
        ctx.lineTo(zx(starConjs[i]), zy(starConjs[i]));
        ctx.strokeStyle = CWARM(0.6); ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Cierre imperfecto: al completar el ciclo se traza la cuerda real
      // 5.ª → 6.ª conjunción. La 6.ª NO coincide con la 1.ª: queda ~2.25°
      // por detrás (la resonancia 8:13:5 no es exacta).
      if (endDay >= TOTAL_DAYS && infConjs.length >= 6 && starConjs.length === 5) {
        const c6 = infConjs[5], c1 = infConjs[0];
        ctx.beginPath();
        ctx.moveTo(zx(starConjs[4]), zy(starConjs[4]));
        ctx.lineTo(zx(c6), zy(c6));
        ctx.strokeStyle = CWARM(0.6); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(zx(c6), zy(c6), 4.5, 0, TAU);
        ctx.strokeStyle = CRETRO(0.9); ctx.lineWidth = 1.4; ctx.stroke();
        let drift = (c6.lon - c1.lon) * 180 / Math.PI;
        while (drift > 180) drift -= 360;
        while (drift < -180) drift += 360;
        ctx.fillStyle = CRETRO(0.9);
        ctx.font = `${isMobile ? '6px' : '8px'} JetBrains Mono,monospace`;
        ctx.textAlign = zx(c6) > cx ? 'right' : 'left';
        ctx.fillText(`6.ª conj.: Δλ ≈ ${drift.toFixed(1)}° — no cierra`,
          zx(c6) + (zx(c6) > cx ? -9 : 9), zy(c6) + 14);
      }

      // Vértices del pentagrama (las 5 conjunciones inferiores del ciclo)
      starConjs.forEach(q => {
        ctx.beginPath(); ctx.arc(zx(q), zy(q), 5, 0, TAU);
        ctx.fillStyle = '#e8a030'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        // Conector sutil con la posición física real (elongación mínima)
        const p = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
        ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(zx(q), zy(q)); ctx.lineTo(p.px, p.py);
        ctx.strokeStyle = CWARM(0.18); ctx.lineWidth = 0.7; ctx.stroke();
        ctx.setLineDash([]);
      });

      // Máximas elongaciones (puntos decorativos: este vespertino / oeste matutino)
      const visMaxElongs = maxElongs.filter(q => q.day <= endDay);
      visMaxElongs.forEach(q => {
        const { px, py } = toCanvas(q.lon, q.elong, cx, cy, R, MAX_ELONG);
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, TAU);
        ctx.fillStyle = q.isEast ? CWARM(0.85) : CBLUE(0.7); ctx.fill();
      });

      // Punto actual de Venus
      if (endDay > 0 && endDay < vPts.length) {
        const cp = vPts[endDay];
        const { px, py } = toCanvas(cp.lon, cp.elong, cx, cy, R, MAX_ELONG);
        ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fillStyle = CWARM(0.12); ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = CDOT(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();

        if (ref.day)   ref.day.textContent   = endDay;
        if (ref.yr)    ref.yr.textContent    = (endDay / 365.25).toFixed(2);
        if (ref.elong) ref.elong.textContent = cp.elong.toFixed(1) + '°';
        if (ref.cyc)   ref.cyc.textContent   = Math.round(100 * endDay / TOTAL_DAYS) + '%';
      }

      // Título
      ctx.fillStyle = CTTL();
      ctx.font = `500 ${isMobile ? '7px' : '10px'} JetBrains Mono,monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(isMobile ? 'PENTAGRAMA DE VENUS · 8 AÑOS'
        : 'PENTAGRAMA DE VENUS · 8 AÑOS · MODELO 3D (i = 3.39°)', isMobile ? 8 : 14, isMobile ? 14 : 19);
    }

    // Controles
    if (ref.spd) ref.spd.addEventListener('input', function () {
      if (ref.spdLbl) ref.spdLbl.textContent = this.value + '×';
    });

    if (ref.play) ref.play.addEventListener('click', () => {
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      venusState.playing = !venusState.playing;
      updatePlayBtn(ref.play);
    });

    if (ref.reset) ref.reset.addEventListener('click', () => {
      venusState.day = 0; venusState.playing = true;
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play);
    });

    if (ref.complete) ref.complete.addEventListener('click', () => {
      venusState.day = TOTAL_DAYS; venusState.playing = false;
      if (!venusState.started) { venusState.started = true; animationId = requestAnimationFrame(draw); }
      updatePlayBtn(ref.play);
    });

    // Lazy start + pausa fuera del viewport + reduced motion
    const venusSection = document.getElementById('venus');
    const venusObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView && !venusState.started) {
          venusState.started = true;
          if (prefersReducedMotion) {
            venusState.day = TOTAL_DAYS;
            venusState.playing = false;
            updatePlayBtn(ref.play);
          } else {
            venusState.playing = true;
            if (ref.play) { ref.play.textContent = 'Pausar'; ref.play.className = 'on'; }
          }
          animationId = requestAnimationFrame(draw);
        }
      });
    }, { threshold: 0.25 });
    if (venusSection) venusObs.observe(venusSection);
  })();

  // =========================================================================
  // 7. Visibility API — pausa explícita cuando la pestaña está oculta
  //    (rAF ya pausa solo, pero apagamos el state para que al volver no
  //     dé un salto temporal grande al usuario).
  // =========================================================================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (solarState.started)  solarState.playing  = false;
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
