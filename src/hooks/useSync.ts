import { useCallback, useEffect, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../config/firebase';

type SyncStatus = 'online' | 'syncing' | 'synced' | 'offline';

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? 'online' : 'offline'
  );

  useEffect(() => {
    function handleOnline() {
      setStatus('online');
    }

    function handleOffline() {
      setStatus('offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      return false;
    }

    setStatus('syncing');

    try {
      await waitForPendingWrites(db);
      setStatus('synced');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setStatus('online');
      return false;
    }
  }, []);

  return { status, syncNow };
}
