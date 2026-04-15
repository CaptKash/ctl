import { motion } from 'framer-motion';

const words = [
  { text: 'Does', highlight: false },
  { text: 'your', highlight: false },
  { text: 'car', highlight: false },
  { text: 'remember', highlight: false },
  { text: 'everything?', highlight: true },
];

export default function IntroScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 36px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px 14px',
        marginBottom: '36px',
      }}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.25, duration: 0.5, ease: 'easeOut' }}
            style={{
              fontSize: '58px',
              fontWeight: 800,
              lineHeight: 1.05,
              fontFamily: "'Inter', sans-serif",
              color: word.highlight ? '#3B82F6' : '#F9FAFB',
              display: 'block',
            }}
          >
            {word.text}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '72%' }}
        transition={{ delay: 1.4, duration: 0.7, ease: 'easeOut' }}
        style={{
          height: '3px',
          background: 'linear-gradient(to right, #3B82F6, #2DD4BF)',
          borderRadius: '2px',
          marginBottom: '24px',
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.5 }}
        style={{
          color: '#9CA3AF',
          fontSize: '22px',
          fontWeight: 500,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          margin: 0,
          letterSpacing: '0.01em',
        }}
      >
        CTL keeps the full record.
      </motion.p>
    </motion.div>
  );
}
