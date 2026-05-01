import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';
import type { Client } from '../types';
import { loadCachedValue, saveCachedValue } from '../utils/cache';

function normalizeClientName(name: string): string {
  return name.trim().toLocaleLowerCase('zh-TW');
}

type UseClientsOptions = {
  enabled?: boolean;
  searchQuery?: string;
};

const CLIENTS_CACHE_KEY = 'clients';
const CLIENTS_CACHE_VERSION = 1;

function sortClients(data: Client[]): Client[] {
  return [...data].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
}

export function useClients({
  enabled = true,
  searchQuery = '',
}: UseClientsOptions = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const clientsRef = useRef(collection(db, colPath('clients')));

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const cachedClients = loadCachedValue<Client[]>(
      CLIENTS_CACHE_KEY,
      CLIENTS_CACHE_VERSION
    );

    if (cachedClients?.length) {
      setClients(sortClients(cachedClients));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const unsubscribe = onSnapshot(
      clientsRef.current,
      (snapshot) => {
        const data = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })) as Client[];

        setClients(sortClients(data));
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || clients.length === 0) return;
    saveCachedValue(CLIENTS_CACHE_KEY, clients, CLIENTS_CACHE_VERSION);
  }, [clients, enabled]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
    );
  }, [clients, searchQuery]);

  async function addClient(data: Omit<Client, 'id'>): Promise<string | null> {
    const payload = {
      ...data,
      name: data.name.trim(),
      phone: data.phone.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt ?? new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(clientsRef.current, payload);
      return docRef.id;
    } catch (error) {
      console.error('Error adding client:', error);
      return null;
    }
  }

  async function updateClient(
    id: string,
    data: Partial<Omit<Client, 'id'>>
  ): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('clients'), id);
      await updateDoc(docRef, {
        ...data,
        phone: data.phone?.trim() ?? data.phone,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      return false;
    }
  }

  async function deleteClient(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('clients'), id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  async function ensureClient(
    name: string,
    patch: Partial<Omit<Client, 'id' | 'name'>> = {}
  ): Promise<Client | null> {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const normalizedName = normalizeClientName(trimmedName);
    const existing = clients.find(
      (client) => normalizeClientName(client.name) === normalizedName
    );

    if (existing) {
      const updatePayload: Partial<Omit<Client, 'id'>> = {};
      const normalizedPhone = patch.phone?.trim();

      if (patch.lastVisit && patch.lastVisit !== existing.lastVisit) {
        updatePayload.lastVisit = patch.lastVisit;
      }

      if (normalizedPhone && normalizedPhone !== existing.phone) {
        updatePayload.phone = normalizedPhone;
      }

      updatePayload.visitCount = (existing.visitCount ?? 0) + 1;

      if (Object.keys(updatePayload).length > 0) {
        await updateClient(existing.id, updatePayload);
      }

      return { ...existing, ...updatePayload };
    }

    const timestamp = new Date().toISOString();
    const payload: Omit<Client, 'id'> = {
      name: trimmedName,
      phone: patch.phone?.trim() ?? '',
      preference: '',
      product: '',
      lastVisit: patch.lastVisit,
      visitCount: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docId = await addClient(payload);
    if (!docId) return null;

    return {
      id: docId,
      ...payload,
    };
  }

  function findClientByName(name: string): Client | null {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const normalizedName = normalizeClientName(trimmedName);
    return (
      clients.find(
        (client) => normalizeClientName(client.name) === normalizedName
      ) ?? null
    );
  }

  return {
    clients,
    isLoading,
    filteredClients,
    addClient,
    updateClient,
    deleteClient,
    ensureClient,
    findClientByName,
  };
}
