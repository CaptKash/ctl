import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 5000, home: 7000, timeline: 7000, faults: 5000, close: 4000 };

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0F172A] flex items-center justify-center font-sans">
      <div 
        className="relative overflow-hidden bg-[#0F172A]" 
        style={{
          width: 'min(56.25vh, 100vw)', 
          aspectRatio: '9/16',
          maxHeight: '100vh'
        }}
      >
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="open" />}
          {currentScene === 1 && <Scene2 key="home" />}
          {currentScene === 2 && <Scene3 key="timeline" />}
          {currentScene === 3 && <Scene4 key="faults" />}
          {currentScene === 4 && <Scene5 key="close" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
