'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, staggerItemTransition } from '@/lib/motion';

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerList({ children, className, stagger = 0.06 }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer(stagger)}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      transition={staggerItemTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
