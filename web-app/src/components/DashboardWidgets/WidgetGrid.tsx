/**
 * WidgetGrid Component
 * 
 * Simple list/stack layout for widgets (upgradeable to drag-and-drop later)
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface WidgetGridProps {
  children: ReactNode;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5
    }
  }
};

export const WidgetGrid: React.FC<WidgetGridProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6 ${className}`}
      role="region"
      aria-label="Dashboard widgets"
    >
      {children}
    </motion.div>
  );
};

