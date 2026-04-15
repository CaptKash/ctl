import { AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import IntroScene from './video_scenes/IntroScene';
import CarouselScene from './video_scenes/CarouselScene';
import EndScene from './video_scenes/EndScene';

const SCENE_DURATIONS = {
  intro: 5500,
  carousel: 19000,
  endcard: 5000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 'min(100vw, calc(100vh * 9 / 16))',
        height: 'min(100vh, calc(100vw * 16 / 9))',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0F172A',
      }}>
        <AnimatePresence mode="wait">
          {currentScene === 0 && <IntroScene key="intro" />}
          {currentScene === 1 && <CarouselScene key="carousel" />}
          {currentScene === 2 && <EndScene key="end" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
