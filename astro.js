// Motor orbital compartido por la página (scripts.js) y la validación
// (validacion.mjs). Script clásico sin dependencias: expone globalThis.Astro
// para que index.html funcione también abierto con file://.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const ARCSEC = DEG / 3600;

  // Elementos medios J2000.0 (Standish et al., 1992). Ángulos en rad, T en días.
  //   a: semieje mayor (UA)   e: excentricidad   T: período sidéreo
  //   M0: anomalía media en J2000.0   lonPeri: longitud del perihelio ϖ
  //   i: inclinación sobre la eclíptica   O: longitud del nodo ascendente Ω
  // Para la Tierra, T es el año anomalístico (propagación de la anomalía media).
  const EARTH = { a: 1, e: 0.016708634, T: 365.259636, M0: 357.5293 * DEG, lonPeri: 102.9372 * DEG, i: 0, O: 0 };
  const PLANETS = {
    mercury: { a: 0.387098, e: 0.205630, T: 87.969,   M0: 174.7948 * DEG, lonPeri: 77.4561 * DEG,  i: 7.00498 * DEG, O: 48.3308 * DEG,  syn: 115.88 },
    venus:   { a: 0.723332, e: 0.006772, T: 224.701,  M0: 50.4161 * DEG,  lonPeri: 131.5637 * DEG, i: 3.39471 * DEG, O: 76.6806 * DEG,  syn: 583.92 },
    mars:    { a: 1.523679, e: 0.093394, T: 686.980,  M0: 19.4125 * DEG,  lonPeri: 336.0408 * DEG, i: 1.84973 * DEG, O: 49.5581 * DEG,  syn: 779.94 },
    jupiter: { a: 5.203363, e: 0.048392, T: 4332.59,  M0: 19.6761 * DEG,  lonPeri: 14.7283 * DEG,  i: 1.30327 * DEG, O: 100.464 * DEG,  syn: 398.88 },
    saturn:  { a: 9.537070, e: 0.054150, T: 10759.22, M0: 317.3460 * DEG, lonPeri: 92.5984 * DEG,  i: 2.48524 * DEG, O: 113.665 * DEG,  syn: 378.09 },
    uranus:  { a: 19.19126, e: 0.047167, T: 30685.4,  M0: 142.2778 * DEG, lonPeri: 170.9543 * DEG, i: 0.77306 * DEG, O: 74.0060 * DEG,  syn: 369.66 },
    neptune: { a: 30.06896, e: 0.008585, T: 60189,    M0: 259.9152 * DEG, lonPeri: 44.9648 * DEG,  i: 1.76995 * DEG, O: 131.784 * DEG,  syn: 367.49 }
  };

  // Nutación IAU 1980, 106 términos (ERFA nut80.c). Por fila: multiplicadores
  // de l, l', F, D, Ω y coeficientes de Δψ (sin) y Δε (cos) en 0.1 mas.
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

  // Precesión general en longitud y oblicuidad media (P03, IAU 2006), nutación
  // IAU 1980 y oblicuidad verdadera. d: días desde J2000.0.
  function frame(d) {
    const T = d / 36525;
    const T2 = T * T, T3 = T2 * T;
    const l  = DEG * (134.96340251 + 1717915923.2178 * T + 31.310 * T2 + 0.064 * T3);
    const lp = DEG * (357.52910000 + 35999.04909 * T - 0.0001559 * T2 - 0.00000048 * T3);
    const F  = DEG * (93.27209062 + 483202.01749 * T - 12.5390 * T2 - 0.0080 * T3);
    const D  = DEG * (297.85019547 + 445267.11140 * T - 5.195 * T2 + 0.007 * T3);
    const Om = DEG * (125.04455501 - 482890.53931 * T + 7.455 * T2 + 0.008 * T3);
    let dp = 0, de = 0;
    for (const t of NUT80) {
      const arg = t[0] * l + t[1] * lp + t[2] * F + t[3] * D + t[4] * Om;
      dp += (t[5] + t[6] * T) * Math.sin(arg);
      de += (t[7] + t[8] * T) * Math.cos(arg);
    }
    const precLon = (5028.796195 * T + 1.1054348 * T2 + 0.00007964 * T3) * ARCSEC;
    const epsMean = (84381.448 - 46.8150 * T - 0.00059 * T2 + 0.001813 * T3) * ARCSEC;
    const deps = de / 1e4 * ARCSEC;
    // Desplazamiento total en longitud: eclíptica J2000 → verdadera de la fecha.
    return { dLon: precLon + dp / 1e4 * ARCSEC, eps: epsMean + deps };
  }

  // Ecuación de Kepler por Newton-Raphson (Meeus, 1998, cap. 30).
  function keplerE(M, e) {
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 10; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  // Posición heliocéntrica en la eclíptica J2000 (+x hacia el equinoccio vernal).
  function helio(el, d) {
    let M = (el.M0 + TAU * d / el.T) % TAU;
    if (M < 0) M += TAU;
    const E = keplerE(M, el.e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + el.e) * Math.sin(E / 2), Math.sqrt(1 - el.e) * Math.cos(E / 2));
    const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(nu));
    const u = el.lonPeri - el.O + nu; // argumento de la latitud ω + ν
    const cu = Math.cos(u), su = Math.sin(u);
    const cO = Math.cos(el.O), sO = Math.sin(el.O), ci = Math.cos(el.i);
    return { x: r * (cO * cu - sO * su * ci), y: r * (sO * cu + cO * su * ci), z: r * su * Math.sin(el.i), M };
  }

  // Constante de aberración anual κ.
  const KAPPA = 20.49552 * ARCSEC;

  // Sol aparente en el día d: ecuación del tiempo E (rad; E > 0 → el Sol
  // verdadero adelanta al medio) y declinación δ (rad).
  //   E_exc = −(2e − e³/4)·sin M − (5/4)e²·sin 2M − (13/12)e³·sin 3M
  //   E_obl = y·sin 2λ − (y²/2)·sin 4λ + (y³/3)·sin 6λ,  y = tan²(ε/2)
  // λ es la longitud aparente: geométrica + aberración anual + precesión + nutación.
  function sun(d) {
    const e = EARTH.e;
    const p = helio(EARTH, d);
    const lamGeo = Math.atan2(-p.y, -p.x);
    // Ápex de la aberración: dirección de la velocidad de la Tierra.
    const p1 = helio(EARTH, d - 0.5), p2 = helio(EARTH, d + 0.5);
    const apex = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const f = frame(d);
    const lam = lamGeo + KAPPA * Math.sin(apex - lamGeo) + f.dLon;
    const y = Math.tan(f.eps / 2) ** 2;
    const M = p.M;
    const exc = -(2 * e - e ** 3 / 4) * Math.sin(M) - (5 / 4) * e * e * Math.sin(2 * M) - (13 / 12) * e ** 3 * Math.sin(3 * M);
    const obl = y * Math.sin(2 * lam) - (y * y / 2) * Math.sin(4 * lam) + (y ** 3 / 3) * Math.sin(6 * lam);
    return { eqTime: exc + obl, decl: Math.asin(Math.sin(f.eps) * Math.sin(lam)) };
  }

  // Posición geocéntrica de un planeta en el día d.
  //   lon, lat: eclípticas verdaderas de la fecha (rad)
  //   ra, dec: ecuatoriales (rad);  sunRa: AR del Sol (rad)
  //   elong: elongación (grados);  east: al este del Sol;  inferior: más cerca que el Sol
  function geo(el, d, f) {
    f = f || frame(d);
    const pe = helio(EARTH, d), pp = helio(el, d);
    const dx = pp.x - pe.x, dy = pp.y - pe.y, dz = pp.z - pe.z;
    const dist = Math.hypot(dx, dy, dz), sunDist = Math.hypot(pe.x, pe.y);
    const lon = Math.atan2(dy, dx) + f.dLon;
    const lat = Math.asin(dz / dist);
    const se = Math.sin(f.eps), ce = Math.cos(f.eps);
    const ra = Math.atan2(Math.sin(lon) * Math.cos(lat) * ce - Math.sin(lat) * se, Math.cos(lon) * Math.cos(lat));
    const dec = Math.asin(Math.sin(lat) * ce + Math.cos(lat) * se * Math.sin(lon));
    const sunLon = Math.atan2(-pe.y, -pe.x) + f.dLon;
    const sunRa = Math.atan2(Math.sin(sunLon) * ce, Math.cos(sunLon));
    const cosEl = -(pe.x * dx + pe.y * dy + pe.z * dz) / (sunDist * dist);
    const elong = Math.acos(Math.max(-1, Math.min(1, cosEl))) / DEG;
    const east = (-pe.x * dy + pe.y * dx) > 0;
    return { lon, lat, ra, dec, sunRa, elong, east, inferior: dist < sunDist };
  }

  // Conjunciones inferiores de un planeta interior en [from, to] (días desde
  // J2000.0): mínimos de elongación con el planeta entre la Tierra y el Sol.
  // Barrido cada `step` días y refinado por sección áurea hasta ~1 minuto.
  function inferiorConjunctions(el, from, to, step) {
    step = step || 0.5;
    const elongAt = d => geo(el, d).elong;
    const out = [];
    let a = elongAt(from), b = elongAt(from + step);
    for (let d = from + step; d + step <= to; d += step) {
      const c = elongAt(d + step);
      if (b < a && b <= c && geo(el, d).inferior) {
        let lo = d - step, hi = d + step;
        const g = (Math.sqrt(5) - 1) / 2;
        while (hi - lo > 1e-3) {
          const m1 = hi - g * (hi - lo), m2 = lo + g * (hi - lo);
          if (elongAt(m1) < elongAt(m2)) hi = m2; else lo = m1;
        }
        const day = (lo + hi) / 2;
        out.push(Object.assign({ day }, geo(el, day)));
      }
      a = b; b = c;
    }
    return out;
  }

  root.Astro = { TAU, DEG, EARTH, PLANETS, frame, helio, sun, geo, inferiorConjunctions };
})(globalThis);
