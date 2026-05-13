export type UserAccessRole = 'admin' | 'owner' | 'staff';

export type AccessBootstrapRecord = {
  ownerEmail: string;
  ownerUid?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AccessRoleRecord = {
  email: string;
  role: UserAccessRole;
  createdAt?: string;
  updatedAt?: string;
};

export type ResolvedAccessState = {
  role: UserAccessRole | null;
  canBootstrapOwner: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
};

export function normalizeAccessEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('en-US');
}

export function sanitizeAccessBootstrapRecord(
  value: Partial<AccessBootstrapRecord> | null | undefined
): AccessBootstrapRecord | null {
  const ownerEmail = normalizeAccessEmail(value?.ownerEmail);
  if (!ownerEmail) {
    return null;
  }

  return {
    ownerEmail,
    ...(typeof value?.ownerUid === 'string' && value.ownerUid.trim()
      ? { ownerUid: value.ownerUid.trim() }
      : {}),
    ...(typeof value?.createdAt === 'string' && value.createdAt.trim()
      ? { createdAt: value.createdAt.trim() }
      : {}),
    ...(typeof value?.updatedAt === 'string' && value.updatedAt.trim()
      ? { updatedAt: value.updatedAt.trim() }
      : {}),
  };
}

export function sanitizeAccessRoleRecord(
  value: Partial<AccessRoleRecord> | null | undefined
): AccessRoleRecord | null {
  const email = normalizeAccessEmail(value?.email);
  const role =
    value?.role === 'admin'
      ? 'admin'
      : value?.role === 'owner'
        ? 'owner'
        : value?.role === 'staff'
          ? 'staff'
          : null;

  if (!email || !role) {
    return null;
  }

  return {
    email,
    role,
    ...(typeof value?.createdAt === 'string' && value.createdAt.trim()
      ? { createdAt: value.createdAt.trim() }
      : {}),
    ...(typeof value?.updatedAt === 'string' && value.updatedAt.trim()
      ? { updatedAt: value.updatedAt.trim() }
      : {}),
  };
}

export function resolveAccessState(
  userEmail: string | null | undefined,
  bootstrap: AccessBootstrapRecord | null,
  roleRecord: AccessRoleRecord | null
): ResolvedAccessState {
  const normalizedEmail = normalizeAccessEmail(userEmail);

  if (!normalizedEmail) {
    return {
      role: null,
      canBootstrapOwner: false,
      isAdmin: false,
      isOwner: false,
      isStaff: false,
    };
  }

  if (!bootstrap) {
    return {
      role: null,
      canBootstrapOwner: true,
      isAdmin: false,
      isOwner: false,
      isStaff: false,
    };
  }

  if (bootstrap.ownerEmail === normalizedEmail || roleRecord?.role === 'admin') {
    return {
      role: 'admin',
      canBootstrapOwner: false,
      isAdmin: true,
      isOwner: true,
      isStaff: true,
    };
  }

  if (roleRecord?.role === 'owner') {
    return {
      role: 'owner',
      canBootstrapOwner: false,
      isAdmin: false,
      isOwner: true,
      isStaff: true,
    };
  }

  if (roleRecord?.role === 'staff') {
    return {
      role: 'staff',
      canBootstrapOwner: false,
      isAdmin: false,
      isOwner: false,
      isStaff: true,
    };
  }

  return {
    role: null,
    canBootstrapOwner: false,
    isAdmin: false,
    isOwner: false,
    isStaff: false,
  };
}

export function sortAccessRoles(records: AccessRoleRecord[]): AccessRoleRecord[] {
  return [...records].sort((left, right) => {
    if (left.role !== right.role) {
      const roleOrder: Record<UserAccessRole, number> = {
        admin: 0,
        owner: 1,
        staff: 2,
      };

      return roleOrder[left.role] - roleOrder[right.role];
    }

    return left.email.localeCompare(right.email, 'en-US');
  });
}