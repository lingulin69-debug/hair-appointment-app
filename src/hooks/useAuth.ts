import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

function getFriendlyAuthError(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Email 格式不正確。';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '帳號或密碼錯誤。';
    case 'auth/too-many-requests':
      return '登入嘗試次數過多，請稍後再試。';
    case 'auth/network-request-failed':
      return '網路連線失敗，請確認網路後再試。';
    default:
      return '登入失敗，請稍後再試。';
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await userCredential.user.getIdToken(true);
      return null;
    } catch (error) {
      return getFriendlyAuthError(error);
    }
  }

  async function signOut(): Promise<string | null> {
    try {
      await firebaseSignOut(auth);
      return null;
    } catch {
      return '登出失敗，請稍後再試。';
    }
  }

  return {
    user,
    isLoading,
    signIn,
    signOut,
  };
}