import React from 'react';
import { GameSummary } from '../../domain/types';
import { Trophy, Users, Zap, TrendingUp, Sparkles, Target, Activity } from 'lucide-react';

interface DashboardMetricsProps {
  summaries: GameSummary[];
}

export default function DashboardMetrics({ summaries }: DashboardMetricsProps) {
  // Find the game with the highest competitive advantage
  const bestGame = [...summaries].sort((a, b) => b.rendimiento - a.rendimiento)[0];

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-6" id="dashboard-metrics-container">
      {/* Competitive Advantage Insight Callout */}
      {bestGame && (
        <div 
          className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/25 rounded-2xl p-6"
          id="competitive-advantage-banner"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-36 h-36 text-emerald-500" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                  Análisis de Ventaja Competitiva
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Mejor desempeño: {bestGame.juego}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                Dominas con mayor ventaja en <span className="text-emerald-400">{bestGame.juego}</span>
              </h3>
              <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
                Tus tiempos de resolución en <strong>{bestGame.juego}</strong> superan a la media de la comunidad en un <strong>{formatNumber(Math.abs(bestGame.diferenciaPct), 0)}%</strong>. 
                Consigues resolverlo en una media de <strong>{formatNumber(bestGame.yo, 1)}s</strong> frente a los <strong>{formatNumber(bestGame.media, 1)}s</strong> generales, 
                lo que te da un coeficiente de aceleración de <strong>{formatNumber(bestGame.rendimiento, 2)}x</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        {summaries.map((summary) => {
          const isWinner = summary.yo < summary.media;

          return (
            <div 
              key={summary.juego}
              className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all space-y-4"
            >
              {/* Title & Micro Tag */}
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h4 className="font-display font-bold text-sm text-white">{summary.juego}</h4>
                  <span className="inline-flex items-center text-[10px] text-neutral-500">
                    <Activity className="w-3 h-3 text-emerald-400 shrink-0 mr-1" />
                    Contexto: {summary.contexto}
                  </span>
                </div>
                
                {isWinner ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Superior a Media
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Ajustado a Media
                  </span>
                )}
              </div>

              {/* Comparative numbers */}
              <div className="grid grid-cols-2 gap-2 border-t border-b border-neutral-800/60 py-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 block uppercase">Tu Tiempo</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-white font-mono">{formatNumber(summary.yo, 1)}s</span>
                  </div>
                </div>
                <div className="space-y-1 border-l border-neutral-800/60 pl-3">
                  <span className="text-[10px] text-neutral-500 block uppercase">Comunidad</span>
                  <span className="text-base font-bold text-neutral-400 font-mono">{formatNumber(summary.media, 1)}s</span>
                </div>
              </div>

              {/* Ahorro & Rentabilidad Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" /> Ahorro Neto
                  </span>
                  <span className="font-mono font-bold text-white">
                    {summary.ahorroS > 0 ? `-${formatNumber(summary.ahorroS, 1)}s` : `+${formatNumber(Math.abs(summary.ahorroS), 1)}s`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> % Ahorro de tiempo
                  </span>
                  <span className={`font-mono font-bold ${summary.ahorroPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.ahorroPct >= 0 ? `${formatNumber(summary.ahorroPct, 1)}%` : `${formatNumber(summary.ahorroPct, 1)}%`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" /> Récord Personal
                  </span>
                  <span className="font-mono font-bold text-neutral-300">
                    {formatNumber(summary.record, 0)}s
                  </span>
                </div>

                <div className="flex justify-between items-center text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Coef. Rendimiento
                  </span>
                  <span className="font-mono font-bold text-neutral-300">
                    {formatNumber(summary.rendimiento, 2)}x
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
