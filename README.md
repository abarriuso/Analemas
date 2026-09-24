# Analemmas

[![Deploy](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml/badge.svg)](https://github.com/abarriuso/Analemas/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**English** · [Español](README.es.md)

Interactive simulation of the solar analemma, the geocentric analemmas of the planets and the pentagram of Venus. Dependency-free JavaScript with no build step, drawn with Canvas 2D.

**[→ Live demo](https://abarriuso.github.io/Analemas/)** · [Spanish version](https://abarriuso.github.io/Analemas/es/)

| Desktop | Mobile |
|:---:|:---:|
| ![Analemmas on desktop](docs/screenshots/Analemas-desktop.png) | ![Analemmas on mobile](docs/screenshots/Analemas-mobile.png) |

## Layout

| File | Contents |
|---|---|
| `astro.js` | Orbital engine: Kepler, precession, nutation, aberration, apparent Sun, geocentric positions, conjunctions |
| `scripts.js` | Simulations, controls and interface; interface strings in `I18N` (English and Spanish) |
| `index.html`, `es/index.html`, `styles.css` | Content in English and in Spanish, and styles |
| `lang.js` | Picks the language (see [Languages](#languages)) |
| `validacion.mjs` | Checks `astro.js` against the *Astronomical Almanac* and real Venus conjunctions |
| `smoke-test.cjs` | Runs the page on a minimal DOM in both languages: load, frames and controls |

## Model

- Fixed J2000.0 mean elements (Standish et al., 1992), with no planet-to-planet perturbations. Kepler's equation solved by Newton-Raphson (|ΔE| < 10⁻¹²).
- Heliocentric positions in 3D with each orbit's inclination *i* and node Ω. Longitudes referred to the true equinox of date: IAU 2006 precession and IAU 1980 nutation (106 terms).
- Equation of time: `E_exc = −(2e − e³/4)·sin M − (5/4)e²·sin 2M − (13/12)e³·sin 3M` plus the obliquity series up to the sixth harmonic in tan(ε/2), using the Sun's apparent longitude (annual aberration included). References: Meeus (1998), chap. 28, and Hughes, Yallop and Hohenkerk (1989).
- Planetary analemmas: Δα = α − α☉ against δ over two synodic periods. Motion counts as retrograde when right ascension decreases for two steps in a row.
- Venus: inferior conjunctions found as elongation minima, refined by golden-section search.

Left out of the model: refraction, parallax, perturbations and secular variation of the elements. It is an outreach project, not an ephemeris generator.

## Validation

```text
pnpm install
pnpm test        # validacion.mjs + smoke-test.cjs + ESLint, html-validate and Stylelint
```

Pull requests also run Lighthouse CI (`pnpm dlx @lhci/cli@0.15.1 autorun`), which fails below the performance, accessibility, best-practices and SEO thresholds in `.lighthouserc.json`.

| Case | Reference | Result |
|---|---|---|
| 4 extremes of the equation of time | *Astronomical Almanac 2024* | Δ ≤ 0.06 min |
| Inferior conjunctions of Venus 2001–2009 | Published dates | < 1 day (2004 transit with 0.17° elongation) |
| Pentagram drift | — | −2.33° per 8-year cycle (≈ 1 230 years per full turn) |

## Running it

Open `index.html` (English) or `es/index.html` (Spanish) in a browser: no server needed.

## Languages

The site is in English at the root and in Spanish under `es/`, with an EN/ES link in the menu. `lang.js` sends Spanish-speaking browsers from the root to `es/` the first time; once a visitor picks a language with that link, the choice is remembered. Text drawn from JavaScript (buttons, chart labels, planet names and descriptions) comes from the `I18N` block in `scripts.js`, chosen by `<html lang>`.

## Credits

- **Idea and first prototype:** [Sandra Fernández Domínguez](https://www.linkedin.com/in/sandra-fern%C3%A1ndez-dom%C3%ADnguez-31836a323/). She came up with the project and built the first prototype of the site with an AI agent.
- **Development:** [Adrián Barriuso Pizarro](https://github.com/abarriuso). He took it from that prototype to the current site: the orbital engine and its validation, the simulations, the tests and the deployment.

Full bibliography: [`docs/references.md`](docs/references.md). MIT licence.
