(function () {
  'use strict';

  if (typeof IntersectionObserver === 'undefined') {
    document.documentElement.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif;color:#fff;background:#1a1a2e;min-height:100vh;display:flex;align-items:center;justify-content:center"><p>Tu navegador no soporta IntersectionObserver. Actualiza a un navegador moderno (Chrome 51+, Firefox 55+, Safari 12.1+).</p></div>';
    return;
  }

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
  const EARTH_T = 365.259636;          // año anomalístico: periodo de propagación de la anomalía media

  // ── Nutación IAU 1980 (serie completa de 106 términos; ERFA nut80.c / SpacePy coeff80) ──
  // Coeficientes en 0.1 mas (milisegundos de arco). Argumentos: l (anomalía media Lunar),
  // lp (anomalía media Solar), F (= L−Ω̄), D (elongación), Om (long. nodo Lunar).
  // dp (Δψ, longitud) = Σ (sp + spt·T)·sin(arg);  de (Δε, oblicuidad) = Σ (ce + cet·T)·cos(arg).
  const ARCSEC2RAD = Math.PI / (180 * 3600);
  const NUT80 = [
    [0,0,0,0,1,-171996.0,-174.2,92025.0,8.9],[0,0,0,0,2,2062.0,0.2,-895.0,0.5],
    [-2,0,2,0,1,46.0,0.0,-24.0,0.0],[2,0,-2,0,0,11.0,0.0,0.0,0.0],[-2,0,2,0,2,-3.0,0.0,1.0,0.0],
    [1,-1,0,-1,0,-3.0,0.0,0.0,0.0],[0,-2,2,-2,1,-2.0,0.0,1.0,0.0],[2,0,-2,0,1,1.0,0.0,0.0,0.0],
    [0,0,2,-2,2,-13187.0,-1.6,5736.0,-3.1],[0,1,0,0,0,1426.0,-3.4,54.0,-0.1],
    [0,1,2,-2,2,-517.0,1.2,224.0,-0.6],[0,-1,2,-2,2,217.0,-0.5,-95.0,0.3],
    [0,0,2,-2,1,129.0,0.1,-70.0,0.0],[2,0,0,-2,0,48.0,0.0,1.0,0.0],[0,0,2,-2,0,-22.0,0.0,0.0,0.0],
    [0,2,0,0,0,17.0,-0.1,0.0,0.0],[0,1,0,0,1,-15.0,0.0,9.0,0.0],[0,2,2,-2,2,-16.0,0.1,7.0,0.0],
    [0,-1,0,0,1,-12.0,0.0,6.0,0.0],[-2,0,0,2,1,-6.0,0.0,3.0,0.0],[0,-1,2,-2,1,-5.0,0.0,3.0,0.0],
    [2,0,0,-2,1,4.0,0.0,-2.0,0.0],[0,1,2,-2,1,4.0,0.0,-2.0,0.0],[1,0,0,-1,0,-4.0,0.0,0.0,0.0],
    [2,1,0,-2,0,1.0,0.0,0.0,0.0],[0,0,-2,2,1,1.0,0.0,0.0,0.0],[0,1,-2,2,0,-1.0,0.0,0.0,0.0],
    [0,1,0,0,2,1.0,0.0,0.0,0.0],[-1,0,0,1,1,1.0,0.0,0.0,0.0],[0,1,2,-2,0,-1.0,0.0,0.0,0.0],
    [0,0,2,0,2,-2274.0,-0.2,977.0,-0.5],[1,0,0,0,0,712.0,0.1,-7.0,0.0],[0,0,2,0,1,-386.0,-0.4,200.0,0.0],
    [1,0,2,0,2,-301.0,0.0,129.0,-0.1],[1,0,0,-2,0,-158.0,0.0,-1.0,0.0],[-1,0,2,0,2,123.0,0.0,-53.0,0.0],
    [0,0,0,2,0,63.0,0.0,-2.0,0.0],[1,0,0,0,1,63.0,0.1,-33.0,0.0],[-1,0,0,0,1,-58.0,-0.1,32.0,0.0],
    [-1,0,2,2,2,-59.0,0.0,26.0,0.0],[1,0,2,0,1,-51.0,0.0,27.0,0.0],[0,0,2,2,2,-38.0,0.0,16.0,0.0],
    [2,0,0,0,0,29.0,0.0,-1.0,0.0],[1,0,2,-2,2,29.0,0.0,-12.0,0.0],[2,0,2,0,2,-31.0,0.0,13.0,0.0],
    [0,0,2,0,0,26.0,0.0,-1.0,0.0],[-1,0,2,0,1,21.0,0.0,-10.0,0.0],[-1,0,0,2,1,16.0,0.0,-8.0,0.0],
    [1,0,0,-2,1,-13.0,0.0,7.0,0.0],[-1,0,2,2,1,-10.0,0.0,5.0,0.0],[1,1,0,-2,0,-7.0,0.0,0.0,0.0],
    [0,1,2,0,2,7.0,0.0,-3.0,0.0],[0,-1,2,0,2,-7.0,0.0,3.0,0.0],[1,0,2,2,2,-8.0,0.0,3.0,0.0],
    [1,0,0,2,0,6.0,0.0,0.0,0.0],[2,0,2,-2,2,6.0,0.0,-3.0,0.0],[0,0,0,2,1,-6.0,0.0,3.0,0.0],
    [0,0,2,2,1,-7.0,0.0,3.0,0.0],[1,0,2,-2,1,6.0,0.0,-3.0,0.0],[0,0,0,-2,1,-5.0,0.0,3.0,0.0],
    [1,-1,0,0,0,5.0,0.0,0.0,0.0],[2,0,2,0,1,-5.0,0.0,3.0,0.0],[0,1,0,-2,0,-4.0,0.0,0.0,0.0],
    [1,0,-2,0,0,4.0,0.0,0.0,0.0],[0,0,0,1,0,-4.0,0.0,0.0,0.0],[1,1,0,0,0,-3.0,0.0,0.0,0.0],
    [1,0,2,0,0,3.0,0.0,0.0,0.0],[1,-1,2,0,2,-3.0,0.0,1.0,0.0],[-1,-1,2,2,2,-3.0,0.0,1.0,0.0],
    [-2,0,0,0,1,-2.0,0.0,1.0,0.0],[3,0,2,0,2,-3.0,0.0,1.0,0.0],[0,-1,2,2,2,-3.0,0.0,1.0,0.0],
    [1,1,2,0,2,2.0,0.0,-1.0,0.0],[-1,0,2,-2,1,-2.0,0.0,1.0,0.0],[2,0,0,0,1,2.0,0.0,-1.0,0.0],
    [1,0,0,0,2,-2.0,0.0,1.0,0.0],[3,0,0,0,0,2.0,0.0,0.0,0.0],[0,0,2,1,2,2.0,0.0,-1.0,0.0],
    [-1,0,0,0,2,1.0,0.0,-1.0,0.0],[1,0,0,-4,0,-1.0,0.0,0.0,0.0],[-2,0,2,2,2,1.0,0.0,-1.0,0.0],
    [-1,0,2,4,2,-2.0,0.0,1.0,0.0],[2,0,0,-4,0,-1.0,0.0,0.0,0.0],[1,1,2,-2,2,1.0,0.0,-1.0,0.0],
    [1,0,2,2,1,-1.0,0.0,1.0,0.0],[-2,0,2,4,2,-1.0,0.0,1.0,0.0],[-1,0,4,0,2,1.0,0.0,0.0,0.0],
    [1,-1,0,-2,0,1.0,0.0,0.0,0.0],[2,0,2,-2,1,1.0,0.0,-1.0,0.0],[2,0,2,2,2,-1.0,0.0,0.0,0.0],
    [1,0,0,2,1,-1.0,0.0,0.0,0.0],[0,0,4,-2,2,1.0,0.0,0.0,0.0],[3,0,2,-2,2,1.0,0.0,0.0,0.0],
    [1,0,2,-2,0,-1.0,0.0,0.0,0.0],[0,1,2,0,1,1.0,0.0,0.0,0.0],[-1,-1,0,2,1,1.0,0.0,0.0,0.0],
    [0,0,-2,0,1,-1.0,0.0,0.0,0.0],[0,0,2,-1,2,-1.0,0.0,0.0,0.0],[0,1,0,2,0,-1.0,0.0,0.0,0.0],
    [1,0,-2,-2,0,-1.0,0.0,0.0,0.0],[0,-1,2,0,1,-1.0,0.0,0.0,0.0],[1,1,0,-2,1,-1.0,0.0,0.0,0.0],
    [1,0,-2,2,0,-1.0,0.0,0.0,0.0],[2,0,0,2,0,1.0,0.0,0.0,0.0],[0,0,2,4,2,-1.0,0.0,0.0,0.0],
    [0,1,0,1,0,1.0,0.0,0.0,0.0]
  ];

  // Precesión P03 (IAU 2006, Capitaine et al. 2003): precesión general en
  // longitud y oblicuidad media. T = siglos julianos desde J2000.0.
  function precessionState(days) {
    const T = days / 36525.0;
    const pA = (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T) * ARCSEC2RAD;
    const epsMean = (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) * ARCSEC2RAD;
    return { precLon: pA, epsMean };
  }

  // Devuelve la nutación (Δψ, Δε), oblicuidad verdadera y precesión (P03) en el
  // día d (días desde J2000.0). T = siglos julianos. Argumentos medios de Meeus (eq. 22.1).
  function nutationState(days) {
    const T = days / 36525.0;
    const l  = DEG * (134.96340251 + 1717915923.2178 * T + 31.310 * T * T + 0.064 * T * T * T);
    const lp = DEG * (357.52910000 + 35999.04909 * T - 0.0001559 * T * T - 0.00000048 * T * T * T);
    const F  = DEG * (93.27209062 + 483202.01749 * T - 12.5390 * T * T - 0.0080 * T * T * T);
    const D  = DEG * (297.85019547 + 445267.11140 * T - 5.195 * T * T + 0.007 * T * T * T);
    const Om = DEG * (125.04455501 - 482890.53931 * T + 7.455 * T * T + 0.008 * T * T * T);
    let dp = 0, de = 0;
    for (let k = 0; k < NUT80.length; k++) {
      const t = NUT80[k];
      const arg = t[0] * l + t[1] * lp + t[2] * F + t[3] * D + t[4] * Om;
      dp += (t[5] + t[6] * T) * Math.sin(arg);
      de += (t[7] + t[8] * T) * Math.cos(arg);
    }
    const pre = precessionState(days);
    const dpsi = dp / 10000 * ARCSEC2RAD;
    const deps = de / 10000 * ARCSEC2RAD;
    return { dpsi, deps, epsTrue: pre.epsMean + deps, precLon: pre.precLon };
  }

  // Rendimiento y dispositivo
  const FRAME_TIME = 1000 / 60;      // ~16.67 ms → cap a 60 fps

  // Constantes de animación
  const SOLAR_DAY_FACTOR = 0.12;    // incremento de día por frame en sección solar
  const PLANET_DAY_FACTOR = 0.11;   // incremento de día por frame en sección planetaria
  const VENUS_DAY_FACTOR = 0.15;    // incremento de día por frame en Venus
  const HERO_ANIM_SPEED = 0.004;    // velocidad de animación del hero

  // Constantes de canvas
  const HERO_X_RATIO = 0.20;       // factor de escala X del hero
  const HERO_Y_RATIO = 0.42;       // factor de escala Y del hero
  const SOLAR_X_PADDING = 0.18;    // padding horizontal del analema solar
  const SOLAR_Y_PADDING = 0.14;    // padding vertical del analema solar
  const PLANET_PADDING = 0.15;     // padding del analema planetario
  const VENUS_RADIUS_RATIO = 0.42; // radio del pentagrama de Venus
  const VENUS_MAX_ELONG = 48;      // elongación máxima para escala de Venus
  const GRID_DIVISIONS = 4;        // número de divisiones de la cuadrícula

  // Año tropico para mapeo día→índice (365.25 ≈ año tropico, no anomalístico)
  const TROPICAL_YEAR = 365.25;
  function getIsMobile() { return window.innerWidth < 768; }
  let isMobile = getIsMobile();
  const hasLowMemory = (navigator.hardwareConcurrency !== undefined) && (navigator.hardwareConcurrency <= 2);
  const reducedMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = reducedMotionMQ.matches;
  reducedMotionMQ.addEventListener('change', () => { prefersReducedMotion = reducedMotionMQ.matches; });

  // ── Utilidad unificada de resize para canvas ──────────────────────────────
  // Uso: setupCanvasResize(canvas, onResizeCallback, { minWidth, maxWidth, aspectRatio, useContainer })
  function setupCanvasResize(canvas, onResize, options = {}) {
    const {
      minWidth = 0,
      maxWidth = Infinity,
      aspectRatio = 1,
      useContainer = true,
      debounceMs = 150
    } = options;

    const dpr = window.devicePixelRatio || 1;
    let resizeTimer = null;
    let lastW = 0, lastH = 0;

    let resizeAttempt = 0;
    function doResize() {
      let cssW, cssH;
      if (useContainer && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        cssW = rect.width;
        cssH = rect.height;
        if ((cssW === 0 || cssH === 0) && resizeAttempt < 20) {
          resizeAttempt++;
          setTimeout(doResize, 50);
          return;
        }
      } else {
        cssW = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - 40));
        cssH = cssW / aspectRatio;
      }

      // Clamp to min/max
      cssW = Math.min(maxWidth, Math.max(minWidth, cssW));
      cssH = cssW / aspectRatio;

      const bufferW = Math.round(cssW * dpr);
      const bufferH = Math.round(cssH * dpr);

      if (bufferW !== lastW || bufferH !== lastH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
        lastW = bufferW;
        lastH = bufferH;
      }

      if (onResize) onResize(cssW, cssH, dpr);
    }

    // Initial + debounced resize
    doResize();
    window.addEventListener('resize', () => {
      isMobile = getIsMobile();
      if (typeof planetCache !== 'undefined') planetCache.clear();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, debounceMs);
    });

    return doResize;
  }

  // ── Paleta de colores (modo oscuro fijo) ─────────────────────────────────
  const colorBg       = ()      => '#12141a';
  const colorGrid     = ()      => 'rgba(180,190,210,0.06)';
  const colorAxis     = ()      => 'rgba(180,190,210,0.14)';
  const colorBlue     = (a = 1) => `rgba(160,180,210,${a})`;
  const colorWarm     = (a = 1) => `rgba(196,155,114,${a})`;
  const colorDot      = ()      => '#dbb48a';
  const colorTitle    = ()      => 'rgba(190,200,215,0.8)';
  const colorMonth    = (a = 1) => `rgba(160,175,200,${a})`;
  const colorLabel    = ()      => 'rgba(180,190,210,0.85)';
  const colorRetro    = (a = 1) => `rgba(192,48,48,${a})`;

  // =========================================================================
  // 1. Utilidades astronómicas
  // =========================================================================

  // Ecuación de Kepler — Newton-Raphson, |ΔE| < 1e-12 (Meeus 1998, cap. 30)
  function keplerE(M, e) {
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 10; i++) {
      const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-12) break;
    }
    return E;
  }

  // Aberración estelar anual (constante κ ≈ 20.49552 arcsec = 9.936e-5 rad)
  // Δλ = -κ * cos(λ - λ☉)  ;  Δβ = -κ * sin(β) * sin(λ - λ☉)  (β≈0 para el Sol)
  const KAPPA = 20.49552 * Math.PI / (180 * 3600); // rad

  // Aberración anual (primer orden). sunLon debe ser la LONGITUD DEL ÁPEX del
  // movimiento de la Tierra (dirección de su velocidad), NO la longitud del cuerpo.
  //   Δλ = +κ·sin(λ_ápice − λ) / cosβ,  Δβ = +κ·sinβ·cos(λ_ápice − λ)
  function aberration(lon, lat, sunLon) {
    const dLon = sunLon - lon;
    const dLambda = KAPPA * Math.sin(dLon) / (Math.cos(lat) + 1e-300);
    const dBeta = KAPPA * Math.sin(lat) * Math.cos(dLon);
    return { lon: lon + dLambda, lat: lat + dBeta };
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
  function generateSolarAnalemaPoints(ecc = ECC0) {
    const pts = [];
    const steps = 2000;
    const T = EARTH_T;
    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * T;
      const ep = orbPos(1, ecc, T, M0_EARTH, d, OMEGA_EARTH);
      const M = ep.M;
      // Longitud eclíptica geocéntrica geométrica del Sol (= dirección Tierra → Sol)
      const lamGeo = Math.atan2(-ep.y, -ep.x);
      // Ápex de la aberración anual = dirección de la velocidad de la Tierra
      // (derivada finita de la posición heliocéntrica). No es constante: la
      // excentricidad terrestre hace variar módulo y dirección a lo largo del año.
      const h = 0.5;
      const e1 = orbPos(1, ecc, T, M0_EARTH, d - h, OMEGA_EARTH);
      const e2 = orbPos(1, ecc, T, M0_EARTH, d + h, OMEGA_EARTH);
      const velLon = Math.atan2(e2.y - e1.y, e2.x - e1.x);
      // Longitud aparente (aberr. anual + nutación en longitud Δψ) para E_obl y declinación
      const ab = aberration(lamGeo, 0, velLon);
      const nut = nutationState(d);
      const lamApp = ab.lon + nut.dpsi + nut.precLon;  // long. aparente (aberr. + nut. + precesión)
      const epsUsed = nut.epsTrue;   // oblicuidad verdadera (precesión + Δε)
      const t2 = Math.tan(epsUsed / 2);
      const t4 = t2 * t2 * t2 * t2;
      const t6 = t4 * t2 * t2;
      const exc =
        -(2 * ecc - ecc * ecc * ecc / 4) * Math.sin(M) -
        (5 * ecc * ecc / 4) * Math.sin(2 * M) -
        (13 * ecc * ecc * ecc / 12) * Math.sin(3 * M);
      // E_obl usa la longitud aparente (Meeus 1998 cap. 28; Hughes et al. 1989).
      const obl =
        t2 * t2 * Math.sin(2 * lamApp) -
        (t4 / 2) * Math.sin(4 * lamApp) +
        (t6 / 3) * Math.sin(6 * lamApp);
      const eqT = exc + obl;
      const decl = Math.asin(Math.max(-1, Math.min(1, Math.sin(epsUsed) * Math.sin(lamApp))));
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

  // Velocidad de animación saneada: el valor del <input range> puede manipularse
  // vía devtools (NaN/vacío), y parseInt sin base es frágil. Degrada al fallback.
  function safeSpeed(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  // ── Utilidades compartidas de UI ──────────────────────────────────────────

  // Actualiza el botón play/pausa/reanudar de cualquier sección de canvas
  function updatePlayBtn(btn, done, playing) {
    if (!btn) return;
    if (done) { btn.textContent = 'Completado'; btn.className = ''; btn.classList.add('ended'); }
    else if (playing) { btn.textContent = 'Pausar'; btn.className = 'on'; }
    else { btn.textContent = 'Reanudar'; btn.className = ''; }
  }

  // Crea un IntersectionObserver que gestiona lazy-start, pausa y prefersReducedMotion
  function createSectionObserver(sectionEl, state, opts) {
    const { threshold = 0.25, onStart, drawFn } = opts;
    let inView = false;
    let animationId = null;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView) {
          if (!state.started) {
            state.started = true;
            if (onStart) onStart();
          }
          if (animationId !== null) cancelAnimationFrame(animationId);
          animationId = requestAnimationFrame(drawFn);
        } else if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      });
    }, { threshold });
    if (sectionEl) obs.observe(sectionEl);
    return { get inView() { return inView; }, get animationId() { return animationId; }, set animationId(v) { animationId = v; } };
  }

  // Dibuja la cuadrícula y ejes de un canvas de analema
  function drawGrid(ctx, MX, MY, X0, X1, Y0, Y1, W, H, xm, ym) {
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      ctx.strokeStyle = colorGrid(); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(MX(X0 + i * (X1 - X0) / GRID_DIVISIONS), ym); ctx.lineTo(MX(X0 + i * (X1 - X0) / GRID_DIVISIONS), H - ym); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm, MY(Y0 + i * (Y1 - Y0) / GRID_DIVISIONS)); ctx.lineTo(W - xm, MY(Y0 + i * (Y1 - Y0) / GRID_DIVISIONS)); ctx.stroke();
    }
    ctx.strokeStyle = colorAxis(); ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(MX((X0 + X1) / 2), ym); ctx.lineTo(MX((X0 + X1) / 2), H - ym); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xm, MY((Y0 + Y1) / 2)); ctx.lineTo(W - xm, MY((Y0 + Y1) / 2)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Vincula controles play/reset/complete/velocity a un estado y draw function
  function bindControlEvents(refs, state, drawFn, opts) {
    const { getTotalDays, updateBtn } = opts;
    if (refs.spd) refs.spd.addEventListener('input', function () {
      if (refs.spdLbl) refs.spdLbl.textContent = this.value + '×';
    });
    if (refs.play) refs.play.addEventListener('click', () => {
      if (!state.started) { state.started = true; drawFn(); }
      state.playing = !state.playing;
      if (updateBtn) updateBtn();
    });
    if (refs.reset) refs.reset.addEventListener('click', () => {
      state.day = 0; state.playing = true;
      if (!state.started) { state.started = true; drawFn(); }
      if (updateBtn) updateBtn();
    });
    if (refs.complete) refs.complete.addEventListener('click', () => {
      state.day = getTotalDays(); state.playing = false;
      if (!state.started) { state.started = true; drawFn(); }
      if (updateBtn) updateBtn();
    });
  }

  // =========================================================================
  // 2. Starfield (fondo estelar animado)
  // =========================================================================
  (function () {
    const cv = document.getElementById('starfield');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let W, H;
    let stars = [];
    let lastFrame = 0;

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

    function updateStars() {
      for (const s of stars) {
        s.x += s.speedX; s.y += s.speedY;
        if (s.x < -20) s.x = W + 20;
        if (s.x > W + 20) s.x = -20;
        if (s.y < -20) s.y = H + 20;
        if (s.y > H + 20) s.y = -20;
      }
    }

    function drawStars(now) {
      const baseColor = [170, 185, 210];
      for (const s of stars) {
        const twinkle = prefersReducedMotion ? 1 : (0.7 + 0.3 * Math.sin(now * s.twinkleSpeed + s.twinklePhase));
        let brightness = s.baseBrightness * twinkle * (1 - s.z * 0.3);
        if (isMobile || hasLowMemory) brightness *= 0.6;
        const r = baseColor[0] + s.colorShift * 30;
        const g = baseColor[1] + s.colorShift * 20;
        const b = baseColor[2] + s.colorShift * 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, TAU);
        ctx.fillStyle = `rgba(${r},${g},${b},${brightness * 0.7})`;
        ctx.fill();
      }
    }

    let starfieldInView = true;
    const starfieldObs = new IntersectionObserver(es => {
      starfieldInView = es[0].isIntersecting;
      if (starfieldInView) animate(performance.now());
    }, { threshold: 0 });
    if (cv.parentElement) starfieldObs.observe(cv);

    function animate(ts) {
      if (!cv.parentElement) return;
      if (!starfieldInView) return;
      if (ts - lastFrame < FRAME_TIME) { requestAnimationFrame(animate); return; }
      lastFrame = ts;
      try {
        ctx.clearRect(0, 0, W, H);
        updateStars();
        drawStars(ts);
      } catch (e) { console.warn('Canvas error:', e); }
      requestAnimationFrame(animate);
    }

    // Usar utilidad unificada de resize
    setupCanvasResize(cv, (w, h, dpr) => {
      W = w; H = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      initStars();
    }, { useContainer: false, aspectRatio: window.innerWidth / window.innerHeight, debounceMs: 150 });

    // El loop lo arranca el IntersectionObserver (evita doble requestAnimationFrame)
  })();

  const heroState = { started: true, playing: true };

  // =========================================================================
  // 3. Hero Canvas — analema interactivo
  // =========================================================================
  (function () {
    const cv = document.getElementById('hero-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const currentEpsDeg = 23.44, currentEps = currentEpsDeg * DEG;
    const currentEcc = ECC0;
    let currentPoints = [];
    let xc = 0, yc = 0, xRange = 1, yRange = 1;
    let animProgress = 0;
    
    let lastTimestamp = 0;
    let baseWidth = 0, baseHeight = 0;
    let cachedScaleX = 1, cachedScaleY = 1;

    function updateAnalema() {
      currentPoints = generateSolarAnalemaPoints(currentEcc);
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
      const periodSpan = document.getElementById('hero-period');
      if (periodSpan) periodSpan.textContent = EARTH_T.toFixed(2) + ' d';
      if (baseWidth > 0 && baseHeight > 0) {
        const ref = Math.min(baseWidth, baseHeight);
        cachedScaleX = ref * HERO_X_RATIO / xRange;
        cachedScaleY = ref * HERO_Y_RATIO / yRange;
      }
    }

    // Usar utilidad unificada de resize
    setupCanvasResize(cv, (w, h, dpr) => {
      baseWidth = w; baseHeight = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      const ref = Math.min(baseWidth, baseHeight);
      cachedScaleX = ref * HERO_X_RATIO / xRange;
      cachedScaleY = ref * HERO_Y_RATIO / yRange;
    }, { useContainer: true, aspectRatio: 1, minWidth: 200, maxWidth: 560, debounceMs: 100 });

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
      heroInView = es[0].isIntersecting;
      if (heroInView) {
        heroState.playing = true;
        requestAnimationFrame(draw);
      }
    }, { threshold: 0 });
    heroObs.observe(cv);

    function draw(ts) {
      if (!heroInView || !heroState.playing) return;
      requestAnimationFrame(draw);
      if (baseWidth === 0 || baseHeight === 0) return;
      if (ts - lastTimestamp < FRAME_TIME) return;
      lastTimestamp = ts;
      if (currentPoints.length === 0) return;
      try {
        if (document.hidden) { heroState.playing = false; return; }
        if (!prefersReducedMotion) {
          animProgress += HERO_ANIM_SPEED;
          if (animProgress > 1) animProgress = 0;
        } else if (animProgress === 0) {
          animProgress = 1;
        }
        const currentPoint = animProgress * currentPoints.length;

        ctx.clearRect(0, 0, baseWidth, baseHeight);
        ctx.save();
        ctx.translate(baseWidth / 2, baseHeight / 2);
        const scaleX = cachedScaleX;
        const scaleY = cachedScaleY;
        const px = p => (p.x - xc) * scaleX;
        const py = p => -(p.y - yc) * scaleY;

        ctx.beginPath();
        currentPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(px(p), py(p)); else ctx.lineTo(px(p), py(p));
        });
        ctx.closePath();
        ctx.strokeStyle = colorBlue(0.25); ctx.lineWidth = 1.2; ctx.stroke();

        const endIdx = Math.min(Math.floor(currentPoint), currentPoints.length - 1);
        if (endIdx >= 1) {
          ctx.beginPath();
          ctx.strokeStyle = colorWarm(0.8); ctx.lineWidth = 1.5;
          for (let i = 1; i <= endIdx; i++) {
            const p1 = currentPoints[i - 1], p2 = currentPoints[i];
            ctx.moveTo(px(p1), py(p1)); ctx.lineTo(px(p2), py(p2));
          }
          ctx.stroke();
        }

        events.forEach(ev => {
          const idx = Math.floor((ev.day / TROPICAL_YEAR) * currentPoints.length);
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
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.fillStyle = colorWarm(0.12); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = colorDot(); ctx.fill();

        ctx.fillStyle = colorTitle();
        ctx.font = `${isMobile ? 7 : 9}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.fillText('J2000.0 · Parámetros dinámicos', baseWidth * 0.47, -baseHeight * 0.47 + 14);
        ctx.restore();
      } catch (e) { console.warn('Canvas error:', e); }
    }
    // El loop lo arranca el IntersectionObserver (evita doble requestAnimationFrame)
  })();

  // =========================================================================
  // 4. Solar Analema Canvas
  // =========================================================================
  const solarState = { day: 0, playing: false, started: false };
  (function () {
    const cv = document.getElementById('solar-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;

    // Usar utilidad unificada de resize
    setupCanvasResize(cv, (w, h, dpr) => {
      logicW = w; logicH = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }, { useContainer: true, aspectRatio: 560/520, maxWidth: 560, debounceMs: 100 });

    // Precomputa los rangos del analema solar (solo una vez)
    const sXs = SOLAR_PTS.map(p => p.x), sYs = SOLAR_PTS.map(p => p.y);
    const sXmin = arrayMin(sXs), sXmax = arrayMax(sXs);
    const sYmin = arrayMin(sYs), sYmax = arrayMax(sYs);
    const sXr = sXmax - sXmin, sYr = sYmax - sYmin;
    const X0 = sXmin - sXr * SOLAR_X_PADDING, X1 = sXmax + sXr * SOLAR_X_PADDING;
    const Y0 = sYmin - sYr * SOLAR_Y_PADDING, Y1 = sYmax + sYr * SOLAR_Y_PADDING;

    const MONTHS = [['ENE', 0], ['FEB', 31], ['MAR', 59], ['ABR', 90], ['MAY', 120],
      ['JUN', 151], ['JUL', 181], ['AGO', 212], ['SEP', 243], ['OCT', 273], ['NOV', 304], ['DIC', 334]];

    // Refs DOM cacheadas (A6)
    const refs = {
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

    function draw(ts) {
      if (!solarObs.inView) return;
      solarObs.animationId = requestAnimationFrame(draw);
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;
      try {
        const W = logicW, H = logicH;
        const xm = isMobile ? 36 : 56, ym = isMobile ? 32 : 42;
        const MX = v => xm + (v - X0) / (X1 - X0) * (W - 2 * xm);
        const MY = v => H - ym - (v - Y0) / (Y1 - Y0) * (H - 2 * ym);
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = colorBg(); ctx.fillRect(0, 0, W, H);

        drawGrid(ctx, MX, MY, X0, X1, Y0, Y1, W, H, xm, ym);

        ctx.beginPath();
        SOLAR_PTS.forEach((p, i) => i === 0 ? ctx.moveTo(MX(p.x), MY(p.y)) : ctx.lineTo(MX(p.x), MY(p.y)));
        ctx.closePath(); ctx.strokeStyle = colorBlue(0.07); ctx.lineWidth = 1; ctx.stroke();

      if (solarState.playing && solarState.day < SOLAR_PTS.length - 1) {
        const s = safeSpeed(refs.spd?.value, 10);
        solarState.day += s * SOLAR_DAY_FACTOR;
          if (solarState.day >= SOLAR_PTS.length - 1) {
            solarState.day = SOLAR_PTS.length - 1;
            solarState.playing = false;
            updatePlayBtn(refs.play, solarState.day >= SOLAR_PTS.length - 1, solarState.playing);
          }
        }

        const end = Math.min(Math.round(solarState.day), SOLAR_PTS.length - 1);
        for (let i = 1; i <= end; i++) {
          ctx.beginPath();
          ctx.moveTo(MX(SOLAR_PTS[i - 1].x), MY(SOLAR_PTS[i - 1].y));
          ctx.lineTo(MX(SOLAR_PTS[i].x), MY(SOLAR_PTS[i].y));
          ctx.strokeStyle = colorBlue(0.85); ctx.lineWidth = 1.7; ctx.stroke();
        }

        const lblSize = isMobile ? '7px' : '9.5px';
        MONTHS.forEach(([n, d]) => {
          const idx = Math.floor((d / TROPICAL_YEAR) * SOLAR_PTS.length);
          if (idx > end) return;
          const p = SOLAR_PTS[idx];
          ctx.beginPath(); ctx.arc(MX(p.x), MY(p.y), 3.5, 0, TAU);
          ctx.fillStyle = colorMonth(0.75); ctx.fill();
          ctx.fillStyle = colorMonth(0.7);
          ctx.font = `${lblSize} JetBrains Mono,monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(n, MX(p.x), MY(p.y) - 8);
        });

        if (end > 0) {
          const cp = SOLAR_PTS[end];
          ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 6, 0, TAU); ctx.fillStyle = colorDot(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 11, 0, TAU);
          ctx.strokeStyle = colorWarm(0.16); ctx.lineWidth = 1.5; ctx.stroke();
          if (refs.day)  refs.day.textContent  = Math.floor(cp.day + 1);
          if (refs.eq)   refs.eq.textContent   = cp.em.toFixed(1) + ' min';
          if (refs.decl) refs.decl.textContent = cp.dd.toFixed(2) + '°';
          if (refs.pct)  refs.pct.textContent  = Math.round(100 * end / (SOLAR_PTS.length - 1)) + '%';
        }

        ctx.fillStyle = colorLabel();
        ctx.font = `${lblSize} JetBrains Mono,monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('← E   ECUACIÓN DEL TIEMPO E(t)   O →', W / 2, H - 5);
        ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('DECLINACIÓN δ', 0, 0); ctx.restore();
        ctx.fillStyle = colorTitle();
        ctx.font = '500 10px JetBrains Mono,monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ANALEMA SOLAR TERRESTRE · J2000.0', xm, isMobile ? 14 : 20);
      } catch (e) { console.warn('Canvas error:', e); }
    }

    const solarSection = document.getElementById('solar');
    const solarObs = createSectionObserver(solarSection, solarState, {
      onStart: () => {
        if (prefersReducedMotion) {
          solarState.day = SOLAR_PTS.length - 1;
          solarState.playing = false;
          updatePlayBtn(refs.play, true, false);
        } else {
          solarState.playing = true;
          if (refs.play) { refs.play.textContent = 'Pausar'; refs.play.className = 'on'; }
        }
      },
      drawFn: draw
    });

    bindControlEvents(refs, solarState, () => requestAnimationFrame(draw), {
      getTotalDays: () => SOLAR_PTS.length - 1,
      updateBtn: () => updatePlayBtn(refs.play, solarState.day >= SOLAR_PTS.length - 1, solarState.playing)
    });
  })();

  // =========================================================================
  // 5. Planetas — analemas geocéntricos
  // =========================================================================
  // Elementos orbitales J2000.0 (Standish 1992, Mean Elements EMB / JPL DE430).
  //   a       = semieje mayor (UA)
  //   e       = excentricidad
  //   T       = período sidéreo (días)
  //   M0      = anomalía media en J2000.0 (rad)
  //   lonPeri = ϖ longitud heliocéntrica del perihelio (rad)
  //   i       = inclinación orbital respecto a la eclíptica J2000 (rad)
  //   O       = longitud del nodo ascendente Ω (rad)
  const planetsData = [
    { id: 'mercury', name: 'Mercurio', color: '#909098', a: 0.387098, e: 0.205630, T: 87.969,   syn: 115.88, lonPeri: 77.4561  * DEG, M0: 174.7948 * DEG, i: 7.00498 * DEG, O: 48.3308 * DEG, synStr: '115.9 d',  rDur: '~22 d',   eccS: '0.2056', shape: 'Lazo compacto',      shapeD: 'Elongación máx. 17.9°–27.8°: el rango varía por la alta excentricidad. Nunca se aleja más de ~28° del Sol (Meeus, 1998).' },
    { id: 'venus',   name: 'Venus',    color: '#e8a030', a: 0.723332, e: 0.006772, T: 224.701,  syn: 583.92, lonPeri: 131.5637 * DEG, M0:  50.4161 * DEG, i: 3.39471 * DEG, O: 76.6806 * DEG, synStr: '583.9 d',  rDur: '~40 d',   eccS: '0.0067', shape: 'Pentagrama (8 años)', shapeD: 'Cinco conjunciones inferiores en ~8 años dibujan un pentagrama aproximado por la casi-resonancia 8:13:5; el patrón deriva ~2.4° por ciclo (Aveni, 2001).' },
    { id: 'mars',    name: 'Marte',    color: '#c85830', a: 1.523679, e: 0.093394, T: 686.980,  syn: 779.94, lonPeri: 336.0408 * DEG, M0:  19.4125 * DEG, i: 1.84973 * DEG, O: 49.5581 * DEG, synStr: '779.9 d',  rDur: '~72 d',   eccS: '0.0934', shape: 'Bucle variable',      shapeD: 'Retrogradaciones muy variables según oposición perihélica o afélica. La excentricidad moderada genera bucles irregulares (Meeus, 1998).' },
    { id: 'jupiter', name: 'Júpiter',  color: '#c0a060', a: 5.203363, e: 0.048392, T: 4332.59,  syn: 398.88, lonPeri:  14.7283 * DEG, M0:  19.6761 * DEG, i: 1.30327 * DEG, O: 100.464 * DEG, synStr: '398.9 d',  rDur: '~121 d',  eccS: '0.0484', shape: 'Bucles uniformes',    shapeD: '~1 retrogradación/año. Bucles casi idénticos por la baja excentricidad. ~30°/año en el zodíaco (P ≈ 12 años).' },
    { id: 'saturn',  name: 'Saturno',  color: '#a88848', a: 9.537070, e: 0.054150, T: 10759.22, syn: 378.09, lonPeri:  92.5984 * DEG, M0: 317.3460 * DEG, i: 2.48524 * DEG, O: 113.665 * DEG, synStr: '378.1 d',  rDur: '~138 d',  eccS: '0.0542', shape: 'Bucles regulares',    shapeD: 'P ≈ 29.5 años. Retrogradaciones anuales (~138 días) predecibles y casi idénticas.' },
    { id: 'uranus',  name: 'Urano',    color: '#40c0a8', a: 19.19126, e: 0.047167, T: 30685.4, syn: 369.66, lonPeri: 170.9543 * DEG, M0: 142.2778 * DEG, i: 0.77306 * DEG, O: 74.0060 * DEG, synStr: '369.7 d',  rDur: '~151 d',  eccS: '0.0472', shape: 'Bucles densos',      shapeD: 'Mag +5.7. 84 años para recorrer el zodíaco. Su rotación es retrógrada (ε = 97.77°), lo que haría extremo su analema solar local.' },
    { id: 'neptune', name: 'Neptuno',  color: '#2858b8', a: 30.06896, e: 0.008585, T: 60189,   syn: 367.49, lonPeri:  44.9648 * DEG, M0: 259.9152 * DEG, i: 1.76995 * DEG, O: 131.784 * DEG, synStr: '367.5 d',  rDur: '~158 d',  eccS: '0.0086', shape: 'Bucles estáticos',   shapeD: 'Mag +7.8. 165 años para recorrer el zodíaco. Movimiento propio ~2°/año. Excentricidad mínima.' }
  ];

  let selectedPlanet = planetsData[2]; // Marte por defecto
  const planetState = { day: 0, playing: false, started: false };
  const venusState = { day: 0, playing: false, started: false };
  const planetCache = new Map();

  function getPlanetPoints(p) {
    if (planetCache.has(p.id)) return planetCache.get(p.id);
    const result = computePlanetPoints(p);
    planetCache.set(p.id, result);
    return result;
  }

  function computePlanetPoints(p) {
    const Te = EARTH_T;
    const steps = isMobile ? 400 : 600;
    const totalDays = Math.min(p.syn * 2, 1800);
    const dt = totalDays / steps;
    const pts = [];
    let prevRA = null, prevDeltaRA = null;

    // Elementos de la Tierra para orbPosInc (i=0, O=0 para eclíptica media J2000)
    const earthEl = { a: 1, e: ECC0, T: Te, M0: M0_EARTH, lonPeri: OMEGA_EARTH, i: 0, O: 0 };

    for (let i = 0; i <= steps; i++) {
      const d = i * dt;
      const pe = orbPosInc(earthEl, d);
      const pp = orbPosInc(p, d);

      // Vector geocéntrico planeta en eclíptica J2000
      const dx = pp.x - pe.x, dy = pp.y - pe.y, dz = pp.z - pe.z;
      const r = Math.hypot(dx, dy, dz);

      // Longitud y latitud eclíptica geocéntrica (precesión + nutación Δψ → true-of-date)
      const nut = nutationState(d);
      const lon = Math.atan2(dy, dx) + nut.dpsi + nut.precLon;
      const beta = Math.asin(Math.max(-1, Math.min(1, dz / r)));

      // Transformación a ecuatorial del momento: (lon, beta) -> (ra, dec)
      // rotación alrededor del eje x por -ε.  Fórmula libre de división por cosβ
      // (Meeus 1998, cap. 12). Usa oblicuidad verdadera (precesión + Δε).
      const sinEps = Math.sin(nut.epsTrue), cosEps = Math.cos(nut.epsTrue);
      const sinLon = Math.sin(lon), cosLon = Math.cos(lon);
      const sinBeta = Math.sin(beta), cosBeta = Math.cos(beta);
      const cosBetaLon = cosBeta * cosLon;

      const ra = Math.atan2(sinLon * cosBeta * cosEps - sinBeta * sinEps, cosBetaLon || 1e-16);
      const dec = Math.asin(Math.max(-1, Math.min(1, sinBeta * cosEps + cosBeta * sinEps * sinLon)));

      // AR del Sol (Tierra en z≈0, beta=0)
      const sunLon = Math.atan2(-pe.y, -pe.x) + nut.dpsi + nut.precLon;
      const sunRA = Math.atan2(Math.sin(sunLon) * cosEps, Math.cos(sunLon));

      // Diferencia en AR (eje horizontal del analema planetario)
      let dRA = ra - sunRA;
      if (dRA > Math.PI) dRA -= TAU;
      if (dRA < -Math.PI) dRA += TAU;

      // Retrogradación robusta: AR del planeta decreciente dos pasos consecutivos
      // (evita falsos positivos cerca de puntos estacionarios)
      let retro = false;
      if (prevRA !== null) {
        let currDelta = ra - prevRA;
        if (currDelta > Math.PI) currDelta -= TAU;
        if (currDelta < -Math.PI) currDelta += TAU;
        if (prevDeltaRA !== null && currDelta < 0 && prevDeltaRA < 0) retro = true;
        prevDeltaRA = currDelta;
      }
      prevRA = ra;

      // Elongación geocéntrica (ángulo Sol-Tierra-Planeta)
      const earthToSunX = -pe.x, earthToSunY = -pe.y, earthToSunZ = -pe.z;
      const dot = earthToSunX * dx + earthToSunY * dy + earthToSunZ * dz;
      const mag1 = Math.hypot(earthToSunX, earthToSunY, earthToSunZ);
      const elong = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * r)))) * 180 / Math.PI;

      pts.push({ x: dRA, y: dec, day: d, retro, elong });
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of pts) {
      if (q.x < minX) minX = q.x; if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y; if (q.y > maxY) maxY = q.y;
    }
    return { pts, bounds: { minX, maxX, minY, maxY } };
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
      const span = document.createElement('span');
      span.style.color = p.color;
      span.style.marginRight = '4px';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '●';
      b.appendChild(span);
      b.appendChild(document.createTextNode(p.name));
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
    if (!ctx) return;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;

    // Usar utilidad unificada de resize
    setupCanvasResize(cv, (w, h, dpr) => {
      logicW = w; logicH = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }, { useContainer: true, aspectRatio: 620/480, maxWidth: 620, debounceMs: 100 });

    // Refs DOM cacheadas (A6)
    const refs = {
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

    function draw(ts) {
      if (!planetObs.inView) return;
      planetObs.animationId = requestAnimationFrame(draw);
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;
      try {
        const p = selectedPlanet;
        const { pts, bounds } = getPlanetPoints(p);
        const W = logicW, H = logicH;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = colorBg(); ctx.fillRect(0, 0, W, H);

        const { minX, maxX, minY, maxY } = bounds;
        const xr = maxX - minX, yr = maxY - minY;
        const xpad = Math.max(xr * PLANET_PADDING, 0.001), ypad = Math.max(yr * PLANET_PADDING, 0.001);
        const X0 = minX - xpad, X1 = maxX + xpad;
        const Y0 = minY - ypad, Y1 = maxY + ypad;

        const xm = isMobile ? 36 : 48, ym = isMobile ? 30 : 40;
        const MX = v => xm + (v - X0) / (X1 - X0) * (W - 2 * xm);
        const MY = v => H - ym - (v - Y0) / (Y1 - Y0) * (H - 2 * ym);

        drawGrid(ctx, MX, MY, X0, X1, Y0, Y1, W, H, xm, ym);

        ctx.beginPath();
        pts.forEach((q, i) => i === 0 ? ctx.moveTo(MX(q.x), MY(q.y)) : ctx.lineTo(MX(q.x), MY(q.y)));
        ctx.strokeStyle = p.color + '18'; ctx.lineWidth = 1; ctx.stroke();

      if (planetState.playing && planetState.day < pts.length - 1) {
        const s = safeSpeed(refs.spd?.value, 25);
        planetState.day += s * PLANET_DAY_FACTOR;
          if (planetState.day >= pts.length - 1) {
            planetState.day = pts.length - 1;
            planetState.playing = false;
            updatePlayBtn(refs.play, planetState.day >= pts.length - 1, planetState.playing);
          }
        }

        const end = Math.min(Math.round(planetState.day), pts.length - 1);
        for (let i = 1; i <= end; i++) {
          ctx.beginPath();
          ctx.moveTo(MX(pts[i - 1].x), MY(pts[i - 1].y));
          ctx.lineTo(MX(pts[i].x), MY(pts[i].y));
          ctx.strokeStyle = pts[i].retro ? colorRetro(0.85) : colorBlue(0.85);
          ctx.lineWidth = 1.7; ctx.stroke();
        }

        if (end > 0) {
          const cp = pts[end];
          ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 5.5, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.arc(MX(cp.x), MY(cp.y), 10, 0, TAU);
          ctx.strokeStyle = p.color + '28'; ctx.lineWidth = 1.5; ctx.stroke();
          if (refs.day)   refs.day.textContent   = Math.round(cp.day).toLocaleString('es-ES');
          if (refs.elong) refs.elong.textContent = cp.elong.toFixed(1) + '°';
          if (refs.pct)   refs.pct.textContent   = Math.round(100 * end / (pts.length - 1)) + '%';
          if (refs.retro) { refs.retro.textContent = cp.retro ? 'Sí' : 'No'; refs.retro.style.color = cp.retro ? '#e05555' : ''; }
        }

        const lblSize = isMobile ? '7px' : '10px';
        ctx.fillStyle = colorLabel();
        ctx.font = `${lblSize} JetBrains Mono,monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('← O   ASCENSIÓN RECTA   E →', W / 2, H - 5);
        ctx.save(); ctx.translate(13, H / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('DECLINACIÓN δ', 0, 0); ctx.restore();
        ctx.fillStyle = colorTitle();
        ctx.font = `500 ${lblSize} JetBrains Mono,monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`ANALEMA DE ${p.name.toUpperCase()} · GEOCÉNTRICO`, xm, isMobile ? 14 : 19);
      } catch (e) { console.warn('Canvas error:', e); }
    }

    const planetSection = document.getElementById('planetas');
    const planetObs = createSectionObserver(planetSection, planetState, {
      onStart: () => {
        if (prefersReducedMotion) {
          const { pts } = getPlanetPoints(selectedPlanet);
          planetState.day = pts.length - 1;
          planetState.playing = false;
          updatePlayBtn(refs.play, planetState.day >= pts.length - 1, planetState.playing);
        } else {
          planetState.playing = true;
          if (refs.play) { refs.play.textContent = 'Pausar'; refs.play.className = 'on'; }
        }
      },
      drawFn: draw
    });

    bindControlEvents(refs, planetState, () => requestAnimationFrame(draw), {
      getTotalDays: () => getPlanetPoints(selectedPlanet).pts.length - 1,
      updateBtn: () => {
        const { pts } = getPlanetPoints(selectedPlanet);
        updatePlayBtn(refs.play, planetState.day >= pts.length - 1, planetState.playing);
      }
    });
  })();

  // =========================================================================
  // 6. Venus — Pentagrama (ciclo de 8 años)
  // =========================================================================
  (function () {
    const cv = document.getElementById('venus-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let lastFrame = 0;
    let logicW = 0, logicH = 0;
    const TOTAL_DAYS = Math.round(8 * TROPICAL_YEAR); // 2922 días

    // Usar utilidad unificada de resize
    setupCanvasResize(cv, (w, h, dpr) => {
      logicW = w; logicH = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }, { useContainer: true, aspectRatio: 1, maxWidth: 700, debounceMs: 100 });

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
      const V = planetsData[1]; // Venus desde planetsData (J2000.0)
      const earthEl = { a: 1, e: ECC0, T: EARTH_T, M0: M0_EARTH, lonPeri: OMEGA_EARTH, i: 0, O: 0 };
      for (let d = 0; d <= TOTAL_DAYS + EXTRA_DAYS; d += 0.5) {
        const pe = orbPosInc(earthEl, d);
        const pv = orbPosInc(V, d);
        const dx = pv.x - pe.x, dy = pv.y - pe.y, dz = pv.z; // Tierra en z ≈ 0
        const nutV = nutationState(d);
        const lon = Math.atan2(dy, dx) + nutV.dpsi + nutV.precLon; // long. true-of-date
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
          vPts[i].elong > vPts[i + 1].elong &&
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
          vPts[i].elong < vPts[i + 1].elong) {
          infConjs.push(vPts[i]);
        }
      }
    }

    precompute();

    // Refs DOM cacheadas (A6)
    const refs = {
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

    // Convierte un punto (lon, elong) a coordenadas canvas polares
    // Radio = elongación normalizada; ángulo = longitud eclíptica geocéntrica
    function toCanvas(lon, elong, cx, cy, R, maxElong) {
      const r = (elong / maxElong) * R;
      return {
        px: cx + r * Math.cos(lon - Math.PI / 2),
        py: cy + r * Math.sin(lon - Math.PI / 2)
      };
    }

    function draw(ts) {
      if (!venusObs.inView) return;
      venusObs.animationId = requestAnimationFrame(draw);
      if (ts - lastFrame < FRAME_TIME) return;
      lastFrame = ts;
      try {
        const W = logicW, H = logicH;
        const cx = W / 2, cy = H / 2;
        const R = Math.min(W, H) * VENUS_RADIUS_RATIO;
        

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = colorBg(); ctx.fillRect(0, 0, W, H);

        if (venusState.playing && venusState.day < TOTAL_DAYS) {
          const spd = safeSpeed(refs.spd?.value, 30);
          venusState.day = Math.min(venusState.day + spd * VENUS_DAY_FACTOR, TOTAL_DAYS);
          if (venusState.day >= TOTAL_DAYS) {
            venusState.playing = false;
            updatePlayBtn(refs.play, venusState.day >= TOTAL_DAYS, venusState.playing);
          }
        }
        const endDay = Math.min(Math.round(venusState.day), TOTAL_DAYS);

        [12, 24, 36, 47].forEach(deg => {
          const r = (deg / VENUS_MAX_ELONG) * R;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
          ctx.strokeStyle = colorGrid(); ctx.lineWidth = 0.5; ctx.stroke();
          ctx.fillStyle = colorLabel();
          ctx.font = `${isMobile ? '6px' : '7px'} JetBrains Mono,monospace`;
          ctx.textAlign = 'left';
          ctx.fillText(`${deg}°`, cx + r + 3, cy + 3);
        });

        for (let a = 0; a < 12; a++) {
          const angle = a * Math.PI / 6 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * R * 0.97, cy + Math.sin(angle) * R * 0.97);
          ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
          ctx.strokeStyle = colorGrid(); ctx.lineWidth = 0.5; ctx.stroke();
        }

        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fillStyle = 'rgba(240,192,64,0.15)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fillStyle = '#f0c040'; ctx.fill();

        const RZ = R * 1.06;
        ctx.beginPath(); ctx.arc(cx, cy, RZ, 0, TAU);
        ctx.strokeStyle = colorAxis(); ctx.lineWidth = 0.6; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - RZ + 4); ctx.lineTo(cx, cy - RZ - 4);
        ctx.strokeStyle = colorAxis(); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = colorLabel();
        ctx.font = `${isMobile ? '6px' : '7px'} JetBrains Mono,monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('λ = 0°', cx + 22, cy - RZ + 13);

        const zx = q => cx + RZ * Math.cos(q.lon - Math.PI / 2);
        const zy = q => cy + RZ * Math.sin(q.lon - Math.PI / 2);

        // vPts tiene paso 0.5d → el índice i corresponde al día i/2
        const maxIdx = Math.min(Math.round(endDay * 2), vPts.length - 1);
        const step = (isMobile || hasLowMemory) ? 2 : 1;
        let prevPt = null;
        for (let i = 0; i <= maxIdx; i += step) {
          const q = vPts[i];
          const p = toCanvas(q.lon, q.elong, cx, cy, R, VENUS_MAX_ELONG);
          if (prevPt) {
            ctx.beginPath();
            ctx.moveTo(prevPt.px, prevPt.py);
            ctx.lineTo(p.px, p.py);
            ctx.strokeStyle = q.isEast ? colorWarm(0.32) : colorBlue(0.26);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          prevPt = p;
        }

        const visConjs = infConjs.filter(q => q.day <= endDay);
        const starConjs = visConjs.slice(0, 5);
        for (let i = 1; i < starConjs.length; i++) {
          ctx.beginPath();
          ctx.moveTo(zx(starConjs[i - 1]), zy(starConjs[i - 1]));
          ctx.lineTo(zx(starConjs[i]), zy(starConjs[i]));
          ctx.strokeStyle = colorWarm(0.6); ctx.lineWidth = 1.5; ctx.stroke();
        }

        if (endDay >= TOTAL_DAYS && infConjs.length >= 6 && starConjs.length === 5) {
          const c6 = infConjs[5], c1 = infConjs[0];
          ctx.beginPath();
          ctx.moveTo(zx(starConjs[4]), zy(starConjs[4]));
          ctx.lineTo(zx(c6), zy(c6));
          ctx.strokeStyle = colorWarm(0.6); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(zx(c6), zy(c6), 4.5, 0, TAU);
          ctx.strokeStyle = colorRetro(0.9); ctx.lineWidth = 1.4; ctx.stroke();
          let drift = (c6.lon - c1.lon) * 180 / Math.PI;
          while (drift > 180) drift -= 360;
          while (drift < -180) drift += 360;
          ctx.fillStyle = colorRetro(0.9);
          ctx.font = `${isMobile ? '6px' : '8px'} JetBrains Mono,monospace`;
          ctx.textAlign = zx(c6) > cx ? 'right' : 'left';
          ctx.fillText(`6.ª conj.: Δλ ≈ ${drift.toFixed(1)}° — no cierra`,
            zx(c6) + (zx(c6) > cx ? -9 : 9), zy(c6) + 14);
        }

        starConjs.forEach(q => {
          ctx.beginPath(); ctx.arc(zx(q), zy(q), 5, 0, TAU);
          ctx.fillStyle = '#e8a030'; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
          const p = toCanvas(q.lon, q.elong, cx, cy, R, VENUS_MAX_ELONG);
          ctx.setLineDash([2, 4]);
          ctx.beginPath(); ctx.moveTo(zx(q), zy(q)); ctx.lineTo(p.px, p.py);
          ctx.strokeStyle = colorWarm(0.18); ctx.lineWidth = 0.7; ctx.stroke();
          ctx.setLineDash([]);
        });

        const visMaxElongs = maxElongs.filter(q => q.day <= endDay);
        visMaxElongs.forEach(q => {
          const { px, py } = toCanvas(q.lon, q.elong, cx, cy, R, VENUS_MAX_ELONG);
          ctx.beginPath(); ctx.arc(px, py, 3.5, 0, TAU);
          ctx.fillStyle = q.isEast ? colorWarm(0.85) : colorBlue(0.7); ctx.fill();
        });

        if (endDay > 0) {
          const cpIdx = Math.min(Math.round(endDay * 2), vPts.length - 1);
          const cp = vPts[cpIdx];
          const { px, py } = toCanvas(cp.lon, cp.elong, cx, cy, R, VENUS_MAX_ELONG);
          ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fillStyle = colorWarm(0.12); ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fillStyle = colorDot(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.stroke();

          if (refs.day)   refs.day.textContent   = Math.round(endDay);
          if (refs.yr)    refs.yr.textContent    = (endDay / TROPICAL_YEAR).toFixed(2);
          if (refs.elong) refs.elong.textContent = cp.elong.toFixed(1) + '°';
          if (refs.cyc)   refs.cyc.textContent   = Math.round(100 * endDay / TOTAL_DAYS) + '%';
        }

        ctx.fillStyle = colorTitle();
        ctx.font = `500 ${isMobile ? '7px' : '10px'} JetBrains Mono,monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(isMobile ? 'PENTAGRAMA DE VENUS · 8 AÑOS'
          : 'PENTAGRAMA DE VENUS · 8 AÑOS · MODELO 3D (i = 3.39°)', isMobile ? 8 : 14, isMobile ? 14 : 19);
      } catch (e) { console.warn('Canvas error:', e); }
    }

    const venusSection = document.getElementById('venus');
    const venusObs = createSectionObserver(venusSection, venusState, {
      onStart: () => {
        if (prefersReducedMotion) {
          venusState.day = TOTAL_DAYS;
          venusState.playing = false;
          updatePlayBtn(refs.play, true, false);
        } else {
          venusState.playing = true;
          if (refs.play) { refs.play.textContent = 'Pausar'; refs.play.className = 'on'; }
        }
      },
      drawFn: draw
    });

    bindControlEvents(refs, venusState, () => requestAnimationFrame(draw), {
      getTotalDays: () => TOTAL_DAYS,
      updateBtn: () => updatePlayBtn(refs.play, venusState.day >= TOTAL_DAYS, venusState.playing)
    });
  })();

  // =========================================================================
  // 7. Visibility API — pausa explícita cuando la pestaña está oculta
  //    (rAF ya pausa solo, pero apagamos el state para que al volver no
  //     dé un salto temporal grande al usuario).
  // =========================================================================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (heroState.started)   heroState.playing   = false;
      if (solarState.started)  solarState.playing  = false;
      if (planetState.started) planetState.playing = false;
      if (venusState.started)  venusState.playing  = false;
    }
  });

  // =========================================================================
  // 8. Fade-in al hacer scroll (elementos con clase .fi)
  // =========================================================================
  const fadeObs = new IntersectionObserver(
    es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('v'); fadeObs.unobserve(e.target); }
    }),
    { threshold: 0.02 }
  );
  const fadeEls = document.querySelectorAll('.fi');
  fadeEls.forEach(el => fadeObs.observe(el));

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
      toggle.textContent = open ? '✕' : '☰';
    });
    links.querySelectorAll('li a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
        toggle.focus();
      }
    });
  })();

}());
