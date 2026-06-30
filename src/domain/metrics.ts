import { GameSummary, RawRun, GameType, GAME_CONFIGS } from './types';

/**
 * Recalculates both the rolling 7-day average for all runs, and updates the aggregated summary.
 * This is a pure domain function.
 */
export function recalculateMetrics(runs: RawRun[]): { sortedRuns: RawRun[]; summaries: GameSummary[] } {
  // Sort runs by date ascending to compute rolling average correctly
  const sorted = [...runs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 1. Calculate Rolling 7-day average for each run (without mutating input objects)
  const sortedRuns: RawRun[] = sorted.map((run, i) => {
    const currentDate = new Date(run.timestamp);
    const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowRuns = sorted.slice(0, i + 1).filter(r => {
      if (r.juego !== run.juego) return false;
      const runDate = new Date(r.timestamp);
      return runDate >= sevenDaysAgo && runDate <= currentDate;
    });
    const sum = windowRuns.reduce((acc, r) => acc + r.yo, 0);
    return { ...run, mediaSemana: Number((sum / windowRuns.length).toFixed(2)) };
  });

  // Group runs by game
  const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens', 'Chess'];
  const summaries: GameSummary[] = games.map(juego => {
    const gameRuns = sortedRuns.filter(r => r.juego === juego);

    if (gameRuns.length === 0) {
      return {
        juego,
        yo: 0,
        media: 0,
        diferenciaPct: 0,
        ahorroS: 0,
        ahorroPct: 0,
        victoriasPct: 0,
        record: 0,
        peor: 0,
        contexto: 'Exploración',
        rendimiento: 0,
        volatilidad: 0,
        deltaSemana: null,
        totalPartidas: 0,
      };
    }

    const { direction } = GAME_CONFIGS[juego];

    const totalYo = gameRuns.reduce((acc, r) => acc + r.yo, 0);
    const totalMedia = gameRuns.reduce((acc, r) => acc + r.media, 0);

    const avgYo = Number((totalYo / gameRuns.length).toFixed(2));
    const avgMedia = Number((totalMedia / gameRuns.length).toFixed(2));

    // For lower=better: positive diferencia = you beat the baseline (good)
    // For higher=better: positive diferencia = you're above potential (good)
    const diferenciaPct = direction === 'lower'
      ? Number((((avgMedia - avgYo) / avgMedia) * 100).toFixed(2))
      : Number((((avgYo - avgMedia) / avgMedia) * 100).toFixed(2));

    const ahorroS = Number((avgMedia - avgYo).toFixed(2));
    const ahorroPct = Number(((ahorroS / avgMedia) * 100).toFixed(2));

    // Win: beat the baseline in the direction that matters
    const winRuns = gameRuns.filter(r => direction === 'lower' ? r.yo < r.media : r.yo >= r.media);
    const victoriasPct = Number((winRuns.length / gameRuns.length).toFixed(2));

    // Record: best result — min for lower=better, max for higher=better
    const record = direction === 'lower'
      ? Math.min(...gameRuns.map(r => r.yo))
      : Math.max(...gameRuns.map(r => r.yo));

    const peor = direction === 'lower'
      ? Math.max(...gameRuns.map(r => r.yo))
      : Math.min(...gameRuns.map(r => r.yo));

    // Rendimiento: avgMedia / avgYo
    const rendimiento = Number((avgMedia / avgYo).toFixed(2));

    // Calculate Volatilidad (Standard Deviation of user's times / Mean of user's times)
    const mean = totalYo / gameRuns.length;
    const variance = gameRuns.reduce((acc, r) => acc + Math.pow(r.yo - mean, 2), 0) / gameRuns.length;
    const stdDev = Math.sqrt(variance);
    const volatilidad = Number((stdDev / mean).toFixed(2));

    // Week-over-week delta: avg of last 7 days vs avg of days 8–14
    const now = new Date(sortedRuns[sortedRuns.length - 1]?.timestamp ?? Date.now());
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    const cutLast = new Date(now.getTime() - ms7);
    const cutPrev = new Date(now.getTime() - 2 * ms7);
    const last7 = gameRuns.filter(r => new Date(r.timestamp) >= cutLast);
    const prev7 = gameRuns.filter(r => new Date(r.timestamp) >= cutPrev && new Date(r.timestamp) < cutLast);
    const avgLast7 = last7.length > 0 ? last7.reduce((s, r) => s + r.yo, 0) / last7.length : null;
    const avgPrev7 = prev7.length > 0 ? prev7.reduce((s, r) => s + r.yo, 0) / prev7.length : null;
    const deltaSemana = avgLast7 !== null && avgPrev7 !== null
      ? Number((avgLast7 - avgPrev7).toFixed(1))
      : null;

    // For the summary's "Contexto", grab the context of the latest run or "Máximo" if recent runs are excellent
    const latestRun = gameRuns[gameRuns.length - 1];
    const contexto = latestRun ? latestRun.contexto : 'Exploración';

    return {
      juego,
      yo: avgYo,
      media: avgMedia,
      diferenciaPct,
      ahorroS,
      ahorroPct,
      victoriasPct,
      record,
      peor,
      contexto,
      rendimiento,
      volatilidad,
      deltaSemana,
      totalPartidas: gameRuns.length,
    };
  });

  return { sortedRuns, summaries };
}

/**
 * Determines the context of a new single run based on historical thresholds
 */
export function determineRunContext(
  yo: number,
  media: number,
  gameRuns: RawRun[],
  record: number,
  direction: 'lower' | 'higher' = 'lower'
): 'Máximo' | 'Exploración' | 'Anomalía' | 'Cansancio' {
  if (media === 0) return 'Exploración';
  // positive diferencia = good performance in either direction
  const diferencia = direction === 'lower'
    ? (media - yo) / media
    : (yo - media) / media;

  if (diferencia >= 0.3) return 'Máximo';
  if (diferencia >= 0)   return 'Exploración';
  if (diferencia >= -0.3) return 'Anomalía';
  return 'Cansancio';
}

// Helper to extract YYYY-MM-DD from ISO timestamp
function getLocalDate(isoString: string): string {
  return isoString.split('T')[0];
}

// Helper to get ISO Week number in a timezone-independent (UTC) way
function getWeekYearKey(isoString: string): string {
  const [year, month, day] = isoString.split('T')[0].split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export function calculatePearsonCorrelation(runs: RawRun[], gameA: GameType, gameB: GameType): number {
  const dates: Record<string, { a: number[]; b: number[] }> = {};
  
  runs.forEach(r => {
    if (r.yo === 0) return;
    const date = getLocalDate(r.timestamp);
    if (!dates[date]) {
      dates[date] = { a: [], b: [] };
    }
    const ratio = r.media / r.yo;
    if (r.juego === gameA) dates[date].a.push(ratio);
    if (r.juego === gameB) dates[date].b.push(ratio);
  });

  const pairs: { x: number; y: number }[] = [];
  Object.values(dates).forEach(d => {
    if (d.a.length > 0 && d.b.length > 0) {
      const avgA = d.a.reduce((sum, val) => sum + val, 0) / d.a.length;
      const avgB = d.b.reduce((sum, val) => sum + val, 0) / d.b.length;
      pairs.push({ x: avgA, y: avgB });
    }
  });

  if (pairs.length < 2) return 0;

  const n = pairs.length;
  const meanX = pairs.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = pairs.reduce((sum, p) => sum + p.y, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  pairs.forEach(p => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  });

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Number((num / den).toFixed(2));
}

export function calculateWeeklyVolatility(runs: RawRun[]): { week: string; Patches?: number; Zip?: number; Sudoku?: number; Queens?: number; }[] {
  const weeklyData: Record<string, Record<string, number[]>> = {};

  runs.forEach(r => {
    const weekKey = getWeekYearKey(r.timestamp);
    if (!weeklyData[weekKey]) weeklyData[weekKey] = {};
    if (!weeklyData[weekKey][r.juego]) weeklyData[weekKey][r.juego] = [];
    weeklyData[weekKey][r.juego].push(r.yo);
  });

  const results = Object.entries(weeklyData).map(([week, games]) => {
    const row: any = { week };
    Object.entries(games).forEach(([juego, times]) => {
      if (times.length < 2) {
        row[juego] = 0; // standard deviation is 0 if only 1 game
        return;
      }
      const mean = times.reduce((s, val) => s + val, 0) / times.length;
      if (mean === 0) {
        row[juego] = 0;
        return;
      }
      const variance = times.reduce((s, val) => s + Math.pow(val - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      row[juego] = Number((stdDev / mean).toFixed(3)); // Coefficient of Variation
    });
    return row;
  });

  return results.sort((a, b) => a.week.localeCompare(b.week));
}

export function groupRunsByTimeOfDay(runs: RawRun[], game: GameType): { block: string; avgYo: number; count: number; avgRatio: number; }[] {
  const filtered = runs.filter(r => r.juego === game && r.contexto !== 'Anomalía' && r.yo !== 0);
  const blocks = [
    { name: 'Madrugada (00-06)', min: 0, max: 6, runs: [] as RawRun[] },
    { name: 'Mañana (06-12)', min: 6, max: 12, runs: [] as RawRun[] },
    { name: 'Tarde (12-18)', min: 12, max: 18, runs: [] as RawRun[] },
    { name: 'Noche (18-00)', min: 18, max: 24, runs: [] as RawRun[] },
  ];

  filtered.forEach(r => {
    const hour = new Date(r.timestamp).getHours();
    const block = blocks.find(b => hour >= b.min && hour < b.max);
    if (block) block.runs.push(r);
  });

  return blocks.map(b => {
    const count = b.runs.length;
    const avgYo = count > 0 ? Number((b.runs.reduce((s, r) => s + r.yo, 0) / count).toFixed(1)) : 0;
    const avgRatio = count > 0 ? Number((b.runs.reduce((s, r) => s + (r.media / r.yo), 0) / count).toFixed(2)) : 0;
    return {
      block: b.name,
      avgYo,
      count,
      avgRatio,
    };
  });
}

export function generateCalendarGrid(anchorDate: Date, weeksCount: number): Date[][] {
  const dayOfWeek = anchorDate.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday=0 to Sunday=6

  // Monday of anchor week
  const currentMonday = new Date(anchorDate);
  currentMonday.setDate(anchorDate.getDate() - dayIndex);
  currentMonday.setHours(0, 0, 0, 0);

  // Monday of (weeksCount - 1) weeks ago
  const startDate = new Date(currentMonday);
  startDate.setDate(currentMonday.getDate() - (weeksCount - 1) * 7);

  const generatedWeeks: Date[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    const weekDays: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + (w * 7 + d));
      weekDays.push(day);
    }
    generatedWeeks.push(weekDays);
  }
  return generatedWeeks;
}

export interface ChessStats {
  latest: number;
  max: number;
  min: number;
  avg: number;
  wins: number;
  draws: number;
  losses: number;
  total: number;
  winsAsB: number;
  totalAsB: number;
  winsAsN: number;
  totalAsN: number;
  delta: number | null;
}

export function calculateChessStats(runs: RawRun[]): ChessStats | null {
  const chessRuns = runs
    .filter(r => r.juego === 'Chess')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (chessRuns.length === 0) return null;

  const elos = chessRuns.map(r => r.yo);
  const wins = chessRuns.filter(r => r.resultado === 'V').length;
  const draws = chessRuns.filter(r => r.resultado === 'T').length;
  const losses = chessRuns.filter(r => r.resultado === 'D').length;

  const asB = chessRuns.filter(r => r.color === 'B');
  const asN = chessRuns.filter(r => r.color === 'N');
  const winsAsB = asB.filter(r => r.resultado === 'V').length;
  const winsAsN = asN.filter(r => r.resultado === 'V').length;

  const latest = chessRuns[chessRuns.length - 1];
  const prev = chessRuns[chessRuns.length - 2];
  const delta = prev ? latest.yo - prev.yo : null;

  return {
    latest: latest.yo,
    max: Math.max(...elos),
    min: Math.min(...elos),
    avg: Math.round(elos.reduce((a, b) => a + b, 0) / elos.length),
    wins,
    draws,
    losses,
    total: chessRuns.length,
    winsAsB,
    totalAsB: asB.length,
    winsAsN,
    totalAsN: asN.length,
    delta,
  };
}

