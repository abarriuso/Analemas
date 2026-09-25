// Orbital engine shared by the page (scripts.js) and the validation
// (validacion.mjs). Classic script with no dependencies: it exposes
// globalThis.Astro so that index.html also works opened from file://.
//
// Time argument: d = days since J2000.0 (JD 2451545.0, TT). ΔT = TT − UT1
// is neglected (≤ 70 s over 1800–2050: < 0.2 s in the equation of time).
//
// Pipeline for an apparent geocentric place:
//   Keplerian elements (JPL, 1800–2050) → Kepler's equation → heliocentric
//   J2000 ecliptic → minus Earth (EMB corrected for the Moon), light-time →
//   annual aberration → J2000 equator → IAU 2006 precession → IAU 1980
//   nutation → true equator and equinox of date (α, δ) and true ecliptic (λ, β).
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const ARCSEC = DEG / 3600;
  const J2000 = 2451545.0;
  const C_AU_DAY = 173.1446326742403; // speed of light, au per day
  const EPS0 = 84381.406 * ARCSEC;    // obliquity of the ecliptic at J2000.0 (IAU 2006)

  // Keplerian elements and their rates per Julian century with respect to the
  // mean ecliptic and equinox of J2000, valid 1800–2050 (Standish & Williams,
  // JPL Solar System Dynamics, "Approximate positions of the planets", table 1).
  //   [a (au), e, I (°), L (°), ϖ (°), Ω (°)]  then the same six rates.
  // The "earth" row is the Earth–Moon barycentre (EMB).
  const ELEMENTS = {
    mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
              [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
              [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
    earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
              [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
    mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
              [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
              [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
              [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
    uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
              [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
    neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
              [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]]
  };
  const PLANET_IDS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  // Validity of table 1: 1800-01-01 to 2050-12-31 (days since J2000.0).
  const RANGE = { from: -73048.5, to: 18627 };

  // Mean periods from the mean-longitude rates (days).
  const period = id => 36525 * 360 / ELEMENTS[id][1][3];
  const synodic = id => 1 / Math.abs(1 / period(id) - 1 / period('earth'));

  // Elements at day d (angles in rad).
  function elements(id, d) {
    const [e0, r] = ELEMENTS[id], T = d / 36525;
    const v = e0.map((x, k) => x + r[k] * T);
    return { a: v[0], e: v[1], i: v[2] * DEG, L: v[3] * DEG, peri: v[4] * DEG, node: v[5] * DEG };
  }

  // Kepler's equation M = E − e·sin E by Newton-Raphson (|ΔE| < 1e-12).
  function keplerE(M, e) {
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 15; k++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  const wrapPi = x => x - TAU * Math.round(x / TAU);

  // Heliocentric position (au) in the J2000 ecliptic, +x towards the equinox.
  // For "earth" this is the Earth–Moon barycentre.
  function helio(id, d) {
    const el = elements(id, d);
    const M = wrapPi(el.L - el.peri);
    const E = keplerE(M, el.e);
    const xp = el.a * (Math.cos(E) - el.e);
    const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const w = el.peri - el.node;
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(el.node), sO = Math.sin(el.node);
    const ci = Math.cos(el.i), si = Math.sin(el.i);
    return {
      x: (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
      y: (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
      z: (sw * si) * xp + (cw * si) * yp,
      M, E, el
    };
  }

  // Points of the osculating ellipse of `id` at day d (for orbit drawings).
  function orbit(id, d, n) {
    const el = elements(id, d), pts = [];
    const w = el.peri - el.node, b = el.a * Math.sqrt(1 - el.e * el.e);
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(el.node), sO = Math.sin(el.node);
    const ci = Math.cos(el.i);
    for (let k = 0; k <= n; k++) {
      const E = k / n * TAU, xp = el.a * (Math.cos(E) - el.e), yp = b * Math.sin(E);
      pts.push({ x: (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
                 y: (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp });
    }
    return pts;
  }

  // ── Moon: displacement of the geocentre from the EMB ─────────────────────
  // Main periodic terms of the lunar theory (Meeus, 1998, chap. 47): enough
  // for the 4 700 km EMB → geocentre offset (error < 1 %, i.e. < 50 km).
  const EMRAT1 = 1 / (1 + 81.30056); // M_moon / (M_earth + M_moon)
  function moonOffset(d, pA) {
    const T = d / 36525;
    const Lp = DEG * (218.3164477 + 481267.88123421 * T);
    const D = DEG * (297.8501921 + 445267.1114034 * T);
    const M = DEG * (357.5291092 + 35999.0502909 * T);
    const Mp = DEG * (134.9633964 + 477198.8675055 * T);
    const F = DEG * (93.2720950 + 483202.0175233 * T);
    const lon = Lp + DEG * (6.288774 * Math.sin(Mp) + 1.274027 * Math.sin(2 * D - Mp) +
      0.658314 * Math.sin(2 * D) + 0.213618 * Math.sin(2 * Mp) - 0.185116 * Math.sin(M) -
      0.114332 * Math.sin(2 * F) + 0.058793 * Math.sin(2 * D - 2 * Mp) +
      0.057066 * Math.sin(2 * D - M - Mp) + 0.053322 * Math.sin(2 * D + Mp)) - pA;
    const lat = DEG * (5.128122 * Math.sin(F) + 0.280602 * Math.sin(Mp + F) +
      0.277693 * Math.sin(Mp - F) + 0.173237 * Math.sin(2 * D - F));
    const r = (385000.56 - 20905.355 * Math.cos(Mp) - 3699.111 * Math.cos(2 * D - Mp) -
      2955.968 * Math.cos(2 * D) - 569.925 * Math.cos(2 * Mp)) / 149597870.7;
    const k = -EMRAT1 * r;
    return { x: k * Math.cos(lat) * Math.cos(lon), y: k * Math.cos(lat) * Math.sin(lon), z: k * Math.sin(lat) };
  }

  // ── Nutation IAU 1980, 106 terms (ERFA nut80.c) ──────────────────────────
  // Per row: multipliers of l, l', F, D, Ω and coefficients of Δψ (sin) and
  // Δε (cos) with their rates, in units of 0.1 mas.
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

  // Fundamental arguments of the 1980 theory (ERFA nut80.c): arcseconds plus
  // whole revolutions per century, so that no precision is lost.
  const fundArg = (c0, c1, c2, c3, rev, T) =>
    ((c0 + (c1 + (c2 + c3 * T) * T) * T) * ARCSEC) + TAU * ((rev * T) % 1);

  function nutation(T) {
    const l = fundArg(485866.733, 715922.633, 31.310, 0.064, 1325, T);
    const lp = fundArg(1287099.804, 1292581.224, -0.577, -0.012, 99, T);
    const F = fundArg(335778.877, 295263.137, -13.257, 0.011, 1342, T);
    const D = fundArg(1072261.307, 1105601.328, -6.891, 0.019, 1236, T);
    const Om = fundArg(450160.280, -482890.539, 7.455, 0.008, -5, T);
    let dp = 0, de = 0;
    for (let k = NUT80.length - 1; k >= 0; k--) {
      const t = NUT80[k];
      const arg = t[0] * l + t[1] * lp + t[2] * F + t[3] * D + t[4] * Om;
      dp += (t[5] + t[6] * T) * Math.sin(arg);
      de += (t[7] + t[8] * T) * Math.cos(arg);
    }
    return { dpsi: dp * 1e-4 * ARCSEC, deps: de * 1e-4 * ARCSEC };
  }

  // ── Rotation matrices (IERS convention: rotation of the frame) ────────────
  const R1 = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
  const R2 = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
  const R3 = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };
  const mul = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const apply = (A, v) => [0, 1, 2].map(i => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]);

  // Reference frame at day d:
  //   epsA: mean obliquity, eps: true obliquity, dpsi/deps: nutation,
  //   pA: general precession in longitude (IAU 2006, Capitaine et al. 2003),
  //   Q: matrix J2000 ecliptic → true equator and equinox of date.
  const frameCache = new Map();
  function frame(d) {
    const key = Math.round(d * 1e4);
    const hit = frameCache.get(key);
    if (hit) return hit;
    const t = d / 36525;
    const poly = c => c.reduceRight((acc, x) => acc * t + x, 0) * ARCSEC;
    const zetaA = poly([2.650545, 2306.083227, 0.2988499, 0.01801828, -0.000005971, -0.0000003173]);
    const zA = poly([-2.650545, 2306.077181, 1.0927348, 0.01826837, -0.000028596, -0.0000002904]);
    const thetaA = poly([0, 2004.191903, -0.4294934, -0.04182264, -0.000007089, -0.0000001274]);
    const epsA = poly([84381.406, -46.836769, -0.0001831, 0.00200340, -0.000000576, -0.0000000434]);
    const pA = poly([0, 5028.796195, 1.1054348, 0.00007964, -0.000023857, -0.0000000383]);
    const { dpsi, deps } = nutation(t);
    const eps = epsA + deps;
    const P = mul(R3(-zA), mul(R2(thetaA), R3(-zetaA)));
    const N = mul(R1(-eps), mul(R3(-dpsi), R1(epsA)));
    const f = { epsA, eps, dpsi, deps, pA, Q: mul(N, mul(P, R1(-EPS0))) };
    if (frameCache.size > 20000) frameCache.clear();
    frameCache.set(key, f);
    return f;
  }

  // Geocentre (not the EMB) in the J2000 ecliptic.
  function earth(d, f) {
    const p = helio('earth', d), m = moonOffset(d, (f || frame(d)).pA);
    return { x: p.x + m.x, y: p.y + m.y, z: p.z + m.z, M: p.M, el: p.el };
  }

  // Heliocentric velocity of the EMB (au/day), by central differences.
  function earthVel(d) {
    const h = 0.05, a = helio('earth', d - h), b = helio('earth', d + h);
    return [(b.x - a.x) / (2 * h), (b.y - a.y) / (2 * h), (b.z - a.z) / (2 * h)];
  }

  // Apparent place of a geocentric J2000-ecliptic vector g seen by an
  // observer moving with velocity v: annual aberration to first order,
  // then rotation to the true equator/ecliptic of date.
  function place(g, v, f) {
    const r = Math.hypot(g[0], g[1], g[2]);
    let u = g.map(x => x / r);
    const uv = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / C_AU_DAY;
    u = u.map((x, k) => x + v[k] / C_AU_DAY - x * uv);
    const q = apply(f.Q, u), n = Math.hypot(q[0], q[1], q[2]);
    const ce = Math.cos(f.eps), se = Math.sin(f.eps);
    const ex = q[0], ey = ce * q[1] + se * q[2], ez = -se * q[1] + ce * q[2];
    return {
      ra: (Math.atan2(q[1], q[0]) + TAU) % TAU,
      dec: Math.asin(q[2] / n),
      lon: (Math.atan2(ey, ex) + TAU) % TAU,
      lat: Math.asin(ez / n),
      dist: r
    };
  }

  // Apparent geocentric Sun at day d.
  //   eqTime: equation of time (rad; > 0 → the true Sun is ahead of the mean
  //   Sun), from its definition E = GHA(true Sun) − (UT − 12 h), with the
  //   Earth rotation angle and the IAU 2006 sidereal-time polynomial.
  //   exc, obl: the classic series split (Meeus, 1998, chap. 28), kept to show
  //   the two physical effects; exc + obl agrees with eqTime to < 1 s.
  function sun(d) {
    const f = frame(d), pe = earth(d, f);
    const s = place([-pe.x, -pe.y, -pe.z], earthVel(d), f);
    const t = d / 36525;
    const gmstPoly = (0.014506 + (4612.156534 + (1.3915817 + (-0.00000044 +
      (-0.000029956 - 0.0000000368 * t) * t) * t) * t) * t) * ARCSEC;
    // ERA − 2π·(mean solar time since noon) reduces to the mean Sun's RA.
    const meanSun = TAU * ((0.7790572732640 + 0.00273781191135448 * d) % 1) + gmstPoly;
    const eqTime = wrapPi(meanSun + f.dpsi * Math.cos(f.epsA) - s.ra);
    const e = pe.el.e, M = pe.M, y = Math.tan(f.eps / 2) ** 2, lam = s.lon;
    const exc = -(2 * e - e ** 3 / 4) * Math.sin(M) - (5 / 4) * e * e * Math.sin(2 * M) - (13 / 12) * e ** 3 * Math.sin(3 * M);
    const obl = y * Math.sin(2 * lam) - (y * y / 2) * Math.sin(4 * lam) + (y ** 3 / 3) * Math.sin(6 * lam);
    return { ra: s.ra, dec: s.dec, lon: s.lon, dist: s.dist, decl: s.dec, eqTime, exc, obl, M, eps: f.eps };
  }

  // Apparent geocentric position of a planet at day d (light-time corrected).
  //   ra, dec: true equator of date;  lon, lat: true ecliptic of date (rad)
  //   dist: au;  elong: elongation (°);  east: east of the Sun;
  //   inferior: closer than the Sun;  sunLon, sunRa: apparent Sun (rad)
  //   helio / earthPos: heliocentric J2000 positions used (for drawings)
  function geo(id, d) {
    const f = frame(d), pe = earth(d, f), v = earthVel(d);
    let tau = 0, pp, g;
    for (let k = 0; k < 3; k++) {
      pp = helio(id, d - tau);
      g = [pp.x - pe.x, pp.y - pe.y, pp.z - pe.z];
      tau = Math.hypot(g[0], g[1], g[2]) / C_AU_DAY;
    }
    const p = place(g, v, f);
    const s = place([-pe.x, -pe.y, -pe.z], v, f);
    const cosEl = Math.cos(p.lat) * Math.cos(s.lat) * Math.cos(p.lon - s.lon) + Math.sin(p.lat) * Math.sin(s.lat);
    return Object.assign(p, {
      sunLon: s.lon, sunRa: s.ra,
      elong: Math.acos(Math.max(-1, Math.min(1, cosEl))) / DEG,
      east: wrapPi(p.lon - s.lon) > 0,
      inferior: p.dist < s.dist,
      helio: pp, earthPos: pe
    });
  }

  // ── Event search ─────────────────────────────────────────────────────────
  // Root of f in [a, b] by bisection (f(a), f(b) with opposite signs).
  function bisect(fn, a, b, tol) {
    let fa = fn(a);
    while (b - a > tol) {
      const m = (a + b) / 2, fm = fn(m);
      if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }

  // Days in [from, to] where g(d) (an angle) crosses zero upwards or downwards,
  // sampled every `step` days and refined to ~1 minute.
  function crossings(g, from, to, step) {
    const out = [];
    let a = from, ga = g(a);
    for (let b = from + step; b <= to; b += step) {
      const gb = g(b);
      if ((ga < 0) !== (gb < 0) && Math.abs(gb - ga) < Math.PI) out.push(bisect(g, a, b, 1e-3));
      a = b; ga = gb;
    }
    return out;
  }

  // Conjunctions in ecliptic longitude (λ − λ☉ = 0) of an inner planet with
  // the Sun, keeping the inferior ones (planet between the Earth and the Sun).
  function inferiorConjunctions(id, from, to, step) {
    return crossings(d => { const g = geo(id, d); return wrapPi(g.lon - g.sunLon); }, from, to, step || 2)
      .map(day => Object.assign({ day }, geo(id, day)))
      .filter(c => c.inferior);
  }

  // Oppositions (λ − λ☉ = 180°) of an outer planet.
  function oppositions(id, from, to, step) {
    return crossings(d => { const g = geo(id, d); return wrapPi(g.lon - g.sunLon - Math.PI); }, from, to, step || 4)
      .map(day => Object.assign({ day }, geo(id, day)));
  }

  // Stationary points in longitude (dλ/dt = 0) in [from, to]: type 'retro'
  // where retrograde motion begins, 'direct' where it ends.
  function stations(id, from, to, step) {
    const rate = d => wrapPi(geo(id, d + 0.05).lon - geo(id, d - 0.05).lon);
    let a = from, ra = rate(a);
    const out = [];
    for (let b = from + (step || 1); b <= to; b += step || 1) {
      const rb = rate(b);
      if ((ra < 0) !== (rb < 0)) {
        const day = bisect(rate, a, b, 1e-3);
        out.push(Object.assign({ day, type: rb < 0 ? 'retro' : 'direct' }, geo(id, day)));
      }
      a = b; ra = rb;
    }
    return out;
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  const MS_J2000 = Date.UTC(2000, 0, 1, 12);
  const toDate = d => new Date(MS_J2000 + d * 864e5);
  const fromDate = (y, m, day) => (Date.UTC(y, m - 1, day, 12) - MS_J2000) / 864e5;

  root.Astro = {
    TAU, DEG, ARCSEC, J2000, RANGE, PLANET_IDS, ELEMENTS,
    elements, period, synodic, keplerE, helio, orbit, earth, frame, nutation,
    sun, geo, inferiorConjunctions, oppositions, stations, crossings, wrapPi,
    toDate, fromDate
  };
})(globalThis);
