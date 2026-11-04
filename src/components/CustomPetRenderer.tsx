import { useEffect, useRef } from 'react';
import type {
  AnimationManifest,
  AnimationState,
} from '../animation/types';
import { timingForState } from '../animation/types';

export interface CustomPetRendererProps {
  frames: HTMLCanvasElement[];
  manifest: AnimationManifest;
  animation: AnimationState;
  reducedMotion: boolean;
  label: string;
  className?: string;
  loopOverride?: boolean;
}

export function CustomPetRenderer({
  frames,
  manifest,
  animation,
  reducedMotion,
  label,
  className,
  loopOverride,
}: CustomPetRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) {
      return;
    }

    canvas.width = manifest.frameWidth;
    canvas.height = manifest.frameHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const timing = timingForState(animation, manifest);
    const loop = loopOverride ?? timing.loop;
    let animationFrame = 0;
    let start = performance.now();
    let lastIndex = -1;

    const draw = (index: number) => {
      const frame = frames[index];
      if (!frame) {
        return;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frame, 0, 0, canvas.width, canvas.height);
    };

    if (reducedMotion) {
      draw(0);
      return;
    }

    const tick = (now: number) => {
      const elapsed = now - start;
      let index = Math.floor(elapsed / timing.frameDurationMs);
      if (loop) {
        index %= frames.length;
      } else {
        index = Math.min(index, frames.length - 1);
      }

      if (index !== lastIndex) {
        draw(index);
        lastIndex = index;
      }

      if (loop || index < frames.length - 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    draw(0);
    animationFrame = window.requestAnimationFrame(tick);

    const onVisibilityChange = () => {
      window.cancelAnimationFrame(animationFrame);
      if (document.visibilityState === 'visible') {
        start = performance.now();
        lastIndex = -1;
        draw(0);
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [animation, frames, loopOverride, manifest, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={['custom-pet-renderer', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    />
  );
}
