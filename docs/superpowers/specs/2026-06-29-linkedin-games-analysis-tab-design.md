# Especificación de Diseño: Pestaña "Análisis" (Análisis de Patrones Avanzados)
**Fecha:** 2026-06-29  
**Autor:** Antigravity  
**Estado:** Propuesto  

---

## 1. Resumen Ejecutivo
Para satisfacer la necesidad del usuario de ver patrones complejos y consistencia en sus partidas diarias de los juegos de LinkedIn (*Patches*, *Zip*, *Sudoku*, *Queens*), se añadirá un sistema de pestañas de primer nivel al panel principal. 

Este sistema introducirá una pestaña llamada **"Análisis"** que alojará cuatro herramientas analíticas avanzadas separadas por un selector de sub-pestañas para evitar la sobrecarga visual:
1. **Mapa de Calor Anual:** Cuadrícula de 52 semanas tipo GitHub que mide la constancia de asistencia y el rendimiento relativo a la comunidad.
2. **Rendimiento por Hora (Patrón Temporal):** Gráfico de dispersión (Scatter Plot) de tiempos vs. hora del día, con resúmenes por bloques horarios.
3. **Tendencia de Volatilidad (Consistencia):** Línea de tendencia semanal del Coeficiente de Variación ($\sigma/\mu$) para medir el aumento de la precisión técnica.
4. **Correlación Cruzada (Multi-juego):** Matriz de 4x4 que analiza la correlación de rendimiento entre juegos en el mismo día.

---

## 2. Arquitectura de Navegación y UI
Se modificará la estructura de `src/presentation/App.tsx` para incorporar un selector de pestañas principal:

### Navegación Principal (Nivel 1)
*   **Inicio (Dashboard):** Panel actual con KPIs, gráfico histórico general, formulario de registro, sincronización y log de anomalías.
*   **Análisis:** Nueva pestaña de análisis profundo de patrones.

### Navegación de Análisis (Nivel 2)
Dentro de la pestaña **Análisis**, se incluirá un menú de navegación horizontal secundario y estilizado:
`[ Mapa de Calor ]  [ Rendimiento por Hora ]  [ Tendencia de Volatilidad ]  [ Correlación Cruzada ]`

---

## 3. Especificación Detallada de Componentes

### 3.1. Sub-pestaña 1: Mapa de Calor Anual (`HeatmapPanel.tsx`)
*   **Visualización:** Grid de celdas cuadradas organizadas en 7 filas (días de la semana) por 52 columnas (semanas del año).
*   **Selector de Filtro:** Un dropdown con opciones: `Todos`, `Patches`, `Zip`, `Sudoku`, `Queens`.
*   **Lógica de Color:**
    *   Si es `Todos`: El color representa el *volumen de juego* diario (cuántos de los 4 juegos se completaron ese día). Escala: 0 juegos (gris oscuro), 1-2 (verde apagado), 3 (verde brillante), 4 (verde esmeralda intenso).
    *   Si es un juego específico: Representa el *rendimiento relativo*.
        *   Gris: No jugado.
        *   Verde Oscuro: Rendimiento Normal (desviación estándar dentro del rango).
        *   Verde Claro/Brillante: Rendimiento Alto ($yo < media$).
        *   Naranja/Marrón: Rendimiento Bajo ($yo > media$).
        *   Dorado/Oro: Récord Personal ($yo \le record$).
        *   Rojo: Anomalía / Cansancio ($yo > mediaSemana + 1.5 \cdot \sigma$).
*   **Interactividad:** Tooltip flotante al pasar el ratón (hover) mostrando la fecha, los tiempos registrados y la comparación con la media.

### 3.2. Sub-pestaña 2: Rendimiento por Hora (`TemporalAnalysisPanel.tsx`)
*   **Visualización A (Scatter Plot):** Un gráfico de dispersión usando Recharts donde:
    *   Eje X: Hora del día (formato `00:00` a `23:59`).
    *   Eje Y: Tiempo del jugador ($yo$) en segundos.
    *   Puntos: Cada punto representa una partida, coloreada por el tipo de juego o destacando récords/anomalías.
    *   Línea de tendencia: Una línea de regresión suave que ayude a ver visualmente si el rendimiento mejora o empeora a ciertas horas.
*   **Visualización B (Bloques Horarios):** Tarjetas que agrupan los datos en 4 bloques:
    *   *Mañana (06:00 - 12:00)*
    *   *Tarde (12:00 - 18:00)*
    *   *Noche (18:00 - 00:00)*
    *   *Madrugada (00:00 - 06:00)*
    Cada bloque muestra la media del periodo y un tag comparativo (ej: *"Un 14% más rápido que tu media general"*). Las partidas etiquetadas como `Anomalía` se excluyen de este cálculo.

### 3.3. Sub-pestaña 3: Tendencia de Volatilidad (`VolatilityTrendPanel.tsx`)
*   **Objetivo:** Medir la consistencia del jugador. Reducir la volatilidad indica que el jugador comete menos fallos graves y domina el juego.
*   **Cálculo Técnico:** Para cada semana del año, se calcula el Coeficiente de Variación ($CV$) para cada juego:
    $$CV = \frac{\sigma}{\mu}$$
    Donde $\sigma$ es la desviación típica de tus tiempos en esa semana, y $\mu$ es la media de tus tiempos en esa semana. 
    *Nota: Usar CV es crucial porque normaliza la dispersión. Permite comparar Sudoku (media ~80s) con Patches (media ~25s) en el mismo gráfico sin que Sudoku domine la escala.*
*   **Visualización:** Gráfico de líneas (`LineChart`) con 4 curvas de colores diferentes. El eje X muestra las semanas (ej: *"Semana 24"*) y el eje Y el valor de $CV$.

### 3.4. Sub-pestaña 4: Correlación Cruzada (`CrossGameCorrelationPanel.tsx`)
*   **Objetivo:** Descubrir si un buen desempeño en un juego se correlaciona con un buen desempeño en otro el mismo día (días de "flujo mental").
*   **Cálculo Técnico:**
    1.  Agrupar las partidas por fecha del calendario.
    2.  Para cada juego, calcular el Ratio de Rendimiento ($Ratio = \frac{mediaComunidad}{yo}$).
    3.  Para cada par de juegos, filtrar las fechas donde *ambos* juegos tienen registros.
    4.  Calcular el Coeficiente de Correlación de Pearson ($r$):
        $$r = \frac{\sum (X - \bar{X})(Y - \bar{Y})}{\sqrt{\sum (X - \bar{X})^2 \sum (Y - \bar{Y})^2}}$$
        Donde $X$ e $Y$ son los ratios de rendimiento de los dos juegos cruzados.
*   **Visualización:** Tabla/Matriz de 4x4.
    *   Las celdas muestran el valor de $r$ con dos decimales (ej: `+0.54`, `-0.15`).
    *   Fondo de celdas coloreado según el rango de $r$ (Verde para correlación positiva, Gris para neutra, Rosa/Rojo para negativa).
*   **Interpretación:** Panel de conclusiones escritas en lenguaje natural generadas a partir de los coeficientes de correlación más significativos.

---

## 4. Estructura de Archivos y Cambios de Código

### Nuevos Componentes
*   [heatmap-analysis](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/HeatmapPanel.tsx)
*   [temporal-analysis](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/TemporalAnalysisPanel.tsx)
*   [volatility-analysis](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/VolatilityTrendPanel.tsx)
*   [correlation-analysis](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/CrossGameCorrelationPanel.tsx)
*   [analysis-container](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx) (Orquestador que agrupa las 4 sub-pestañas).

### Nuevas Funciones de Dominio (`src/domain/metrics.ts` / `src/utils/math.ts`)
*   Función para agrupar partidas por bloques de fecha (semanas, días, horas).
*   Función matemática para calcular el coeficiente de correlación de Pearson.
*   Función para extraer medias móviles semanales de desviación típica y CV.

---

## 5. Criterios de Aceptación y Pruebas
1.  **Interactividad fluida:** Cambiar de sub-pestaña no debe recargar la página.
2.  **Tratamiento de datos nulos:** Si un día no tiene partidas o una semana tiene menos de 2 registros para calcular la desviación típica, los componentes deben mostrar estados vacíos o explicativos amigables en vez de arrojar `NaN` o romper el renderizado.
3.  **Filtrado de anomalías:** Debe haber un interruptor de control de anomalías que recalcule dinámicamente la correlación y volatilidad con/sin datos anómalos.
