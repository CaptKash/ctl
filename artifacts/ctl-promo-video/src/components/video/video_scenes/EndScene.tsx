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
        padding: '48px 32px',
        boxSizing: 'border-box',
        gap: '32px',
      }}
    >
      {/* Logo */}
      <motion.img
        src={`${base}ctl-logo.png`}
        initial={{ opacity: 0, scale: 0.85, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
        style={{ width: '85%', maxWidth: '300px', borderRadius: '12px' }}
      />

      {/* Download now */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          color: '#F9FAFB',
          fontSize: '38px',
          fontWeight: 800,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          margin: 0,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        Download now.
      </motion.p>

      {/* Store badges */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          alignItems: 'center',
        }}
      >
        {/* App Store */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: '#000000',
          border: '1.5px solid #334155',
          borderRadius: '14px',
          padding: '14px 32px',
          width: '80%',
          maxWidth: '280px',
          justifyContent: 'center',
        }}>
          <svg width="26" height="30" viewBox="0 0 24 28" fill="none">
            <path d="M18.7 14.8c0-3.5 2.9-5.2 3-5.3-1.6-2.4-4.2-2.7-5.1-2.7-2.2-.2-4.2 1.3-5.3 1.3-1.1 0-2.8-1.2-4.6-1.2-2.4 0-4.6 1.4-5.8 3.5-2.5 4.3-.6 10.7 1.8 14.2 1.2 1.7 2.6 3.7 4.4 3.6 1.8-.1 2.4-1.1 4.6-1.1 2.1 0 2.7 1.1 4.6 1.1 1.9 0 3.1-1.7 4.3-3.5 1.4-2 1.9-3.9 1.9-4-.1 0-3.8-1.5-3.8-5.9z" fill="white"/>
            <path d="M15.3 4.9c1-1.2 1.6-2.9 1.4-4.6-1.4.1-3.1.9-4.1 2.1-.9 1-1.7 2.7-1.5 4.3 1.6.1 3.2-.8 4.2-1.8z" fill="white"/>
          </svg>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px', fontFamily: "'Inter', sans-serif", fontWeight: 500, lineHeight: 1 }}>Download on the</div>
            <div style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.2 }}>App Store</div>
          </div>
        </div>

        {/* Google Play */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: '#000000',
          border: '1.5px solid #334155',
          borderRadius: '14px',
          padding: '14px 32px',
          width: '80%',
          maxWidth: '280px',
          justifyContent: 'center',
        }}>
          <svg width="26" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M1.2 0.5C0.8 0.9 0.5 1.5 0.5 2.3v23.4c0 0.8 0.3 1.4 0.7 1.8l0.1 0.1 13.1-13.1v-0.3L1.2 0.5z" fill="#4FC3F7"/>
            <path d="M18.3 18.6l-4.4-4.4v-0.3l4.4-4.4 0.1 0.1 5.2 3c1.5 0.8 1.5 2.2 0 3L18.3 18.6z" fill="#FFCA28"/>
            <path d="M18.4 18.5L13.9 14 1.2 26.5c0.5 0.5 1.3 0.6 2.1 0.1l15.1-8.1" fill="#F44336"/>
            <path d="M18.4 9.5L3.3 1.4C2.5 0.9 1.7 1 1.2 1.5L13.9 14l4.5-4.5z" fill="#4CAF50"/>
          </svg>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#9CA3AF', fontSize: '11px', fontFamily: "'Inter', sans-serif", fontWeight: 500, lineHeight: 1 }}>Get it on</div>
            <div style={{ color: '#FFFFFF', fontSize: '20px', fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.2 }}>Google Play</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
