import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;

export default function EndScene() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
        padding: '40px',
        boxSizing: 'border-box',
      }}
    >
      <motion.img
        src={`${base}ctl-logo.png`}
        initial={{ opacity: 0, scale: 0.82, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          width: '88%',
          maxWidth: '320px',
          borderRadius: '14px',
          marginBottom: '36px',
        }}
      />

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '72%' }}
        transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
        style={{
          height: '3px',
          background: 'linear-gradient(to right, #3B82F6, #2DD4BF)',
          borderRadius: '2px',
          marginBottom: '28px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        <p style={{
          color: '#9CA3AF',
          fontSize: '16px',
          fontWeight: 500,
          fontFamily: "'Inter', sans-serif",
          margin: '0 0 10px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          Now available on
        </p>
        <p style={{
          color: '#F9FAFB',
          fontSize: '28px',
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          lineHeight: 1.2,
        }}>
          App Store
        </p>
        <p style={{
          color: '#3B82F6',
          fontSize: '18px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          margin: '6px 0 0',
        }}>
          &amp; Google Play
        </p>
      </motion.div>
    </motion.div>
  );
}
