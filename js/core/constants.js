export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const EPS0 = 23.4392911 * DEG;
export const ECC0 = 0.016708634;
export const OMEGA_EARTH = 102.9372 * DEG;
export const M0_EARTH = 357.5293 * DEG;
export const EARTH_T = 365.259636;

export const FRAME_TIME = 1000 / 60;

export let isMobile = window.innerWidth < 768;
export const hasLowMemory = (navigator.hardwareConcurrency !== undefined) && (navigator.hardwareConcurrency <= 2);
export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('resize', () => { isMobile = window.innerWidth < 768; });

export const KAPPA = 20.49552 * Math.PI / (180 * 3600);

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
    z: r * su * Math.sin(el.i),
    M, nu
  };
}

export function aberration(lon, lat, sunLon) {
  const dLon = lon - sunLon;
  const dLambda = -KAPPA * Math.cos(dLon);
  const dBeta = -KAPPA * Math.sin(lat) * Math.sin(dLon);
  return { lon: lon + dLambda, lat: lat + dBeta };
}

export function arrayMin(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
export function arrayMax(arr) { let m = arr[0]; for (let i = 1; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }

export function safeSpeed(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const CBG    = ()      => '#12141a';
export const CGRID  = ()      => 'rgba(180,190,210,0.06)';
export const CAXIS  = ()      => 'rgba(180,190,210,0.14)';
export const CBLUE  = (a = 1) => `rgba(160,180,210,${a})`;
export const CWARM  = (a = 1) => `rgba(196,155,114,${a})`;
export const CDOT   = ()      => '#dbb48a';
export const CTTL   = ()      => 'rgba(190,200,215,0.8)';
export const CMON   = (a = 1) => `rgba(160,175,200,${a})`;
export const CLBL   = ()      => 'rgba(180,190,210,0.85)';
export const CRETRO = (a = 1) => `rgba(192,48,48,${a})`;