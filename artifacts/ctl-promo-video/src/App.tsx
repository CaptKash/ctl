import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE = import.meta.env.BASE_URL;

const SCENES = [
  { id: 'intro',      duration: 5000 },
  { id: 'tagline',    duration: 4000 },
  { id: 'maintenance',duration: 6000 },
  { id: 'faults',     duration: 6000 },
  { id: 'screenshot', duration: 6000 },
  { id: 'fleet',      duration: 7000 },
  { id: 'outro',      duration: 5000 },
];

const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

export default function App() {
  const [scene, setScene] = useState(0);
  const sceneRef = useRef(0);

  useEffect(() => {
    const t0 = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = (Date.now() - t0) % TOTAL;
      let acc = 0, idx = 0;
      for (let i = 0; i < SCENES.length; i++) {
        acc += SCENES[i].duration;
        if (elapsed < acc) { idx = i; break; }
      }
      if (idx !== sceneRef.current) { sceneRef.current = idx; setScene(idx); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const id = SCENES[scene].id;
  const progress = ((scene + 1) / SCENES.length) * 100;

  return (
    <div className="w-full h-screen flex items-center justify-center overflow-hidden" style={{ background: '#F0F2F5' }}>
      <div className="relative overflow-hidden shadow-2xl" style={{
        width: 'min(54vh, 100vw)',
        aspectRatio: '9/16',
        background: '#FFFFFF',
        borderRadius: 28,
      }}>
        {/* Progress bar */}
        <motion.div
          className="absolute top-0 left-0 h-[3px] z-50"
          style={{ background: '#2563EB' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'circOut' }}
        />

        {/* Persistent background orb — changes with scene */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: '60%', aspectRatio: '1', top: '-10%', right: '-10%' }}
          animate={{
            background: ['intro','tagline','screenshot','fleet','outro'].includes(id)
              ? 'radial-gradient(circle, #0F2557 0%, #1D3461 100%)'
              : 'radial-gradient(circle, #DBEAFE 0%, #EFF6FF 100%)',
            scale: id === 'intro' || id === 'outro' ? 1.2 : 0.9,
            opacity: id === 'tagline' ? 0.15 : 0.35,
          }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

        <AnimatePresence mode="wait">
          {id === 'intro'       && <SceneIntro       key="intro"       />}
          {id === 'tagline'     && <SceneTagline      key="tagline"     />}
          {id === 'maintenance' && <SceneMaintenance  key="maintenance" />}
          {id === 'faults'      && <SceneFaults       key="faults"      />}
          {id === 'screenshot'  && <SceneScreenshot   key="screenshot"  />}
          {id === 'fleet'       && <SceneFleet        key="fleet"       />}
          {id === 'outro'       && <SceneOutro        key="outro"       />}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Shared motion presets ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  transition: { delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
});

/* ─── Scene 1: Intro ─── */
function SceneIntro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1D3461 0%, #0F2045 100%)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.7 }}
    >
      <motion.img
        src={`${BASE}icon.png`}
        alt="CTL"
        style={{ width: '38%', borderRadius: 24 }}
        {...scaleIn(0.2)}
      />
      <motion.p
        style={{ color: '#93C5FD', fontSize: '3.5vw', marginTop: '4%', letterSpacing: '0.18em', fontWeight: 500 }}
        {...fadeUp(0.8)}
      >
        CAR TECHNICAL LOG
      </motion.p>
    </motion.div>
  );
}

/* ─── Scene 2: Tagline ─── */
function SceneTagline() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center px-[8%]"
      style={{ background: '#FFFFFF' }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.p style={{ color: '#9CA3AF', fontSize: '2.8vw', fontWeight: 500, letterSpacing: '0.12em', marginBottom: '3%' }} {...fadeUp(0.3)}>
        AVIATION-STYLE LOGBOOK
      </motion.p>
      <motion.h1 style={{ color: '#1D3461', fontSize: '8.5vw', fontWeight: 800, lineHeight: 1.1, marginBottom: '5%' }} {...fadeUp(0.5)}>
        Your car<br />has a history.
      </motion.h1>
      <motion.p style={{ color: '#2563EB', fontSize: '6.5vw', fontWeight: 700 }} {...fadeUp(0.8)}>
        Track it.
      </motion.p>

      {/* accent line */}
      <motion.div
        style={{ height: 3, background: 'linear-gradient(90deg, #2563EB, #20B2AA)', borderRadius: 2, marginTop: '8%' }}
        initial={{ width: 0 }} animate={{ width: '40%' }}
        transition={{ delay: 1.1, duration: 0.8, ease: 'circOut' }}
      />
    </motion.div>
  );
}

/* ─── Shared feature card row ─── */
function LogRow({ icon, title, detail, date, color, delay }: {
  icon: string; title: string; detail: string; date: string; color: string; delay: number;
}) {
  return (
    <motion.div
      style={{
        display: 'flex', alignItems: 'center', gap: '4%',
        background: '#FFFFFF', borderRadius: 14,
        padding: '3.5% 4%', marginBottom: '3%',
        boxShadow: '0 1px 8px rgba(29,52,97,0.08)',
        border: '1px solid #F1F5F9',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: 'circOut' }}
    >
      <div style={{
        width: '11%', aspectRatio: '1', borderRadius: 10,
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '3.5vw', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#1D3461', fontWeight: 600, fontSize: '3vw', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
        <p style={{ color: '#6B7280', fontSize: '2.4vw' }}>{detail}</p>
      </div>
      <p style={{ color: '#9CA3AF', fontSize: '2.2vw', flexShrink: 0 }}>{date}</p>
    </motion.div>
  );
}

/* ─── Scene 3: Maintenance Log ─── */
function SceneMaintenance() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#F8FAFD', padding: '7%' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
    >
      <motion.p style={{ color: '#9CA3AF', fontSize: '2.5vw', fontWeight: 500, letterSpacing: '0.1em', marginBottom: '2%' }} {...fadeUp(0.1)}>
        LOG EVERY SERVICE
      </motion.p>
      <motion.h2 style={{ color: '#1D3461', fontSize: '6.5vw', fontWeight: 800, marginBottom: '6%' }} {...fadeUp(0.25)}>
        Maintenance Log
      </motion.h2>

      <LogRow icon="🔧" title="Oil Change" detail="5W-30 · 5,000 km interval" date="Mar 15" color="#DBEAFE" delay={0.4} />
      <LogRow icon="⚙️" title="Timing Belt" detail="Replaced at 98,000 km" date="Jan 02" color="#EDE9FE" delay={0.6} />
      <LogRow icon="🛞" title="Tire Rotation" detail="All four · Balanced" date="Dec 20" color="#D1FAE5" delay={0.8} />
      <LogRow icon="🔋" title="Battery" detail="12V AGM · 80Ah" date="Nov 11" color="#FEF3C7" delay={1.0} />

      <motion.div
        style={{ height: 3, background: 'linear-gradient(90deg, #2563EB, #20B2AA)', borderRadius: 2, marginTop: 'auto' }}
        initial={{ width: 0 }} animate={{ width: '35%' }}
        transition={{ delay: 1.2, duration: 0.8, ease: 'circOut' }}
      />
    </motion.div>
  );
}

/* ─── Scene 4: Fault Records ─── */
function SceneFaults() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#F8FAFD', padding: '7%' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
    >
      <motion.p style={{ color: '#9CA3AF', fontSize: '2.5vw', fontWeight: 500, letterSpacing: '0.1em', marginBottom: '2%' }} {...fadeUp(0.1)}>
        TRACK EVERY ISSUE
      </motion.p>
      <motion.h2 style={{ color: '#1D3461', fontSize: '6.5vw', fontWeight: 800, marginBottom: '6%' }} {...fadeUp(0.25)}>
        Fault Records
      </motion.h2>

      <LogRow icon="⚠️" title="Check Engine" detail="P0420 · Catalyst Below Threshold" date="Mar 20" color="#FEE2E2" delay={0.4} />
      <LogRow icon="🌡️" title="Overheating" detail="Coolant low · Resolved" date="Feb 08" color="#FFEDD5" delay={0.6} />
      <LogRow icon="💡" title="ABS Warning" detail="Sensor fault · Front left" date="Jan 17" color="#FEF3C7" delay={0.8} />
      <LogRow icon="🔊" title="Knocking" detail="Fuel quality issue · Resolved" date="Dec 30" color="#F3E8FF" delay={1.0} />

      <motion.div
        style={{ height: 3, background: 'linear-gradient(90deg, #EF4444, #F97316)', borderRadius: 2, marginTop: 'auto' }}
        initial={{ width: 0 }} animate={{ width: '35%' }}
        transition={{ delay: 1.2, duration: 0.8, ease: 'circOut' }}
      />
    </motion.div>
  );
}

/* ─── Scene 5: Real Screenshot ─── */
function SceneScreenshot() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1D3461 0%, #0F2045 100%)', padding: '6%' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
    >
      <motion.p
        style={{ color: '#93C5FD', fontSize: '2.8vw', fontWeight: 500, letterSpacing: '0.12em', marginBottom: '5%' }}
        {...fadeUp(0.2)}
      >
        CLEAN · FAST · RELIABLE
      </motion.p>

      <motion.div
        style={{
          width: '72%',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,255,255,0.12)',
        }}
        {...scaleIn(0.4)}
      >
        <img
          src={`${BASE}screen_signin.png`}
          alt="CTL app screenshot"
          style={{ width: '100%', display: 'block' }}
        />
      </motion.div>

      <motion.p
        style={{ color: 'rgba(255,255,255,0.6)', fontSize: '2.8vw', marginTop: '5%', textAlign: 'center' }}
        {...fadeUp(1.0)}
      >
        Built for drivers who care.
      </motion.p>
    </motion.div>
  );
}

/* ─── Scene 6: Fleet ─── */
function SceneFleet() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1D3461 0%, #0F2045 100%)', padding: '7%' }}
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.64, 0, 0.13, 1] }}
    >
      <motion.div
        style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '2.5% 6%',
          marginBottom: '4%',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
        {...scaleIn(0.6)}
      >
        <span style={{ color: '#93C5FD', fontSize: '2.5vw', fontWeight: 600, letterSpacing: '0.15em' }}>PREMIUM</span>
      </motion.div>

      <motion.h2
        style={{ color: '#FFFFFF', fontSize: '9vw', fontWeight: 800, textAlign: 'center', lineHeight: 1.05, marginBottom: '3%' }}
        {...fadeUp(0.8)}
      >
        CTL Fleet
      </motion.h2>

      <motion.div
        style={{ height: 3, background: 'linear-gradient(90deg, #2563EB, #20B2AA)', width: '40%', borderRadius: 2, marginBottom: '8%' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
      />

      {[
        { label: 'Monthly', price: '$2.99', sub: 'per month' },
        { label: 'Annual', price: '$19.99', sub: 'per year · Best value' },
        { label: 'Lifetime', price: '$24.99', sub: 'one-time purchase' },
      ].map((p, i) => (
        <motion.div
          key={p.label}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: i === 1 ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.06)',
            border: i === 1 ? '1px solid rgba(37,99,235,0.5)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '3.5% 5%', marginBottom: '3%',
          }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 + i * 0.15, duration: 0.5, ease: 'circOut' }}
        >
          <div>
            <p style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '3.2vw' }}>{p.label}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '2.4vw' }}>{p.sub}</p>
          </div>
          <p style={{ color: i === 1 ? '#60A5FA' : '#FFFFFF', fontWeight: 700, fontSize: '4vw' }}>{p.price}</p>
        </motion.div>
      ))}

      <motion.p
        style={{ color: 'rgba(255,255,255,0.4)', fontSize: '2.4vw', marginTop: '3%', textAlign: 'center' }}
        {...fadeUp(1.7)}
      >
        Unlimited vehicles · All features
      </motion.p>
    </motion.div>
  );
}

/* ─── Scene 7: Outro ─── */
function SceneOutro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1D3461 0%, #0F2045 100%)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
    >
      <motion.img
        src={`${BASE}icon.png`}
        alt="CTL"
        style={{ width: '30%', borderRadius: 22, marginBottom: '6%' }}
        {...scaleIn(0.3)}
      />

      <motion.p style={{ color: '#FFFFFF', fontSize: '9vw', fontWeight: 800, letterSpacing: '-0.02em' }} {...fadeUp(0.6)}>
        CTL
      </motion.p>
      <motion.p style={{ color: '#93C5FD', fontSize: '3vw', fontWeight: 500, letterSpacing: '0.12em', marginBottom: '10%' }} {...fadeUp(0.8)}>
        CAR TECHNICAL LOG
      </motion.p>

      <motion.div
        style={{
          background: '#FFFFFF',
          color: '#1D3461',
          borderRadius: 14,
          padding: '3.5% 8%',
          display: 'flex', alignItems: 'center', gap: '3%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        {...scaleIn(1.1)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1D3461">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <div>
          <p style={{ fontSize: '2vw', fontWeight: 400, opacity: 0.6, lineHeight: 1 }}>Download on the</p>
          <p style={{ fontSize: '3.5vw', fontWeight: 700, lineHeight: 1.2 }}>App Store</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
