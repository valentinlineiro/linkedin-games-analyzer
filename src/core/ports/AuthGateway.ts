import { AuthUser } from '../../domain/types';

export interface AuthGateway {
  /**
   * Initiates Google Sign-In popup process.
   * Returns details of signed-in user if successful.
   */
  signIn(): Promise<AuthUser | null>;

  /**
   * Signs the user out from active auth provider session.
   */
  signOut(): Promise<void>;

  /**
   * Subscribes to changes in authentication state.
   * Returns a function to unsubscribe from listeners.
   */
  onAuthStateChanged(
    onUser: (user: AuthUser | null) => void,
    onRestoredToken: (token: string) => void
  ): () => void;

  /**
   * Exposes active Google OAuth token.
   */
  getAccessToken(): string | null;

  /**
   * Returns the currently authenticated user if present.
   */
  getCurrentUser(): AuthUser | null;
}
