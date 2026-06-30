import React, { useEffect } from 'react';
import { X, Settings, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import SyncPanel from './SyncPanel';
import { AuthUser, RawRun } from '../../domain/types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runs: RawRun[];
  user: AuthUser | null;
  authLoading: boolean;
  activeSpreadsheet: { id: string; title: string; url: string } | null;
  isSyncingLive: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onConnectSheet: () => void;
  onDisconnectSheet: () => void;
  onCreateNewSheet: () => void;
  onPullFromSheet: () => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onImportRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
  onResetData: () => void;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  runs,
  user,
  authLoading,
  activeSpreadsheet,
  isSyncingLive,
  onSignIn,
  onSignOut,
  onConnectSheet,
  onDisconnectSheet,
  onCreateNewSheet,
  onPullFromSheet,
  onPushToSheet,
  onImportRuns,
  onResetData,
}: SettingsDrawerProps) {
  // Escape key handler for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="settings-drawer-root" className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/60" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
    
          {/* Settings Pane */}
          <motion.div 
            className="relative w-full max-w-[100vw] sm:max-w-[380px] md:max-w-[420px] bg-[#121212] border-l border-neutral-800 p-6 shadow-2xl flex flex-col h-full z-10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-neutral-400" />
            <span>Configuración y Sincronización</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-6 pr-1">
          <SyncPanel
            runs={runs}
            user={user}
            authLoading={authLoading}
            activeSpreadsheet={activeSpreadsheet}
            isSyncingLive={isSyncingLive}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            onConnectSheet={onConnectSheet}
            onDisconnectSheet={onDisconnectSheet}
            onCreateNewSheet={onCreateNewSheet}
            onPullFromSheet={onPullFromSheet}
            onPushToSheet={onPushToSheet}
            onImportRuns={onImportRuns}
          />

          <div className="border-t border-neutral-800 pt-4 space-y-2">
            <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Peligro
            </h3>
            <p className="text-[11px] text-neutral-500">
              Al limpiar el historial borrarás todos los registros. Si estás sincronizado con la nube, las partidas guardadas allí persistirán hasta que las borres de forma explícita.
            </p>
            <button
              onClick={() => {
                onResetData();
                onClose();
              }}
              className="px-3 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Limpiar Historial Local
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
