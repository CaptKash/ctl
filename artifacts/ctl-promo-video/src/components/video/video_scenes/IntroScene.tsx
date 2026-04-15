import { motion } from 'framer-motion';

const words = [
  { text: 'Are', highlight: false },
  { text: 'you', highlight: false },
  { text: 'giving', highlight: false },
  { text: 'your', highlight: false },
  { text: 'car', highlight: true },
  { text: 'the', highlight: false },
  { text: 'attention', highlight: false },
  { text: 'it', highlight: false },
  { text: 'needs?', highlight: true },
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
        transition={{ delay: 3.8, duration: 0.7, ease: 'easeOut' }}
        style={{
          height: '3px',
          background: 'linear-gradient(to right, #3B82F6, #2DD4BF)',
          borderRadius: '2px',
          marginBottom: '28px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 4.5, duration: 0.55, ease: 'easeOut' }}
        style={{
          backgroundColor: '#1E3A8A',
          borderLeft: '4px solid #3B82F6',
          borderRadius: '10px',
          padding: '16px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{
          color: '#FFFFFF',
          fontSize: '30px',
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}>
          CTL helps you do that.
        </p>
      </motion.div>
    </motion.div>
  );
}
