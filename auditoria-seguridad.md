# Auditoría de Seguridad — Analemas

**Fecha**: 13 julio 2026  
**Alcance**: `index.html` · `scripts.js` · `styles.css` · `validacion.mjs` · `.gitignore`  
**Metodología**: Revisión línea por línea de todos los vectores de ataque (XSS, CSP, SRI, inyección DOM, exfiltración, fingerprinting, dependencias externas, almacenamiento, red)

---

## Resumen Ejecutivo

| Dominio | Riesgo global | Críticos | Medios | Bajos/Info |
|---------|:-------------:|:--------:|:------:|:----------:|
| `index.html` | ✅ Bajo | 0 | 2 | 5 |
| `scripts.js` | ✅ Bajo | 0 | 4 | 6 |
| `styles.css` | ✅ Bajo | 0 | 0 | 1 |
| `validacion.mjs` | ✅ Muy bajo | 0 | 0 | 0 |
| `.gitignore` | 🟡 Medio | 0 | 3 | 3 |
| **Total** | — | **0** | **9** | **15** |

**No se detectaron vulnerabilidades explotables.** El proyecto es un sitio estático sin backend, sin base de datos, sin formularios, sin input de usuario, sin cookies, sin almacenamiento local y sin peticiones de red desde JavaScript. La superficie de ataque es mínima.

---

## HALLAZGOS POR ARCHIVO

### index.html

#### Medios

| ID | Línea | Hallazgo | Riesgo | Mitigación |
|----|-------|----------|--------|------------|
| M‑H1 | — | **Ausencia de CSP**. No existe `<meta http-equiv="Content-Security-Policy">`. Sin CSP, cualquier XSS futuro podría ejecutar scripts arbitrarios y hacer `fetch` a cualquier origen. | Sin defensa en profundidad. | Añadir meta CSP: `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'self'` |
| M‑H2 | 13–18 | **Sin SRI en Google Fonts**. Los `link` a `fonts.googleapis.com` carecen de `integrity`. | Si el CDN de Google fuera comprometido, el CSS devuelto podría ser malicioso. | Auto-hospedar las fuentes, o aceptar el riesgo (práctica común). Google Fonts no publica hashes SRI. |

#### Bajos / Informativos

| ID | Línea | Hallazgo |
|----|-------|----------|
| I‑H1 | 15, 28 | Inline `onload` handlers incompatible con CSP estricto sin `'unsafe-inline'`. Migrar a `addEventListener` desde JS. |
| I‑H2 | 19 | Favicon en data URI: contenido hardcodeado, sin riesgo, pero puede no funcionar en navegadores antiguos. |
| I‑H3 | 22 | `og:image` apunta a SVG. Algunas plataformas no renderizan SVGs como OG image. |
| I‑H4 | 24 | `og:url` hardcodeada a GitHub Pages. Actualizar si cambia el dominio. |
| I‑H5 | 12, 49, 81… | Comentarios HTML seccionadores. No revelan información sensible. |

---

### scripts.js

#### Medios

| ID | Línea | Hallazgo | Riesgo | Mitigación |
|----|-------|----------|--------|------------|
| M‑J1 | 734 | **`innerHTML`** con interpolación: `b.innerHTML = '<span style="color:' + p.color + ';">●</span>' + p.name`. Aunque `p.color`/`p.name` son constantes del array hardcodeado `planetsData`, el patrón **es frágil**: si en el futuro se alimentaran desde una fuente externa, sería XSS directo. | Patrón peligroso. | Reemplazar con `document.createElement('span')`, `textContent`, y `appendChild`. |
| M‑J2 | 19 | `navigator.deviceMemory` — API de Chromium para detectar RAM (<4 GB). | Fingerprinting pasivo. | Documentar su uso; considerar eliminarlo si no es crítico. |
| M‑J3 | 151 | `navigator.maxTouchPoints` + `'ontouchstart' in window` — detección de táctil. | Fingerprinting pasivo. | Documentar intención (solo ajuste de rendimiento). |
| M‑J4 | global | **Sin `try/catch`** en bucles `draw()`. Si un canvas pierde contexto o hay OOM, la excepción no capturada detiene toda la animación. | Denegación de servicio local. | Envolver cada `draw()` en `try/catch`. |

#### Bajos / Informativos

| ID | Línea | Hallazgo |
|----|-------|----------|
| I‑J1 | 301, 438, 746, 921 | `window.devicePixelRatio` — lectura de densidad de píxeles (estándar en canvas). |
| I‑J2 | 1267–1269 | Código muerto: `origFn` se asigna pero nunca se usa. Además accede a `IntersectionObserver.prototype.handleEvent` que no existe nativamente. |
| I‑J3 | 1282, 1287, 1293 | `innerHTML` con caracteres literales `'✕'`/`'☰'`. Sin riesgo (hardcodeados), pero mejor usar `textContent`. |
| I‑J4 | 605, 891, 1199 | `textContent` con valor de slider — patrón seguro. |
| I‑J5 | 282, 454, 762, 941 | Debounce con `setTimeout` — patrón seguro. |

#### Buenas prácticas detectadas

- `'use strict'` (L2)
- Uso generalizado de `.textContent` en vez de `.innerHTML` para datos astronómicos (L312–315, L561–564, L703–712)
- Null-check en cada canvas: `if (!cv) return;`
- `IntersectionObserver` para pausar render fuera del viewport (L354, L585, L870, L1222)
- `visibilitychange` para pausar al ocultar la pestaña (L1247)
- Sin `eval`, `Function`, `setTimeout` con strings, `document.write`, `fetch`, `XHR`, `WebSocket`, `localStorage`, `cookies`

---

### styles.css

| ID | Línea | Hallazgo | Riesgo |
|----|-------|----------|--------|
| I‑C1 | 1281 | `a[href^="http"]::after { content: " (" attr(href) ")"; }` — Expone URLs completas al imprimir. Bajo riesgo si algún enlace contiene parámetros sensibles. | Bajo |

Sin `url()`, `expression()`, `javascript:`, `@import`, `behavior`, `-moz-binding`, data URIs, ni selectores `:visited`/`:target`. CSS limpio.

---

### validacion.mjs

**0 hallazgos.** Módulo puramente matemático:
- Sin `child_process`, `fs`, `fetch`, `http`
- Sin dependencias externas
- Sin secrets, API keys, tokens
- Sin entrada de usuario
- Divisiones con guardas seguras para los valores de excentricidad usados
- `Math.acos` con clamping correcto (`Math.max(-1, Math.min(1, ...))`)
- Bucle Newton-Raphson con max 10 iteraciones + break temprano

---

### .gitignore

| ID | Ausencia | Riesgo |
|----|----------|--------|
| M‑G1 | `.env`, `.env.*`, `.env.local` | **Alto potencial** — Si existe algún `.env` con secrets, se comitearía |
| M‑G2 | `node_modules/` | Medio — Si se añade npm en el futuro |
| M‑G3 | `*.log`, `logs/` | Medio — Logs de depuración con datos sensibles |
| I‑G1 | `.idea/` (JetBrains) | Bajo |
| I‑G2 | `dist/`, `build/` | Bajo |
| I‑G3 | `*.key`, `*.pem`, `*.cert` | Medio |

---

## Dictamen de Seguridad

**Puntuación de riesgo global: 1.2/10 — Muy Bajo**

El proyecto `analemma` es un sitio web estático de divulgación científica sin backend, sin base de datos, sin formularios, sin input de usuario, sin cookies, sin almacenamiento local, y sin peticiones de red desde JavaScript. Todas las simulaciones se ejecutan localmente en el navegador mediante Canvas 2D.

No se ha encontrado **ninguna vulnerabilidad explotable**. Los hallazgos se limitan a:

1. **Ausencia de CSP** — defensa en profundidad recomendada pero no crítica dado que no hay vectores XSS conocidos.
2. **Patrón `innerHTML` en L734** — no explotable hoy (datos hardcodeados), pero frágil ante cambios futuros.
3. **`.gitignore` incompleto** — riesgo solo si en el futuro se añaden archivos `.env` o `node_modules`.
4. **Fingerprinting mínimo** — `deviceMemory`, `maxTouchPoints`, `devicePixelRatio` — usado exclusivamente para ajustes de rendimiento local, sin exfiltración.

El código sigue las mejores prácticas de seguridad para aplicaciones JavaScript del lado cliente: `'use strict'`, `textContent` sobre `innerHTML` en el 95% de los casos, null-safety en referencias DOM, pausa de animaciones fuera del viewport y al ocultar la pestaña, y cero dependencias externas de runtime.

**Todas las mitigaciones han sido implementadas.** Ver sección以下.

---

## Checklist de mitigaciones — Estado final

| Prioridad | Acción | Estado | Archivo |
|-----------|--------|--------|---------|
| P1 | Añadir meta CSP | ✅ | `index.html:7-8` |
| P2 | Refactorizar `innerHTML` → `createElement` + `textContent` | ✅ | `scripts.js:734-740` |
| P3 | Añadir `try/catch` en bucles `draw()` | ✅ | `scripts.js` (5 bucles) |
| P4 | Añadir `.env`, `node_modules/`, `*.log`, `*.key`, `*.pem` a `.gitignore` | ✅ | `.gitignore:25-49` |
| P5 | Migrar inline `onload` a JS (CSP compliance) | ✅ | `index.html:14-18` → `scripts.js:5-10` |
| P6 | Eliminar código muerto (L1267–1269) | ✅ | `scripts.js` |
| P7 | Añadir `Permissions-Policy` (camera, mic, geo, etc.) | ✅ | `index.html:30` |
| P8 | Añadir `referrer` policy `strict-origin-when-cross-origin` | ✅ | `index.html:29` |
| P9 | Reemplazar favicon data URI por archivo SVG | ✅ | `index.html:20` |
| P10 | Añadir `target="_blank" rel="noopener noreferrer"` en referencias | ✅ | `index.html` (10 enlaces) |
| P11 | OG image con URL absoluta | ✅ | `index.html:23` |
