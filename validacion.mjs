// =============================================================================
// validacion.mjs — Casos de validación reproducibles del motor orbital
// Ejecutar:  node validacion.mjs
//
// 1. Ecuación del tiempo: extremos del modelo frente al Astronomical Almanac
//    (USNO/HMNAO, 2024). Compara la serie corregida con la serie con el signo
//    erróneo en el término (5/4)e²·sin(2M) que estuvo publicado hasta jun 2026.
// 2. Pentagrama de Venus: fechas de las conjunciones inferiores del modelo
//    (con inclinación orbital i, Ω) frente a las fechas reales, y deriva del
//    pentagrama por ciclo de 8 años (no-cierre de la resonancia 8:13:5).
// =============================================================================

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Parámetros J2000.0 (Standish et al. 1992, Explanatory Supplement, tabla 5.8.1)
const EPS0 = 23.4392911 * DEG;
const ECC0 = 0.016708634;
const OMEGA_EARTH = 102.9372 * DEG;
const M0_EARTH = 357.5293 * DEG;

function keplerE(M, e) {
  let E = M;
  for (let i = 0; i < 10; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Posición heliocéntrica 3D (eclíptica J2000, +x → equinoccio vernal)
function orbPos3D(el, t) {
  let M = (el.M0 + TAU * t / el.T) % TAU;
  if (M < 0) M += TAU;
  const E = keplerE(M, el.e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + el.e) * Math.sin(E / 2),
    Math.sqrt(1 - el.e) * Math.cos(E / 2)
  );
  const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(nu));
  const i = el.i || 0, O = el.O || 0;
  const w = el.lonPeri - O;          // argumento del perihelio ω = ϖ − Ω
  const u = w + nu;                  // argumento de la latitud
  return {
    x: r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i)),
    y: r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i)),
    z: r * Math.sin(u) * Math.sin(i),
    M, nu
  };
}

const EARTH = { a: 1, e: ECC0, T: 365.259636, M0: M0_EARTH, lonPeri: OMEGA_EARTH };
const VENUS = {
  a: 0.72333, e: 0.00677, T: 224.701,
  M0: 50.4161 * DEG, lonPeri: 131.5637 * DEG,
  i: 3.39471 * DEG, O: 76.68069 * DEG
};

// ── Aberración anual + nutación IAU 1980 (espejo de scripts.js para validar EoT aparente) ──
const ARCSEC2RAD = Math.PI / (180 * 3600);
const KAPPA = 20.49552 * ARCSEC2RAD; // constante de aberración
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
function precessionState(days) {
  const T = days / 36525.0;
  const pA = (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T) * ARCSEC2RAD;
  const epsMean = (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) * ARCSEC2RAD;
  return { precLon: pA, epsMean };
}
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
    const arg = t[0]*l + t[1]*lp + t[2]*F + t[3]*D + t[4]*Om;
    dp += (t[5] + t[6]*T) * Math.sin(arg);
    de += (t[7] + t[8]*T) * Math.cos(arg);
  }
  const pre = precessionState(days);
  return { dpsi: dp/10000*ARCSEC2RAD, deps: de/10000*ARCSEC2RAD, precLon: pre.precLon, epsTrue: pre.epsMean + de/10000*ARCSEC2RAD };
}
function aberration(lon, lat, L) {
  const dLon = L - lon;
  const dLambda = KAPPA * Math.sin(dLon) / (Math.cos(lat) + 1e-300);
  const dBeta = KAPPA * Math.sin(lat) * Math.cos(dLon);
  return { lon: lon + dLambda, lat: lat + dBeta };
}

// ── 1. Ecuación del tiempo (modelo APARANTE: aberración + nutación IAU 1980) ──
function eqTime(t, signoCorregido) {
  const ep = orbPos3D(EARTH, t);
  const M = ep.M;
  let lam = Math.atan2(-ep.y, -ep.x);
  if (lam < 0) lam += TAU;
  const e = ECC0;
  const s2 = signoCorregido ? -1 : +1; // signo del término (5/4)e²·sin(2M)
  const exc =
    -(2 * e - e * e * e / 4) * Math.sin(M) +
    s2 * (5 * e * e / 4) * Math.sin(2 * M) -
    (13 * e * e * e / 12) * Math.sin(3 * M);
  const h = 0.5;
  const e1 = orbPos3D(EARTH, t - h), e2 = orbPos3D(EARTH, t + h);
  const velLon = Math.atan2(e2.y - e1.y, e2.x - e1.x);
  const ab = aberration(lam, 0, velLon);
  const nu = nutationState(t);
  const lamApp = ab.lon + nu.dpsi + nu.precLon;  // long. aparente (aberr. + nut. + precesión)
  const eps = nu.epsTrue;                  // oblicuidad verdadera (precesión + Δε)
  const t2 = Math.tan(eps / 2);
  const y = t2 * t2;
  const obl = y * Math.sin(2 * lamApp) - (y * y / 2) * Math.sin(4 * lamApp) + (y * y * y / 3) * Math.sin(6 * lamApp);
  return (exc + obl) * (180 / Math.PI) * 4; // minutos de tiempo
}

// Detecta extremos locales por cambio de signo de la derivada primera (robusto
// frente al jitter de redondeo en las cimas planas de la EoT). Fusiona clusters
// de picos espuriados a menos de 2 días, conservando el valor más extremo.
function extremos(signoCorregido) {
  const dt = 0.05;
  const vals = [];
  for (let t = 0; t <= 366 + dt; t += dt) vals.push({ t, v: eqTime(t, signoCorregido) });
  const raw = [];
  for (let i = 1; i < vals.length - 1; i++) {
    const d1 = vals[i].v - vals[i - 1].v;
    const d2 = vals[i + 1].v - vals[i].v;
    if (d1 > 0 && d2 < 0) raw.push({ t: vals[i].t, v: vals[i].v, max: true });
    else if (d1 < 0 && d2 > 0) raw.push({ t: vals[i].t, v: vals[i].v, max: false });
  }
  const merged = [];
  for (const p of raw) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(p.t - last.t) < 2 && p.max === last.max) {
      if (p.max ? p.v > last.v : p.v < last.v) { last.t = p.t; last.v = p.v; }
    } else merged.push({ ...p });
  }
  return merged.map(p => ({ dia: +p.t.toFixed(1), valor: +p.v.toFixed(2) }));
}

// Referencia: Astronomical Almanac 2024 (USNO/HMNAO)
const REF = [
  { nombre: 'Mínimo principal  (~11-12 feb)', valor: -14.24 },
  { nombre: 'Máximo secundario (~14 may)   ', valor: +3.74 },
  { nombre: 'Mínimo secundario (~26 jul)   ', valor: -6.46 },
  { nombre: 'Máximo principal  (~3 nov)    ', valor: +16.46 }
];

console.log('═══ 1. ECUACIÓN DEL TIEMPO — extremos del modelo vs USNO 2024 ═══\n');
for (const corregido of [false, true]) {
  const ext = extremos(corregido).filter(x => Math.abs(x.valor) > 2);
  console.log(corregido
    ? '— Serie corregida  E_exc = −(2e−e³/4)·sinM − (5/4)e²·sin2M − (13/12)e³·sin3M'
    : '— Serie ANTERIOR (signo +(5/4)e²·sin2M, erróneo)');
  ext.slice(0, 4).forEach((x, k) => {
    const d = (x.valor - REF[k].valor).toFixed(2);
    console.log(`   ${REF[k].nombre}  ref ${REF[k].valor.toFixed(2).padStart(7)} min · modelo ${x.valor.toFixed(2).padStart(7)} min (día ${x.dia}) · Δ = ${d} min`);
  });
  console.log('');
}

// ── 2. Venus: conjunciones inferiores y deriva del pentagrama ────────────────
console.log('═══ 2. VENUS — conjunciones inferiores (modelo 3D con i, Ω) ═══\n');
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const pts = [];
for (let d = 0; d <= 8 * 365.25 + 600; d += 0.05) {
  const pe = orbPos3D(EARTH, d);
  const pv = orbPos3D(VENUS, d);
  const gx = pv.x - pe.x, gy = pv.y - pe.y, gz = pv.z - pe.z;
  const sx = -pe.x, sy = -pe.y, sz = -pe.z;
  const gm = Math.hypot(gx, gy, gz), sm = Math.hypot(sx, sy, sz);
  const elong = Math.acos(Math.max(-1, Math.min(1, (gx * sx + gy * sy + gz * sz) / (gm * sm)))) / DEG;
  const nutV = nutationState(d);
  let lon = (Math.atan2(gy, gx) + nutV.dpsi + nutV.precLon) / DEG; if (lon < 0) lon += 360;
  pts.push({ d, elong, lon, inferior: gm < sm });
}
const ics = [];
for (let i = 1; i < pts.length - 1; i++) {
  if (pts[i].inferior && pts[i].elong < pts[i - 1].elong && pts[i].elong < pts[i + 1].elong) {
    ics.push(pts[i]);
  }
}
// Fechas reales de conjunción inferior (Astronomical Almanac / JPL Horizons)
const REALES = ['2001-03-30', '2002-10-31', '2004-06-08', '2006-01-13', '2007-08-18', '2009-03-27'];
ics.slice(0, 6).forEach((c, k) => {
  const fecha = new Date(J2000 + c.d * 86400000).toISOString().slice(0, 10);
  console.log(`   CI ${k + 1}: día ${c.d.toFixed(1).padStart(7)} → ${fecha} (real ${REALES[k] || '—'}) · λ_geo = ${c.lon.toFixed(2)}° · elong = ${c.elong.toFixed(2)}°`);
});
if (ics.length >= 6) {
  let drift = ics[5].lon - ics[0].lon;
  if (drift > 180) drift -= 360;
  if (drift < -180) drift += 360;
  console.log(`\n   Deriva del pentagrama por ciclo de 8 años: ${drift.toFixed(2)}°  (no-cierre de la resonancia 8:13:5)`);
  console.log(`   Rotación completa del pentagrama: ≈ ${(360 / Math.abs(drift) * 8).toFixed(0)} años`);
}

// Elongaciones máximas del modelo (rango real: ~45°–47°)
const maxE = [];
for (let i = 1; i < pts.length - 1; i++) {
  if (pts[i].elong > pts[i - 1].elong && pts[i].elong >= pts[i + 1].elong && pts[i].elong > 40) maxE.push(pts[i].elong);
}
console.log(`\n   Elongaciones máximas del modelo: ${Math.min(...maxE).toFixed(1)}° – ${Math.max(...maxE).toFixed(1)}° (referencia: 45°–47°)`);

// ── 3. Verificación de regresión (exit code) ─────────────────────────────────
let pass = true;
const extCorregido = extremos(true).filter(x => Math.abs(x.valor) > 2).slice(0, 4);
if (extCorregido.length < 4) { pass = false; process.stderr.write(`FAIL: Solo ${extCorregido.length} extremos detectados (esperados ≥4)\n`); }
extCorregido.forEach((x, k) => {
  const d = Math.abs(x.valor - REF[k].valor);
  if (d > 1.0) { pass = false; process.stderr.write(`FAIL: ${REF[k].nombre} Δ=${d.toFixed(2)} min (umbral: 1.0 min)\n`); }
});
if (ics.length < 5) { pass = false; process.stderr.write(`FAIL: Solo ${ics.length} conjunciones inferiores detectadas (esperadas ≥5)\n`); }
console.log(`\n═══ RESULTADO: ${pass ? 'PASS' : 'FAIL'} ═══`);
process.exit(pass ? 0 : 1);
