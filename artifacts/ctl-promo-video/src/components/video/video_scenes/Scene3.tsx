import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1400),
      setTimeout(() => setPhase(5), 1600),
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
      <div className="absolute right-[5%] top-[20%] z-0 flex flex-col gap-2 max-w-[40%] text-right">
        <motion.div
          className="text-[52px] font-bold text-[#F9FAFB] leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Full service history.
        </motion.div>
        <motion.div
          className="text-[52px] font-bold text-[#F9FAFB] leading-[1.1]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Every car.
        </motion.div>
      </div>

      {/* Phone Frame */}
      <div className="absolute top-[35%] left-[20%] w-[390px] h-[844px] bg-[#0F172A] rounded-[44px] border-[6px] border-[#2D2D2D] overflow-hidden shadow-2xl flex flex-col scale-[0.6] origin-top z-10">
        <div className="flex-1 p-6 overflow-hidden">
          <h1 className="text-[20px] font-bold text-[#F9FAFB] mb-6">History</h1>

          <div className="flex flex-col gap-4">
            <motion.div 
              className="bg-[#1E293B] border border-[#34D399]/30 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-[#F9FAFB] font-bold text-[16px] mb-1">Oil Change</h2>
              <p className="text-[#9CA3AF] text-[13px]">Completed Jan 3 · $89.00</p>
            </motion.div>

            <motion.div 
              className="bg-[#1E293B] border border-[#3B82F6]/30 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-[#F9FAFB] font-bold text-[16px] mb-1">Annual Inspection</h2>
              <p className="text-[#9CA3AF] text-[13px]">Next due Jan 2026</p>
            </motion.div>

            <motion.div 
              className="bg-[#1E293B] border border-[#F87171]/30 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-start mb-1">
                <h2 className="text-[#F9FAFB] font-bold text-[16px]">Check Engine Light</h2>
                <div className="bg-[#450A0A] text-[#F87171] text-[10px] font-bold px-2 py-1 rounded">ACTIVE</div>
              </div>
              <p className="text-[#9CA3AF] text-[13px]">Logged Apr 3</p>
            </motion.div>

            <motion.div 
              className="bg-[#1E293B] border border-[#34D399]/30 rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-start mb-1">
                <h2 className="text-[#F9FAFB] font-bold text-[16px]">Brake Pads</h2>
                <div className="bg-[#022C22] text-[#34D399] text-[10px] font-bold px-2 py-1 rounded">RESOLVED</div>
              </div>
              <p className="text-[#9CA3AF] text-[13px]">Replaced · $240.00</p>
            </motion.div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="h-[80px] bg-[#1E293B] border-t border-[#334155] flex justify-around items-center px-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#6B7280]" />
            <span className="text-[#6B7280] text-[11px] font-medium">Cars</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#3B82F6]" />
            <span className="text-[#3B82F6] text-[11px] font-medium">History</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[#6B7280]" />
            <span className="text-[#6B7280] text-[11px] font-medium">Settings</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
