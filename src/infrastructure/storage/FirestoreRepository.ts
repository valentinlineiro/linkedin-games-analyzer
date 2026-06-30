import { RunRepository } from '../../core/ports/RunRepository';
import { RawRun, GameType } from '../../domain/types';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  writeBatch,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export class FirestoreRepository implements RunRepository {
  private db: Firestore;

  constructor(private getUserId: () => string | null) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    this.db = getFirestore(app);
  }

  private getUserRunsCollection() {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado para usar Firestore.');
    }
    return collection(this.db, 'users', userId, 'runs');
  }

  async loadRuns(): Promise<RawRun[]> {
    try {
      const runsCol = this.getUserRunsCollection();
      const q = query(runsCol, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      const runs: RawRun[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        runs.push({
          id: docSnap.id,
          timestamp: data.timestamp,
          juego: data.juego as GameType,
          yo: data.yo,
          media: data.media,
          mediaSemana: data.mediaSemana,
          ahorro: data.ahorro,
          contexto: data.contexto,
          nota: data.nota || '',
        });
      });
      return runs;
    } catch (error) {
      console.error('Error al cargar partidas desde Firestore:', error);
      throw new Error('No se pudieron cargar las partidas desde la nube.');
    }
  }

  async saveRun(run: Omit<RawRun, 'id'>): Promise<RawRun> {
    try {
      const runsCol = this.getUserRunsCollection();
      const docRef = await addDoc(runsCol, run);
      return {
        ...run,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Error al guardar partida en Firestore:', error);
      throw new Error('No se pudo guardar la partida en la nube.');
    }
  }

  async deleteRun(id: string): Promise<void> {
    try {
      const runsCol = this.getUserRunsCollection();
      const docRef = doc(runsCol, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error al eliminar partida de Firestore:', error);
      throw new Error('No se pudo eliminar la partida de la nube.');
    }
  }

  async clearAll(): Promise<void> {
    const runsCol = this.getUserRunsCollection();
    const snapshot = await getDocs(runsCol);
    const batch = writeBatch(this.db);
    snapshot.forEach((docSnap) => {
      batch.delete(doc(runsCol, docSnap.id));
    });
    await batch.commit();
  }

  async seedRuns(runs: RawRun[]): Promise<void> {
    try {
      const runsCol = this.getUserRunsCollection();
      const batch = writeBatch(this.db);
      runs.forEach((run) => {
        const runDocRef = run.id && !run.id.startsWith('sheet-row') && !run.id.startsWith('run-') && !run.id.startsWith('p') && !run.id.startsWith('z') && !run.id.startsWith('s') && !run.id.startsWith('q')
          ? doc(runsCol, run.id)
          : doc(runsCol);
        const { id, ...runData } = run;
        batch.set(runDocRef, runData);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error al sembrar partidas en Firestore:', error);
      throw new Error('No se pudieron inicializar las partidas en la nube.');
    }
  }
}
