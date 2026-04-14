import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
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
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1.2 : 0, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        />
        
        <motion.h2 
          className="text-[22px] font-medium text-[#F9FAFB] text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Track every mile. Remember everything.
        </motion.h2>

        <motion.div
          className="px-6 py-3 rounded-full border border-[#3B82F6]/50 bg-[#3B82F6]/10 text-[#3B82F6] text-[14px] font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Available on the App Store
        </motion.div>
      </div>
    </motion.div>
  );
}
