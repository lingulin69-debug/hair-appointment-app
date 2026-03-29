import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';
import type { Leave, LeaveType } from '../types';
import type { DateRange } from '../utils/schedule';
import { loadCachedValue, removeCachedValue, saveCachedValue } from '../utils/cache';
import { startTiming } from '../utils/performance';

type UseLeavesOptions = {
  enabled?: boolean;
  range?: DateRange | null;
};

const DEFAULT_LEAVE_TYPE = 'leave';
const LEAVES_CACHE_VERSION = 1;

function buildLeavesCacheKey(range: DateRange | null): string {
  if (!range) {
    return 'leaves:all';
  }

  return `leaves:${range.startDateStr}:${range.endDateStr}`;
}

function isLeaveInRange(dateStr: string, range: DateRange | null): boolean {
  if (!range) {
    return true;
  }

  return dateStr >= range.startDateStr && dateStr <= range.endDateStr;
}

export function useLeaves({ enabled = true, range = null }: UseLeavesOptions = {}) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const leavesColRef = useRef(collection(db, colPath('leaves')));
  const cacheKey = useMemo(() => buildLeavesCacheKey(range), [range]);
  const leavesQuery = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (range) {
      return query(
        leavesColRef.current,
        where('date', '>=', range.startDateStr),
        where('date', '<=', range.endDateStr),
        orderBy('date', 'asc')
      );
    }

    return query(leavesColRef.current, orderBy('date', 'asc'));
  }, [enabled, range]);

  useEffect(() => {
    if (!leavesQuery) {
      return;
    }

    const cachedLeaves = loadCachedValue<Leave[]>(cacheKey, LEAVES_CACHE_VERSION);
    if (cachedLeaves?.length) {
      setLeaves(cachedLeaves);
    } else {
      setLeaves([]);
    }

    let isCancelled = false;
    const endTiming = startTiming(`leaves:${cacheKey}`);

    async function loadLeaves() {
      try {
        const snapshot = await getDocs(leavesQuery);
        if (isCancelled) {
          return;
        }

        const data = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })) as Leave[];

        setLeaves(data);
        saveCachedValue(cacheKey, data, LEAVES_CACHE_VERSION);
        endTiming();
      } catch (error) {
        console.error('Error fetching leaves:', error);
        endTiming();
      }
    }

    void loadLeaves();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, leavesQuery]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (leaves.length === 0) {
      removeCachedValue(cacheKey);
      return;
    }

    saveCachedValue(cacheKey, leaves, LEAVES_CACHE_VERSION);
  }, [cacheKey, enabled, leaves]);

  const leaveSet = useMemo(() => new Set(leaves.map((leave) => leave.date)), [leaves]);

  function isLeaveDay(dateStr: string): boolean {
    return leaveSet.has(dateStr);
  }

  async function addLeave(
    date: string,
    type: LeaveType = DEFAULT_LEAVE_TYPE
  ): Promise<string | null> {
    if (isLeaveDay(date)) return null;

    try {
      const docRef = await addDoc(leavesColRef.current, { date, type });

      if (isLeaveInRange(date, range)) {
        setLeaves((current) => [...current, { id: docRef.id, date, type }]);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding leave:', error);
      return null;
    }
  }

  async function removeLeave(date: string): Promise<boolean> {
    const target = leaves.find((leave) => leave.date === date);
    if (!target) return false;

    try {
      const docRef = doc(db, colPath('leaves'), target.id);
      await deleteDoc(docRef);
      setLeaves((current) => current.filter((leave) => leave.id !== target.id));
      return true;
    } catch (error) {
      console.error('Error removing leave:', error);
      return false;
    }
  }

  async function toggleLeave(
    date: string,
    type: LeaveType = DEFAULT_LEAVE_TYPE
  ): Promise<void> {
    if (isLeaveDay(date)) {
      await removeLeave(date);
      return;
    }

    await addLeave(date, type);
  }

  return {
    leaves,
    leaveSet,
    isLeaveDay,
    toggleLeave,
    addLeave,
    removeLeave,
  };
}
