import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: React.ReactNode;
  className?: string;
}

export function HelpTooltip({ content, className = '' }: HelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTooltip && tooltipRef.current && iconRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const iconRect = iconRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Start with default position (to the right of the icon)
      let left = iconRect.width + 8; // 8px gap between icon and tooltip
      let top = -(tooltipRect.height / 2) + (iconRect.height / 2); // Vertically center with icon

      // Check horizontal overflow
      if (iconRect.right + tooltipRect.width + 8 > viewportWidth) {
        // Position to the left of the icon if it would overflow right
        left = -(tooltipRect.width + 8);
      }

      // Check vertical overflow
      if (iconRect.top + top < 0) {
        // Prevent overflow at the top
        top = -iconRect.top;
      } else if (iconRect.top + top + tooltipRect.height > viewportHeight) {
        // Prevent overflow at the bottom
        top = viewportHeight - iconRect.top - tooltipRect.height;
      }

      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`
      });
    }
  }, [showTooltip]);

  return (
    <div className={`relative inline-flex ${className}`} ref={iconRef}>
      <HelpCircle 
        className="h-4 w-4 text-[var(--text-secondary)] cursor-help hover:text-[var(--highlight-color)]"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className="absolute z-50 w-64 p-3 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg"
          style={tooltipStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
} 