import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1900),
      setTimeout(() => setPhase(4), 2600),
      setTimeout(() => setPhase(5), 3300),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: "🔧", title: "Log Maintenance", detail: "Oil, brakes, tires" },
    { icon: "⚠️", title: "Track Faults", detail: "Dashboard warnings" },
    { icon: "📅", title: "Inspections", detail: "Automated reminders" },
    { icon: "📊", title: "Full History", detail: "Detailed service records" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center px-[8%]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ x: '-100%', opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
      >
        <div className="w-12 h-1 bg-[#0F766E] mb-4 rounded-full" />
        <h2 className="text-[8vw] font-bold text-white">Features</h2>
      </motion.div>

      <div className="flex flex-col gap-4">
        {features.map((f, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= i + 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="w-[12vw] h-[12vw] rounded-xl bg-[#3B82F6]/20 flex items-center justify-center text-[6vw]">
              {f.icon}
            </div>
            <div>
              <h3 className="text-[4.5vw] font-bold text-white leading-tight">{f.title}</h3>
              <p className="text-[3.5vw] text-[#94A3B8]">{f.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}