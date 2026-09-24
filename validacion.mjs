// Valida el motor orbital (astro.js, el mismo que usa la página) frente a
// referencias publicadas. Sale con código 1 si algún caso supera su tolerancia.
//   node validacion.mjs
import './astro.js';

const { Astro } = globalThis;
const MIN_PER_RAD = (180 / Math.PI) * 4;
let pass = true;
const fail = msg => { pass = false; console.error('FAIL: ' + msg); };

// ── 1. Extremos de la ecuación del tiempo (Astronomical Almanac 2024) ────────
const EOT_REF = [
  { name: 'Mínimo principal  (~11-12 feb)', min: -14.24 },
  { name: 'Máximo secundario (~14 may)   ', min: +3.74 },
  { name: 'Mínimo secundario (~26 jul)   ', min: -6.46 },
  { name: 'Máximo principal  (~3 nov)    ', min: +16.46 }
];
const EOT_TOL = 0.1; // min

const dt = 0.05;
const eot = [];
for (let d = 0; d <= 366; d += dt) eot.push({ d, v: Astro.sun(d).eqTime * MIN_PER_RAD });
const extremes = [];
for (let i = 1; i < eot.length - 1; i++) {
  const { v } = eot[i];
  if ((v > eot[i - 1].v && v >= eot[i + 1].v) || (v < eot[i - 1].v && v <= eot[i + 1].v)) extremes.push(eot[i]);
}

console.log('1. Ecuación del tiempo — extremos del modelo frente a USNO/HMNAO 2024\n');
if (extremes.length !== 4) fail(`${extremes.length} extremos detectados (esperados 4)`);
extremes.slice(0, 4).forEach((x, k) => {
  const ref = EOT_REF[k];
  const delta = x.v - ref.min;
  console.log(`   ${ref.name}  ref ${ref.min.toFixed(2).padStart(6)} · modelo ${x.v.toFixed(2).padStart(6)} min (día ${x.d.toFixed(1)}) · Δ ${delta.toFixed(2)}`);
  if (Math.abs(delta) > EOT_TOL) fail(`${ref.name.trim()}: |Δ| = ${Math.abs(delta).toFixed(2)} min > ${EOT_TOL}`);
});

// ── 2. Conjunciones inferiores de Venus y deriva del pentagrama ──────────────
const J2000 = Date.UTC(2000, 0, 1, 12);
const REAL = ['2001-03-30', '2002-10-31', '2004-06-08', '2006-01-13', '2007-08-18', '2009-03-27'];
const DATE_TOL = 1; // día
const ics = Astro.inferiorConjunctions(Astro.PLANETS.venus, 0, 8 * 365.25 + 600);

console.log('\n2. Venus — conjunciones inferiores (modelo 3D con i, Ω)\n');
if (ics.length < 6) fail(`${ics.length} conjunciones inferiores detectadas (esperadas 6)`);
ics.slice(0, 6).forEach((c, k) => {
  const date = new Date(J2000 + c.day * 864e5);
  const off = (date - Date.parse(REAL[k] + 'T12:00Z')) / 864e5;
  console.log(`   CI ${k + 1}: ${date.toISOString().slice(0, 16)} (real ${REAL[k]}) · λ = ${(((c.lon / Astro.DEG) % 360 + 360) % 360).toFixed(2)}° · elong = ${c.elong.toFixed(2)}°`);
  if (Math.abs(off) > DATE_TOL) fail(`CI ${k + 1} desviada ${off.toFixed(1)} d`);
});
// Tránsito de 2004: la elongación mínima debe quedar dentro del disco solar (~0.27°).
if (ics[2] && ics[2].elong > 0.27) fail(`tránsito de 2004 no reproducido (elong ${ics[2].elong.toFixed(2)}°)`);

if (ics.length >= 6) {
  let drift = (ics[5].lon - ics[0].lon) / Astro.DEG;
  drift -= 360 * Math.round(drift / 360);
  console.log(`\n   Deriva del pentagrama por ciclo de 8 años: ${drift.toFixed(2)}° (precesión completa ≈ ${Math.round(360 / Math.abs(drift) * 8)} años)`);
}

console.log(`\n${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);
