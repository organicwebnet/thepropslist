import { useState, useRef, useEffect, useCallback } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface UseContextMenuOptions {
  onOpen?: (position: ContextMenuPosition) => void;
  onClose?: () => void;
  longPressDelay?: number; // milliseconds for long press on mobile
  disabled?: boolean;
}

export interface UseContextMenuReturn {
  isOpen: boolean;
  position: ContextMenuPosition | null;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleClose: () => void;
  longPressHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

/**
 * Hook for handling contextual menus on both desktop (right-click) and mobile (long-press)
 * 
 * @param options Configuration options
 * @returns Menu state and event handlers
 */
export function useContextMenu(options: UseContextMenuOptions = {}): UseContextMenuReturn {
  const {
    onOpen,
    onClose,
    longPressDelay = 500, // Default 500ms for long press
    disabled = false,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  
  // Refs for long-press detection
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const handleOpen = useCallback((x: number, y: number) => {
    if (disabled) return;
    
    const pos = { x, y };
    setPosition(pos);
    setIsOpen(true);
    onOpen?.(pos);
  }, [disabled, onOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    onClose?.();
  }, [onClose]);

  // Handle right-click (desktop)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get position relative to viewport
    handleOpen(e.clientX, e.clientY);
  }, [disabled, handleOpen]);

  // Clear long-press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle touch start (mobile long-press detection)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchTarget.current = e.currentTarget;
    hasMoved.current = false;

    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current && touchStartPos.current) {
        // Long press detected - open menu
        handleOpen(touchStartPos.current.x, touchStartPos.current.y);
        clearLongPressTimer();
      }
    }, longPressDelay);
  }, [disabled, longPressDelay, handleOpen, clearLongPressTimer]);

  // Handle touch move (cancel long-press if user moves finger)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    // Calculate movement distance
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // If moved more than 10px, cancel long-press
    if (deltaX > 10 || deltaY > 10) {
      hasMoved.current = true;
      clearLongPressTimer();
    }
  }, [clearLongPressTimer]);

  // Handle touch end (cancel long-press if touch ends before delay)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();
    touchStartPos.current = null;
    hasMoved.current = false;
    touchTarget.current = null;
  }, [clearLongPressTimer]);

  // Handle touch cancel (same as touch end)
  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();
    touchStartPos.current = null;
    hasMoved.current = false;
    touchTarget.current = null;
  }, [clearLongPressTimer]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Don't close if clicking on the menu itself
      const target = e.target as HTMLElement;
      if (target.closest('[data-context-menu]')) {
        return;
      }
      handleClose();
    };

    // Use a small delay to avoid closing immediately when opening
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    isOpen,
    position,
    handleContextMenu,
    handleClose,
    longPressHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}

