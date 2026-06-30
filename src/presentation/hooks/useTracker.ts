import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useRuns } from './useRuns';
import { useSync } from './useSync';

export function useTracker() {
  const { user, authLoading, setAuthLoading, onSignIn, onSignOut } = useAuth();
  const {
    runs, sortedRuns, summaries, recordTimes, lastCommunityAverages,
    setRuns, localStorageRepo,
    handleAddRun, handleDeleteRun, handleResetData, handleImportRuns,
  } = useRuns();
  const { isSyncingLive, setIsSyncingLive, firestoreRepo, handlePullFromCloud, handlePushToCloud } = useSync(user);

  // Bridge: when auth state resolves, load runs from the appropriate source
  useEffect(() => {
    if (authLoading) return;

    if (user && firestoreRepo) {
      setIsSyncingLive(true);
      firestoreRepo.loadRuns()
        .then((cloudRuns) => {
          if (cloudRuns.length > 0) {
            setRuns(cloudRuns);
          } else {
            localStorageRepo.loadRuns().then((localRuns) => {
              setRuns(localRuns.length > 0 ? localRuns : []);
            });
          }
        })
        .catch(() => {
          localStorageRepo.loadRuns().then((localRuns) => {
            setRuns(localRuns.length > 0 ? localRuns : []);
          });
        })
        .finally(() => {
          setIsSyncingLive(false);
        });
    } else {
      localStorageRepo.loadRuns().then((localRuns) => {
        setRuns(localRuns.length > 0 ? localRuns : []);
      });
    }
  }, [user, authLoading]);

  const onAddRun = (data: Parameters<typeof handleAddRun>[0]) =>
    handleAddRun(data, user, firestoreRepo, setIsSyncingLive);

  const onDeleteRun = (id: string) =>
    handleDeleteRun(id, user, firestoreRepo, setIsSyncingLive);

  const onResetData = () =>
    handleResetData(user, firestoreRepo, setIsSyncingLive);

  const onImportRuns = (data: Parameters<typeof handleImportRuns>[0]) =>
    handleImportRuns(data, user, firestoreRepo, setIsSyncingLive);

  const onPullFromCloud = async () => {
    const loaded = await handlePullFromCloud();
    if (loaded) setRuns(loaded);
  };

  const onPushToCloud = async () => {
    await handlePushToCloud();
    const loaded = await handlePullFromCloud();
    if (loaded) setRuns(loaded);
  };

  return {
    runs,
    sortedRuns,
    summaries,
    recordTimes,
    lastCommunityAverages,
    user,
    authLoading,
    activeSpreadsheet: user ? { id: 'firestore', title: 'Base de datos Firestore', url: '#' } : null,
    isSyncingLive,
    onSignIn,
    onSignOut,
    onConnectSheet: () => {},
    onDisconnectSheet: onSignOut,
    onCreateNewSheet: () => {},
    onPullFromSheet: onPullFromCloud,
    onPushToSheet: onPushToCloud,
    onAddRun,
    onDeleteRun,
    onResetData,
    onImportRuns,
  };
}
