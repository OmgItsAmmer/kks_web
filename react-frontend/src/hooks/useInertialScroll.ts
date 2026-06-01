import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

/** Shared instance survives React StrictMode double-mount in dev. */
let sharedLenis: Lenis | null = null;
let consumerCount = 0;

function shouldUseSmoothScroll(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createLenis(): Lenis {
  return new Lenis({
    autoRaf: true,
    // Slightly higher lerp = less lag between frames, fewer subpixel repaint artifacts
    lerp: 0.12,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1,
    // syncTouch causes jitter/flicker on many browsers; native touch scroll is smoother here
    syncTouch: false,
    // DOM tree walks on every wheel event — disable; use data-lenis-prevent on nested scrollers
    allowNestedScroll: false,
    stopInertiaOnNavigate: true,
    overscroll: true,
    prevent: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      return Boolean(
        node.closest('[data-lenis-prevent]') ||
          node.closest('[data-lenis-prevent-wheel]') ||
          node.closest('[data-lenis-prevent-touch]')
      );
    },
  });
}

function acquireLenis(): Lenis {
  if (!sharedLenis) {
    sharedLenis = createLenis();
  }
  consumerCount += 1;
  return sharedLenis;
}

function releaseLenis(): void {
  consumerCount -= 1;
  if (consumerCount <= 0 && sharedLenis) {
    sharedLenis.destroy();
    sharedLenis = null;
    consumerCount = 0;
  }
}

/**
 * Smooth inertial scrolling via Lenis.
 * Uses a module singleton to avoid StrictMode init/destroy flicker in development.
 */
export function useInertialScroll() {
  const location = useLocation();

  useEffect(() => {
    if (!shouldUseSmoothScroll()) {
      return;
    }

    acquireLenis();

    return () => {
      releaseLenis();
    };
  }, []);

  useEffect(() => {
    const lenis = sharedLenis;
    if (!lenis) return;

    lenis.scrollTo(0, { immediate: true, force: true });

    const resizeFrame = requestAnimationFrame(() => {
      lenis.resize();
    });

    return () => cancelAnimationFrame(resizeFrame);
  }, [location.pathname]);
}
