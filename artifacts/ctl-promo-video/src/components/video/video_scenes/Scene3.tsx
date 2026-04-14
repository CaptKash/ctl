import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-[8%]"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ y: '-100%', opacity: 0, transition: { duration: 0.6 } }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-[30vw] h-[30vw] rounded-[2rem] bg-gradient-to-br from-[#3B82F6] to-[#0F766E] p-1 shadow-[0_0_40px_rgba(59,130,246,0.3)] mb-10 flex items-center justify-center"
        initial={{ rotate: -90, scale: 0 }}
        animate={phase >= 1 ? { rotate: 0, scale: 1 } : { rotate: -90, scale: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="w-full h-full bg-[#0F1626] rounded-[1.8rem] flex items-center justify-center font-bold text-[8vw] text-white">
          CTL
        </div>
      </motion.div>

      <div className="text-center relative z-10">
        <motion.p 
          className="text-[4vw] font-mono text-[#3B82F6] mb-4 uppercase tracking-widest"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          The Solution
        </motion.p>

        <motion.h2 
          className="text-[10vw] font-bold leading-tight text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          An aviation-style logbook for your car.
        </motion.h2>
      </div>
    </motion.div>
  );
}