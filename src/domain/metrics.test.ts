import { describe, it, expect } from 'vitest';
import { recalculateMetrics, calculatePearsonCorrelation, calculateWeeklyVolatility, groupRunsByTimeOfDay, generateCalendarGrid, calculateChessStats } from './metrics';
import { RawRun } from './types';

const mockRuns: RawRun[] = [
  // Day 1 (Monday, 2026-06-01)
  { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
  { id: '2', timestamp: '2026-06-01T09:15:00', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
  // Day 2 (Tuesday, 2026-06-02)
  { id: '3', timestamp: '2026-06-02T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
  { id: '4', timestamp: '2026-06-02T14:20:00', juego: 'Queens', yo: 60, media: 80, ahorro: 20, contexto: 'Exploración' },
  // Day 3 (Wednesday, 2026-06-03)
  { id: '5', timestamp: '2026-06-03T23:30:00', juego: 'Patches', yo: 25, media: 50, ahorro: 25, contexto: 'Exploración' },
];

describe('Análisis Estadístico Avanzado', () => {
  describe('calculatePearsonCorrelation', () => {
    it('calcula correlación de Pearson correctamente para correlación perfecta', () => {
      // Game ratio = media / yo
      // Day 1: Patches ratio = 40/20 = 2.0; Queens ratio = 80/40 = 2.0
      // Day 2: Patches ratio = 40/30 = 1.333; Queens ratio = 80/60 = 1.333
      // Both sets of data have values: [2.0, 1.333], which correlate perfectly.
      const corr = calculatePearsonCorrelation(mockRuns, 'Patches', 'Queens');
      expect(corr).toBeCloseTo(1.0, 2);
    });

    it('devuelve 0 si hay menos de 2 días coincidentes', () => {
      const corr = calculatePearsonCorrelation(mockRuns.slice(0, 2), 'Patches', 'Queens');
      expect(corr).toBe(0);
    });

    it('devuelve 0 si la desviación estándar es 0 (datos constantes)', () => {
      const constantRuns: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T09:15:00', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
        { id: '3', timestamp: '2026-06-02T10:00:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
        { id: '4', timestamp: '2026-06-02T14:20:00', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
      ];
      const corr = calculatePearsonCorrelation(constantRuns, 'Patches', 'Queens');
      expect(corr).toBe(0);
    });

    it('ignora partidas donde yo === 0', () => {
      const runsWithZero: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 0, media: 40, ahorro: 40, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T09:15:00', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
        { id: '3', timestamp: '2026-06-02T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
        { id: '4', timestamp: '2026-06-02T14:20:00', juego: 'Queens', yo: 60, media: 80, ahorro: 20, contexto: 'Exploración' },
      ];
      const corr = calculatePearsonCorrelation(runsWithZero, 'Patches', 'Queens');
      expect(corr).toBe(0);
    });

    it('promedia los ratios de rendimiento si hay múltiples partidas el mismo día para el mismo juego', () => {
      const runsWithMultiple: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T12:00:00', juego: 'Patches', yo: 40, media: 40, ahorro: 0, contexto: 'Exploración' },
        { id: '3', timestamp: '2026-06-01T09:15:00', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
        { id: '4', timestamp: '2026-06-02T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
        { id: '5', timestamp: '2026-06-02T14:20:00', juego: 'Queens', yo: 60, media: 80, ahorro: 20, contexto: 'Exploración' },
      ];
      const corr = calculatePearsonCorrelation(runsWithMultiple, 'Patches', 'Queens');
      expect(corr).toBeCloseTo(1.0, 2);
    });
  });

  describe('calculateWeeklyVolatility', () => {
    it('calcula volatilidad semanal correctamente', () => {
      // 2026-06-01 is Monday, week key should be 2026-W23 (let's verify the utility's key)
      const vol = calculateWeeklyVolatility(mockRuns);
      expect(vol.length).toBe(1);
      
      const firstWeek = vol[0];
      expect(firstWeek.week).toMatch(/^2026-W\d{2}$/);
      
      // Patches times in week 23: 20, 30, 25.
      // Mean = (20 + 30 + 25) / 3 = 25
      // Variance = ((20-25)^2 + (30-25)^2 + (25-25)^2) / 3 = (25 + 25 + 0) / 3 = 50 / 3 = 16.6667
      // stdDev = sqrt(50/3) ≈ 4.08248
      // Volatility (Coefficient of Variation) = 4.08248 / 25 ≈ 0.163
      expect(firstWeek.Patches).toBeCloseTo(0.163, 3);
      
      // Queens times: 40, 60.
      // Mean = 50
      // Variance = ((40-50)^2 + (60-50)^2) / 2 = 100
      // stdDev = 10
      // Volatility = 10 / 50 = 0.200
      expect(firstWeek.Queens).toBeCloseTo(0.200, 3);
    });

    it('devuelve 0 para juegos con solo 1 partida en la semana', () => {
      const singleRun: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' }
      ];
      const vol = calculateWeeklyVolatility(singleRun);
      expect(vol[0].Patches).toBe(0);
    });

    it('devuelve 0 si el promedio de tiempos es 0', () => {
      const zeroRuns: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 0, media: 40, ahorro: 40, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T10:00:00', juego: 'Patches', yo: 0, media: 40, ahorro: 40, contexto: 'Exploración' },
      ];
      const vol = calculateWeeklyVolatility(zeroRuns);
      expect(vol[0].Patches).toBe(0);
    });
  });

  describe('groupRunsByTimeOfDay', () => {
    it('agrupa partidas por bloque horario y calcula promedios omitiendo anomalías', () => {
      const mixedRuns: RawRun[] = [
        // Mañana (06-12)
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
        // Tarde (12-18)
        { id: '3', timestamp: '2026-06-01T14:00:00', juego: 'Patches', yo: 25, media: 50, ahorro: 25, contexto: 'Exploración' },
        // Anomalía - should be ignored
        { id: '4', timestamp: '2026-06-01T15:00:00', juego: 'Patches', yo: 10, media: 40, ahorro: 30, contexto: 'Anomalía' },
        // Noche (18-00)
        { id: '5', timestamp: '2026-06-01T19:00:00', juego: 'Patches', yo: 50, media: 50, ahorro: 0, contexto: 'Exploración' },
        // Madrugada (00-06)
        { id: '6', timestamp: '2026-06-01T03:00:00', juego: 'Patches', yo: 40, media: 40, ahorro: 0, contexto: 'Exploración' }
      ];

      const groups = groupRunsByTimeOfDay(mixedRuns, 'Patches');
      expect(groups.length).toBe(4);

      // Check Madrugada (00-06): 1 run (yo: 40, ratio: 40/40 = 1.0)
      const madrugada = groups.find(g => g.block.startsWith('Madrugada'));
      expect(madrugada).toEqual({ block: 'Madrugada (00-06)', avgYo: 40, count: 1, avgRatio: 1 });

      // Check Mañana (06-12): 2 runs (yo: 20 and 30 -> avgYo: 25. Ratios: 40/20 = 2.0, 40/30 = 1.333 -> avgRatio: 1.67)
      const manana = groups.find(g => g.block.startsWith('Mañana'));
      expect(manana).toEqual({ block: 'Mañana (06-12)', avgYo: 25, count: 2, avgRatio: 1.67 });

      // Check Tarde (12-18): 1 run (excl. anomaly) (yo: 25, ratio: 50/25 = 2.0)
      const tarde = groups.find(g => g.block.startsWith('Tarde'));
      expect(tarde).toEqual({ block: 'Tarde (12-18)', avgYo: 25, count: 1, avgRatio: 2.0 });

      // Check Noche (18-00): 1 run (yo: 50, ratio: 50/50 = 1.0)
      const noche = groups.find(g => g.block.startsWith('Noche'));
      expect(noche).toEqual({ block: 'Noche (18-00)', avgYo: 50, count: 1, avgRatio: 1.0 });
    });

    it('ignora partidas donde yo === 0', () => {
      const runsWithZero: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T08:30:00', juego: 'Patches', yo: 0, media: 40, ahorro: 40, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-01T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' }
      ];
      const groups = groupRunsByTimeOfDay(runsWithZero, 'Patches');
      const manana = groups.find(g => g.block.startsWith('Mañana'));
      expect(manana).toEqual({ block: 'Mañana (06-12)', avgYo: 30, count: 1, avgRatio: 1.33 });
    });
  });

  describe('generateCalendarGrid', () => {
    it('returns exactly 26 weeks', () => {
      const grid = generateCalendarGrid(new Date('2026-06-29'), 26);
      expect(grid.length).toBe(26);
    });

    it('each week contains exactly 7 days', () => {
      const grid = generateCalendarGrid(new Date('2026-06-29'), 26);
      grid.forEach(week => {
        expect(week.length).toBe(7);
      });
    });

    it('the first day of each week is a Monday (day of week = 1)', () => {
      const grid = generateCalendarGrid(new Date('2026-06-29'), 26);
      grid.forEach(week => {
        expect(week[0].getDay()).toBe(1); // 1 = Monday
      });
    });

    it('the last day of the last week is Sunday, July 5th, 2026', () => {
      const grid = generateCalendarGrid(new Date('2026-06-29'), 26);
      const lastWeek = grid[grid.length - 1];
      const lastDay = lastWeek[lastWeek.length - 1];
      
      expect(lastDay.getFullYear()).toBe(2026);
      expect(lastDay.getMonth()).toBe(6); // July is index 6
      expect(lastDay.getDate()).toBe(5);
      expect(lastDay.getDay()).toBe(0); // Sunday
    });
  });

  describe('recalculateMetrics immutability', () => {
    it('does not mutate the original run objects', () => {
      const runs: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T10:00:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
        { id: '2', timestamp: '2026-06-02T10:00:00', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
      ];
      const originalKeys = Object.keys(runs[0]).sort();
      recalculateMetrics(runs);
      expect(Object.keys(runs[0]).sort()).toEqual(originalKeys);
      expect(runs[0].yo).toBe(20);
      expect('mediaSemana' in runs[0]).toBe(false);
    });
  });

  describe('calculateChessStats', () => {
    it('calcula estadisticas de ajedrez correctamente', () => {
      const chessRuns: RawRun[] = [
        { id: 'c1', timestamp: '2026-06-01T10:00:00', juego: 'Chess', yo: 1400, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'B', resultado: 'V' },
        { id: 'c2', timestamp: '2026-06-02T10:00:00', juego: 'Chess', yo: 1410, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'N', resultado: 'D' },
        { id: 'c3', timestamp: '2026-06-03T10:00:00', juego: 'Chess', yo: 1420, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'B', resultado: 'T' }
      ];
      const stats = calculateChessStats(chessRuns);
      expect(stats).not.toBeNull();
      expect(stats!.latest).toBe(1420);
      expect(stats!.max).toBe(1420);
      expect(stats!.min).toBe(1400);
      expect(stats!.avg).toBe(1410);
      expect(stats!.wins).toBe(1);
      expect(stats!.losses).toBe(1);
      expect(stats!.draws).toBe(1);
      expect(stats!.total).toBe(3);
      expect(stats!.winsAsB).toBe(1);
      expect(stats!.totalAsB).toBe(2);
      expect(stats!.winsAsN).toBe(0);
      expect(stats!.totalAsN).toBe(1);
      expect(stats!.delta).toBe(10); // 1420 - 1410
    });

    it('devuelve null si no hay partidas de ajedrez', () => {
      const stats = calculateChessStats([]);
      expect(stats).toBeNull();

      const nonChessRuns: RawRun[] = [
        { id: '1', timestamp: '2026-06-01T10:00:00', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' }
      ];
      const stats2 = calculateChessStats(nonChessRuns);
      expect(stats2).toBeNull();
    });

    it('calcula delta como null si solo hay una partida de ajedrez', () => {
      const chessRuns: RawRun[] = [
        { id: 'c1', timestamp: '2026-06-01T10:00:00', juego: 'Chess', yo: 1400, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'B', resultado: 'V' }
      ];
      const stats = calculateChessStats(chessRuns);
      expect(stats).not.toBeNull();
      expect(stats!.delta).toBeNull();
    });
  });
});
