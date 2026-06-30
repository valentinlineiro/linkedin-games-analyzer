import { useState, useMemo } from 'react';
import { AuthUser } from '../../domain/types';
import { FirestoreRepository } from '../../infrastructure/storage/FirestoreRepository';

export function useSync(user: AuthUser | null) {
  const [isSyncingLive, setIsSyncingLive] = useState(false);

  const firestoreRepo = useMemo(
    () => (user ? new FirestoreRepository(() => user.uid) : null),
    [user]
  );

  const handlePullFromCloud = async () => {
    if (!firestoreRepo) return null;
    setIsSyncingLive(true);
    try {
      return await firestoreRepo.loadRuns();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al descargar datos de la nube.');
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handlePushToCloud = async () => {
    if (!firestoreRepo) return null;
    const confirmed = window.confirm(
      '¿Deseas subir todas tus partidas de rendimiento actuales a la nube? Se combinarán con tus partidas existentes.'
    );
    if (!confirmed) return null;
    setIsSyncingLive(true);
    try {
      await firestoreRepo.seedRuns([]);
      return await firestoreRepo.loadRuns();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al subir partidas a la nube.');
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  return {
    isSyncingLive,
    setIsSyncingLive,
    firestoreRepo,
    handlePullFromCloud,
    handlePushToCloud,
  };
}
