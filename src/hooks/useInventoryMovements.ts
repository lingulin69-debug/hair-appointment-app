import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';
import type { InventoryMovement } from '../types';
import type { DateRange } from '../utils/schedule';
import {
  createInventoryMovementPayload,
  sanitizeInventoryMovement,
} from '../utils/transactions';

type UseInventoryMovementsOptions = {
  enabled?: boolean;
  range?: DateRange | null;
};

export function useInventoryMovements({
  enabled = true,
  range = null,
}: UseInventoryMovementsOptions = {}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const movementsRef = useRef(collection(db, colPath('inventoryMovements')));

  const movementsQuery = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (range) {
      return query(
        movementsRef.current,
        where('dateStr', '>=', range.startDateStr),
        where('dateStr', '<=', range.endDateStr),
        orderBy('dateStr', 'asc')
      );
    }

    return query(movementsRef.current, orderBy('dateStr', 'asc'));
  }, [enabled, range]);

  useEffect(() => {
    if (!movementsQuery) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      movementsQuery,
      (snapshot) => {
        const nextMovements = snapshot.docs
          .map((entry) =>
            sanitizeInventoryMovement(entry.data() as Partial<InventoryMovement>, entry.id)
          )
          .sort((left, right) => `${right.dateStr} ${right.id}`.localeCompare(`${left.dateStr} ${left.id}`));

        setMovements(nextMovements);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to inventory movements:', error);
        setMovements([]);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [movementsQuery]);

  async function addInventoryMovement(
    data: Omit<InventoryMovement, 'id'>
  ): Promise<string | null> {
    try {
      const payload = createInventoryMovementPayload(data);
      const docRef = await addDoc(movementsRef.current, payload);
      return docRef.id;
    } catch (error) {
      console.error('Error adding inventory movement:', error);
      return null;
    }
  }

  async function updateInventoryMovement(
    id: string,
    patch: Partial<Omit<InventoryMovement, 'id'>>
  ): Promise<boolean> {
    const existing = movements.find((movement) => movement.id === id);
    if (!existing) {
      return false;
    }

    try {
      const payload = createInventoryMovementPayload({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, colPath('inventoryMovements'), id);
      await updateDoc(docRef, payload);
      return true;
    } catch (error) {
      console.error('Error updating inventory movement:', error);
      return false;
    }
  }

  async function deleteInventoryMovement(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('inventoryMovements'), id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting inventory movement:', error);
      return false;
    }
  }

  return {
    movements,
    isLoading,
    addInventoryMovement,
    updateInventoryMovement,
    deleteInventoryMovement,
  };
}