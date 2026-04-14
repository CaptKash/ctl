import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center px-[10%]"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.6 } }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative z-10">
        <motion.div 
          className="w-12 h-1 bg-[#3B82F6] mb-6 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: phase >= 1 ? 48 : 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
        />
        
        <h1 className="text-[12vw] font-bold leading-[1.1] tracking-tight">
          <motion.span 
            className="block text-white"
            initial={{ opacity: 0, y: 40 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Your car
          </motion.span>
          <motion.span 
            className="block text-[#94A3B8]"
            initial={{ opacity: 0, y: 40 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            has a history.
          </motion.span>
        </h1>

        <motion.p 
          className="mt-8 text-[5vw] text-[#3B82F6] font-mono tracking-widest uppercase"
          initial={{ opacity: 0, letterSpacing: '0em' }}
          animate={phase >= 4 ? { opacity: 1, letterSpacing: '0.1em' } : { opacity: 0, letterSpacing: '0em' }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          Do you know it?
        </motion.p>
      </div>
    </motion.div>
  );
}