'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpTransition } from '@/lib/motion';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageWrapper({ children, className, delay = 0 }: PageWrapperProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...fadeUpTransition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
