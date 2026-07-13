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

// ── 1. Ecuación del tiempo ───────────────────────────────────────────────────
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
  const t2 = Math.tan(EPS0 / 2);
  const y = t2 * t2;
  const obl = y * Math.sin(2 * lam) - (y * y / 2) * Math.sin(4 * lam) + (y * y * y / 3) * Math.sin(6 * lam);
  return (exc + obl) * (180 / Math.PI) * 4; // minutos de tiempo
}

function extremos(signoCorregido) {
  const res = [];
  const dt = 0.01;
  let prev = eqTime(0, signoCorregido), prev2 = eqTime(-dt, signoCorregido);
  for (let t = dt; t <= 366; t += dt) {
    const v = eqTime(t, signoCorregido);
    if ((prev > prev2 && prev > v) || (prev < prev2 && prev < v)) {
      res.push({ dia: +(t - dt).toFixed(1), valor: +prev.toFixed(2) });
    }
    prev2 = prev; prev = v;
  }
  return res;
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
  let lon = Math.atan2(gy, gx) / DEG; if (lon < 0) lon += 360;
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
