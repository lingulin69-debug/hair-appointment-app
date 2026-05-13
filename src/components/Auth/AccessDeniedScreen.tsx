import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

interface AccessDeniedScreenProps {
  email: string;
  bootstrapOwnerEmail?: string | null;
  onSignOut: () => void | Promise<void>;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  email,
  bootstrapOwnerEmail = null,
  onSignOut,
}) => {
  return (
    <div className="force-serif flex min-h-[100dvh] items-center justify-center bg-[#EBE6DC] px-6 py-10 text-[#4A3B32]">
      <div className="w-full max-w-2xl rounded-[36px] border border-[#E6DED2] bg-[#FFFCF7] p-8 shadow-[0_28px_70px_rgba(74,59,50,0.14)] md:p-10">
        <div className="inline-flex items-center gap-3 rounded-full bg-[#FFF3F0] px-4 py-2 text-sm font-black tracking-[0.18em] text-[#9A4F44]">
          <Lock className="h-4 w-4" />
          ACCESS DENIED
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-[0.08em] text-[#3E312A]">
          這個帳號還沒有權限
        </h1>
        <p className="mt-4 text-base font-bold leading-8 text-[#6F6257]">
          目前登入的是 {email}。這個帳號尚未被管理員指派為 owner 或 staff，所以還不能進入系統。
        </p>
        {bootstrapOwnerEmail && (
          <div className="mt-6 rounded-[28px] border border-[#E6DED2] bg-[#F8F2E8] p-5 text-sm font-bold leading-7 text-[#6F6257]">
            目前管理員：{bootstrapOwnerEmail}
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={onSignOut}
            className={`inline-flex items-center gap-2 rounded-full border border-[#E2DCD0] bg-white px-6 py-4 text-base font-black text-[#4A3B32] shadow-sm ${interactionMotion.subtleButton}`}
          >
            <LogOut className="h-5 w-5" />
            登出
          </button>
        </div>
      </div>
    </div>
  );
};