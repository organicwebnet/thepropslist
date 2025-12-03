/**
 * WidgetContainer Component
 * 
 * Base wrapper for all dashboard widgets with consistent styling and behavior
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, X } from 'lucide-react';
import type { WidgetContainerProps } from './types';

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4 }
  },
  hover: {
    scale: 1.01,
    transition: { duration: 0.2 }
  }
};

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widgetId: _widgetId, // Unused but kept for API consistency
  title,
  children,
  loading = false,
  error = null,
  className = '',
  onSettingsClick,
  onClose,
}) => {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`bg-pb-darker/50 backdrop-blur-sm rounded-2xl border border-pb-primary/20 ${className}`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-pb-primary/20">
        <h3 className="text-base md:text-lg font-semibold text-white truncate flex-1 min-w-0">{title}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 md:p-1.5 text-pb-gray hover:text-white hover:bg-pb-primary/20 rounded-lg transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center"
              title="Widget settings"
              aria-label="Widget settings"
              type="button"
            >
              <Settings2 className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 md:p-1.5 text-pb-gray hover:text-white hover:bg-pb-primary/20 rounded-lg transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center"
              title="Hide widget"
              aria-label="Hide widget"
              type="button"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 md:p-5 lg:p-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-pb-gray text-sm">Loading...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-400 text-sm">Error: {error}</div>
          </div>
        )}

        {!loading && !error && children}
      </div>
    </motion.div>
  );
};

