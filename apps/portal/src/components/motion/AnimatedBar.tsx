'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ease, duration } from '@/lib/motion';

interface AnimatedBarProps {
  pct: number;
  className?: string;
  delay?: number;
}

export function AnimatedBar({ pct, className, delay = 0 }: AnimatedBarProps) {
  return (
    <motion.div
      className={className}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      transition={{
        duration: duration.slow,
        ease: ease.premium,
        delay,
      }}
    />
  );
}
