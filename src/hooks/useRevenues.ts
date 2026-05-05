import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';
import type { Revenue } from '../types';
import type { DateRange } from '../utils/schedule';
import { formatDateString, isExactDateString } from '../utils/schedule';

type UseRevenuesOptions = {
  enabled?: boolean;
  range?: DateRange | null;
};

function sanitizeRevenue(entry: Partial<Revenue>, id: string): Revenue {
  const parsedAmount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount ?? 0);
  const amount = Number.isFinite(parsedAmount) ? Math.max(0, parsedAmount) : 0;
  const date =
    typeof entry.date === 'string' && isExactDateString(entry.date)
      ? entry.date
      : formatDateString(new Date());
  const kind = entry.kind === 'expense' ? 'expense' : 'income';
  const category =
    typeof entry.category === 'string' && entry.category.trim()
      ? entry.category.trim()
      : kind === 'expense'
        ? '其他支出'
        : '其他收入';
  const source = entry.source === 'appointment' ? 'appointment' : 'manual';
  const note = typeof entry.note === 'string' ? entry.note.trim() : '';
  const linkedAppointmentId =
    typeof entry.linkedAppointmentId === 'string' && entry.linkedAppointmentId.trim()
      ? entry.linkedAppointmentId.trim()
      : undefined;

  return {
    id,
    amount,
    date,
    category,
    kind,
    source,
    ...(note && { note }),
    ...(linkedAppointmentId && { linkedAppointmentId }),
    ...(typeof entry.createdAt === 'string' && entry.createdAt.trim()
      ? { createdAt: entry.createdAt.trim() }
      : {}),
    ...(typeof entry.updatedAt === 'string' && entry.updatedAt.trim()
      ? { updatedAt: entry.updatedAt.trim() }
      : {}),
  };
}

function createManualRevenuePayload(
  entry: Omit<Revenue, 'id' | 'source'>
): Omit<Revenue, 'id'> {
  const normalized = sanitizeRevenue({
    ...entry,
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, 'draft');

  return {
    amount: normalized.amount,
    date: normalized.date,
    category: normalized.category,
    kind: normalized.kind,
    source: 'manual',
    ...(normalized.note ? { note: normalized.note } : {}),
    ...(normalized.linkedAppointmentId
      ? { linkedAppointmentId: normalized.linkedAppointmentId }
      : {}),
    ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
    ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
  };
}

export function useRevenues({ enabled = true, range = null }: UseRevenuesOptions = {}) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const revenuesRef = useRef(collection(db, colPath('revenues')));

  const revenuesQuery = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (range) {
      return query(
        revenuesRef.current,
        where('date', '>=', range.startDateStr),
        where('date', '<=', range.endDateStr),
        orderBy('date', 'asc')
      );
    }

    return query(revenuesRef.current, orderBy('date', 'asc'));
  }, [enabled, range]);

  useEffect(() => {
    if (!revenuesQuery) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      revenuesQuery,
      (snapshot) => {
        const nextRevenues = snapshot.docs
          .map((entry) => sanitizeRevenue(entry.data() as Partial<Revenue>, entry.id))
          .sort((left, right) => `${right.date} ${right.id}`.localeCompare(`${left.date} ${left.id}`));

        setRevenues(nextRevenues);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to revenues:', error);
        setRevenues([]);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [revenuesQuery]);

  async function addRevenue(data: Omit<Revenue, 'id' | 'source'>): Promise<string | null> {
    try {
      const payload = createManualRevenuePayload(data);
      const docRef = await addDoc(revenuesRef.current, payload);
      return docRef.id;
    } catch (error) {
      console.error('Error adding revenue:', error);
      return null;
    }
  }

  async function deleteRevenue(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('revenues'), id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting revenue:', error);
      return false;
    }
  }

  return {
    revenues,
    isLoading,
    addRevenue,
    deleteRevenue,
  };
}