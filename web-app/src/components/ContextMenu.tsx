import React, { useEffect, useRef, useCallback } from 'react';
import { ContextMenuPosition } from '../hooks/useContextMenu';

export type ContextMenuItem = 
  | {
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
      separator?: false;
    }
  | {
      separator: true;
    };

export interface ContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

/**
 * ContextMenu component that displays a menu at a specific position
 * Automatically positions itself to stay within viewport bounds
 */
// Constants for viewport positioning
const VIEWPORT_PADDING = 10; // px padding from viewport edges
const MIN_TOUCH_TARGET = 44; // px minimum touch target size

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState<ContextMenuPosition | null>(position);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedIndex = useRef<number>(-1);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!isOpen || !position || !menuRef.current) {
      setAdjustedPosition(position);
      return;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - VIEWPORT_PADDING;
    }
    if (x < 0) {
      x = VIEWPORT_PADDING;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - VIEWPORT_PADDING;
    }
    if (y < 0) {
      y = VIEWPORT_PADDING;
    }

    setAdjustedPosition({ x, y });
  }, [isOpen, position]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const enabledItems = items.filter(item => !('separator' in item) && !item.disabled);
    const enabledIndices: number[] = [];
    let currentIndex = 0;
    
    items.forEach((item, idx) => {
      if (!('separator' in item) && !item.disabled) {
        enabledIndices.push(idx);
        if (idx === focusedIndex.current) {
          currentIndex = enabledIndices.length - 1;
        }
      }
    });

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (enabledIndices.length > 0) {
          const nextIndex = (currentIndex + 1) % enabledIndices.length;
          focusedIndex.current = enabledIndices[nextIndex];
          menuItemRefs.current[focusedIndex.current]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (enabledIndices.length > 0) {
          const prevIndex = currentIndex === 0 ? enabledIndices.length - 1 : currentIndex - 1;
          focusedIndex.current = enabledIndices[prevIndex];
          menuItemRefs.current[focusedIndex.current]?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex.current >= 0 && menuItemRefs.current[focusedIndex.current]) {
          menuItemRefs.current[focusedIndex.current]?.click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Home':
        e.preventDefault();
        if (enabledIndices.length > 0) {
          focusedIndex.current = enabledIndices[0];
          menuItemRefs.current[focusedIndex.current]?.focus();
        }
        break;
      case 'End':
        e.preventDefault();
        if (enabledIndices.length > 0) {
          focusedIndex.current = enabledIndices[enabledIndices.length - 1];
          menuItemRefs.current[focusedIndex.current]?.focus();
        }
        break;
    }
  }, [items, onClose]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && menuItemRefs.current.length > 0) {
      const firstEnabledIndex = items.findIndex(item => !('separator' in item) && !item.disabled);
      if (firstEnabledIndex >= 0) {
        focusedIndex.current = firstEnabledIndex;
        setTimeout(() => {
          menuItemRefs.current[firstEnabledIndex]?.focus();
        }, 0);
      }
    }
  }, [isOpen, items]);

  if (!isOpen || !adjustedPosition) {
    return null;
  }

  return (
    <>
      {/* Backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onTouchStart={onClose}
        aria-hidden="true"
        aria-label="Close context menu"
      />
      {/* Menu */}
      <div
        ref={menuRef}
        data-context-menu
        className={`fixed z-50 bg-pb-darker border border-white/20 rounded-lg shadow-xl py-1 min-w-[160px] ${className}`}
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
        role="menu"
        aria-label="Context menu"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {items.map((item, index) => {
          if ('separator' in item && item.separator) {
            return (
              <div
                key={`separator-${index}`}
                className="my-1 border-t border-white/10"
                role="separator"
              />
            );
          }

          if (!('label' in item) || !('onClick' in item)) {
            return null;
          }

          return (
            <button
              key={index}
              ref={(el) => {
                menuItemRefs.current[index] = el;
              }}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              onFocus={() => {
                focusedIndex.current = index;
              }}
              disabled={item.disabled}
              className={`
                w-full px-4 py-3 text-left text-sm flex items-center gap-2
                transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary focus:ring-offset-2 focus:ring-offset-pb-darker
                ${item.disabled 
                  ? 'text-pb-gray/40 cursor-not-allowed' 
                  : item.danger
                    ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300 active:bg-red-500/30'
                    : 'text-white hover:bg-white/10 active:bg-white/20'
                }
              `}
              role="menuitem"
              aria-disabled={item.disabled}
              style={{
                minHeight: `${MIN_TOUCH_TARGET}px`,
              }}
            >
              {item.icon && <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

