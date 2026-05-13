import React, { useState } from 'react';
import { LockKeyhole, Mail, Scissors, ShieldCheck } from 'lucide-react';
import { interactionMotion } from '../../styles/interactionMotion';

interface LoginScreenProps {
  isCheckingSession?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  defaultIdentifier?: string;
  defaultPassword?: string;
  defaultRememberDevice?: boolean;
  onSubmit: (identifier: string, password: string, rememberDevice: boolean) => void | Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isCheckingSession = false,
  isSubmitting = false,
  errorMessage = null,
  defaultIdentifier = '',
  defaultPassword = '',
  defaultRememberDevice = false,
  onSubmit,
}) => {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [password, setPassword] = useState(defaultPassword);
  const [rememberDevice, setRememberDevice] = useState(defaultRememberDevice);

  const isBusy = isCheckingSession || isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    await onSubmit(identifier, password, rememberDevice);
  };

  return (
    <div className="force-serif relative min-h-[100dvh] overflow-hidden bg-[#EBE6DC] text-[#4A3B32]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,250,245,0.96),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(214,194,171,0.42),_transparent_32%)]" />
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full border border-white/50 bg-white/20 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#D9C8B4]/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center gap-8 px-6 py-10 lg:flex-row lg:items-center lg:gap-10">
        <section className="max-w-xl rounded-[36px] border border-white/60 bg-white/45 p-8 shadow-[0_24px_70px_rgba(74,59,50,0.12)] backdrop-blur-xl md:p-10">
          <div className="inline-flex items-center gap-3 rounded-full bg-[#F7EFE5] px-4 py-2 text-sm font-black tracking-[0.18em] text-[#8C7A6B]">
            <Scissors className="h-4 w-4" />
            AMY.SALON ACCESS
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-[0.08em] text-[#3E312A] md:text-5xl">
            前台與後台
            <br />
            現在正式分流
          </h1>
          <p className="mt-5 max-w-lg text-base font-bold leading-8 text-[#6F6257] md:text-lg">
            登入後才可進入排程、結帳、顧客、商品與庫存管理。這一層是實際登入 gate，不只是把畫面藏起來。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-[#E6DED2] bg-[#FFFCF7] p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 text-sm font-black tracking-[0.16em] text-[#8C7A6B]">
                <ShieldCheck className="h-4 w-4" />
                FRONTDESK
              </div>
              <div className="mt-3 text-xl font-black text-[#4A3B32]">預約與結帳</div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#7A6B5D]">
                月曆排程、預約操作、完成結帳都會鎖在登入後。
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E6DED2] bg-[#FFF9F2] p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 text-sm font-black tracking-[0.16em] text-[#8C7A6B]">
                <ShieldCheck className="h-4 w-4" />
                BACKOFFICE
              </div>
              <div className="mt-3 text-xl font-black text-[#4A3B32]">顧客與庫存</div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#7A6B5D]">
                顧客消費、商品主檔、進貨出貨與報表都從這裡控管。
              </p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-md rounded-[36px] border border-[#E6DED2] bg-[#FFFCF7] p-8 shadow-[0_28px_70px_rgba(74,59,50,0.14)] md:p-10">
          <div className="text-xs font-black tracking-[0.32em] text-[#8C7A6B]">登入系統</div>
          <h2 className="mt-3 text-3xl font-black tracking-[0.08em] text-[#4A3B32]">
            使用管理帳號登入
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#7A6B5D]">
            使用 Firebase Authentication 的帳號 / Email 與密碼登入。短帳號會自動補成內部登入網域，不必每次輸入完整 Email。
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-3 inline-flex items-center gap-2 text-sm font-black tracking-[0.18em] text-[#6F6257]">
                <Mail className="h-4 w-4" />
                帳號 / EMAIL
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-[24px] border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-base font-bold text-[#4A3B32] outline-none transition focus:border-[#4A3B32]"
                placeholder="alassealin 或 owner@amysalon.local"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-3 inline-flex items-center gap-2 text-sm font-black tracking-[0.18em] text-[#6F6257]">
                <LockKeyhole className="h-4 w-4" />
                PASSWORD
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[24px] border border-[#E2DCD0] bg-[#FCFAF5] px-5 py-4 text-base font-bold text-[#4A3B32] outline-none transition focus:border-[#4A3B32]"
                placeholder="輸入密碼"
                autoComplete="current-password"
              />
            </label>

            <label className="flex items-center gap-3 rounded-[22px] border border-[#E2DCD0] bg-[#FCFAF5] px-4 py-3 text-sm font-black text-[#6F6257]">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
                className="h-4 w-4 rounded border-[#CDBEAB] text-[#4A3B32] focus:ring-[#4A3B32]"
              />
              記住這台裝置的帳號密碼
            </label>

            {errorMessage && (
              <div className="rounded-[24px] border border-[#E7C1B8] bg-[#FFF3F0] px-4 py-3 text-sm font-black text-[#9A4F44]">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy || !identifier.trim() || !password.trim()}
              className={`w-full rounded-[24px] bg-[#4A3B32] px-5 py-4 text-lg font-black tracking-[0.08em] text-white shadow-[0_18px_40px_rgba(74,59,50,0.18)] disabled:cursor-not-allowed disabled:opacity-50 ${interactionMotion.button}`}
            >
              {isCheckingSession ? '檢查登入狀態中...' : isSubmitting ? '登入中...' : '進入系統'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};