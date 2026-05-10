import React, { useState } from 'react';
import { Apple, Mail, ArrowRight } from 'lucide-react';

export function BrandHero() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Google SVG icon
  const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      {/* Font Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@400;500;600;700&display=swap');
      `}} />
      
      <div 
        style={{ width: 390, height: 844, fontFamily: "'Inter', sans-serif" }} 
        className="relative overflow-hidden rounded-[40px] shadow-2xl flex flex-col bg-[#0F2D5E]"
        dir="auto"
      >
        {/* Background Gradients & Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F2D5E] to-[#1D4ED8] opacity-80 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#3B82F6] rounded-full blur-[100px] opacity-40 pointer-events-none" />
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full p-8 text-white">
          
          {/* Header Section */}
          <div className="mt-12 flex flex-col items-center text-center">
            <div 
              className="text-6xl tracking-tighter"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              CTL
            </div>
            <div className="mt-2 text-xs font-semibold tracking-[0.2em] text-blue-200">
              CAR TECHNICAL LOG
            </div>
            
            <h1 className="mt-12 text-3xl font-bold leading-tight">
              Your car's<br/>flight log.
            </h1>
            <p className="mt-4 text-blue-100/80 text-sm">
              Aviation-grade logbook for your car. Every service, repair, and drive.
            </p>
          </div>

          <div className="flex-1" />

          {/* Segmented Control */}
          <div className="w-full bg-white/10 p-1 rounded-2xl flex backdrop-blur-md mb-6 border border-white/10">
            <button 
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${mode === 'signup' ? 'bg-white text-[#0F2D5E] shadow-sm' : 'text-white/70 hover:text-white'}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
            <button 
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${mode === 'signin' ? 'bg-white text-[#0F2D5E] shadow-sm' : 'text-white/70 hover:text-white'}`}
              onClick={() => setMode('signin')}
            >
              Log In
            </button>
          </div>

          {/* Form Area */}
          <div className="space-y-4 mb-8">
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="Email address" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all"
              />
            </div>
            
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">or continue with</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Social Auth */}
          <div className="space-y-3">
            <button className="w-full bg-white hover:bg-neutral-50 text-neutral-900 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3">
              <Apple className="w-5 h-5" />
              Continue with Apple
            </button>
            <button className="w-full bg-white hover:bg-neutral-50 text-neutral-900 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3">
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {/* Legal */}
          <div className="mt-8 text-center">
            <p className="text-[10px] text-white/40">
              By continuing you agree to our <a href="#" className="underline underline-offset-2 hover:text-white/60">Terms</a> & <a href="#" className="underline underline-offset-2 hover:text-white/60">Privacy</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
