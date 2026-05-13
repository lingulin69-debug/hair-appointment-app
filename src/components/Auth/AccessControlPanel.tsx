import React, { useMemo, useState } from 'react';
import { Crown, Shield, Trash2, UserPlus } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';
import { normalizeAccessEmail, type AccessRoleRecord, type UserAccessRole } from '../../utils/access';

interface AccessControlPanelProps {
  bootstrapOwnerEmail: string;
  roles: AccessRoleRecord[];
  isLoading?: boolean;
  onSaveRole: (email: string, role: UserAccessRole) => Promise<string | null>;
  onRemoveRole: (email: string) => Promise<string | null>;
}

export const AccessControlPanel: React.FC<AccessControlPanelProps> = ({
  bootstrapOwnerEmail,
  roles,
  isLoading = false,
  onSaveRole,
  onRemoveRole,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserAccessRole>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedBootstrapOwnerEmail = normalizeAccessEmail(bootstrapOwnerEmail);

  const getRoleLabel = (value: UserAccessRole) => {
    if (value === 'admin') {
      return 'admin';
    }

    return value === 'owner' ? 'owner' : 'staff';
  };

  const visibleRoles = useMemo(() => {
    const remainingRoles = roles.filter(
      (entry) => normalizeAccessEmail(entry.email) !== normalizedBootstrapOwnerEmail
    );

    if (!normalizedBootstrapOwnerEmail) {
      return remainingRoles;
    }

    return [
      { email: normalizedBootstrapOwnerEmail, role: 'admin' as const },
      ...remainingRoles,
    ];
  }, [normalizedBootstrapOwnerEmail, roles]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await onSaveRole(email, role);
      if (result) {
        setFeedback(result);
        return;
      }

      setFeedback(`已更新 ${normalizeAccessEmail(email)} 為 ${getRoleLabel(role)}。`);
      setEmail('');
      setRole('staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetEmail: string, nextRole: Extract<UserAccessRole, 'owner' | 'staff'>) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await onSaveRole(targetEmail, nextRole);
      setFeedback(result ?? `${targetEmail} 已改為 ${getRoleLabel(nextRole)}。`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await onRemoveRole(targetEmail);
      setFeedback(result ?? `已移除 ${targetEmail} 的權限。`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-[#E6DED2] bg-[#FFFCF7] p-6 shadow-[0_12px_30px_rgba(74,59,50,0.06)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.28em] text-[#8C7A6B]">ACCESS CONTROL</div>
          <h2 className="mt-2 text-2xl font-black tracking-[0.08em] text-[#4A3B32]">
            權限管理
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6F6257]">
            只有管理員可以調整帳號權限。owner 可以進後台，但不會看到這個面板。
          </p>
        </div>
        <div className="rounded-full bg-[#F7EFE5] px-4 py-2 text-sm font-black text-[#6F6257]">
          管理員帳號：{bootstrapOwnerEmail}
        </div>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto]" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="parent@amysalon.com"
          className="rounded-[22px] border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-base font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32]"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value === 'owner' ? 'owner' : 'staff')}
          className="rounded-[22px] border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-base font-bold text-[#4A3B32] outline-none focus:border-[#4A3B32]"
        >
          <option value="staff">staff</option>
          <option value="owner">owner</option>
        </select>
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-6 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
        >
          <UserPlus className="h-5 w-5" />
          {isSubmitting ? '儲存中...' : '儲存權限'}
        </button>
      </form>

      {feedback && (
        <div className="mt-4 rounded-[22px] border border-[#E2DCD0] bg-[#F8F2E8] px-4 py-3 text-sm font-black text-[#6F6257]">
          {feedback}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded-[22px] border border-dashed border-[#D5C7B6] bg-[#FCFAF5] px-4 py-4 text-sm font-bold text-[#7A6B5D]">
            正在同步權限清單...
          </div>
        ) : visibleRoles.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#D5C7B6] bg-[#FCFAF5] px-4 py-4 text-sm font-bold text-[#7A6B5D]">
            目前還沒有額外授權帳號。
          </div>
        ) : (
          visibleRoles.map((entry) => {
            const isBootstrapOwner = normalizeAccessEmail(entry.email) === normalizedBootstrapOwnerEmail;
            const isAdmin = entry.role === 'admin';

            return (
              <div
                key={entry.email}
                className="flex flex-col gap-3 rounded-[22px] border border-[#E6DED2] bg-[#FCFAF5] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-lg font-black text-[#4A3B32]">{entry.email}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#F1E9DD] px-3 py-1 text-sm font-black text-[#6F6257]">
                      {entry.role !== 'staff' ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      {entry.role}
                    </span>
                    {isBootstrapOwner && (
                      <span className="rounded-full bg-[#FFF3E6] px-3 py-1 text-sm font-black text-[#8B5C2B]">
                        固定管理員
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRoleChange(entry.email, 'staff')}
                    disabled={isSubmitting || isBootstrapOwner || isAdmin || entry.role === 'staff'}
                    className={`rounded-full border border-[#E2DCD0] bg-white px-4 py-2 text-sm font-black text-[#4A3B32] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.subtleButton}`}
                  >
                    改 staff
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRoleChange(entry.email, 'owner')}
                    disabled={isSubmitting || isBootstrapOwner || isAdmin || entry.role === 'owner'}
                    className={`rounded-full border border-[#E2DCD0] bg-white px-4 py-2 text-sm font-black text-[#4A3B32] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.subtleButton}`}
                  >
                    改 owner
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(entry.email)}
                    disabled={isSubmitting || isBootstrapOwner || isAdmin}
                    className={`inline-flex items-center gap-2 rounded-full border border-[#E8C9C2] bg-[#FFF3EE] px-4 py-2 text-sm font-black text-[#9A4F44] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.subtleButton}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    移除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};