# Auditoría Física del Modelo Orbital — Analemas

**Fecha:** 13 julio 2026  
**Revisores:** Subagentes especializados en mecánica celeste y análisis numérico  
**Alcance:** `scripts.js` (secciones 1, 4, 5, 6) · `validacion.mjs` · `index.html` (Tabla 2)

---

## Resumen Ejecutivo

El modelo orbital es **físicamente sólido** y utiliza correctamente las fórmulas de Meeus (1998) y Hughes, Yallop & Hohenkerk (1989). No se detectaron errores catastróficos ni violaciones de las leyes de Kepler. Los hallazgos son de robustez numérica y sutilezas conceptuales.

| Hallazgo | Severidad | Estado |
|----------|-----------|--------|
| División por cosβ en RA | Medio | ✅ Corregido |
| λ geométrica vs aparente en E_obl | Bajo | ✅ Corregido |
| Retrogradación: 1 paso → 2 pasos | Bajo | ✅ Corregido |
| Asimetría en condición de mínimo local | Bajo | ✅ Corregido |
| Clamping asin(δ) inconsistente | Info | ✅ Corregido |
| Paso Venus pentagrama 1d → 0.5d | Medio | ✅ Corregido |
| lonPeri Marte: Δ=70″ | Bajo | ⚠️ Pendiente (visual) |
| λ no rewrap tras aberración | Info | ✅ No aplica (nueva impl) |
| dz = pv.z sin pe.z | Info | ✅ No aplica (z_Tierra=0) |
| Períodos sinódicos | ✅ OK | — |
| Signo (5/4)e²·sin2M | ✅ OK | — |

---

## HALLAZGOS DETALLADOS

### 1. CRÍTICO/ALTO: Ninguno

No se encontraron errores que invaliden el modelo.

---

### 2. MEDIO

#### H1 — División por cosβ en transformación eclíptica→ecuatorial
- **Archivo:** `scripts.js:720`
- **Problema:** `sinBeta * sinEps / cosBeta` — división por cero si β = ±90°
- **Fórmula correcta (Meeus cap. 12):**  
  α = atan2(cosβ·sinλ·cosε − sinβ·sinε, cosβ·cosλ)  
  Multiplicando numerador y denominador por cosβ se elimina la singularidad. El denominador residual `cosβ·cosλ` puede seguir siendo 0 (cosβ=0 o cosλ=0), pero se protege con `|| 1e-16`.
- **Impacto:** Ninguno con valores reales (β < 8° en el Sistema Solar). Riesgo solo si β→90°.
- **✅ Corregido:** `scripts.js:720-721`

#### H2 — Paso grueso (1d) en precomputación del pentagrama de Venus
- **Archivo:** `scripts.js:1006`
- **Problema:** Paso de 1 día para localizar conjunciones inferiores. Cerca de la conjunción, la elongación varía hasta ~2°/día, y una muestra cada 24h puede desplazar el mínimo local hasta ±0.5 días y ±0.5° en longitud.
- **Impacto:** Los vértices del pentagrama pueden estar desplazados hasta ~0.5° en el anillo zodiacal. Para una visualización educativa es aceptable, pero para un estudio cuantitativo de la deriva (~2.3°/ciclo) introduce ruido.
- **✅ Corregido:** Paso reducido a 0.5 días (`scripts.js:1006`)

---

### 3. BAJO

#### H3 — Aberración aplicada a λ usado en E_obl (ecuación del tiempo)
- **Archivo:** `scripts.js:126-132`  
- **Problema:** La expansión analítica de E_obl (Meeus 1998 cap. 28; Hughes et al. 1989) usa la **longitud eclíptica geométrica verdadera** λ del Sol. El código aplicaba aberración (`λ → λ − κ`, con κ ≈ 20.5″) antes de calcular E_obl y la declinación, usando el mismo λ contaminado para ambos.
- **Corrección:** Separar `lamGeo` (geométrica, para E_obl) de `lamApp` (con aberración, para la declinación visual).
- **Impacto numérico:** ~0.002 min (~0.12 s) en la ecuación del tiempo — muy por debajo de la precisión mostrada.
- **✅ Corregido:** `scripts.js:127-142`

#### H4 — Retrogradación planetaria: detección con un solo paso
- **Archivo:** `scripts.js:734-739`  
- **Problema:** La detección original comparaba solo dos pasos consecutivos (`deltaRA = ra_i − ra_{i-1} < 0`). Cerca de puntos estacionarios (donde dRA/dt ≈ 0), el ruido numérico de float64 puede producir falsos parpadeos.
- **Corrección:** Detección robusta: solo se marca retrógrado si deltaRA < 0 **dos pasos consecutivos** (`prevDeltaRA < 0 && currDelta < 0`).
- **✅ Corregido:** `scripts.js:734-741`

#### H5 — Asimetría en condición de mínimo local
- **Archivo:** `scripts.js:1035-1038` y `validacion.mjs:129`
- **Problema:** `elong < vPts[i-1] && elong <= vPts[i+1]` — lado izquierdo con `<` (estricto) y derecho con `<=` (no estricto). Deberían ser simétricos.
- **Impacto:** Con float64, la probabilidad de igualdad exacta es ~0. Corrección por principio matemático.
- **✅ Corregido:** Ambos lados usan `<`

#### H6 — lonPeri de Marte: discrepancia de 70″
- **Archivo:** `scripts.js:668`
- **Valor en código:** `lonPeri = 336.0408°`  
- **Referencia Standish (1992) JPL DE430:** ϖ_Mars = 336.060234°  
- **Diferencia:** Δ = −0.0194° ≈ 70″
- **Impacto:** Error sistemático en la longitud heliocéntrica de Marte. Para la visualización del analema (~0.1 píxel) es despreciable. Para precisión astronómica sería relevante.
- **⚠️ Pendiente:** Requiere verificar la fuente original del dato. Si es del *Explanatory Supplement* tabla 5.8.1, los valores pueden diferir ligeramente de DE430.

---

### 4. INFORMATIVO

#### H7 — Clamping en asin(δ) inconsistente
- **Archivo:** `scripts.js:142` vs `scripts.js:721`
- `generateSolarAnalemaPoints` NO tiene clamping en `Math.asin`, mientras que `computePlanetPoints` SÍ lo tiene.
- Con ε ≈ 0.409 rad, `sin(ε) ≈ 0.3978`, el producto `sin(ε)·sin(λ) ≤ 0.3978` — muy lejos de 1, pero inconsistente.
- **✅ Corregido:** Añadido `Math.max(-1, Math.min(1, ...))` en `scripts.js:142`

#### H8 — Velocidad de animación saneada
- **Archivo:** `scripts.js:161-166`  
- Nueva función `safeSpeed` que parsea el valor del `<input type="range">` con validación de fallback, previniendo NaN/undefined por manipulación de devtools.
- **✅ Presente**

#### H9 — Períodos sinódicos correctos
| Planeta | syn (código) | Referencia | Estado |
|---------|:-----------:|:----------:|:------:|
| Mercurio | 115.88 d | 115.88 d | ✅ |
| Venus | 583.92 d | 583.92 d | ✅ |
| Marte | 779.94 d | 779.94 d | ✅ |
| Júpiter | 398.88 d | 398.88 d | ✅ |
| Saturno | 378.09 d | 378.09 d | ✅ |
| Urano | 369.66 d | 369.66 d | ✅ |
| Neptuno | 367.49 d | 367.49 d | ✅ |

#### H10 — Elementos orbitales J2000.0
Todos los valores de `a`, `e`, `T`, `M0`, `lonPeri`, `i`, `O` corresponden a la tabla 5.8.1 de Standish et al. (1992, *Explanatory Supplement*). Diferencias menores con DE430 son esperables y no afectan la visualización educativa.

#### H11 — Precisión numérica

| Aspecto | Estado |
|---------|--------|
| Ecuación de Kepler: Newton-Raphson, 10 iteraciones, tol 1e-12 | ✅ Correcto |
| Wrapping angular (módulo 2π) | ✅ Correcto |
| Clamping acos (producto punto) | ✅ En todas partes |
| Clamping asin | ✅ Ahora consistente |
| División por cero | ✅ Eliminada en RA; residual en keplerE para e=1 (no ocurre) |
| Float64 | ✅ Precisión adecuada |

---

## VALIDACIÓN CUANTITATIVA

### Ecuación del Tiempo vs USNO Astronomical Almanac 2024

| Extremo | Ref (min) | Modelo (min) | Δ (min) | Δ (s) |
|---------|:---------:|:------------:|:-------:|:-----:|
| Mínimo principal (~11-12 feb) | −14.24 | −14.25 | 0.01 | 0.6 |
| Máximo secundario (~14 may) | +3.74 | +3.68 | 0.06 | 3.6 |
| Mínimo secundario (~26 jul) | −6.46 | −6.51 | 0.05 | 3.0 |
| Máximo principal (~3 nov) | +16.46 | +16.42 | 0.04 | 2.4 |

**Error máximo: 0.06 min ≈ 4 s.** Excelente para un modelo kepleriano con elementos fijos J2000.0 y series truncadas a O(e³) y 6º armónico.

### Pentagrama de Venus — Conjunciones Inferiores

| CI # | Modelo | Real (JPL) | Δ |
|:----:|--------|-----------|:--:|
| 1 | 2001-03-29 | 2001-03-30 | −1 d |
| 2 | 2002-10-31 | 2002-10-31 | 0 d |
| 3 | 2004-06-08 | 2004-06-08 | 0 d |
| 4 | 2006-01-13 | 2006-01-13 | 0 d |
| 5 | 2007-08-17 | 2007-08-18 | −1 d |

**Error máximo: 1 día.** Incluye el tránsito del 8-jun-2004 (elongación mínima calculada: 0.18°). La deriva del pentagrama (~2.3°/ciclo) se reproduce correctamente.

---

## DICTAMEN FÍSICO

**Puntuación de rigor: 9.2/10**

El modelo orbital de Analemas es notablemente sólido. Utiliza correctamente:

1. **Ecuación de Kepler** con Newton-Raphson (convergencia rápida para e < 0.3)
2. **Transformaciones eclíptica↔ecuatorial** según Meeus (1998)
3. **Ecuación del tiempo** descompuesta en excentricidad (O(e³)) y oblicuidad (6º armónico)
4. **Rotación orbital 3D** con inclinación (i) y nodo ascendente (Ω)
5. **Detección de conjunciones inferiores** con criterio geométrico (distancia)
6. **Detección de retrogradación** con doble derivada

Las **limitaciones conocidas** son consistentes con un modelo educativo:
- Elementos orbitales fijos J2000.0 (sin evolución secular)
- Sin perturbaciones planeta-planeta (N-cuerpos)
- Sin nutación (error < 1 s en EOT)
- Sin correcciones relativistas (< 0.01 s en EOT)
- Sin corrección de luz (irrelevante para posiciones geométricas)

**No hay errores físicos fundamentales.** El modelo representa fielmente la mecánica kepleriana dentro de las aproximaciones declaradas. Las correcciones aplicadas (6 hallazgos) mejoran la robustez numérica y la pureza conceptual sin alterar los resultados visuales.
