# Analemas

[![Deploy](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml/badge.svg)](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[English](README.md) · **Español**

Simulación interactiva del analema solar, los analemas geocéntricos de los planetas y el pentagrama de Venus. JavaScript sin dependencias ni compilación, dibujado con Canvas 2D.

**[→ Ver en vivo (español)](https://abarriuso.github.io/Analemas/es/)** · [Versión en inglés](https://abarriuso.github.io/Analemas/)

| Escritorio | Móvil |
|:---:|:---:|
| ![Analemas en escritorio](docs/screenshots/Analemas-desktop.png) | ![Analemas en móvil](docs/screenshots/Analemas-mobile.png) |

## Estructura

| Archivo | Contenido |
|---|---|
| `astro.js` | Motor orbital: Kepler, precesión, nutación, aberración, Sol aparente, posiciones geocéntricas, conjunciones |
| `scripts.js` | Simulaciones, controles e interfaz; textos de la interfaz en `I18N` (inglés y español) |
| `index.html`, `es/index.html`, `styles.css` | Contenido en inglés y en español, y estilos |
| `lang.js` | Elige el idioma (ver [Idiomas](#idiomas)) |
| `validacion.mjs` | Contrasta `astro.js` con el *Astronomical Almanac* y con conjunciones reales de Venus |
| `smoke-test.cjs` | Ejecuta la página sobre un DOM mínimo en los dos idiomas: carga, fotogramas y controles |

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

Los pull requests pasan además Lighthouse CI (`pnpm dlx @lhci/cli@0.15.1 autorun`), que falla por debajo de los umbrales de rendimiento, accesibilidad, buenas prácticas y SEO de `.lighthouserc.json`.

| Caso | Referencia | Resultado |
|---|---|---|
| 4 extremos de la ecuación del tiempo | *Astronomical Almanac 2024* | Δ ≤ 0.06 min |
| Conjunciones inferiores de Venus 2001–2009 | Fechas publicadas | < 1 día (tránsito de 2004 con elongación 0.17°) |
| Deriva del pentagrama | — | −2.33° por ciclo de 8 años (≈ 1 230 años por vuelta) |

## Ejecución

Abre `index.html` (inglés) o `es/index.html` (español) en el navegador: funciona sin servidor.

## Idiomas

La web está en inglés en la raíz y en español en `es/`, con un enlace EN/ES en el menú. `lang.js` lleva la primera vez a `es/` a los navegadores en español; cuando el visitante elige idioma con ese enlace, la elección se recuerda. Los textos generados en JavaScript (botones, rótulos de los gráficos, nombres y descripciones de planetas) salen del bloque `I18N` de `scripts.js` según `<html lang>`.

## Créditos

- **Idea y primer prototipo:** [Sandra Fernández Domínguez](https://www.linkedin.com/in/sandra-fern%C3%A1ndez-dom%C3%ADnguez-31836a323/). Planteó el proyecto y construyó el primer prototipo de la web con un agente de IA.
- **Desarrollo:** [Adrián Barriuso Pizarro](https://github.com/abarriuso). Llevó ese prototipo hasta la web actual: el motor orbital y su validación, las simulaciones, los tests y el despliegue.

Bibliografía completa: [`docs/referencias-bibliograficas.md`](docs/referencias-bibliograficas.md). Licencia MIT.
