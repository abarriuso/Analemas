# Analemas

[![Deploy](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml/badge.svg)](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Simulación interactiva del analema solar, los analemas geocéntricos de los planetas y el pentagrama de Venus. JavaScript sin dependencias ni compilación, dibujado con Canvas 2D.

**[→ Ver en vivo](https://abarriuso.github.io/Analemas/)**

| Escritorio | Móvil |
|:---:|:---:|
| ![Analemas en escritorio](docs/screenshots/Analemas-desktop.png) | ![Analemas en móvil](docs/screenshots/Analemas-mobile.png) |

## Estructura

| Archivo | Contenido |
|---|---|
| `astro.js` | Motor orbital: Kepler, precesión, nutación, aberración, Sol aparente, posiciones geocéntricas, conjunciones |
| `scripts.js` | Simulaciones, controles e interfaz; textos de la interfaz en `I18N` |
| `index.html`, `styles.css` | Contenido y estilos |
| `validacion.mjs` | Contrasta `astro.js` con el *Astronomical Almanac* y con conjunciones reales de Venus |
| `smoke-test.cjs` | Ejecuta la página sobre un DOM mínimo: carga, fotogramas y controles |

## Modelo

- Elementos medios J2000.0 fijos (Standish et al., 1992), sin perturbaciones entre planetas. Ecuación de Kepler por Newton-Raphson (|ΔE| < 10⁻¹²).
- Posiciones heliocéntricas en 3D con la inclinación *i* y el nodo Ω de cada órbita. Longitudes referidas al equinoccio verdadero de la fecha: precesión IAU 2006 y nutación IAU 1980 (106 términos).
- Ecuación del tiempo: `E_exc = −(2e − e³/4)·sin M − (5/4)e²·sin 2M − (13/12)e³·sin 3M` más la serie de oblicuidad hasta el sexto armónico en tan(ε/2), con la longitud aparente del Sol (incluida la aberración anual). Referencias: Meeus (1998), cap. 28, y Hughes, Yallop y Hohenkerk (1989).
- Analemas planetarios: Δα = α − α☉ frente a δ durante dos períodos sinódicos. Retrogradación cuando la AR decrece dos pasos seguidos.
- Venus: conjunciones inferiores como mínimos de elongación, refinados por sección áurea.

Fuera del modelo: refracción, paralaje, perturbaciones y variación secular de los elementos. Es un proyecto divulgativo, no un generador de efemérides.

## Validación

```text
pnpm install
pnpm test        # validacion.mjs + smoke-test.cjs + ESLint, html-validate y Stylelint
```

| Caso | Referencia | Resultado |
|---|---|---|
| 4 extremos de la ecuación del tiempo | *Astronomical Almanac 2024* | Δ ≤ 0.06 min |
| Conjunciones inferiores de Venus 2001–2009 | Fechas publicadas | < 1 día (tránsito de 2004 con elongación 0.17°) |
| Deriva del pentagrama | — | −2.33° por ciclo de 8 años (≈ 1 230 años por vuelta) |

## Ejecución

Abre `index.html` en el navegador: funciona sin servidor.

## Traducción

La página está preparada para una segunda versión en otro idioma sin tocar el código:

1. Copia `index.html` a `en/index.html`, pon `lang="en"`, antepón `../` a las rutas de `fonts/`, `styles.css`, `astro.js`, `scripts.js`, `favicon.svg` y `assets/`, y traduce el texto (incluidos `aria-label`, `<title>`, metadatos y el diagrama SVG).
2. `scripts.js` elige los textos generados en JS (botones, rótulos de los gráficos, nombres y descripciones de planetas) según `<html lang>`; el bloque `I18N.en` ya está escrito.
3. Enlaza ambas versiones con `<link rel="alternate" hreflang="…">` y un selector de idioma en la navegación.
4. Añade `en` a la copia de archivos del job `build` en `.github/workflows/deploy.yml`.

## Autores

**Sandra Fernández Domínguez** — [LinkedIn](https://www.linkedin.com/in/sandra-fern%C3%A1ndez-dom%C3%ADnguez-31836a323/)
**Adrián Barriuso Pizarro** — [GitHub](https://github.com/abarriuso)

Bibliografía completa: [`docs/referencias-bibliograficas.md`](docs/referencias-bibliograficas.md). Licencia MIT.
