import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1400),
      setTimeout(() => setPhase(5), 1600),
      setTimeout(() => setPhase(6), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#0F172A] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Text */}
      <div className="absolute left-[10%] top-[15%] z-0 flex flex-col gap-2">
        <motion.div
          className="text-[52px] font-bold text-[#F9FAFB] leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          One place
        </motion.div>
        <motion.div
          className="text-[52px] font-bold text-[#F9FAFB] leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          for all your
        </motion.div>
        <motion.div
          className="text-[52px] font-bold text-[#F9FAFB] leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          car's records.
        </motion.div>
      </div>

      {/* Phone Frame */}
      <motion.div
        className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[390px] h-[844px] bg-[#0F172A] rounded-[44px] border-[6px] border-[#2D2D2D] overflow-hidden shadow-2xl flex flex-col scale-[0.6] origin-top z-10"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: '-50%', opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        <div className="flex-1 p-6 overflow-hidden">
          <motion.h1 
            className="text-[20px] font-bold text-[#F9FAFB] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
          >
            My Cars
          </motion.h1>

          <motion.div 
            className="bg-[#1E293B] rounded-2xl p-5 mb-8 border border-[#334155] relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="absolute top-4 right-4 w-3 h-3 bg-[#3B82F6] rounded-full" />
            <h2 className="text-[#F9FAFB] font-bold text-[18px] mb-1">2021 BMW 3 Series</h2>
            <p className="text-[#9CA3AF] text-[14px]">M340i</p>
          </motion.div>

          <motion.h3 
            className="text-[20px] font-bold text-[#F9FAFB] mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
          >
            Upcoming
          </motion.h3>

          <motion.div 
            className="bg-[#451A03] border border-[#FBBF24]/30 rounded-xl p-4 mb-4 flex items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="w-2 h-2 rounded-full bg-[#FBBF24] mr-3" />
            <span className="text-[#F9FAFB] font-medium text-[15px]">Oil Change · Due in 8 days</span>
          </motion.div>

          <motion.div 
            className="bg-[#172554] border border-[#3B82F6]/30 rounded-xl p-4 flex items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 6 ? 1 : 0, y: phase >= 6 ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-[#3B82F6] mr-3" />
            <span className="text-[#F9FAFB] font-medium text-[15px]">Annual Inspection · Jan 15</span>
          </motion.div>
        </div>

        {/* Tab Bar */}
        <div className="h-[80px] bg-[#1E293B] border-t border-[#334155] flex justify-around items-center px-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#3B82F6]" />
            <span className="text-[#3B82F6] text-[11px] font-medium">Cars</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#6B7280]" />
            <span className="text-[#6B7280] text-[11px] font-medium">History</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#6B7280]" />
            <span className="text-[#6B7280] text-[11px] font-medium">Settings</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
