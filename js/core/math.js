import { TAU, DEG, EPS0, ECC0, OMEGA_EARTH, M0_EARTH, EARTH_T, KAPPA } from './constants.js';

export function keplerE(M, e) {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 10; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

export function orbPos(a, e, T, M0, t, lonPeri) {
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

export function orbPosInc(el, t) {
  let M = (el.M0 + TAU * t / el.T) % TAU;
  if (M < 0) M += TAU;
  const E = keplerE(M, el.e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + el.e) * Math.sin(E / 2),
    Math.sqrt(1 - el.e) * Math.cos(E / 2)
  );
  const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(nu));
  const u = (el.lonPeri - el.O) + nu;
  const cu = Math.cos(u), su = Math.sin(u);
  const cO = Math.cos(el.O), sO = Math.sin(el.O), ci = Math.cos(el.i);
  return {
    x: r * (cO * cu - sO * su * ci),
    y: r * (sO * cu + cO * su * ci),
    z: r * su * Math.sin(el.i)
  };
}

export function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
export function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }

export function aberration(lon, lat, sunLon) {
  const dLon = lon - sunLon;
  const dLambda = -KAPPA * Math.cos(dLon);
  const dBeta = -KAPPA * Math.sin(lat) * Math.sin(dLon);
  return { lon: lon + dLambda, lat: lat + dBeta };
}

export function safeSpeed(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const EARTH_EL = { a: 1, e: ECC0, T: EARTH_T, M0: M0_EARTH, lonPeri: OMEGA_EARTH, i: 0, O: 0 };