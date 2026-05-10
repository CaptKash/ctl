import React from 'react';
import { Mail } from 'lucide-react';

interface PhoneFrameProps {
  label: string;
  children: React.ReactNode;
}

function PhoneFrame({ label, children }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-neutral-500 uppercase tracking-widest">{label}</span>
      <div
        className="relative overflow-hidden rounded-[40px] shadow-2xl ring-8 ring-neutral-900/5"
        style={{ width: 390, height: 844 }}
      >
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pt-2 pointer-events-none">
          <div className="w-[120px] h-[30px] bg-black rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function BrandHero({ isDark, width = 390 }: { isDark: boolean; width?: number }) {
  const polyFill = isDark ? '#1D4A96' : '#DBEAFE';
  const titleColor = isDark ? '#FFFFFF' : '#0F2D5E';
  const tagColor = isDark ? '#93C5FD' : '#2563EB';
  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: isDark ? '#0F2D5E' : '#FFFFFF',
        paddingTop: 56,
        paddingBottom: 28,
        paddingLeft: 28,
        paddingRight: 28,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        borderBottom: isDark ? 'none' : '2px solid #B8CADD',
        boxShadow: isDark ? 'none' : '0 4px 8px rgba(29, 78, 216, 0.08)',
      }}
    >
      <svg
        width={width}
        height={250}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <polygon
          points={`${Math.round(width * 0.57)},0 ${width},0 ${width},250 ${Math.round(width * 0.57)},155`}
          fill={polyFill}
        />
      </svg>
      <div className="relative">
        <div
          style={{
            fontSize: 72,
            lineHeight: '76px',
            fontWeight: 700,
            color: titleColor,
            letterSpacing: '-0.02em',
          }}
        >
          CTL
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div style={{ height: 5, width: 90, backgroundColor: '#1D4ED8', borderRadius: 3 }} />
          <div style={{ height: 5, width: 38, backgroundColor: '#0891B2', borderRadius: 3 }} />
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 18,
            fontWeight: 600,
            color: tagColor,
          }}
        >
          Car Technical Log
        </div>
      </div>
    </div>
  );
}

function CinematicCTLScreen({ mode }: { mode: 'light' | 'dark' }) {
  const isDark = mode === 'dark';

  return (
    <div
      className={`w-full h-full relative font-sans flex flex-col ${
        isDark ? 'bg-[#0F172A] text-[#F9FAFB]' : 'bg-[#F9FAFB] text-[#111827]'
      }`}
    >
      {/* Brand hero (matches the existing app signup screen) */}
      <BrandHero isDark={isDark} />

      {/* Sign-in card */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-6">
        <div
          className={`w-full rounded-2xl p-5 ${
            isDark
              ? 'bg-white/[0.04] border border-white/10'
              : 'bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(15,45,94,0.06)]'
          }`}
        >
          <div className="mb-5">
            <h2
              className={`text-[22px] font-bold ${isDark ? 'text-white' : 'text-[#0F2D5E]'}`}
            >
              Create account
            </h2>
            <p
              className={`text-[13px] mt-1 ${isDark ? 'text-[#93A4BF]' : 'text-[#6B7280]'}`}
            >
              Start logging your fleet's full service history
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button className="w-full h-[50px] bg-black text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-[0.98] transition-transform">
              <AppleIcon className="w-5 h-5 fill-current" />
              Continue with Apple
            </button>

            <button
              className={`w-full h-[50px] rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-[0.98] transition-transform ${
                isDark
                  ? 'bg-white text-black'
                  : 'bg-white text-[#111827] border border-[#E5E7EB]'
              }`}
            >
              <GoogleIcon className="w-5 h-5" />
              Continue with Google
            </button>

            <button className="w-full h-[50px] bg-[#1A56DB] text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] active:scale-[0.98] transition-transform">
              <Mail className="w-5 h-5" />
              Continue with Email
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2.5 mt-5">
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-[#E5E7EB]'}`} />
            <span
              className={`text-[11px] ${isDark ? 'text-[#6B7E9C]' : 'text-[#9CA3AF]'}`}
            >
              already have an account?
            </span>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-[#E5E7EB]'}`} />
          </div>

          {/* Sign In button */}
          <button
            className={`mt-4 w-full h-[48px] rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] border ${
              isDark
                ? 'border-white/15 text-white bg-white/[0.03]'
                : 'border-[#E5E7EB] text-[#111827] bg-white'
            }`}
          >
            Sign In
            <span className="text-[16px]">→</span>
          </button>
        </div>

        <div className="flex-1" />

        <p
          className={`text-[11px] text-center mt-6 ${
            isDark ? 'text-[#6B7E9C]' : 'text-[#9CA3AF]'
          }`}
        >
          By continuing you agree to our Terms & Privacy
        </p>
      </div>
    </div>
  );
}

export function CinematicCTL() {
  return (
    <div className="min-h-screen bg-neutral-200 flex flex-col md:flex-row items-center justify-center gap-12 p-8 overflow-y-auto">
      <PhoneFrame label="Light Mode">
        <CinematicCTLScreen mode="light" />
      </PhoneFrame>
      <PhoneFrame label="Dark Mode">
        <CinematicCTLScreen mode="dark" />
      </PhoneFrame>
    </div>
  );
}
