import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function isFirebaseConfig(
  value: Partial<FirebaseConfig> | null | undefined
): value is FirebaseConfig {
  if (!value) return false;

  return (
    typeof value.apiKey === 'string' &&
    typeof value.authDomain === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.storageBucket === 'string' &&
    typeof value.messagingSenderId === 'string' &&
    typeof value.appId === 'string' &&
    value.apiKey.length > 0 &&
    value.authDomain.length > 0 &&
    value.projectId.length > 0 &&
    value.storageBucket.length > 0 &&
    value.messagingSenderId.length > 0 &&
    value.appId.length > 0
  );
}

function resolveFirebaseConfig(): FirebaseConfig {
  const envConfig: Partial<FirebaseConfig> = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (isFirebaseConfig(envConfig)) {
    return envConfig;
  }

  if (typeof __firebase_config !== 'undefined') {
    try {
      const parsed = JSON.parse(__firebase_config) as Partial<FirebaseConfig>;
      if (isFirebaseConfig(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse __firebase_config:', error);
    }
  }

  throw new Error(
    'Firebase configuration is missing. Check your .env values or __firebase_config.'
  );
}

const firebaseConfig = resolveFirebaseConfig();

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn('Falling back to default Firestore cache mode:', error);
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);
export const APP_ID =
  typeof __app_id !== 'undefined' && __app_id
    ? __app_id
    : firebaseConfig.projectId;

export const colPath = (name: string) =>
  `artifacts/${APP_ID}/public/data/${name}`;
