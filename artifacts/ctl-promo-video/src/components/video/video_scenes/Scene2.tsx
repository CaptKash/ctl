import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1700),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center px-[8%]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ scale: 1.1, opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Floating scattered receipts / logs metaphor */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-[2.5vw] text-white/30 backdrop-blur-sm"
            style={{
              width: '40vw',
              top: `${10 + i * 15}%`,
              left: `${(i % 2) * 40}%`
            }}
            initial={{ opacity: 0, y: 50, rotate: (i % 2 === 0 ? -15 : 15) }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotate: (i % 2 === 0 ? -5 : 5) } : { opacity: 0, y: 50 }}
            transition={{ delay: i * 0.15, duration: 0.8, type: "spring" }}
          >
            <div>SRV-{1000 + i * 23}</div>
            <div className="h-1 bg-white/20 w-3/4 mt-2 rounded" />
            <div className="h-1 bg-white/10 w-1/2 mt-1 rounded" />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 bg-[#0F1626]/80 backdrop-blur-md p-8 border-l-4 border-red-500">
        <motion.h2 
          className="text-[9vw] font-bold leading-tight text-white mb-4"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Scattered receipts.
        </motion.h2>
        
        <motion.h2 
          className="text-[8vw] font-bold leading-tight text-red-400"
          initial={{ opacity: 0, x: -30 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Forgotten services.
        </motion.h2>
      </div>
    </motion.div>
  );
}