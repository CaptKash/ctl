import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const base = import.meta.env.BASE_URL;

const screenshots = [
  { src: `${base}screenshots/dashboard.jpg`, label: 'Dashboard' },
  { src: `${base}screenshots/my_fleet.jpg`, label: 'My Fleet' },
  { src: `${base}screenshots/log_event.jpg`, label: 'Log Event' },
  { src: `${base}screenshots/generate_report.jpg`, label: 'Generate Report' },
  { src: `${base}screenshots/fault_log.jpg`, label: 'Fault Log' },
  { src: `${base}screenshots/history.jpg`, label: 'History' },
  { src: `${base}screenshots/tools.jpg`, label: 'Tools' },
];

const PAUSE_MS = 2500;

export default function CarouselScene() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= screenshots.length - 1) return;
    const t = setTimeout(() => setIndex(i => i + 1), PAUSE_MS);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        <motion.img
          key={index}
          src={screenshots[index].src}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{
            scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </AnimatePresence>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '7px',
        alignItems: 'center',
      }}>
        {screenshots.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === index ? 22 : 6,
              backgroundColor: i === index ? '#3B82F6' : 'rgba(255,255,255,0.35)',
            }}
            transition={{ duration: 0.3 }}
            style={{
              height: 6,
              borderRadius: 3,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
