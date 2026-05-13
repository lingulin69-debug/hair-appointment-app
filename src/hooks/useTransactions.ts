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
import type { CheckoutRecord } from '../types';
import type { DateRange } from '../utils/schedule';
import { createCheckoutPayload, sanitizeCheckoutRecord } from '../utils/transactions';

type UseTransactionsOptions = {
  enabled?: boolean;
  range?: DateRange | null;
};

export function useTransactions({ enabled = true, range = null }: UseTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<CheckoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const transactionsRef = useRef(collection(db, colPath('transactions')));

  const transactionsQuery = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (range) {
      return query(
        transactionsRef.current,
        where('dateStr', '>=', range.startDateStr),
        where('dateStr', '<=', range.endDateStr),
        orderBy('dateStr', 'asc')
      );
    }

    return query(transactionsRef.current, orderBy('dateStr', 'asc'));
  }, [enabled, range]);

  useEffect(() => {
    if (!transactionsQuery) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const nextTransactions = snapshot.docs
          .map((entry) => sanitizeCheckoutRecord(entry.data() as Partial<CheckoutRecord>, entry.id))
          .sort((left, right) => `${right.dateStr} ${right.id}`.localeCompare(`${left.dateStr} ${left.id}`));

        setTransactions(nextTransactions);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to transactions:', error);
        setTransactions([]);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [transactionsQuery]);

  async function addTransaction(data: Omit<CheckoutRecord, 'id'>): Promise<string | null> {
    try {
      const payload = createCheckoutPayload(data);
      const docRef = await addDoc(transactionsRef.current, payload);
      return docRef.id;
    } catch (error) {
      console.error('Error adding transaction:', error);
      return null;
    }
  }

  async function updateTransaction(
    id: string,
    patch: Partial<Omit<CheckoutRecord, 'id'>>
  ): Promise<boolean> {
    const existing = transactions.find((transaction) => transaction.id === id);
    if (!existing) {
      return false;
    }

    try {
      const payload = createCheckoutPayload({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, colPath('transactions'), id);
      await updateDoc(docRef, payload);
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  }

  async function deleteTransaction(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('transactions'), id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  return {
    transactions,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}