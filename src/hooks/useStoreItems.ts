import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDocs,
  type UpdateData,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, colPath } from '../config/firebase';
import type { StoreItem } from '../types';
import { loadCachedValue, saveCachedValue } from '../utils/cache';
import { startTiming } from '../utils/performance';

const DEFAULT_STORE_ITEMS: StoreItem[] = [
  {
    id: 'default-service-haircut',
    name: '剪髮',
    price: 600,
    duration: '60 分鐘',
    type: 'service',
  },
  {
    id: 'default-service-shampoo',
    name: '洗髮',
    price: 300,
    duration: '30 分鐘',
    type: 'service',
  },
  {
    id: 'default-service-color',
    name: '染髮',
    price: 2500,
    duration: '120 分鐘',
    type: 'service',
  },
  {
    id: 'default-service-perm',
    name: '燙髮',
    price: 3000,
    duration: '150 分鐘',
    type: 'service',
  },
];

function cloneDefaultStoreItems(): StoreItem[] {
  return DEFAULT_STORE_ITEMS.map((item) => ({ ...item }));
}

const STORE_ITEMS_CACHE_KEY = 'store-items';
const STORE_ITEMS_CACHE_VERSION = 1;

function normalizeStoreItemColor(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmedValue) ? trimmedValue : undefined;
}

function createStoreItemPayload(data: Omit<StoreItem, 'id'>): Omit<StoreItem, 'id'> {
  const color = normalizeStoreItemColor(data.color);

  return {
    name: data.name.trim(),
    price: data.price,
    duration: data.duration.trim() || '-',
    type: data.type,
    ...(color && { color }),
  };
}

function createStoreItemUpdatePayload(data: Partial<Omit<StoreItem, 'id'>>): {
  firestorePatch: UpdateData<StoreItem>;
  localPatch: Partial<Omit<StoreItem, 'id'>>;
} {
  const firestorePatch: UpdateData<StoreItem> = {};
  const localPatch: Partial<Omit<StoreItem, 'id'>> = {};

  if (typeof data.name === 'string') {
    const name = data.name.trim();
    firestorePatch.name = name;
    localPatch.name = name;
  }

  if (typeof data.price === 'number') {
    firestorePatch.price = data.price;
    localPatch.price = data.price;
  }

  if (typeof data.duration === 'string') {
    const duration = data.duration.trim() || '-';
    firestorePatch.duration = duration;
    localPatch.duration = duration;
  }

  if (data.type === 'service' || data.type === 'product') {
    firestorePatch.type = data.type;
    localPatch.type = data.type;
  }

  if (Object.prototype.hasOwnProperty.call(data, 'color')) {
    const color = normalizeStoreItemColor(data.color);

    if (color) {
      firestorePatch.color = color;
      localPatch.color = color;
    } else {
      firestorePatch.color = deleteField();
      localPatch.color = undefined;
    }
  }

  return { firestorePatch, localPatch };
}

function sanitizeStoreItem(item: Partial<StoreItem>, id: string): StoreItem {
  const parsedPrice =
    typeof item.price === 'number' ? item.price : Number(item.price ?? 0);

  const color = normalizeStoreItemColor(item.color);

  return {
    id,
    name:
      typeof item.name === 'string' && item.name.trim()
        ? item.name.trim()
        : '未命名項目',
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    duration:
      typeof item.duration === 'string' && item.duration.trim()
        ? item.duration.trim()
        : '-',
    type: item.type === 'product' ? 'product' : 'service',
    ...(color !== undefined && { color }),
  };
}

function sortStoreItems(items: StoreItem[]): StoreItem[] {
  return [...items].sort((a, b) =>
    `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`, 'zh-TW')
  );
}

async function seedDefaultStoreItems(): Promise<void> {
  const batch = writeBatch(db);

  for (const item of DEFAULT_STORE_ITEMS) {
    const docRef = doc(db, colPath('storeItems'), item.id);
    batch.set(docRef, {
      name: item.name,
      price: item.price,
      duration: item.duration,
      type: item.type,
    });
  }

  await batch.commit();
}

type UseStoreItemsOptions = {
  enabled?: boolean;
};

export function useStoreItems({ enabled = true }: UseStoreItemsOptions = {}) {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const storeItemsRef = useRef(collection(db, colPath('storeItems')));
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const cachedStoreItems = loadCachedValue<StoreItem[]>(
      STORE_ITEMS_CACHE_KEY,
      STORE_ITEMS_CACHE_VERSION
    );

    if (cachedStoreItems?.length) {
      setStoreItems(sortStoreItems(cachedStoreItems));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    let isCancelled = false;
    const endTiming = startTiming('store-items');

    async function loadStoreItems() {
      try {
        const snapshot = await getDocs(storeItemsRef.current);
        if (isCancelled) {
          return;
        }

        if (snapshot.empty) {
          setStoreItems(sortStoreItems(cloneDefaultStoreItems()));
          setIsLoading(false);

          if (!isInitializingRef.current) {
            isInitializingRef.current = true;

            void seedDefaultStoreItems()
              .catch((error) => {
                console.error('Error initializing store items:', error);
              })
              .finally(() => {
                isInitializingRef.current = false;
              });
          }

          endTiming();
          return;
        }

        const data = snapshot.docs.map((entry) =>
          sanitizeStoreItem(entry.data() as Partial<StoreItem>, entry.id)
        );

        setStoreItems(sortStoreItems(data));
        setIsLoading(false);
        endTiming();
      } catch (error) {
        console.error('Error fetching store items:', error);
        if (!cachedStoreItems?.length) {
          setStoreItems(sortStoreItems(cloneDefaultStoreItems()));
        }
        setIsLoading(false);
        endTiming();
      }
    }

    void loadStoreItems();

    return () => {
      isCancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || storeItems.length === 0) {
      return;
    }

    saveCachedValue(STORE_ITEMS_CACHE_KEY, storeItems, STORE_ITEMS_CACHE_VERSION);
  }, [enabled, storeItems]);

  const serviceItems = useMemo(
    () => storeItems.filter((item) => item.type === 'service'),
    [storeItems]
  );

  async function addStoreItem(data: Omit<StoreItem, 'id'>): Promise<string | null> {
    try {
      const payload = createStoreItemPayload(data);
      const docRef = await addDoc(storeItemsRef.current, payload);
      const nextItem = sanitizeStoreItem(payload, docRef.id);
      setStoreItems((current) => sortStoreItems([...current, nextItem]));
      return docRef.id;
    } catch (error) {
      console.error('Error adding store item:', error);
      return null;
    }
  }

  async function updateStoreItem(
    id: string,
    data: Partial<Omit<StoreItem, 'id'>>
  ): Promise<boolean> {
    const { firestorePatch, localPatch } = createStoreItemUpdatePayload(data);

    try {
      const docRef = doc(db, colPath('storeItems'), id);
      await updateDoc(docRef, firestorePatch);
      setStoreItems((current) =>
        sortStoreItems(
          current.map((item) =>
            item.id === id ? sanitizeStoreItem({ ...item, ...localPatch }, id) : item
          )
        )
      );
      return true;
    } catch (error) {
      console.error('Error updating store item:', error);
      return false;
    }
  }

  async function deleteStoreItem(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, colPath('storeItems'), id);
      await deleteDoc(docRef);
      setStoreItems((current) => current.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting store item:', error);
      return false;
    }
  }

  return {
    storeItems,
    serviceItems,
    isLoading,
    addStoreItem,
    updateStoreItem,
    deleteStoreItem,
    defaultStoreItems: cloneDefaultStoreItems(),
  };
}
