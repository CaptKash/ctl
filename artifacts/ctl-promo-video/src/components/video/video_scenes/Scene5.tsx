import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center px-[10%]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.5 } }}
      transition={{ duration: 1, ease: [0.64, 0, 0.13, 1] }}
    >
      <motion.div
        className="w-[25vw] h-[25vw] bg-white rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.2)] mb-8"
        initial={{ scale: 0, rotate: 180 }}
        animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 180 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <span className="text-[#0F1626] font-bold text-[8vw]">CTL</span>
      </motion.div>

      <div className="text-center w-full">
        <motion.h1 
          className="text-[9vw] font-bold text-white leading-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Track every mile.
        </motion.h1>

        <motion.h2 
          className="text-[8vw] font-bold text-[#3B82F6] leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          Remember everything.
        </motion.h2>
      </div>

      <motion.div
        className="absolute bottom-[10vh] border border-white/20 rounded-full px-6 py-3"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <span className="text-white text-[3.5vw] tracking-wider uppercase">Download Now</span>
      </motion.div>
    </motion.div>
  );
}