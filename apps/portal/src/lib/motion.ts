import type { Transition, Variants } from 'framer-motion';

export const spring = {
  crisp: { type: 'spring', stiffness: 380, damping: 30 } as Transition,
  soft:  { type: 'spring', stiffness: 120, damping: 20 } as Transition,
  slow:  { type: 'spring', stiffness: 60,  damping: 18 } as Transition,
};

export const ease = {
  premium: [0.23, 1, 0.32, 1] as [number, number, number, number],
  snap:    [0.16, 1, 0.3,  1] as [number, number, number, number],
};

export const duration = {
  fast:   0.18,
  normal: 0.28,
  slow:   0.45,
};

export const fadeUp: Variants = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0  },
  exit:     { opacity: 0, y: -8 },
};

export const fadeUpTransition: Transition = {
  type: 'spring', stiffness: 120, damping: 20,
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1    },
  exit:    { opacity: 0, scale: 0.97 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0   },
  exit:    { opacity: 0, x: -20 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0  },
  exit:    { opacity: 0, x: 20 },
};

export const staggerContainer = (stagger = 0.06): Variants => ({
  animate: {
    transition: { staggerChildren: stagger, delayChildren: 0.05 },
  },
});

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0  },
};

export const staggerItemTransition: Transition = {
  type: 'spring', stiffness: 120, damping: 20,
};

export const shakeX: Variants = {
  animate: { x: [0, -6, 6, -4, 4, -2, 2, 0] },
};

export const shakeTransition: Transition = {
  duration: 0.5, ease: 'easeInOut',
};

export const pulseOpacity: Variants = {
  animate: { opacity: [1, 0.55, 1] },
};

export const pulseTransition: Transition = {
  duration: 1.8, repeat: Infinity, ease: 'easeInOut',
};

export const expandHeight: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit:    { height: 0, opacity: 0 },
};

export const expandTransition: Transition = {
  type: 'spring', stiffness: 200, damping: 26,
};
