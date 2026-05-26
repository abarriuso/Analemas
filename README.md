# Analemas — Mecánica Orbital y Geometría Celeste

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black)](scripts.js)
[![Canvas 2D](https://img.shields.io/badge/Canvas-2D%20API-orange)](scripts.js)
[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-brightgreen)](https://abarriuso.github.io/analemma/)

Simulación interactiva del analema solar, analemas planetarios geocéntricos y el pentagrama de Venus.  
**Vanilla JS + Canvas 2D puro. Sin dependencias. Sin build. Abre y listo.**

Basada en los algoritmos de Meeus (1998) y parámetros orbitales NASA JPL J2000.0.

---

![Preview del analema solar terrestre](og-image.svg)

> **[→ Ver demo en vivo](https://abarriuso.github.io/analemma/)**

---

## Qué hay dentro

| # | Sección | Contenido |
|---|---|---|
| Hero | Analema animado | Figura en 8 con eventos orbitales (perihelio, solsticios, equinoccios) |
| 01 | Fundamentos | Excentricidad orbital + oblicuidad axial como causas del analema |
| 02 | Formalismo | Ecuación del tiempo, series de Fourier, solución de Kepler |
| 03 | Solar | Animación interactiva del analema terrestre (365 días) con estadísticas en tiempo real |
| 04 | Planetas | Analemas geocéntricos de Mercurio a Neptuno — retrogradaciones en rojo |
| 05 | Venus | Pentagrama de Venus — resonancia 8:13:5 — polar plot de 8 años |
| 06 | Tabla | Parámetros comparativos J2000.0 del sistema solar |
| 07 | Referencias | 19 fuentes bibliográficas en formato APA 7.ª ed. |

---

## Ejecutar

```bash
git clone https://github.com/abarriuso/analemma.git
cd analemma
# Abre index.html en el navegador — no necesita servidor
```

O directo: `start index.html` (Windows) · `open index.html` (Mac)

---

## Detalles técnicos

### Motor orbital

```
Ecuación de Kepler  →  Newton-Raphson  |ΔE| < 10⁻¹²
Ecuación del tiempo →  O(e³) excéntrico + 6.º armónico oblicuidad
Error vs Astronomical Almanac: < 30 s  (Meeus 1998, pp. 183–185)
```

### Arquitectura JS

- **IIFE estricto** — todo encapsulado, cero globales accidentales
- **Canvas 2D API** — todos los gráficos en `requestAnimationFrame` con cap a 60 fps
- **IntersectionObserver** — las animaciones arrancan solo al entrar en pantalla
- **Detección de dispositivo** — menos partículas y pasos en móvil/memoria baja
- **`prefers-reduced-motion`** — todas las animaciones CSS y JS lo respetan

### Accesibilidad

- Skip-link, `aria-label` en todos los controles y canvas, `role="img"` con descripciones
- Navegación por teclado completa, `:focus-visible` con outline visible
- Menú móvil con `aria-expanded` actualizado dinámicamente

---

## Parámetros físicos J2000.0

| Planeta | e | ε | T sidéreo | S sinódico |
|---|---|---|---|---|
| **Tierra** | 0.016708634 | 23.4393° | 365.25 d | — |
| Mercurio | 0.2056 | 0.034° | 87.97 d | 115.9 d |
| Venus | 0.0067 | 177.4° | 224.701 d | 583.9 d |
| Marte | 0.0934 | 25.19° | 686.97 d | 779.9 d |
| Júpiter | 0.0489 | 3.13° | 4 332.6 d | 398.9 d |
| Saturno | 0.0565 | 26.73° | 10 759 d | 378.1 d |
| Urano | 0.0472 | 97.77° | 30 589 d | 369.7 d |
| Neptuno | 0.0086 | 28.32° | 60 182 d | 367.5 d |

Fuentes: Williams (2024) · Meeus (1998) · USNO/HMNAO (2024)

### Resonancia de Venus — verificación numérica

| Ciclo | Duración |
|---|---|
| 8 años terrestres | ≈ 2 921.94 d |
| 13 órbitas venusianas | ≈ 2 921.11 d |
| 5 períodos sinódicos | ≈ 2 919.60 d |
| **Error residual** | **~2.3 d · 0.08%** |

---

## Revisión física

**✅ Correcto vs. fuentes**
- Fórmula E(t) en series de Fourier — Meeus (1998) cap. 27
- Solución Kepler Newton-Raphson convergente en < 10 iteraciones (e < 0.3)
- `LON_PERIHELION = 282.94°` (longitud **geocéntrica** del Sol en perihelio — no confundir con los 102.94° heliocentricos)
- Períodos sinódicos, excentricidades y oblicuidades J2000.0 de Williams (2024)
- Extremos E(t): ~12 feb (−14.2 min), ~14 may (+3.7 min), ~26 jul (−6.5 min), ~3 nov (+16.4 min)
- Detección de retrogradación por signo de Δlongitud eclíptica

**⚠️ Simplificaciones declaradas**
- Inclinaciones orbitales = 0 (órbitas coplanares con la eclíptica)
- Perturbaciones N-cuerpos y correcciones relativistas ignoradas
- Parámetros e, ε, ω fijos en J2000.0 (variación secular despreciable en décadas)
- Luna: usa inclinación orbital 6.68° en vez de oblicuidad axial ~1.5°

---

## Estructura

```
analemma/
├── index.html      # HTML semántico — 7 secciones + hero
├── styles.css      # Paleta oscura, layout, responsive, animaciones
├── scripts.js      # Motor orbital + canvas (IIFE estricto, ~950 líneas)
├── og-image.svg    # Preview para redes sociales
├── LICENSE         # MIT
└── README.md
```

---

## Autores

**Sandra Fernández Domínguez** — [LinkedIn](https://www.linkedin.com/in/sandra-fern%C3%A1ndez-dom%C3%ADnguez-31836a323/)  
**Adrián Barriuso Pizarro** — [GitHub @abarriuso](https://github.com/abarriuso)

---

## Referencias seleccionadas

1. Meeus, J. (1998). *Astronomical Algorithms* (2.ª ed.). Willmann-Bell.
2. Williams, D. R. (2024). *Planetary Fact Sheets*. NASA GSFC.
3. Duffett-Smith, P. (1990). *Astronomy with your personal computer*. Cambridge University Press.
4. Müller, M. (1995). Equation of time. *Acta Physica Polonica A*, 88(S-49).
5. di Cicco, D. (1979). The analemma. *Sky & Telescope*, 57(6), 536–540.

[Lista completa de 19 referencias en la web →](https://abarriuso.github.io/analemma/#referencias)

---

## Configurar GitHub Pages

1. Sube el repo: `git remote add origin https://github.com/abarriuso/analemma.git && git push -u origin main`
2. En GitHub: **Settings → Pages → Source → Deploy from branch → main / (root)**
3. En ~1 min estará vivo en `https://abarriuso.github.io/analemma/`
4. **Topics sugeridos para el repo:** `astronomy` `javascript` `canvas` `orbital-mechanics` `simulation` `analema` `kepler` `visualization`

---

*MIT License · Vanilla JS · Sin dependencias · 2026*
