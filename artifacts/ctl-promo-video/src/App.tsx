import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, AlertTriangle, Fuel, Grid, Crown, Apple } from 'lucide-react';

const SCENES = [
  { id: 'intro', duration: 4000 },
  { id: 'problem', duration: 6000 },
  { id: 'features', duration: 8000 },
  { id: 'dashboard', duration: 8000 },
  { id: 'fleet', duration: 8000 },
  { id: 'outro', duration: 6000 },
];

const TOTAL_DURATION = SCENES.reduce((acc, scene) => acc + scene.duration, 0);

export default function App() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const currentSceneRef = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    let animationFrameId: number;

    const tick = () => {
      const elapsed = (Date.now() - startTime) % TOTAL_DURATION;

      let accumulated = 0;
      let targetIndex = 0;

      for (let i = 0; i < SCENES.length; i++) {
        accumulated += SCENES[i].duration;
        if (elapsed < accumulated) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== currentSceneRef.current) {
        currentSceneRef.current = targetIndex;
        setCurrentSceneIndex(targetIndex);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const scene = SCENES[currentSceneIndex];

  return (
    <div className="w-full h-screen bg-background flex items-center justify-center font-sans overflow-hidden">
      {/* 9:16 Aspect Ratio Container */}
      <div className="relative w-full max-w-[54vh] h-full max-h-[96vw] aspect-[9/16] bg-background shadow-2xl overflow-hidden shadow-black/10 border border-border/50">
        
        {/* Global Accent Line */}
        <motion.div 
          className="absolute top-0 left-0 h-1 bg-accent z-50"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentSceneIndex + 1) / SCENES.length) * 100}%` }}
          transition={{ duration: 1, ease: "circOut" }}
        />

        <AnimatePresence mode="wait">
          {scene.id === 'intro' && <SceneIntro key="intro" />}
          {scene.id === 'problem' && <SceneProblem key="problem" />}
          {scene.id === 'features' && <SceneFeatures key="features" />}
          {scene.id === 'dashboard' && <SceneDashboard key="dashboard" />}
          {scene.id === 'fleet' && <SceneFleet key="fleet" />}
          {scene.id === 'outro' && <SceneOutro key="outro" />}
        </AnimatePresence>

      </div>
    </div>
  );
}

// Scene 1: App name reveal
function SceneIntro() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        className="text-8xl font-bold tracking-tighter text-foreground mb-4"
      >
        CTL
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
        className="text-xl font-medium tracking-wide text-foreground/70 uppercase"
      >
        Car Technical Log
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="mt-6 text-2xl text-accent-dark arabic-text font-semibold"
      >
        سجل السيارة التقني
      </motion.div>
    </motion.div>
  );
}

// Scene 2: Problem statement
function SceneProblem() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-10 bg-surface"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Abstract Car Silhouette */}
      <motion.div 
        className="mb-12 relative w-48 h-24"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <motion.path
            d="M30 70 L40 40 L80 30 L140 30 L170 45 L180 70 Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
          />
          <motion.circle 
            cx="60" cy="70" r="12" 
            stroke="currentColor" strokeWidth="3" className="text-accent"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: 'spring' }}
          />
          <motion.circle 
            cx="140" cy="70" r="12" 
            stroke="currentColor" strokeWidth="3" className="text-accent"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7, type: 'spring' }}
          />
          <motion.path 
            d="M70 40 L130 40" 
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-foreground/30"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2, duration: 0.5 }}
          />
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="text-4xl font-bold text-center leading-tight mb-6"
      >
        Your car has a story.
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.8 }}
        className="text-3xl text-accent-dark arabic-text"
      >
        لسيارتك قصة.
      </motion.p>
    </motion.div>
  );
}

// Scene 3: Feature showcase
function SceneFeatures() {
  const features = [
    { icon: Settings, en: "Maintenance Log", ar: "سجل الصيانة" },
    { icon: AlertTriangle, en: "Fault Records", ar: "سجل الأعطال" },
    { icon: Fuel, en: "Fuel & Costs", ar: "الوقود والتكاليف" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-8 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full flex flex-col gap-6">
        {features.map((feat, idx) => (
          <motion.div
            key={idx}
            className="bg-surface border border-border p-6 rounded-2xl flex items-center shadow-sm relative overflow-hidden"
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.4 + idx * 0.8, duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
          >
            <motion.div 
              className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.8 + idx * 0.8, duration: 0.4 }}
            />
            
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mr-6 shrink-0 text-accent">
              <feat.icon size={24} strokeWidth={2} />
            </div>
            
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-foreground mb-1">{feat.en}</span>
              <span className="text-lg text-foreground/60 arabic-text">{feat.ar}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Scene 4: Dashboard Mockup
function SceneDashboard() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center pt-24 pb-12 px-8 bg-surface"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-center mb-10 w-full"
      >
        <h2 className="text-3xl font-bold text-foreground mb-3">Everything in one place.</h2>
        <p className="text-2xl text-accent arabic-text">كل شيء في مكانه.</p>
      </motion.div>

      {/* Abstract Dashboard Grid */}
      <div className="w-full flex-1 flex flex-col gap-4">
        {/* Top Hero Card */}
        <motion.div 
          className="w-full h-32 rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-6 flex flex-col justify-end"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <motion.div className="w-1/3 h-4 bg-white/30 rounded-full mb-3" />
          <motion.div className="w-2/3 h-6 bg-white/50 rounded-full" />
        </motion.div>

        <div className="flex gap-4 h-24">
          <motion.div 
            className="flex-1 rounded-2xl bg-background border border-border p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
             <div className="w-8 h-8 rounded-full bg-foreground/10 mb-3" />
             <div className="w-full h-3 bg-foreground/5 rounded-full" />
          </motion.div>
          <motion.div 
            className="flex-1 rounded-2xl bg-background border border-border p-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.7, duration: 0.5 }}
          >
            <div className="w-8 h-8 rounded-full bg-foreground/10 mb-3" />
            <div className="w-full h-3 bg-foreground/5 rounded-full" />
          </motion.div>
        </div>

        {/* List Items */}
        {[1, 2, 3].map((item, i) => (
          <motion.div 
            key={i}
            className="w-full h-16 rounded-xl bg-background border border-border flex items-center px-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0 + (i * 0.2), duration: 0.5 }}
          >
             <div className="w-10 h-10 rounded-lg bg-foreground/5" />
             <div className="flex-1">
               <div className="w-1/2 h-3 bg-foreground/20 rounded-full mb-2" />
               <div className="w-1/3 h-2 bg-foreground/10 rounded-full" />
             </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Scene 5: Fleet Tease
function SceneFleet() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-8 bg-foreground text-background"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.64, 0, 0.13, 1] }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mb-10"
      >
        <Crown size={48} className="text-white" strokeWidth={1.5} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="text-4xl font-bold text-center mb-4 tracking-tight"
      >
        Unlock CTL Fleet
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.8 }}
        className="text-2xl text-background/70 arabic-text text-center"
      >
        للأسطول والمحترفين
      </motion.p>
      
      {/* Decorative dots */}
      <motion.div 
        className="absolute bottom-20 flex gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        {[1,2,3].map(i => (
          <motion.div 
            key={i} 
            className="w-2 h-2 rounded-full bg-accent"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// Scene 6: End Card
function SceneOutro() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
        className="mb-16"
      >
        <div className="text-7xl font-bold tracking-tighter text-foreground mb-2 text-center">CTL</div>
        <div className="w-16 h-1 bg-accent mx-auto mt-6" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <p className="text-foreground/60 font-medium mb-6 uppercase tracking-widest text-sm">Available on</p>
        
        {/* App Store Badge Mock */}
        <div className="bg-foreground text-background px-6 py-3 rounded-full flex items-center gap-3 shadow-lg">
          <Apple size={24} />
          <div className="flex flex-col">
            <span className="text-[10px] leading-none mb-1 opacity-80">Download on the</span>
            <span className="text-lg font-semibold leading-none">App Store</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
