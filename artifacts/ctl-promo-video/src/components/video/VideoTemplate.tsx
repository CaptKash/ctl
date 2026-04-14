import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 4000, problem: 5000, solution: 5000, features: 6000, close: 5000 };

const scenePos = [
  { x: '10vw', y: '20vh', scale: 1.5, opacity: 0.15 },
  { x: '-20vw', y: '60vh', scale: 2, opacity: 0.1 },
  { x: '40vw', y: '40vh', scale: 1, opacity: 0.2 },
  { x: '10vw', y: '10vh', scale: 1.8, opacity: 0.12 },
  { x: '30vw', y: '70vh', scale: 1.2, opacity: 0.15 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A0F1D] flex items-center justify-center">
      {/* Fixed 9:16 Aspect Ratio Container for Instagram Reel */}
      <div 
        className="relative overflow-hidden shadow-2xl bg-[#0F1626]" 
        style={{
          width: 'min(56.25vh, 100vw)', // 9/16 = 0.5625
          aspectRatio: '9/16',
          maxHeight: '100vh'
        }}
      >
        {/* Persistent background layer */}
        <div className="absolute inset-0">
          <motion.div className="absolute w-[150vw] h-[150vw] rounded-full blur-[80px]"
            style={{ background: 'radial-gradient(circle, #1E3A8A, transparent 60%)' }}
            animate={{ 
              x: ['-20%', '10%', '-10%'], 
              y: ['-10%', '20%', '0%'], 
              scale: [1, 1.1, 0.9] 
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
          />
          <motion.div className="absolute w-[120vw] h-[120vw] rounded-full blur-[60px]"
            style={{ background: 'radial-gradient(circle, #0F766E, transparent 50%)' }}
            animate={{ 
              x: ['20%', '-20%', '10%'], 
              y: ['50%', '30%', '60%'],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} 
          />
        </div>

        {/* Persistent midground grid/tech layer */}
        <motion.div 
          className="absolute inset-0 z-0 opacity-10"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '8vw 8vw'
          }}
          animate={{
            y: [0, '8vw']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Persistent accent shapes */}
        <motion.div
          className="absolute w-[40vw] h-[40vw] rounded-full border border-[#3B82F6]/30 z-0"
          animate={{
            x: scenePos[currentScene]?.x || '10vw',
            y: scenePos[currentScene]?.y || '20vh',
            scale: scenePos[currentScene]?.scale || 1,
            opacity: scenePos[currentScene]?.opacity || 0.2,
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Scene Content */}
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="open" />}
          {currentScene === 1 && <Scene2 key="problem" />}
          {currentScene === 2 && <Scene3 key="solution" />}
          {currentScene === 3 && <Scene4 key="features" />}
          {currentScene === 4 && <Scene5 key="close" />}
        </AnimatePresence>
      </div>
    </div>
  );
}