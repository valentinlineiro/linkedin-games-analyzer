import React from 'react';
import { Layers, Cloud, CloudOff, Settings, Plus } from 'lucide-react';
import { AuthUser } from '../../domain/types';

interface HeaderProps {
  user: AuthUser | null;
  isSyncingLive: boolean;
  activeSpreadsheet: { id: string; title: string; url: string } | null;
  onOpenSettings: () => void;
  onOpenDrawer: () => void;
}

export default function Header({
  user,
  isSyncingLive,
  activeSpreadsheet,
  onOpenSettings,
  onOpenDrawer,
}: HeaderProps) {
  return (
    <header className="bg-[#111111] border-b border-neutral-800 sticky top-0 z-40 px-6 py-4" id="app-header">
      <div className="max-w-4xl mx-auto flex justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 text-black font-bold rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <h1 className="font-display text-lg font-bold tracking-tight text-white hidden sm:block">
            LinkedIn Games Tracker
          </h1>
          <h1 className="font-display text-lg font-bold tracking-tight text-white sm:hidden">
            LIG
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeSpreadsheet ? (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all"
            >
              <Cloud className="w-3.5 h-3.5" /> <span>{isSyncingLive ? 'Guardando…' : 'Nube activa'}</span>
            </button>
          ) : (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-neutral-900 text-neutral-500 border-neutral-800 cursor-pointer hover:bg-neutral-800 hover:text-neutral-300 transition-all"
            >
              <CloudOff className="w-3.5 h-3.5" /> <span>Local</span>
            </button>
          )}

          <button
            onClick={onOpenDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4" /> <span>Registrar partida</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 border border-neutral-800 rounded-xl text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
