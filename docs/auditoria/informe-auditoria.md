# Informe de auditoría de rigurosidad — *Analemas*

**Fecha:** 11 de junio de 2026
**Alcance:** `index.html`, `scripts.js`, `README.md` y bibliografía completa de la web publicada.
**Método:** revisión línea a línea del contenido físico-matemático; verificación numérica independiente del motor orbital (`validacion.mjs`, incluido en el repositorio); verificación de las 19 referencias bibliográficas contra registros editoriales (DOI/Crossref, ADS, catálogos, fuentes primarias en línea); inspección del renderizado real en navegador (capturas antes/después).

Este informe complementa y responde a las revisiones previas `observaciones-criticas.md` y `dictamen-final.md`.

---

## 1. Resumen ejecutivo

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| F1 | Signo erróneo del término (5/4)e²·sin 2M en la ecuación del tiempo | **Alta** (error físico demostrable) | Corregido |
| F2 | Pentagrama de Venus descrito como «casi perfecto» con «precisión geométrica» | **Alta** (afirmación falsa) | Corregido |
| F3 | Renderizado de Venus: líneas anómalas atravesando el Sol y estrella trazada con reordenación artificial | **Alta** (visual y conceptual) | Corregido |
| F4 | 2 referencias inexistentes, 1 DOI falso, 2 títulos erróneos, 1 cita de revista no verificable, 1 cita textual fabricada | **Alta** (integridad bibliográfica) | Corregido |
| F5 | «Cada elongación máxima ocurre 72° más adelante» (el avance real es ~215.5°) | Media | Corregido |
| F6 | Extremos de E_exc y E_obl mal descritos («máximo en perihelio / equinoccios») | Media | Corregido |
| F7 | Etiquetas Este/Oeste invertidas en el eje de E(t) y definición del eje X con el signo cambiado | Media | Corregido |
| F8 | Datos erróneos en la tabla comparativa (períodos de Urano, Neptuno, Marte, Tierra; ε de Plutón) | Media | Corregido |
| F9 | Historia del término «analema» atribuida incorrectamente a Flamsteed (1672); globos «desde el s. XVII» | Media | Corregido |
| F10 | Códice de Dresde: «384 años de observaciones» (la tabla de Venus abarca ≈ 104 años) | Media | Corregido |
| F11 | Morfotipos de analemas planetarios sin fuente o incorrectos (Júpiter, Urano, Mercurio, Marte) | Media | Corregido |
| F12 | Incoherencias internas: e mostrada ≠ e simulada (Júpiter, Saturno); «Meeus cap. 27» vs «cap. 28» | Baja | Corregido |
| F13 | Validación cuantitativa no reproducible (crítica nº 6 del informe previo) | Media | Resuelto con `validacion.mjs` |

**Dictamen tras la corrección:** el motor orbital es kepleriano correcto dentro de sus simplificaciones declaradas; tras corregir F1 reproduce los cuatro extremos de la ecuación del tiempo del *Astronomical Almanac* 2024 con error ≤ 4 s, y tras incorporar la inclinación de Venus (F3) reproduce las cinco conjunciones inferiores reales de 2001–2007 con error ≤ 1 día, incluido el tránsito de 2004. El contenido textual queda ajustado a lo que el modelo realmente demuestra, y la bibliografía contiene únicamente entradas verificadas.

---

## 2. Hallazgos físico-matemáticos

### F1 · Signo del término e² de la ecuación del tiempo — **error real, demostrado y corregido**

La serie publicada era `E_exc = −2e·sinM + (5/4)e²·sin2M − (13/12)e³·sin3M`. La ecuación del tiempo con convenio E = tiempo solar verdadero − medio es **menos** la ecuación del centro proyectada, es decir, todos los términos llevan signo negativo:

```
E_exc = −(2e − e³/4)·sin M − (5/4)e²·sin 2M − (13/12)e³·sin 3M + O(e⁴)
```

El término con signo cambiado vale 2·(5/4)e² ≈ 0.16 min y **explica exactamente** las desviaciones que la propia web documentaba en su Tabla 2 (Δ entre +0.15 y −0.22 min con signo modulado por sin 2M). Tras la corrección (`scripts.js`, `generateSolarAnalemaPoints`):

| Extremo E(t) | Ref. USNO 2024 | Modelo anterior | Δ ant. | Modelo corregido | Δ corr. |
|---|---|---|---|---|---|
| ~11–12 feb | −14.24 min | −14.09 | 0.15 | **−14.25** | **0.01** |
| ~14 may | +3.74 min | +3.52 | 0.22 | **+3.68** | **0.06** |
| ~26 jul | −6.46 min | −6.40 | 0.06 | **−6.51** | **0.05** |
| ~3 nov | +16.46 min | +16.28 | 0.18 | **+16.42** | **0.04** |

El error máximo pasa de ≈ 13 s a ≈ 4 s. Se corrigieron la fórmula del recuadro de la sección 02, la Tabla 2, la nota metodológica y el README. Reproducible con `node validacion.mjs`.

### F2 · «Pentagrama casi perfecto» y «precisión geométrica» — afirmación falsa, corregida

La resonancia 8:13:5 es solo aproximada (8 años trópicos = 2921.94 d; 5 sinódicos = 2919.61 d; desajuste ≈ 2.33 d = 0.08 %). Consecuencia medible: la sexta conjunción inferior **no** coincide con la primera, sino que cae ≈ 2.3° por detrás (modelo: −2.25° con muestreo fino; −2.4° con muestreo diario), de modo que el pentagrama **no se cierra** y precesa una vuelta completa en ≈ 1 300 años. El texto de la sección 05 ahora lo dice explícitamente y el canvas lo muestra con un marcador rojo («6.ª conj.: Δλ ≈ −2.4° — no cierra») al completar el ciclo.

### F3 · Renderizado del pentagrama de Venus — origen de las «líneas raras»

Diagnóstico sobre el render real (captura previa: `ph-09-venus-penta.png`):

1. **Modelo coplanar**: con inclinación 0, en cada conjunción (5 inferiores + 5 superiores en 8 años) la elongación llega exactamente a 0° y la trayectoria atravesaba el centro del gráfico (el disco solar), generando un nudo de líneas rectas radiales físicamente falso — Venus solo pasa por delante del disco solar en los tránsitos (~2 veces por siglo).
2. **Estrella con reordenación artificial**: las cuerdas se trazaban ordenando los vértices por longitud y saltando de dos en dos (`[0,2,4,1,3,0]`), apareciendo de golpe al final; además los vértices (elongación ≈ 0°) se dibujaban sin explicación sobre el círculo de máxima elongación (48°).
3. **Ambigüedad visual**: vértices y máximas elongaciones Este compartían color naranja, y la leyenda/aria-label afirmaban que los vértices eran las elongaciones máximas (son las conjunciones inferiores).

Solución aplicada (`scripts.js`, sección 6):

- **Modelo 3D**: posición de Venus con inclinación i = 3.39471° y nodo Ω = 76.68069° (Standish et al., 1992). Las elongaciones mínimas en conjunción inferior resultan 0.18°–8.0°, valores reales; la trayectoria ya no atraviesa el Sol y el interior del gráfico forma la roseta de 5 pétalos característica.
- **Cuerdas cronológicas**: cada conjunción inferior ocurre ~215.5° más adelante en longitud, así que unirlas en orden temporal genera por sí solo la estrella {5/2}; la figura emerge progresivamente durante la animación.
- **Anillo zodiacal explícito** (con marca λ = 0°) separado del gráfico polar de elongación, donde se proyectan los vértices; conectores punteados sutiles los unen con la posición física real.
- **Marcador de no-cierre** (F2) y estela continua en lugar de puntos sueltos.
- Leyenda y `aria-label` reescritos en consecuencia.

Validación contra efemérides reales (conjunciones inferiores, `validacion.mjs`):

| Conjunción | Modelo | Real | Error | Elongación mín. modelo |
|---|---|---|---|---|
| 1 | 2001-03-30 | 2001-03-30 | 0 d | 8.01° |
| 2 | 2002-10-31 | 2002-10-31 | 0 d | 5.65° |
| 3 | 2004-06-08 | 2004-06-08 (tránsito) | 0 d | **0.18°** |
| 4 | 2006-01-13 | 2006-01-13 | 0 d | 5.48° |
| 5 | 2007-08-17 | 2007-08-18 | 1 d | 7.97° |
| 6 | 2009-03-28 | 2009-03-27 | 1 d | 8.15° |

Elongaciones máximas del modelo: 45.4°–47.1° (rango real: ≈ 45°–47°).

### F5 · Geometría de los 72°

Lo publicado («cada elongación máxima ocurre 72° más adelante… con precisión geométrica») era doblemente incorrecto: los eventos consecutivos avanzan ≈ 215.5° (≡ 144.5° hacia atrás), y es el **conjunto** de cinco vértices el que queda espaciado ≈ 72°; además la separación no es exacta (deriva de F2). Texto corregido en la sección 05.

### F6 · Extremos de las componentes de E(t)

Lo publicado: «E_exc maximiza cerca del perihelio (3 enero) y E_obl en los equinoccios». Ambas afirmaciones son falsas: E_exc ∝ −sin M se **anula** en perihelio y afelio y alcanza ±7.7 min a comienzos de abril/octubre; E_obl ∝ sin 2λ se **anula** en equinoccios y solsticios y alcanza ±9.9 min a mitad de cada estación (coherente con la tarjeta correcta de la sección 01, con la que esta frase se contradecía). Corregido. *(Era la crítica nº 5 del informe previo.)*

### F7 · Orientación del eje de la ecuación del tiempo

Con E = verdadero − medio, si E > 0 el Sol verdadero culmina antes y a mediodía medio se encuentra al **Oeste** del meridiano (observador del hemisferio norte mirando al sur). El eje decía «← O … E →» con E positivo a la derecha: estaba invertido; ahora «← E … O →» (verificado contra el render: noviembre, E = +16.4, queda en el lóbulo inferior derecho = Oeste; febrero a la izquierda = Este). También se corrigió la definición del recuadro de la sección 02: el eje X es α_medio − α ≡ E (no α − α_medio).

### F8 · Datos de la tabla comparativa (sección 06)

| Dato | Antes | Ahora | Fuente |
|---|---|---|---|
| T sidéreo Urano | 30 589 d (es el período **trópico**) | 30 685 d | Williams (2024) |
| T sidéreo Neptuno | 60 182 d | 60 189 d | Williams (2024) |
| T sidéreo Tierra | 365.25 d (año juliano) | 365.256 d | Williams (2024) |
| T sidéreo Marte | 686.9 d | 686.98 d | Williams (2024) |
| S sinódico «Sol/Tierra» | 365.25 d (sin sentido) | — (nota: el analema se repite con el año trópico, 365.242 d) | — |
| ε Plutón | 119.6° (valor IAU antiguo) | ≈ 122.5° | Williams (2024) |

Los valores de `scripts.js` (Urano, Neptuno, Marte) se actualizaron en consecuencia.

### F11 · Morfotipos de analemas planetarios

- «Marte: ‘8’ casi simétrica» → la figura real es una **lágrima**, fotografiada desde el rover Opportunity 2006–2008 (Lakdawalla, 2014).
- «Júpiter: segmento casi vertical» → con ε ≈ 3.1° y e ≈ 0.048 domina la excentricidad: **óvalo sin cruce**.
- «Urano: gran elipse» → afirmación sin fuente; sustituida por el criterio general (el «8» exige que domine la oblicuidad).
- Mercurio: se añade la salvedad de que el analema clásico ni siquiera es construible allí (día solar ≈ 176 días terrestres ≈ 2 años locales; Urschel, s.f.).

### F9, F10 · Afirmaciones históricas

- **Término «analema»**: en la Antigüedad designaba una construcción geométrica para relojes de sol (Vitruvio); el sentido moderno (curva en «8») se generalizó en el **siglo XVIII**, no con Flamsteed en 1672. Flamsteed se mantiene, correctamente, como primera tabulación rigurosa de la ecuación del tiempo, con la revisión histórica de Hughes et al. (1989).
- **Globos terráqueos**: «desde el s. XVII» → siglos XVIII–XIX.
- **Códice de Dresde**: «384 años de observaciones» → la tabla de Venus abarca 65 períodos sinódicos ≈ **104 años**, con valor canónico de 584 días y esquema de corrección. Se añadió además la referencia mesopotámica más antigua (tablilla de Venus de Ammisaduqa; Hunger & Pingree, 1999), que da uso real a una referencia que estaba huérfana.

---

## 3. Auditoría bibliográfica (referencia a referencia)

Verificación realizada el 10–11 de junio de 2026. Resultado: de las 19 entradas originales, 11 correctas, 2 inexistentes (eliminadas), 1 con DOI falso, 2 con título erróneo, 1 no verificable (sustituida por fuente primaria), 1 sin uso en el texto (ahora citada), 1 cita textual fabricada (retirada). Se añadieron 4 entradas. **Total actual: 22 entradas, todas citadas en el texto y verificadas.**

| Referencia original | Veredicto | Acción |
|---|---|---|
| APA (2020) | ✔ Correcta | — |
| Aveni (2001) *Skywatchers of ancient Mexico* (2.ª ed.) | ⚠ Título inexacto: la ed. 2001 se titula *Skywatchers: A revised and updated version of…* | Título corregido |
| Ayiomamitis (2003) *Sky & Telescope*, 105(3), 42–45 | ⚠ El autor y sus analemas de 2003 son reales (APOD, galería S&T), pero la cita de revista con volumen/páginas no es verificable | Sustituida por la fotografía documentada en *Earth Science Picture of the Day* (USRA, enero 2004) |
| Bretagnon & Simon (1986) | ✔ Correcta | Recolocada: cita los períodos, no «el pentagrama» |
| Bricker & Bricker (2011) | ✔ Correcta | — |
| di Cicco (1979) «The analemma» | ⚠ Título real: **«Exposing the analemma»**, S&T 57(6), 536–540 | Título corregido |
| Dobrovolskis (2013) | ⚠ Título real: **«Insolation on exoplanets with eccentricity and obliquity»** (DOI correcto) | Título corregido |
| Duffett-Smith (1990) | ✔ Correcta | — |
| Flamsteed (1672) Phil. Trans. 7(81), 1099–1105, DOI 10.1098/rstl.1672.0034 | ✘ **DOI falso** (resuelve a un artículo de W. Needham); la obra es un tratado independiente | Recatalogada como *De inaequalitate dierum solarium dissertatio astronomica* (Londres, 1672) |
| Hale & Doggett (1982) JRASC 76(6) | ✘ **No existe** en ADS ni en los índices de JRASC | Eliminada; sus citas en texto sustituidas por fuentes verificadas |
| Heller, Leconte & Barnes (2011) | ✔ Correcta (DOI verificado) | — |
| Hunger & Pingree (1999) | ✔ Correcta pero **no citada en el texto** (viola APA) | Ahora citada (tablilla de Ammisaduqa) |
| Meeus (1998) | ✔ Correcta | Capítulos unificados: ec. del tiempo = cap. 28 (antes se citaba también cap. 27) |
| Morrison, J. E. (1988) *J. Navigation* 41(1), DOI 10.1017/S0373463300006992 | ✘ **DOI inexistente (404)**; artículo no localizable | Eliminada; sustituida por **Hughes, Yallop & Hohenkerk (1989), MNRAS 238(4), 1529–1535** (verificada en Oxford Academic/ADS) |
| Müller (1995) | ✔ Correcta. Pero la web le atribuía una **cita textual entrecomillada fabricada** | Cita retirada; reformulada como síntesis propia con remisión bibliográfica |
| Seidelmann (1992) | ✔ Correcta | — |
| USNO/HMNAO (2024) | ✔ Correcta | — |
| Waugh (1973) | ✔ Correcta; se citaba con un capítulo no verificable («cap. 7») | Capítulo retirado; citada en el contexto gnomónico |
| Williams (2024) | ✔ Correcta (URL oficial; en migración del sitio NSSDC a nasa.gov en 2026) | — |

**Entradas añadidas** (todas verificadas y citadas):

1. Hughes, D. W., Yallop, B. D., & Hohenkerk, C. Y. (1989). The equation of time. *MNRAS*, 238(4), 1529–1535. doi:10.1093/mnras/238.4.1529.
2. Standish, E. M., Newhall, X. X., Williams, J. G., & Yeomans, D. K. (1992). Orbital ephemerides… En Seidelmann (Ed.), *Explanatory supplement* (cap. 5). — Fuente real de los elementos medios J2000.0 usados por el código (antes citada en texto como «Standish 1992» sin entrada en la lista, violando APA).
3. Lakdawalla, E. (2014). *A Martian analemma*. The Planetary Society. — Analema marciano fotográfico (lágrima).
4. Urschel, B. (s.f.). *Other analemmas*. Analemma.com. — Analemas de otros planetas y limitación de Mercurio/Venus.
5. Sawyer, F. (1994). Of analemmas, mean time and the analemmatic sundial — Part 1. *Bull. BSS*, 6(2), 2–6. — Historia del término. *Nota de transparencia: verificada vía indexación secundaria; no se accedió al documento primario.*

Nota actualizada en la sección 07 con los índices correctos ([17], [18], [20], [22] para parámetros; [8], [14] para algoritmos).

---

## 4. Verificación de elementos orbitales del código

Los elementos de `planetsData` (a, e, T, ϖ, M₀) se contrastaron con los elementos medios J2000.0 de Standish et al. (1992): consistentes (se comprobó además la identidad M₀ = L₀ − ϖ para los ocho planetas). Discrepancias menores documentadas: las excentricidades mostradas de Júpiter y Saturno eran los valores osculantes de los *fact sheets* (0.0489, 0.0565) mientras la simulación usa los medios (0.04839, 0.05415); las fichas ahora muestran los valores del modelo y la tabla declara ambas fuentes en nota al pie.

---

## 5. Respuesta a las críticas del informe previo (`observaciones-criticas.md`)

| Crítica previa | Estado |
|---|---|
| 1–2. Elementos fijos J2000.0, sin perturbaciones | Permanece (declarado); ámbito divulgativo |
| 3. Órbitas coplanares | **Parcialmente resuelto**: Venus (§05) ahora incluye i y Ω; §04 sigue coplanar y lo declara |
| 4. Terminología «analema» en construcciones geocéntricas | Ya estaba acotado con definición operativa en §04; se mantiene |
| 5. Afirmaciones absolutas («máximo en los equinoccios», «pentagrama perfecto») | **Resuelto** (F2, F6) |
| 6. Validación no reproducible | **Resuelto**: `validacion.mjs` + Tabla 2 actualizada |
| 7. Pentagrama no exacto | **Resuelto** (F2, F3): deriva cuantificada y visible |
| 8. Sin aberración/refracción/paralaje/nutación | Permanece (declarado en §README y nota metodológica) |

---

## 6. Limitaciones que permanecen (declaradas, no defectos)

- Elementos orbitales J2000.0 fijos: sin evolución secular, precesión ni nutación.
- Sin perturbaciones N-cuerpos ni correcciones relativistas; sin aberración, refracción ni paralaje.
- Analemas geocéntricos de §04 proyectados sobre la eclíptica (β = 0), salvo Venus en §05.
- La deriva del pentagrama mostrada (−2.4° con muestreo diario; −2.25° con muestreo de 0.05 d) depende del año juliano del modelo; con año trópico la literatura da ≈ −2.3°/ciclo. La web usa «≈ 2.3°».
- Referencia Sawyer (1994) verificada solo por indexación secundaria.

---

## 7. Archivos modificados y evidencia

| Archivo | Cambios |
|---|---|
| `scripts.js` | Signo de E_exc; helper `orbPosInc` (órbitas 3D); Venus 3D + estrella cronológica + anillo zodiacal + marcador de deriva; T de Marte/Urano/Neptuno; e mostradas de Júpiter/Saturno; etiqueta del eje E/O; textos de fichas |
| `index.html` | Secciones 01, 02, 04, 05, 06: todas las correcciones F2–F11; lista de referencias (22 entradas); Tabla 2 revalidada; nota metodológica; leyenda y aria-label de Venus |
| `README.md` | Motor orbital, pentagrama, tabla de parámetros, simplificaciones, referencias |
| `validacion.mjs` | **Nuevo**: validación reproducible (ecuación del tiempo y conjunciones de Venus) |

Evidencia visual incluida en el repositorio:

- `ph-09-venus-penta.png` — render **anterior** (líneas atravesando el Sol, cuerda suelta, vértices ambiguos).
- `informe-img-venus-cierre.png` — render corregido a ciclo completo (estrella {5/2}, roseta interior, marcador rojo de no-cierre).
- `informe-img-venus-intermedio.png` — emergencia cronológica de la estrella (día ~1476, una cuerda).
- `informe-img-solar-eot.png` — analema solar con la serie corregida y ejes orientados (FEB-Este / NOV-Oeste).

---

## 8. Conclusión

El proyecto era ya sólido en su arquitectura kepleriana, pero contenía un error de signo real en la ecuación del tiempo (detectable en su propia tabla de validación), una descripción del pentagrama de Venus que afirmaba una perfección que la mecánica celeste no respalda, un renderizado que mezclaba artefactos del modelo coplanar con construcciones gráficas no físicas, y una bibliografía con entradas fabricadas o deformadas. Tras esta auditoría:

- el modelo reproduce el *Astronomical Almanac* con error ≤ 4 s en los extremos de E(t);
- reproduce las conjunciones inferiores de Venus 2001–2009 con error ≤ 1 día (incluido el tránsito de 2004);
- el pentagrama se presenta como lo que es: una figura aproximada que deriva ≈ 2.3° por ciclo y no se cierra;
- las 22 referencias están verificadas y todas citadas;
- la validación es reproducible por terceros (`node validacion.mjs`).
