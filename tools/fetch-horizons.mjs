// Builds data/horizons.json, the reference data for validacion.mjs, from the
// NASA/JPL Horizons API (DE441). Needs network access; the result is
// committed so that the tests run offline.
//   node tools/fetch-horizons.mjs
import { writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const BODIES = { sun: '10', mercury: '199', venus: '299', mars: '499', jupiter: '599', saturn: '699', uranus: '799', neptune: '899' };
const EOT_YEARS = [1805, 1900, 1950, 2000, 2024, 2050];
const EVENTS_SPAN = ['1995-01-01', '2035-01-01'];

async function horizons(params) {
  const q = new URLSearchParams({
    format: 'text', OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER',
    CAL_FORMAT: 'JD', ANG_FORMAT: 'DEG', EXTRA_PREC: 'YES', ...params
  });
  for (const [k, v] of Object.entries(params)) q.set(k, `'${v}'`);
  const text = await (await fetch(`${API}?${q}`)).text();
  const body = text.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(`Horizons: no table for ${JSON.stringify(params)}\n${text.slice(0, 400)}`);
  // Rows: JD, optional solar/lunar presence flags, then numbers.
  return body.trim().split('\n').map(l => l.trim().split(/\s+/).filter(x => /^[-+.\d]/.test(x)).map(Number));
}

const round = (x, k) => Number(x.toFixed(k));
const wrap180 = x => ((x % 360) + 540) % 360 - 180;

// Zero of a sampled series f (unit step) between i and i+1, by bisection on
// the cubic through f[i-1..i+2].
function cubicZero(f, i) {
  const p = [f[i - 1], f[i], f[i + 1], f[i + 2]], xs = [-1, 0, 1, 2];
  const L = x => p.reduce((s, pa, a) => s + pa * xs.reduce((t, xb, b) => b === a ? t : t * (x - xb) / (xs[a] - xb), 1), 0);
  let lo = 0, hi = 1;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if ((L(m) < 0) === (L(lo) < 0)) lo = m; else hi = m; }
  return i + (lo + hi) / 2;
}
function zeros(f) {
  const out = [];
  for (let i = 1; i < f.length - 2; i++) {
    if ((f[i] < 0) !== (f[i + 1] < 0) && Math.abs(f[i + 1] - f[i]) < 90) out.push(cubicZero(f, i));
  }
  return out;
}

const out = {
  source: 'NASA/JPL Horizons API (planetary ephemeris DE441), retrieved with tools/fetch-horizons.mjs',
  retrieved: new Date().toISOString().slice(0, 10),
  positions: {}, eot: {}, events: {}
};

// 1. Apparent geocentric RA/Dec (true equator and equinox of date), TT.
for (const [name, id] of Object.entries(BODIES)) {
  const rows = await horizons({ COMMAND: id, CENTER: '500@399', START_TIME: '1800-01-02', STOP_TIME: '2050-12-31', STEP_SIZE: '250d', QUANTITIES: '2', TIME_TYPE: 'TT' });
  out.positions[name] = rows.map(r => [round(r[0], 1), round(r[1], 6), round(r[2], 6)]);
}
out.positions.note = '[JD (TT), RA (deg), Dec (deg)], airless apparent, geocentric';

// 2. Equation of time: local apparent solar time at longitude 0 at 12:00 UT.
for (const y of EOT_YEARS) {
  const rows = await horizons({ COMMAND: '10', CENTER: 'coord@399', COORD_TYPE: 'GEODETIC', SITE_COORD: '0,0,0', START_TIME: `${y}-01-01 12:00`, STOP_TIME: `${y}-12-31 12:00`, STEP_SIZE: '5d', QUANTITIES: '34' });
  out.eot[y] = rows.map(r => [round(r[0], 1), round((r[1] - 12) * 3600, 3)]);
}
out.eot.note = '[JD (UT), E in seconds of time] = local apparent solar time − 12 h at longitude 0, 12:00 UT';

// 3. Events from daily apparent ecliptic longitudes (of date).
const daily = {};
for (const name of ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
  daily[name] = await horizons({ COMMAND: BODIES[name], CENTER: '500@399', START_TIME: EVENTS_SPAN[0], STOP_TIME: EVENTS_SPAN[1], STEP_SIZE: '1d', QUANTITIES: '31', TIME_TYPE: 'TT' });
}
const jd0 = daily.sun[0][0];
const toJd = x => round(jd0 + x, 4);
for (const name of ['mercury', 'venus']) {
  // Conjunctions in longitude; inferior ones have the planet moving westwards.
  const f = daily[name].map((r, i) => wrap180(r[1] - daily.sun[i][1]));
  out.events[`${name}InferiorConjunctions`] = zeros(f).filter(x => f[Math.floor(x) - 1] > f[Math.floor(x) + 2]).map(toJd);
}
for (const name of ['mars', 'jupiter', 'saturn']) {
  const lon = daily[name].map(r => r[1]);
  const f = lon.map((l, i) => wrap180(l - daily.sun[i][1] - 180));
  out.events[`${name}Oppositions`] = zeros(f).filter(x => f[Math.floor(x)] > f[Math.floor(x) + 1]).map(toJd);
  const rate = lon.map((l, i) => (i > 0 && i < lon.length - 1) ? wrap180(lon[i + 1] - lon[i - 1]) : 0).slice(1, -1);
  out.events[`${name}Stations`] = zeros(rate).map(x => toJd(x + 1));
}
out.events.note = `JD (TT) derived from daily apparent ecliptic longitudes ${EVENTS_SPAN.join(' – ')} by cubic interpolation`;

writeFileSync(new URL('../data/horizons.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('data/horizons.json written');
