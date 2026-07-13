import { TAU, DEG, EPS0, ECC0, OMEGA_EARTH, M0_EARTH } from '../core/constants.js';
import { keplerE, orbPos, arrayMin, arrayMax, aberration } from '../core/math.js';

const T = 365.25;
const t2 = Math.tan(EPS0 / 2);
const t4 = t2 * t2 * t2 * t2;
const t6 = t4 * t2 * t2;

export const SOLAR_PTS = (() => {
  const pts = [];
  const steps = 2000;
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * T;
    const ep = orbPos(1, ECC0, T, M0_EARTH, d, OMEGA_EARTH);
    const M = ep.M;
    let lamGeo = Math.atan2(-ep.y, -ep.x);
    if (lamGeo < 0) lamGeo += TAU;
    const ab = aberration(lamGeo, 0, lamGeo);
    const lamApp = ab.lon;
    const exc =
      -(2 * ECC0 - ECC0 ** 3 / 4) * Math.sin(M) -
      (5 * ECC0 ** 2 / 4) * Math.sin(2 * M) -
      (13 * ECC0 ** 3 / 12) * Math.sin(3 * M);
    const obl = t2 * t2 * Math.sin(2 * lamGeo) - (t4 / 2) * Math.sin(4 * lamGeo) + (t6 / 3) * Math.sin(6 * lamGeo);
    const eqT = exc + obl;
    const decl = Math.asin(Math.max(-1, Math.min(1, Math.sin(EPS0) * Math.sin(lamApp))));
    pts.push({ x: eqT, y: decl, em: eqT * (180 / Math.PI) * 4, dd: decl * 180 / Math.PI, day: d });
  }
  return pts;
})();

const sXs = SOLAR_PTS.map(p => p.x), sYs = SOLAR_PTS.map(p => p.y);
export const SX0 = arrayMin(sXs), SX1 = arrayMax(sXs);
export const SY0 = arrayMin(sYs), SY1 = arrayMax(sYs);
export const SXR = SX1 - SX0, SYR = SY1 - SY0;
export const SX0p = SX0 - SXR * 0.18, SX1p = SX1 + SXR * 0.18;
export const SY0p = SY0 - SYR * 0.14, SY1p = SY1 + SYR * 0.14;

export const MONTHS = [['ENE', 0], ['FEB', 31], ['MAR', 59], ['ABR', 90], ['MAY', 120],
  ['JUN', 151], ['JUL', 181], ['AGO', 212], ['SEP', 243], ['OCT', 273], ['NOV', 304], ['DIC', 334]];