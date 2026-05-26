# Analemas — Mecánica Orbital y Geometría Celeste

Simulación interactiva del analema solar, analemas planetarios geocéntricos y el pentagrama de Venus. Construida en HTML/CSS/JavaScript puro, sin dependencias externas. Basada en los algoritmos de Meeus (1998) y parámetros orbitales NASA JPL J2000.0.

---

## Demo

Abre `index.html` directamente en el navegador. No requiere servidor ni instalación.

```
git clone https://github.com/abarriuso/analemma.git
cd analemma
# Abre index.html en tu navegador
```

---

## Características

| Sección | Contenido |
|---|---|
| **Hero** | Analema solar animado con parámetros dinámicos (ε, e) |
| **01 Fundamentos** | Explicación física del analema: excentricidad y oblicuidad |
| **02 Formalismo** | Ecuación del tiempo, series de Fourier, Kepler Newton-Raphson |
| **03 Solar** | Animación interactiva del analema terrestre (365 días) |
| **04 Planetas** | Analemas geocéntricos de Mercurio a Neptuno con retrogradaciones |
| **05 Venus** | Pentagrama de Venus — resonancia orbital 8:13:5 en 8 años |
| **06 Tabla** | Parámetros comparativos J2000.0 del sistema solar |
| **07 Referencias** | 19 fuentes bibliográficas en formato APA 7.ª ed. |

---

## Tecnología

- **JavaScript vanilla** — IIFE estrictamente encapsulado, sin frameworks
- **Canvas 2D API** — todos los gráficos renderizados con requestAnimationFrame
- **CSS custom properties** — paleta instrumental en modo oscuro fijo
- **IntersectionObserver** — las animaciones arrancan solo al hacerse visibles
- **Accessibility** — skip-link, aria-labels, roles, prefers-reduced-motion

---

## Metodología física

### Ecuación del tiempo (Meeus 1998, cap. 27)

```
E(t) = E_exc(t) + E_obl(t)

E_exc = −2e·sin(M) + (5e²/4)·sin(2M) − (13e³/12)·sin(3M) + O(e⁴)
E_obl = −tan²(ε/2)·sin(2λ) + ½tan⁴(ε/2)·sin(4λ) − ⅓tan⁶(ε/2)·sin(6λ) + ···
```

Precisión: O(e³) en excentricidad, 6.º armónico en oblicuidad.  
Error vs. _Astronomical Almanac_: < 30 s (Meeus 1998, pp. 183–185).

### Ecuación de Kepler — Newton-Raphson

```
E − e·sin(E) = M     →    |ΔE| < 10⁻¹² (< 10 iteraciones para e < 0.3)
```

### Longitud del perihelio terrestre

La longitud geocéntrica del Sol en el perihelio es `ϖ⊕ + 180° = 282.94°` (no 102.94°). El valor 102.94° es la longitud **heliocéntrica** de la dirección del perihelio; visto desde la Tierra, el Sol se encuentra a 282.94° el 3 de enero.

```js
const LON_PERIHELION = 282.9372 * (Math.PI / 180);  // rad
```

### Parámetros J2000.0 (Williams 2024, Meeus 1998)

| Planeta | e | ε | T sidéreo | S sinódico |
|---|---|---|---|---|
| Tierra (Sol) | 0.016708634 | 23.4393° | 365.25 d | 365.25 d |
| Mercurio | 0.2056 | 0.034° | 87.97 d | 115.9 d |
| Venus | 0.0067 | 177.4° | 224.701 d | 583.9 d |
| Marte | 0.0934 | 25.19° | 686.97 d | 779.9 d |
| Júpiter | 0.0489 | 3.13° | 4332.6 d | 398.9 d |
| Saturno | 0.0565 | 26.73° | 10759 d | 378.1 d |
| Urano | 0.0472 | 97.77° | 30589 d | 369.7 d |
| Neptuno | 0.0086 | 28.32° | 60182 d | 367.5 d |

### Resonancia de Venus

La resonancia 8:13:5 se verifica numéricamente:

| Ciclo | Duración | Fuente |
|---|---|---|
| 8 años terrestres | ≈ 2921.94 d | 8 × 365.2422 d |
| 13 órbitas venusianas | ≈ 2921.11 d | 13 × 224.701 d |
| 5 períodos sinódicos | ≈ 2919.60 d | 5 × 583.92 d |
| **Error residual** | **~2.3 d (0.08%)** | |

Nota: algunas fuentes divulgativas citan «13 órbitas ≈ 2921.55 d», valor incorrecto. El período sidéreo de Venus es 224.701 d (Meeus 1998, Williams 2024); 13 × 224.701 = **2921.11 d**.

### Extremos de la ecuación del tiempo

| Fecha aprox. | E(t) | Causa dominante |
|---|---|---|
| ~12 febrero | −14.2 min | Oblicuidad + excentricidad (mínimo) |
| ~14 mayo | +3.7 min | Oblicuidad (máximo local) |
| ~26 julio | −6.5 min | Oblicuidad (mínimo local) |
| ~3 noviembre | +16.4 min | Excentricidad + oblicuidad (máximo global) |

Fuente: Meeus (1998), Tabla 27.a; USNO/HMNAO (2024).

---

## Revisión física completa

### ✅ Correcto

- Fórmula de la ecuación del tiempo en series de Fourier (Meeus cap. 27)
- Solución Newton-Raphson de la ecuación de Kepler con umbral 10⁻¹²
- `LON_PERIHELION = 282.94°` (longitud geocéntrica correcta)
- Todos los períodos sinódicos coinciden con Meeus (1998) dentro de 0.1 d
- Excentricidades y oblicuidades J2000.0 de Williams (2024)
- Declinación solar: `δ = arcsin(sin ε · sin λ)` — fórmula exacta para la eclíptica
- Resonancia Venus: error residual correcto (~2.3 d para la comparación sinódica)
- Retrogradación detectada correctamente por signo de Δlon

### ⚠️ Simplificaciones documentadas

- **Órbitas planetarias en el plano de la eclíptica**: la simulación de planetas asume inclinaciones orbitales = 0 (coplanares). Las inclinaciones reales (Mercurio 7.0°, Venus 3.4°, etc.) producirían ligeras variaciones en la declinación de los analemas.
- **Perturbaciones N-cuerpos ignoradas**: se usa mecánica kepleriana pura. Para la precisión presentada (< 1 min en E(t)) es suficiente; los efectos relativistas y las perturbaciones lunares son subminuto.
- **Parámetros fijos**: e, ε y ω se mantienen constantes en J2000.0. La variación secular (ε decrece ~0.47″/año) es despreciable en escalas de décadas pero significativa en milenios.
- **Luna**: la oblicuidad usada (6.68°) es la inclinación orbital sobre la eclíptica, no la oblicuidad axial verdadera (~1.5°). Para un analema lunar simplificado es una aproximación aceptable.

---

## Estructura del proyecto

```
analemma/
├── index.html      # Estructura semántica y contenido científico
├── styles.css      # Paleta, layout, responsive, animaciones CSS
├── scripts.js      # Motor orbital, canvas y controles (IIFE estricto)
└── README.md
```

---

## Autores

- **Sandra Fernández Domínguez** — [LinkedIn](https://www.linkedin.com/in/sandra-fern%C3%A1ndez-dom%C3%ADnguez-31836a323/)
- **Adrián Barriuso Pizarro** — [GitHub](https://github.com/abarriuso)

---

## Referencias seleccionadas

- Meeus, J. (1998). *Astronomical Algorithms* (2.ª ed.). Willmann-Bell.
- Williams, D. R. (2024). *Planetary Fact Sheets*. NASA GSFC. https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- Duffett-Smith, P. (1990). *Astronomy with your personal computer* (2.ª ed.). Cambridge University Press.
- U.S. Naval Observatory & H.M. Nautical Almanac Office. (2024). *The Astronomical Almanac for 2024*.
- Müller, M. (1995). Equation of time — Problem in astronomy. *Acta Physica Polonica A*, 88(S-49).

Lista completa de 19 referencias en la sección 07 del sitio (formato APA 7.ª ed.).

---

## Licencia

MIT — libre para uso educativo y personal.
