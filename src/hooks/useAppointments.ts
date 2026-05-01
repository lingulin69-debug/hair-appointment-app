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
import type { Appointment, StoreItem } from '../types';
import type { DateRange } from '../utils/schedule';
import { sortAppointmentsByDateTime } from '../utils/schedule';
import { loadCachedValue, removeCachedValue, saveCachedValue } from '../utils/cache';
import { startTiming } from '../utils/performance';

function calcTotalPrice(
  service: string,
  pax: number,
  storeItems?: StoreItem[] | null
): number {
  if (!service || pax <= 0) return 0;

  const safeStoreItems = Array.isArray(storeItems) ? storeItems : [];
  const serviceItem = safeStoreItems.find((item) => item.name === service);
  if (!serviceItem) return 0;

  return serviceItem.price * pax;
}

const APPOINTMENTS_CACHE_VERSION = 1;

function buildAppointmentsCacheKey(range: DateRange | null): string {
  if (!range) {
    return 'appointments:all';
  }

  return `appointments:${range.startDateStr}:${range.endDateStr}`;
}

function isDateInRange(dateStr: string, range: DateRange | null): boolean {
  if (!range) {
    return true;
  }

  return dateStr >= range.startDateStr && dateStr <= range.endDateStr;
}

type UseAppointmentsOptions = {
  enabled?: boolean;
  range?: DateRange | null;
  storeItems?: StoreItem[] | null;
};

export function useAppointments({
  enabled = true,
  range = null,
  storeItems,
}: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const appointmentsRef = useRef(collection(db, colPath('appointments')));
  const cacheKey = useMemo(() => buildAppointmentsCacheKey(range), [range]);
  const appointmentsQuery = useMemo(
    () => {
      if (!enabled) {
        return null;
      }

      if (range) {
        return query(
          appointmentsRef.current,
          where('dateStr', '>=', range.startDateStr),
          where('dateStr', '<=', range.endDateStr),
          orderBy('dateStr', 'asc')
        );
      }

      return query(appointmentsRef.current, orderBy('dateStr', 'asc'));
    },
    [enabled, range]
  );

  useEffect(() => {
    if (!appointmentsQuery) {
      setIsLoading(false);
      return;
    }

    const cachedAppointments = loadCachedValue<Appointment[]>(
      cacheKey,
      APPOINTMENTS_CACHE_VERSION
    );

    if (cachedAppointments?.length) {
      setAppointments(sortAppointmentsByDateTime(cachedAppointments));
      setIsLoading(false);
    } else {
      setAppointments([]);
      setIsLoading(true);
    }

    const endTiming = startTiming(`appointments:${cacheKey}`);

    const unsubscribe = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })) as Appointment[];

        setAppointments(sortAppointmentsByDateTime(data));
        setIsLoading(false);
        endTiming();
      },
      (error) => {
        console.error('Error listening to appointments:', error);
        setIsLoading(false);
        endTiming();
      }
    );

    return unsubscribe;
  }, [appointmentsQuery, cacheKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (appointments.length === 0) {
      removeCachedValue(cacheKey);
      return;
    }

    saveCachedValue(cacheKey, appointments, APPOINTMENTS_CACHE_VERSION);
  }, [appointments, cacheKey, enabled]);

  async function addAppointment(
    data: Omit<Appointment, 'id' | 'rescheduleCount'>
  ): Promise<string | null> {
    try {
      const totalPrice =
        data.totalPrice ?? calcTotalPrice(data.service, data.pax, storeItems);
      const docRef = await addDoc(appointmentsRef.current, {
        ...data,
        totalPrice,
        status: data.status ?? 'pending',
        rescheduleCount: 0,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding appointment:', error);
      return null;
    }
  }

  async function updateAppointment(
    id: string,
    data: Partial<Omit<Appointment, 'id' | 'rescheduleCount'>>
  ): Promise<boolean> {
    const patch: Record<string, unknown> = { ...data };

    if (
      patch.totalPrice === undefined &&
      (data.service !== undefined || data.pax !== undefined)
    ) {
      const existing = appointments.find((appointment) => appointment.id === id);
      if (existing) {
        const service = data.service ?? existing.service;
        const pax = data.pax ?? existing.pax;
        patch.totalPrice = calcTotalPrice(service, pax, storeItems);
      }
    }

    try {
      const docRef = doc(db, colPath('appointments'), id);
      await updateDoc(docRef, patch);
      return true;
    } catch (error) {
      console.error('Error updating appointment:', error);
      return false;
    }
  }

  async function rescheduleAppointment(
    id: string,
    newDateStr: string,
    newTime: string
  ): Promise<boolean> {
    const existing = appointments.find((appointment) => appointment.id === id);
    if (!existing) return false;

    try {
      const docRef = doc(db, colPath('appointments'), id);
      await updateDoc(docRef, {
        dateStr: newDateStr,
        time: newTime,
        rescheduleCount: (existing.rescheduleCount || 0) + 1,
      });
      return true;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      return false;
    }
  }

  async function deleteAppointment(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('appointments'), id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      return false;
    }
  }

  return {
    appointments,
    isLoading,
    addAppointment,
    updateAppointment,
    rescheduleAppointment,
    deleteAppointment,
  };
}
