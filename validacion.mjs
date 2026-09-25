// Checks the orbital engine (astro.js, the same file the page runs) against
// independent references and exits with code 1 if any case is out of
// tolerance.
//   node validacion.mjs
//
// References: ERFA/SOFA test values and Meeus (1998) for nutation;
// NASA/JPL Horizons (DE441) for positions, the equation of time and events,
// stored in data/horizons.json by tools/fetch-horizons.mjs.
import { readFileSync } from 'node:fs';
import './astro.js';

const { Astro } = globalThis;
const REF = JSON.parse(readFileSync(new URL('./data/horizons.json', import.meta.url), 'utf8'));
const DEG = Math.PI / 180, ARCSEC = DEG / 3600, SEC_PER_RAD = 86400 / (2 * Math.PI);
const J2000 = 2451545.0;
let pass = true;
const check = (ok, msg) => { if (!ok) { pass = false; console.error('   FAIL: ' + msg); } };
const iso = jd => new Date((jd - 2440587.5) * 864e5).toISOString().slice(0, 16).replace('T', ' ');
const wrap180 = x => ((x % 360) + 540) % 360 - 180;

// ── 1. Nutation IAU 1980 ────────────────────────────────────────────────────
console.log('1. Nutation (IAU 1980, 106 terms)\n');
{
  // ERFA t_erfa_c.c, eraNut80(2400000.5, 53736.0).
  const n = Astro.nutation((2400000.5 + 53736.0 - J2000) / 36525);
  const e1 = Math.abs(n.dpsi - -0.000009643658353226563), e2 = Math.abs(n.deps - 0.4060051006879713e-4);
  console.log(`   ERFA test value:  Δψ ${n.dpsi.toExponential(10)} rad, Δε ${n.deps.toExponential(10)} rad (|error| ${Math.max(e1, e2).toExponential(1)})`);
  check(e1 < 1e-12 && e2 < 1e-12, 'nutation differs from ERFA');
  // Meeus (1998), example 22.a: 1987 April 10, 0h TD.
  const m = Astro.nutation((2446895.5 - J2000) / 36525);
  console.log(`   Meeus ex. 22.a:   Δψ ${(m.dpsi / ARCSEC).toFixed(3)}″ (−3.788″), Δε ${(m.deps / ARCSEC).toFixed(3)}″ (+9.443″)`);
  check(Math.abs(m.dpsi / ARCSEC + 3.788) < 0.001 && Math.abs(m.deps / ARCSEC - 9.443) < 0.001, 'Meeus example 22.a');
}

// ── 2. Apparent positions, 1800–2050 ────────────────────────────────────────
// Tolerances: 1.5 × the worst residual of these fixed-rate Keplerian elements
// (JPL quotes nominal heliocentric errors of 10″–600″), so that any
// regression in the pipeline shows up.
const POS_TOL = { sun: 40, mercury: 55, venus: 95, mars: 310, jupiter: 920, saturn: 1250, uranus: 190, neptune: 95 };
console.log('\n2. Apparent geocentric α, δ against JPL Horizons, 1800–2050 (every 250 days)\n');
for (const [body, tol] of Object.entries(POS_TOL)) {
  const rows = REF.positions[body];
  let sq = 0, max = 0, worst = 0;
  for (const [jd, ra, dec] of rows) {
    const d = jd - J2000;
    const g = body === 'sun' ? Astro.sun(d) : Astro.geo(body, d);
    const sep = Math.hypot(wrap180(g.ra / DEG - ra) * Math.cos(dec * DEG), g.dec / DEG - dec) * 3600;
    sq += sep * sep;
    if (sep > max) { max = sep; worst = jd; }
  }
  console.log(`   ${body.padEnd(8)} rms ${Math.sqrt(sq / rows.length).toFixed(1).padStart(6)}″   max ${max.toFixed(1).padStart(6)}″ (${iso(worst).slice(0, 10)})   tolerance ${tol}″`);
  check(max <= tol, `${body}: ${max.toFixed(1)}″ > ${tol}″`);
}

// ── 3. Equation of time ─────────────────────────────────────────────────────
console.log('\n3. Equation of time against JPL Horizons (sundial time at longitude 0, 12:00 UT)\n');
{
  let maxAll = 0, maxSeries = 0;
  for (const [year, rows] of Object.entries(REF.eot)) {
    if (!Array.isArray(rows)) continue;
    let max = 0;
    for (const [jd, sec] of rows) {
      const s = Astro.sun(jd - J2000);
      max = Math.max(max, Math.abs(s.eqTime * SEC_PER_RAD - sec));
      maxSeries = Math.max(maxSeries, Math.abs((s.exc + s.obl - s.eqTime) * SEC_PER_RAD));
    }
    maxAll = Math.max(maxAll, max);
    console.log(`   ${year}: max |ΔE| = ${max.toFixed(2)} s`);
  }
  check(maxAll < 2, `equation of time off by ${maxAll.toFixed(2)} s`);
  console.log(`   Series E_exc + E_obl against the exact E: max ${maxSeries.toFixed(2)} s`);
  check(maxSeries < 1.5, 'series decomposition drifts from the exact equation of time');

  // Extremes in 2024, model and reference found the same way.
  const extremes = f => {
    const out = [];
    for (let i = 1; i < f.length - 1; i++) {
      const [a, b, c] = [f[i - 1][1], f[i][1], f[i + 1][1]];
      if ((b > a && b >= c) || (b < a && b <= c)) {
        const x = 0.5 * (a - c) / (a - 2 * b + c);
        out.push([f[i][0] + x * (f[1][0] - f[0][0]), b - 0.25 * (a - c) * x]);
      }
    }
    return out;
  };
  const d0 = Astro.fromDate(2024, 1, 1);
  const model = extremes(Array.from({ length: 367 }, (_, k) => [d0 + k + J2000, Astro.sun(d0 + k).eqTime * SEC_PER_RAD]));
  const ref = extremes(REF.eot[2024]);
  console.log('\n   2024 extremes (reference sampled every 5 days, parabolic peak):');
  check(model.length === 4 && ref.length === 4, 'expected four extremes in 2024');
  model.slice(0, 4).forEach(([jd, v], k) => {
    const r = ref[k];
    console.log(`   ${iso(jd).slice(0, 10)}  model ${(v / 60).toFixed(3).padStart(7)} min   Horizons ${(r[1] / 60).toFixed(3).padStart(7)} min   Δ ${(v - r[1]).toFixed(2)} s`);
    check(Math.abs(v - r[1]) < 2, `2024 extreme ${k + 1}`);
  });
}

// ── 4. Events, 1995–2035 ────────────────────────────────────────────────────
console.log('\n4. Conjunctions, oppositions and stationary points against JPL Horizons, 1995–2035\n');
const [from, to] = [Astro.fromDate(1995, 1, 1) - 1, Astro.fromDate(2035, 1, 1)];
const EVENTS = [
  ['venusInferiorConjunctions', () => Astro.inferiorConjunctions('venus', from, to), 0.5],
  ['mercuryInferiorConjunctions', () => Astro.inferiorConjunctions('mercury', from, to), 0.25],
  ['marsOppositions', () => Astro.oppositions('mars', from, to), 2],
  ['marsStations', () => Astro.stations('mars', from, to, 2), 2.5],
  ['jupiterOppositions', () => Astro.oppositions('jupiter', from, to), 5],
  ['jupiterStations', () => Astro.stations('jupiter', from, to, 2), 5],
  ['saturnOppositions', () => Astro.oppositions('saturn', from, to), 7],
  ['saturnStations', () => Astro.stations('saturn', from, to, 2), 7]
];
for (const [key, run, tolHours] of EVENTS) {
  const ref = REF.events[key], model = run().map(e => e.day + J2000);
  let max = 0;
  for (const jd of ref) {
    const near = model.reduce((b, x) => Math.abs(x - jd) < Math.abs(b - jd) ? x : b, Infinity);
    max = Math.max(max, Math.abs(near - jd) * 24);
  }
  const extra = model.filter(x => x > ref[0] - 1 && x < ref[ref.length - 1] + 1).length - ref.length;
  console.log(`   ${key.padEnd(28)} ${String(ref.length).padStart(3)} events   max |Δt| ${max.toFixed(2).padStart(5)} h   tolerance ${tolHours} h`);
  check(max <= tolHours, `${key}: ${max.toFixed(2)} h`);
  check(extra === 0, `${key}: ${extra > 0 ? extra + ' spurious' : -extra + ' missing'} events`);
}

// ── 5. Transits of Venus and the pentagram ──────────────────────────────────
console.log('\n5. Venus: transits and the drift of the pentagram\n');
{
  const ics = Astro.inferiorConjunctions('venus', Astro.fromDate(1995, 1, 1), Astro.fromDate(2035, 1, 1));
  const transits = ics.filter(c => {
    const s = Astro.sun(c.day);
    // Angular separation of the centres against the Sun's semidiameter (959.63″ at 1 au).
    const sep = Math.acos(Math.sin(c.dec) * Math.sin(s.dec) + Math.cos(c.dec) * Math.cos(s.dec) * Math.cos(c.ra - s.ra)) / ARCSEC;
    return sep < 959.63 / s.dist;
  }).map(c => iso(c.day + J2000).slice(0, 10));
  console.log(`   Transits 1995–2035: ${transits.join(', ')} (real: 2004-06-08, 2012-06-06)`);
  check(transits.join() === '2004-06-08,2012-06-06', 'transits of Venus not reproduced');

  const cyc = Astro.inferiorConjunctions('venus', Astro.fromDate(2025, 1, 1), Astro.fromDate(2034, 1, 1));
  const drift = wrap180((cyc[5].lon - cyc[0].lon) / DEG);
  console.log(`   Pentagram drift, ${iso(cyc[0].day + J2000).slice(0, 10)} → ${iso(cyc[5].day + J2000).slice(0, 10)}: ${drift.toFixed(2)}° per 8-year cycle (full turn ≈ ${Math.round(360 / Math.abs(drift) * 8)} years)`);
  check(drift < -2 && drift > -2.7, 'pentagram drift out of range');
}

console.log(`\n${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);
