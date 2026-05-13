import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { accessPath, db } from '../config/firebase';
import {
  normalizeAccessEmail,
  resolveAccessState,
  sanitizeAccessBootstrapRecord,
  sanitizeAccessRoleRecord,
  sortAccessRoles,
  type AccessBootstrapRecord,
  type AccessRoleRecord,
  type UserAccessRole,
} from '../utils/access';

export function useAccessControl(user: User | null) {
  const userEmail = normalizeAccessEmail(user?.email);
  const [bootstrap, setBootstrap] = useState<AccessBootstrapRecord | null>(null);
  const [roleRecord, setRoleRecord] = useState<AccessRoleRecord | null>(null);
  const [roles, setRoles] = useState<AccessRoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [resolvedUserEmail, setResolvedUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !userEmail) {
      setBootstrap(null);
      setRoleRecord(null);
      setRoles([]);
      setResolvedUserEmail(null);
      setIsLoading(false);
      return;
    }

    let bootstrapReady = false;
    let roleReady = false;

    const finishLoading = () => {
      if (bootstrapReady && roleReady) {
        setResolvedUserEmail(userEmail);
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setResolvedUserEmail(null);

    const unsubscribeBootstrap = onSnapshot(
      doc(db, accessPath('bootstrap/state')),
      (snapshot) => {
        bootstrapReady = true;
        setBootstrap(
          snapshot.exists()
            ? sanitizeAccessBootstrapRecord(snapshot.data() as Partial<AccessBootstrapRecord>)
            : null
        );
        finishLoading();
      },
      () => {
        bootstrapReady = true;
        setBootstrap(null);
        finishLoading();
      }
    );

    const unsubscribeRole = onSnapshot(
      doc(db, accessPath(`rolesByEmail/${userEmail}`)),
      (snapshot) => {
        roleReady = true;
        setRoleRecord(
          snapshot.exists()
            ? sanitizeAccessRoleRecord(snapshot.data() as Partial<AccessRoleRecord>)
            : null
        );
        finishLoading();
      },
      () => {
        roleReady = true;
        setRoleRecord(null);
        finishLoading();
      }
    );

    return () => {
      unsubscribeBootstrap();
      unsubscribeRole();
    };
  }, [user, userEmail]);

  const accessState = useMemo(
    () => resolveAccessState(userEmail, bootstrap, roleRecord),
    [bootstrap, roleRecord, userEmail]
  );

  const isResolvingCurrentUser = Boolean(userEmail) && resolvedUserEmail !== userEmail;

  useEffect(() => {
    if (!user || !userEmail || isResolvingCurrentUser || !accessState.isAdmin) {
      setRoles([]);
      setIsRolesLoading(false);
      return;
    }

    setIsRolesLoading(true);

    const unsubscribe = onSnapshot(
      query(collection(db, accessPath('rolesByEmail')), orderBy('email', 'asc')),
      (snapshot) => {
        const nextRoles = snapshot.docs
          .map((entry) => sanitizeAccessRoleRecord(entry.data() as Partial<AccessRoleRecord>))
          .filter((entry): entry is AccessRoleRecord => Boolean(entry));
        setRoles(sortAccessRoles(nextRoles));
        setIsRolesLoading(false);
      },
      () => {
        setRoles([]);
        setIsRolesLoading(false);
      }
    );

    return unsubscribe;
  }, [accessState.isAdmin, isResolvingCurrentUser, user, userEmail]);

  async function bootstrapOwner(): Promise<string | null> {
    if (!user || !userEmail) {
      return '目前沒有可用的登入帳號。';
    }

    const now = new Date().toISOString();

    try {
      await setDoc(doc(db, accessPath('bootstrap/state')), {
        ownerEmail: userEmail,
        ownerUid: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      await setDoc(doc(db, accessPath(`rolesByEmail/${userEmail}`)), {
        email: userEmail,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });

      return null;
    } catch (error) {
      console.error('Error bootstrapping owner access:', error);
      return '建立管理員權限失敗，請稍後再試。';
    }
  }

  async function saveRole(email: string, role: UserAccessRole): Promise<string | null> {
    if (!accessState.isAdmin) {
      return '只有管理員可以管理權限。';
    }

    const normalizedEmail = normalizeAccessEmail(email);
    if (!normalizedEmail) {
      return '請輸入 Email。';
    }

    if (role === 'admin' && bootstrap?.ownerEmail !== normalizedEmail) {
      return '目前只保留一個管理員帳號。';
    }

    if (bootstrap?.ownerEmail === normalizedEmail && role !== 'admin') {
      return '管理員帳號不能降級或改成其他角色。';
    }

    const now = new Date().toISOString();

    try {
      await setDoc(
        doc(db, accessPath(`rolesByEmail/${normalizedEmail}`)),
        {
          email: normalizedEmail,
          role,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
      return null;
    } catch (error) {
      console.error('Error saving access role:', error);
      return '儲存權限失敗，請稍後再試。';
    }
  }

  async function removeRole(email: string): Promise<string | null> {
    if (!accessState.isAdmin) {
      return '只有管理員可以移除權限。';
    }

    const normalizedEmail = normalizeAccessEmail(email);
    if (!normalizedEmail) {
      return '找不到要移除的 Email。';
    }

    if (bootstrap?.ownerEmail === normalizedEmail) {
      return '管理員帳號不能被移除。';
    }

    try {
      await deleteDoc(doc(db, accessPath(`rolesByEmail/${normalizedEmail}`)));
      return null;
    } catch (error) {
      console.error('Error removing access role:', error);
      return '移除權限失敗，請稍後再試。';
    }
  }

  return {
    userEmail,
    bootstrap,
    roles,
    isLoading: isLoading || isResolvingCurrentUser,
    isRolesLoading,
    ...accessState,
    bootstrapOwner,
    saveRole,
    removeRole,
  };
}