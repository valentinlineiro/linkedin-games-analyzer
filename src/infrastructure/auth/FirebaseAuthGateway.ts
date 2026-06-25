import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { AuthGateway } from '../../core/ports/AuthGateway';
import { AuthUser } from '../../domain/types';
import firebaseConfig from '../../../firebase-applet-config.json';

export class FirebaseAuthGateway implements AuthGateway {
  private auth;
  private provider: GoogleAuthProvider;
  private cachedAccessToken: string | null = null;
  private isSigningIn = false;

  constructor() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    this.auth = getAuth(app);
    this.provider = new GoogleAuthProvider();
  }

  async signIn(): Promise<AuthUser | null> {
    if (this.isSigningIn) return null;
    try {
      this.isSigningIn = true;
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        this.cachedAccessToken = credential.accessToken;
      }
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      console.error('Error in Google Sign-In:', error);
      throw error;
    } finally {
      this.isSigningIn = false;
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.cachedAccessToken = null;
  }

  onAuthStateChanged(
    onUser: (user: AuthUser | null) => void,
    onRestoredToken: (token: string) => void
  ): () => void {
    return onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = this.mapFirebaseUser(firebaseUser);
        onUser(user);
        if (this.cachedAccessToken) {
          onRestoredToken(this.cachedAccessToken);
        }
      } else {
        this.cachedAccessToken = null;
        onUser(null);
      }
    });
  }

  getAccessToken(): string | null {
    return this.cachedAccessToken;
  }

  getCurrentUser(): AuthUser | null {
    const user = this.auth.currentUser;
    return user ? this.mapFirebaseUser(user) : null;
  }

  private mapFirebaseUser(user: FirebaseUser): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }
}
