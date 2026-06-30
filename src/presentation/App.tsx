import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTracker } from './hooks/useTracker';
import Header from './components/Header';
import InputDrawer from './components/InputDrawer';
import SettingsDrawer from './components/SettingsDrawer';
import DashboardOverview from './components/DashboardOverview';

export default function App() {
  const {
    runs,
    sortedRuns,
    summaries,
    lastCommunityAverages,
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
    onAddRun,
    onDeleteRun,
    onResetData,
    onImportRuns,
  } = useTracker();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/20" id="app-root-container">
      {/* New Modular Header */}
      <Header
        user={user}
        isSyncingLive={isSyncingLive}
        activeSpreadsheet={activeSpreadsheet}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Global Slide-over Data Entry Drawer */}
      <InputDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAddRun={onAddRun}
        lastCommunityAverages={lastCommunityAverages}
      />

      {/* Sheets Sync and System Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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
        onResetData={onResetData}
      />

      {/* Main Workspace Dashboard Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6" id="app-main-content">
        <DashboardOverview
          runs={runs}
          sortedRuns={sortedRuns}
          summaries={summaries}
          onDeleteRun={onDeleteRun}
        />
      </main>

      <footer className="text-center py-8 text-xs text-neutral-700 max-w-4xl mx-auto border-t border-neutral-800" id="app-footer">
        <p>© 2026 LinkedIn Games Tracker</p>
      </footer>

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 block md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        aria-label="Registrar Partida"
        id="mobile-fab"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
