import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrustFirst() {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div style={{ width: 390, height: 844 }} className="mx-auto bg-white overflow-hidden relative font-sans shadow-xl" dir="auto">
        <div className="px-8 pt-24 pb-12 h-full flex flex-col">
          {/* Header */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-12 text-center">
            <h1 className="text-5xl font-extrabold tracking-tighter text-zinc-900 mb-2">CTL</h1>
            <p className="text-zinc-500 text-sm tracking-widest uppercase font-medium">Car Technical Log</p>
            <div className="w-10 h-[1px] bg-zinc-200 my-6 mx-auto"></div>
            <p className="text-zinc-600 font-medium">
              Aviation-grade logbook for your car.
            </p>
          </div>

          {/* Actions */}
          <div className="w-full space-y-4">
            <button className="w-full h-14 bg-black text-white rounded-xl font-semibold flex items-center justify-center space-x-3 active:scale-[0.98] transition-transform">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M15.4 8.2c.6-1.1.9-2.3.8-3.5-1.2.1-2.5.6-3.4 1.4-.7.6-1.2 1.5-1.4 2.5 1.1.1 2.3-.4 3.1-1.3-.1.1 0 .1.9.9z" />
                <path d="M17.4 11.2c-.1-2.2 1.8-3.4 1.9-3.5-1.1-1.6-2.8-1.8-3.5-1.9-1.5-.1-3 .8-3.8.8-.8 0-2.1-.8-3.3-.8-1.4 0-2.8.8-3.6 2.1-1.6 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.3 1.2-.1 1.6-.8 3.1-.8 1.4 0 1.9.8 3.1.8 1.2.1 2-.9 2.8-2.1.8-1.1 1.2-2.3 1.2-2.3-.1-.1-2-1-2.1-4.1z" />
              </svg>
              <span>Continue with Apple</span>
            </button>

            <button className="w-full h-14 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-semibold flex items-center justify-center space-x-3 active:scale-[0.98] transition-transform shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-zinc-400 font-medium">Or</span>
              </div>
            </div>

            {showEmail ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input id="email" type="email" placeholder="Email address" className="h-12 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-900 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="sr-only">Password</Label>
                  <Input id="password" type="password" placeholder="Password" className="h-12 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-900 rounded-lg" />
                </div>
                <Button className="w-full h-12 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800">
                  Sign In
                </Button>
              </div>
            ) : (
              <button 
                onClick={() => setShowEmail(true)}
                className="w-full h-14 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <Mail className="w-5 h-5 text-zinc-500" />
                <span>Continue with Email</span>
              </button>
            )}

          </div>

          <div className="mt-8 text-center">
             <p className="text-xs text-zinc-500">
               By continuing you agree to our <a href="#" className="underline underline-offset-2 text-zinc-800 hover:text-black">Terms</a> & <a href="#" className="underline underline-offset-2 text-zinc-800 hover:text-black">Privacy</a>
             </p>
          </div>
          
          <div className="mt-auto text-center pt-8">
            <p className="text-sm text-zinc-600 font-medium">
              Already have an account? <a href="#" className="text-black font-semibold hover:underline">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
