import React, { useEffect } from 'react';
import { Mail } from 'lucide-react';

export function VisualCinematic() {
  useEffect(() => {
    // Add Google font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div 
        style={{ width: 390, height: 844, fontFamily: "'Space Grotesk', sans-serif" }} 
        className="relative mx-auto overflow-hidden bg-black text-white shadow-2xl"
        dir="auto"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/__mockup/images/cinematic-car.png" 
            alt="Cinematic Car" 
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-10">
          
          {/* Glass Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-[32px] p-6 shadow-2xl flex flex-col items-center">
            
            <div className="w-full text-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-2 tracking-widest uppercase">CTL</h1>
              <p className="text-white/90 text-sm font-medium">Car Technical Log</p>
              <p className="text-white/60 text-xs mt-2">Aviation-grade logbook for your car</p>
            </div>

            <div className="w-full flex flex-col gap-3">
              {/* Apple Button */}
              <button className="w-full bg-white text-black h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-[15px] transition-transform active:scale-[0.98]">
                <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                Continue with Apple
              </button>

              {/* Google Button */}
              <button className="w-full bg-white text-black h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-[15px] transition-transform active:scale-[0.98]">
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              {/* Email Button */}
              <button className="w-full bg-white/10 text-white border border-white/20 h-12 rounded-full flex items-center justify-center gap-2 font-semibold text-[15px] transition-transform active:scale-[0.98] mt-2">
                <Mail className="w-5 h-5" />
                Continue with Email
              </button>
            </div>

            <div className="w-full flex justify-center mt-6">
              <button className="text-white/80 text-sm hover:text-white transition-colors">
                Already have an account? <span className="font-semibold text-white">Sign in</span>
              </button>
            </div>

            <p className="text-[10px] text-white/40 mt-8 text-center max-w-[250px]">
              By continuing you agree to our Terms & Privacy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
