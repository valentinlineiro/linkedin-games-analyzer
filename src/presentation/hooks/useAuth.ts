import { useState, useEffect, useMemo } from 'react';
import { AuthUser } from '../../domain/types';
import { FirebaseAuthGateway } from '../../infrastructure/auth/FirebaseAuthGateway';

export function useAuth() {
  const authGateway = useMemo(() => new FirebaseAuthGateway(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged(
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      () => {}
    );
    return () => unsubscribe();
  }, [authGateway]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      const loggedUser = await authGateway.signIn();
      setUser(loggedUser);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al iniciar sesión con Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authGateway.signOut();
      setUser(null);
    } catch {
      alert('Error al cerrar sesión.');
    }
  };

  return {
    user,
    authLoading,
    authGateway,
    setAuthLoading,
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
  };
}
