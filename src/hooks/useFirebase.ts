import {
  collection, doc,
  addDoc, updateDoc, deleteDoc, getDocs,
  onSnapshot, query, QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';

// ── 單次讀取 ──────────────────────────────────────────
export async function getAll<T>(col: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colPath(col)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
  } catch (e) {
    console.error(`[getAll] ${col}`, e);
    return [];
  }
}

// ── 即時監聽 ──────────────────────────────────────────
export function subscribe<T>(
  col: string,
  onData: (data: T[]) => void,
  onError?: (e: Error) => void,
  ...constraints: QueryConstraint[]
): () => void {
  const q = query(collection(db, colPath(col)), ...constraints);
  return onSnapshot(
    q,
    snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T))),
    e => {
      console.error(`[subscribe] ${col}`, e);
      onError?.(e);
    }
  );
}

// ── 新增 ──────────────────────────────────────────────
export async function addItem(
  col: string,
  data: DocumentData
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, colPath(col)), data);
    return ref.id;
  } catch (e) {
    console.error(`[addItem] ${col}`, e);
    return null;
  }
}

// ── 更新 ──────────────────────────────────────────────
export async function updateItem(
  col: string,
  id: string,
  data: Partial<DocumentData>
): Promise<boolean> {
  try {
    await updateDoc(doc(db, colPath(col), id), data);
    return true;
  } catch (e) {
    console.error(`[updateItem] ${col}/${id}`, e);
    return false;
  }
}

// ── 刪除 ──────────────────────────────────────────────
export async function deleteItem(
  col: string,
  id: string
): Promise<boolean> {
  try {
    await deleteDoc(doc(db, colPath(col), id));
    return true;
  } catch (e) {
    console.error(`[deleteItem] ${col}/${id}`, e);
    return false;
  }
}
