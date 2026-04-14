import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col items-center z-10 w-full px-8">
        <motion.img 
          src={`${import.meta.env.BASE_URL}ctl-logo.png`} 
          alt="CTL Logo"
          className="w-48 object-contain mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        
        <div className="w-64 h-[2px] bg-[#334155] relative overflow-hidden mb-8 rounded-full">
          <motion.div 
            className="absolute top-0 left-0 bottom-0"
            style={{ background: 'linear-gradient(90deg, #3B82F6, #2DD4BF)' }}
            initial={{ width: '0%' }}
            animate={{ width: phase >= 1 ? '60%' : '0%' }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </div>

        <motion.h2 
          className="text-[22px] font-medium text-[#9CA3AF] text-center max-w-[80%]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          The logbook your car deserves
        </motion.h2>
      </div>
    </motion.div>
  );
}
