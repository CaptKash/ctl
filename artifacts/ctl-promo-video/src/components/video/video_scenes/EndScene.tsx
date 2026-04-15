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
        gap: '0px',
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
          marginBottom: '40px',
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          color: '#F9FAFB',
          fontSize: '36px',
          fontWeight: 800,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          margin: '0 0 36px',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        Download CTL now.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        style={{
          color: '#9CA3AF',
          fontSize: '15px',
          fontWeight: 500,
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          margin: '0 0 18px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        Available on
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          alignItems: 'center',
        }}
      >
        {/* App Store badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#000',
          border: '1.5px solid #374151',
          borderRadius: '12px',
          padding: '12px 28px',
          width: '80%',
          maxWidth: '280px',
          justifyContent: 'center',
        }}>
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M18.7 14.8c0-3.5 2.9-5.2 3-5.3-1.6-2.4-4.2-2.7-5.1-2.7-2.2-.2-4.2 1.3-5.3 1.3-1.1 0-2.8-1.2-4.6-1.2-2.4 0-4.6 1.4-5.8 3.5-2.5 4.3-.6 10.7 1.8 14.2 1.2 1.7 2.6 3.7 4.4 3.6 1.8-.1 2.4-1.1 4.6-1.1 2.1 0 2.7 1.1 4.6 1.1 1.9 0 3.1-1.7 4.3-3.5 1.4-2 1.9-3.9 1.9-4-.1 0-3.8-1.5-3.8-5.9z" fill="white"/>
            <path d="M15.3 4.9c1-1.2 1.6-2.9 1.4-4.6-1.4.1-3.1.9-4.1 2.1-0.9 1-1.7 2.7-1.5 4.3 1.6.1 3.2-.8 4.2-1.8z" fill="white"/>
          </svg>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: '10px', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Download on the</div>
            <div style={{ color: '#FFFFFF', fontSize: '18px', fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.1 }}>App Store</div>
          </div>
        </div>

        {/* Google Play badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#000',
          border: '1.5px solid #374151',
          borderRadius: '12px',
          padding: '12px 28px',
          width: '80%',
          maxWidth: '280px',
          justifyContent: 'center',
        }}>
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M1.2 0.5C0.8 0.9 0.5 1.5 0.5 2.3v23.4c0 0.8 0.3 1.4 0.7 1.8l0.1 0.1 13.1-13.1v-0.3L1.2 0.5z" fill="#4FC3F7"/>
            <path d="M18.3 18.6l-4.4-4.4v-0.3l4.4-4.4 0.1 0.1 5.2 3c1.5 0.8 1.5 2.2 0 3L18.3 18.6z" fill="#FFCA28"/>
            <path d="M18.4 18.5L13.9 14 1.2 26.5c0.5 0.5 1.3 0.6 2.1 0.1l15.1-8.1" fill="#F44336"/>
            <path d="M18.4 9.5L3.3 1.4C2.5 0.9 1.7 1 1.2 1.5L13.9 14l4.5-4.5z" fill="#4CAF50"/>
          </svg>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: '10px', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Get it on</div>
            <div style={{ color: '#FFFFFF', fontSize: '18px', fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.1 }}>Google Play</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
