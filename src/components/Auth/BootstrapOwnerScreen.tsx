import React from 'react';
import { Crown, LogOut, ShieldCheck } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

interface BootstrapOwnerScreenProps {
  email: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onBootstrap: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
}

export const BootstrapOwnerScreen: React.FC<BootstrapOwnerScreenProps> = ({
  email,
  isSubmitting = false,
  errorMessage = null,
  onBootstrap,
  onSignOut,
}) => {
  return (
    <div className="force-serif flex min-h-[100dvh] items-center justify-center bg-[#EBE6DC] px-6 py-10 text-[#4A3B32]">
      <div className="w-full max-w-3xl rounded-[36px] border border-[#E6DED2] bg-[#FFFCF7] p-8 shadow-[0_28px_70px_rgba(74,59,50,0.14)] md:p-10">
        <div className="inline-flex items-center gap-3 rounded-full bg-[#F7EFE5] px-4 py-2 text-sm font-black tracking-[0.18em] text-[#8C7A6B]">
          <Crown className="h-4 w-4" />
          ADMIN BOOTSTRAP
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-[0.08em] text-[#3E312A]">
          建立第一個管理員
        </h1>
        <p className="mt-4 text-base font-bold leading-8 text-[#6F6257]">
          系統目前還沒有管理員。你現在登入的帳號會成為最高權限帳號，之後再由管理員指派其他 owner 或 staff。
        </p>

        <div className="mt-6 rounded-[28px] border border-[#E6DED2] bg-[#F8F2E8] p-5">
          <div className="text-sm font-black tracking-[0.16em] text-[#8C7A6B]">目前登入帳號</div>
          <div className="mt-2 text-2xl font-black text-[#4A3B32]">{email}</div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-[24px] border border-[#E7C1B8] bg-[#FFF3F0] px-4 py-3 text-sm font-black text-[#9A4F44]">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onBootstrap}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-6 py-4 text-base font-black text-white shadow-[0_16px_30px_rgba(74,59,50,0.18)] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting ? '建立中...' : '將目前帳號設為管理員'}
          </button>

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