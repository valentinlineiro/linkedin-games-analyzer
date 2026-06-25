import { GameSummary, RawRun, GameType } from './types';

/**
 * Recalculates both the rolling 7-day average for all runs, and updates the aggregated summary.
 * This is a pure domain function.
 */
export function recalculateMetrics(runs: RawRun[]): { sortedRuns: RawRun[]; summaries: GameSummary[] } {
  // Sort runs by date ascending to compute rolling average correctly
  const sortedRuns = [...runs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 1. Calculate Rolling 7-day average for each run
  // Rolling 7 days means: average of the user's times for that game in the interval [currentDate - 7 days, currentDate]
  for (let i = 0; i < sortedRuns.length; i++) {
    const currentRun = sortedRuns[i];
    const currentDate = new Date(currentRun.timestamp);
    const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter runs of same game within the [currentDate - 7 days, currentDate] window
    const windowRuns = sortedRuns.slice(0, i + 1).filter(r => {
      if (r.juego !== currentRun.juego) return false;
      const runDate = new Date(r.timestamp);
      return runDate >= sevenDaysAgo && runDate <= currentDate;
    });

    const sum = windowRuns.reduce((acc, r) => acc + r.yo, 0);
    currentRun.mediaSemana = Number((sum / windowRuns.length).toFixed(2));
  }

  // Group runs by game
  const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];
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
      };
    }

    const totalYo = gameRuns.reduce((acc, r) => acc + r.yo, 0);
    const totalMedia = gameRuns.reduce((acc, r) => acc + r.media, 0);
    
    const avgYo = Number((totalYo / gameRuns.length).toFixed(2));
    const avgMedia = Number((totalMedia / gameRuns.length).toFixed(2));

    // Difference in percentage: (avgYo - avgMedia) / avgMedia
    const diferenciaPct = Number((((avgYo - avgMedia) / avgMedia) * 100).toFixed(2));

    // Ahorro (s): avgMedia - avgYo
    const ahorroS = Number((avgMedia - avgYo).toFixed(2));

    // Ahorro (%): ahorroS / avgMedia * 100
    const ahorroPct = Number(((ahorroS / avgMedia) * 100).toFixed(2));

    // Win rate: percentage of runs where user beat the community average (yo < media)
    const winRuns = gameRuns.filter(r => r.yo < r.media);
    const victoriasPct = Number((winRuns.length / gameRuns.length).toFixed(2));

    // Record: minimum player time
    const record = Math.min(...gameRuns.map(r => r.yo));

    // Peor: maximum player time
    const peor = Math.max(...gameRuns.map(r => r.yo));

    // Rendimiento: avgMedia / avgYo
    const rendimiento = Number((avgMedia / avgYo).toFixed(2));

    // Calculate Volatilidad (Standard Deviation of user's times / Mean of user's times)
    const mean = totalYo / gameRuns.length;
    const variance = gameRuns.reduce((acc, r) => acc + Math.pow(r.yo - mean, 2), 0) / gameRuns.length;
    const stdDev = Math.sqrt(variance);
    const volatilidad = Number((stdDev / mean).toFixed(2));

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
  record: number
): 'Máximo' | 'Exploración' | 'Anomalía' | 'Cansancio' {
  if (media === 0) return 'Exploración';
  const diferencia = (media - yo) / media;
  
  if (diferencia >= 0.3) {
    return 'Máximo';
  } else if (diferencia >= 0) {
    return 'Exploración';
  } else if (diferencia >= -0.3) {
    return 'Anomalía';
  } else {
    return 'Cansancio';
  }
}
