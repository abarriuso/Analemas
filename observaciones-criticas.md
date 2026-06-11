Observaciones críticas y limitaciones identificadas

La revisión realizada no ha detectado errores físicos graves ni inconsistencias fundamentales en la mecánica orbital implementada. Sin embargo, sí se han identificado varias simplificaciones, ambigüedades y limitaciones que conviene señalar desde una perspectiva de rigor científico.

1. Uso de elementos orbitales fijos

El modelo utiliza elementos orbitales referidos a la época J2000.0 y los considera constantes durante toda la simulación.

Consecuencias:

No se modela la evolución secular de las órbitas.
No se representan precesiones orbitales.
No se representan variaciones a largo plazo de excentricidad u oblicuidad.
Las posiciones obtenidas son aproximaciones geométricas y no efemérides astronómicas de precisión.

Esta decisión es razonable para fines educativos y divulgativos, pero limita la fidelidad física del modelo.

2. Ausencia de perturbaciones gravitatorias

Las órbitas se tratan como soluciones keplerianas independientes.

No se modelan:

Interacciones gravitatorias planeta-planeta.
Resonancias dinámicas.
Perturbaciones seculares.
Efectos N-cuerpos.

Como consecuencia, los patrones obtenidos representan un sistema solar idealizado.

3. Órbitas coplanares en los analemas geocéntricos planetarios

La documentación indica que las inclinaciones orbitales se simplifican o eliminan en determinados cálculos.

Esto implica que:

La geometría observada para Mercurio no es completamente realista.
La geometría observada para Venus no es completamente realista.
La geometría observada para Marte tampoco reproduce exactamente la observación real.

Las formas obtenidas conservan el comportamiento general, pero no constituyen representaciones observacionales exactas.

4. Terminología de los analemas planetarios

La extensión del término "analema" a determinadas construcciones geocéntricas planetarias es razonable desde un punto de vista divulgativo, pero no siempre coincide con la definición clásica utilizada en astronomía observacional.

Sería recomendable explicitar con mayor precisión la definición operativa utilizada en cada gráfico.

5. Ambigüedad en algunas afirmaciones divulgativas

Existen expresiones que pueden interpretarse de forma excesivamente absoluta.

Por ejemplo:

"el efecto es máximo en los equinoccios"
"pentagrama perfecto"
determinadas descripciones simplificadas de los analemas de Urano

Estas afirmaciones son útiles para divulgación, pero desde una perspectiva científica deberían formularse con mayor precisión y delimitando claramente qué magnitud física se está describiendo.

6. Validación cuantitativa insuficientemente documentada

La documentación indica errores inferiores a determinados umbrales respecto a referencias astronómicas estándar.

Sin embargo, no se incluyen:

tablas de comparación,
estadísticas RMS,
errores máximos documentados,
casos de validación reproducibles.

La calidad del modelo parece elevada para sus objetivos, pero la evidencia publicada no permite verificar de forma independiente las cifras anunciadas.

7. Pentagrama de Venus

La resonancia Venus-Tierra utilizada reproduce correctamente el conocido patrón pentagonal asociado a las conjunciones inferiores.

No obstante:

la resonancia no es exacta,
existen perturbaciones dinámicas reales,
existen desviaciones acumulativas a largo plazo.

Por tanto, cualquier referencia a un pentagrama "perfecto" debe entenderse como una descripción geométrica aproximada y no como una propiedad exacta del sistema físico real.

8. Ausencia de correcciones observacionales

El modelo no incorpora correcciones empleadas habitualmente en astronomía de precisión:

aberración de la luz,
refracción atmosférica,
paralaje,
nutación,
movimiento polar,
correcciones relativistas.

Para los objetivos del proyecto esta omisión es razonable, pero limita su uso como herramienta observacional.

9. Limitaciones inherentes al enfoque

El proyecto debe interpretarse como una visualización científica basada en mecánica kepleriana simplificada y no como un generador profesional de efemérides.

Evaluarlo con criterios de software astronómico profesional sería inapropiado dado el alcance declarado del proyecto.

Dentro de sus objetivos divulgativos y educativos, las simplificaciones adoptadas son coherentes y técnicamente justificables.
