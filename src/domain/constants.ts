import { GameSummary, RawRun, GameType } from './types';

// The default record times for new runs (to evaluate "Máximo" context before user has run history)
export const DEFAULT_RECORD_TIMES: Record<GameType, number> = {
  Patches: 7,
  Zip: 7,
  Sudoku: 43,
  Queens: 25,
};

// The initial aggregate data provided by the user (expressed using numbers)
export const INITIAL_SUMMARY: GameSummary[] = [
  {
    juego: 'Patches',
    yo: 26.21,
    media: 45.74,
    diferenciaPct: -43.0,
    ahorroS: 19.53,
    ahorroPct: 33.56,
    victoriasPct: 0.87,
    record: 7,
    peor: 81,
    contexto: 'Máximo',
    rendimiento: 1.75,
    volatilidad: 0.70,
  },
  {
    juego: 'Zip',
    yo: 22.18,
    media: 31.49,
    diferenciaPct: -30.0,
    ahorroS: 9.31,
    ahorroPct: 17.31,
    victoriasPct: 0.69,
    record: 7,
    peor: 49,
    contexto: 'Máximo',
    rendimiento: 1.42,
    volatilidad: 0.56,
  },
  {
    juego: 'Sudoku',
    yo: 81.31,
    media: 118.44,
    diferenciaPct: -31.0,
    ahorroS: 37.13,
    ahorroPct: 28.82,
    victoriasPct: 0.95,
    record: 43,
    peor: 178,
    contexto: 'Máximo',
    rendimiento: 1.46,
    volatilidad: 0.34,
  },
  {
    juego: 'Queens',
    yo: 50.0,
    media: 84.03,
    diferenciaPct: -40.0,
    ahorroS: 34.03,
    ahorroPct: 29.08,
    victoriasPct: 0.82,
    record: 25,
    peor: 88,
    contexto: 'Máximo',
    rendimiento: 1.68,
    volatilidad: 0.32,
  },
];

// Rich, realistic daily historical runs from June 1st to June 24th, 2026.
export const INITIAL_RUNS: RawRun[] = [
  // --- PATCHES (Yo average ~26s, community ~45s, record=7s, worst=81s) ---
  { id: 'p1', timestamp: '2026-06-01T10:15:00-07:00', juego: 'Patches', yo: 28.5, media: 46.2, ahorro: 17.7, contexto: 'Exploración', nota: 'Partida regular' },
  { id: 'p2', timestamp: '2026-06-03T09:40:00-07:00', juego: 'Patches', yo: 25.1, media: 45.8, ahorro: 20.7, contexto: 'Exploración' },
  { id: 'p3', timestamp: '2026-06-05T11:20:00-07:00', juego: 'Patches', yo: 29.8, media: 46.5, ahorro: 16.7, contexto: 'Exploración' },
  { id: 'p4', timestamp: '2026-06-07T14:30:00-07:00', juego: 'Patches', yo: 24.3, media: 45.0, ahorro: 20.7, contexto: 'Exploración' },
  { id: 'p5', timestamp: '2026-06-10T08:12:00-07:00', juego: 'Patches', yo: 81.0, media: 45.5, ahorro: -35.5, contexto: 'Anomalía', nota: 'Error de click repetido y bloqueo en patrón' },
  { id: 'p6', timestamp: '2026-06-12T10:05:00-07:00', juego: 'Patches', yo: 26.0, media: 45.9, ahorro: 19.9, contexto: 'Exploración' },
  { id: 'p7', timestamp: '2026-06-14T17:15:00-07:00', juego: 'Patches', yo: 23.4, media: 45.2, ahorro: 21.8, contexto: 'Exploración' },
  { id: 'p8', timestamp: '2026-06-16T12:00:00-07:00', juego: 'Patches', yo: 25.8, media: 45.7, ahorro: 19.9, contexto: 'Exploración' },
  { id: 'p9', timestamp: '2026-06-19T09:30:00-07:00', juego: 'Patches', yo: 27.2, media: 46.0, ahorro: 18.8, contexto: 'Exploración' },
  { id: 'p10', timestamp: '2026-06-21T15:20:00-07:00', juego: 'Patches', yo: 22.0, media: 45.4, ahorro: 23.4, contexto: 'Exploración' },
  { id: 'p11', timestamp: '2026-06-22T10:45:00-07:00', juego: 'Patches', yo: 7.0,  media: 45.0, ahorro: 38.0, contexto: 'Máximo', nota: 'Récord personal absoluto, patrón perfecto' },
  { id: 'p12', timestamp: '2026-06-23T11:00:00-07:00', juego: 'Patches', yo: 23.5, media: 45.3, ahorro: 21.8, contexto: 'Exploración' },

  // --- ZIP (Yo average ~22s, community ~31.5s, record=7s, worst=49s) ---
  { id: 'z1', timestamp: '2026-06-02T11:10:00-07:00', juego: 'Zip', yo: 24.2, media: 31.8, ahorro: 7.6, contexto: 'Exploración' },
  { id: 'z2', timestamp: '2026-06-04T08:50:00-07:00', juego: 'Zip', yo: 21.8, media: 31.2, ahorro: 9.4, contexto: 'Exploración' },
  { id: 'z3', timestamp: '2026-06-06T13:15:00-07:00', juego: 'Zip', yo: 23.0, media: 31.5, ahorro: 8.5, contexto: 'Exploración' },
  { id: 'z4', timestamp: '2026-06-08T09:22:00-07:00', juego: 'Zip', yo: 49.0, media: 31.0, ahorro: -18.0, contexto: 'Anomalía', nota: 'Distracción externa durante la partida' },
  { id: 'z5', timestamp: '2026-06-11T14:40:00-07:00', juego: 'Zip', yo: 20.5, media: 31.6, ahorro: 11.1, contexto: 'Exploración' },
  { id: 'z6', timestamp: '2026-06-13T10:30:00-07:00', juego: 'Zip', yo: 22.1, media: 31.9, ahorro: 9.8, contexto: 'Exploración' },
  { id: 'z7', timestamp: '2026-06-16T15:00:00-07:00', juego: 'Zip', yo: 21.0, media: 31.4, ahorro: 10.4, contexto: 'Exploración' },
  { id: 'z8', timestamp: '2026-06-18T09:10:00-07:00', juego: 'Zip', yo: 7.0,  media: 31.1, ahorro: 24.1, contexto: 'Máximo', nota: 'Récord personal absoluto, tablero muy sencillo' },
  { id: 'z9', timestamp: '2026-06-20T11:55:00-07:00', juego: 'Zip', yo: 19.8, media: 31.5, ahorro: 11.7, contexto: 'Exploración' },
  { id: 'z10', timestamp: '2026-06-23T14:05:00-07:00', juego: 'Zip', yo: 21.2, media: 31.3, ahorro: 10.1, contexto: 'Exploración' },

  // --- SUDOKU (Yo average ~81s, community ~118s, record=43s, worst=178s) ---
  { id: 's1', timestamp: '2026-06-01T14:00:00-07:00', juego: 'Sudoku', yo: 84.5, media: 119.2, ahorro: 34.7, contexto: 'Exploración' },
  { id: 's2', timestamp: '2026-06-05T18:30:00-07:00', juego: 'Sudoku', yo: 178.0, media: 117.5, ahorro: -60.5, contexto: 'Anomalía', nota: 'Se trabó una casilla, borrón y cuenta nueva' },
  { id: 's3', timestamp: '2026-06-08T11:00:00-07:00', juego: 'Sudoku', yo: 82.1, media: 118.0, ahorro: 35.9, contexto: 'Exploración' },
  { id: 's4', timestamp: '2026-06-11T19:12:00-07:00', juego: 'Sudoku', yo: 80.0, media: 118.6, ahorro: 38.6, contexto: 'Exploración' },
  { id: 's5', timestamp: '2026-06-14T10:45:00-07:00', juego: 'Sudoku', yo: 85.3, media: 119.0, ahorro: 33.7, contexto: 'Exploración' },
  { id: 's6', timestamp: '2026-06-17T08:15:00-07:00', juego: 'Sudoku', yo: 76.5, media: 118.3, ahorro: 41.8, contexto: 'Exploración' },
  { id: 's7', timestamp: '2026-06-20T16:30:00-07:00', juego: 'Sudoku', yo: 43.0, media: 117.9, ahorro: 74.9, contexto: 'Máximo', nota: 'Récord personal absoluto, resolución fluida de candidatos' },
  { id: 's8', timestamp: '2026-06-22T12:10:00-07:00', juego: 'Sudoku', yo: 79.2, media: 118.5, ahorro: 39.3, contexto: 'Exploración' },
  { id: 's9', timestamp: '2026-06-23T20:00:00-07:00', juego: 'Sudoku', yo: 81.0, media: 118.4, ahorro: 37.4, contexto: 'Exploración' },

  // --- QUEENS (Yo average ~50s, community ~84s, record=25s, worst=88s) ---
  { id: 'q1', timestamp: '2026-06-02T16:22:00-07:00', juego: 'Queens', yo: 53.0, media: 84.5, ahorro: 31.5, contexto: 'Exploración' },
  { id: 'q2', timestamp: '2026-06-05T12:05:00-07:00', juego: 'Queens', yo: 49.5, media: 83.8, ahorro: 34.3, contexto: 'Exploración' },
  { id: 'q3', timestamp: '2026-06-09T09:50:00-07:00', juego: 'Queens', yo: 51.2, media: 84.1, ahorro: 32.9, contexto: 'Exploración' },
  { id: 'q4', timestamp: '2026-06-12T15:30:00-07:00', juego: 'Queens', yo: 88.0, media: 84.0, ahorro: -4.0,  contexto: 'Anomalía', nota: 'Error de doble corona en fila, costó deshacer' },
  { id: 'q5', timestamp: '2026-06-15T11:00:00-07:00', juego: 'Queens', yo: 48.0, media: 83.9, ahorro: 35.9, contexto: 'Exploración' },
  { id: 'q6', timestamp: '2026-06-18T10:00:00-07:00', juego: 'Queens', yo: 46.8, media: 84.2, ahorro: 37.4, contexto: 'Exploración' },
  { id: 'q7', timestamp: '2026-06-21T14:15:00-07:00', juego: 'Queens', yo: 25.0, media: 83.5, ahorro: 58.5, contexto: 'Máximo', nota: 'Récord personal absoluto' },
  { id: 'q8', timestamp: '2026-06-23T08:50:00-07:00', juego: 'Queens', yo: 47.5, media: 84.0, ahorro: 36.5, contexto: 'Exploración' },
];
