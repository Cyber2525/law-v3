import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

export interface PulldownMenuItem<T = string> {
  id: T;
  type?: 'item';
  label: string;
  icon?: React.ReactNode;
  showCheck?: boolean; // whether to show the checkmark when selected (default: true)
  alignWithCheck?: boolean; // whether to align text with check-enabled items (default: true)
  labelClass?: string; // custom classes like text-red-500
  iconClass?: string;  // custom classes for the icon
  keepOpenOnClick?: boolean; // if true, clicking the item doesn't automatically close the menu (default: false)
}

export interface PulldownMenuSeparator {
  id: string; // unique key for react rendering
  type: 'separator';
}

export interface PulldownMenuBigSeparator {
  id: string; // unique key for react rendering
  type: 'big-separator';
}

export type PulldownMenuOption<T = string> = 
  | PulldownMenuItem<T> 
  | PulldownMenuSeparator 
  | PulldownMenuBigSeparator;

export interface PulldownMenuProps<T = string> {
  isVisible?: boolean;
  options: PulldownMenuOption<T>[];
  onSelect: (id: T) => void;
  selectedId?: T;
  renderTrigger?: (props: {
    isOpen: boolean;
    buttonRef: React.RefObject<HTMLButtonElement>;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: () => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onTouchEnd?: (e: React.TouchEvent) => void;
    onTouchCancel?: () => void;
  }) => React.ReactNode;
}

export function PulldownMenu<T extends string = string>({
  isVisible = true,
  options,
  onSelect,
  selectedId,
  renderTrigger
}: PulldownMenuProps<T>) {
  // Animation states
  const [isOpen, setIsOpen] = useState(false);        // User intent (Open/Closed)
  const [isMounted, setIsMounted] = useState(false);  // DOM presence
  const [isVisibleState, setIsVisibleState] = useState(false);  // CSS opacity/scale trigger
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  // Interaction & Selection State
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [isInitialDragActive, setIsInitialDragActive] = useState(false);

  // iOS Style Drag Scaling State
  const [dragScale, setDragScale] = useState(1.0);
  const [isPointerActive, setIsPointerActive] = useState(false);

  const isDragging = isPointerActive || isInitialDragActive;
  const isScalingActive = dragScale < 0.999;

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);
  const justFinishedTouchDragRef = useRef(false);

  const activePointerIdRef = useRef<number | null>(null);
  const targetDragScaleRef = useRef(1.0);
  const currentDragScaleRef = useRef(1.0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const initialClickPosRef = useRef<{ x: number; y: number } | null>(null);
  const initialClickDistanceRef = useRef<number | null>(null);
  const openTimeRef = useRef<number>(0);

  // States and refs for tracking slide actions and pressed state of blue trigger button
  const [isTriggerPressed, setIsTriggerPressed] = useState(false);
  const isTriggerPressedRef = useRef(false);
  const setTriggerPressed = (val: boolean) => {
    setIsTriggerPressed(val);
    isTriggerPressedRef.current = val;
  };
  const triggerCleanupRef = useRef<(() => void) | null>(null);

  const cleanupTriggerTracking = () => {
    if (triggerCleanupRef.current) {
      triggerCleanupRef.current();
      triggerCleanupRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (triggerCleanupRef.current) {
        triggerCleanupRef.current();
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const openMenu = () => {
    if (isOpen) return;
    window.history.pushState({ ...window.history.state, debugMenu: true }, '');
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.top + 40,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(true);
  };

  const closeMenu = () => {
    if (window.history.state?.debugMenu) {
      window.history.back();
    } else {
      setIsOpen(false);
    }
  };

  // --- Haptic Feedback Helper ---
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); 
    }
  };

  const executeAction = (id: string) => {
    onSelect(id as T);
    const clickedOpt = options.find(
      (o) => o.type !== 'separator' && o.type !== 'big-separator' && o.id === id
    ) as PulldownMenuItem<T> | undefined;

    if (clickedOpt && clickedOpt.keepOpenOnClick) {
      return;
    }
    closeMenu();
  };

  // --- Unified iOS Style Pointer Tracking & Drag Selection ---
  useEffect(() => {
    if (!isOpen) {
      setDragScale(1.0);
      setIsPointerActive(false);
      targetDragScaleRef.current = 1.0;
      currentDragScaleRef.current = 1.0;
      if (!isTriggerPressedRef.current) {
        initialClickPosRef.current = null;
        initialClickDistanceRef.current = null;
      }
      activePointerIdRef.current = null;
      return;
    }

    let animationFrameId: number;

    const updateScale = () => {
      const elapsed = performance.now() - openTimeRef.current;

      if ((isPointerActive || isInitialDragActive) && lastPointerPosRef.current && menuRef.current && (menuPos.top !== 0 || menuPos.right !== 0)) {
        const { x, y } = lastPointerPosRef.current;
        const unscaledHeight = menuRef.current.scrollHeight;
        const rEdge = window.innerWidth - menuPos.right;
        const lEdge = rEdge - 250;
        const tEdge = menuPos.top;
        const bEdge = tEdge + unscaledHeight;

        // Distance from current pointer position to the resting menu's unscaled bounding rect
        const dx = Math.max(lEdge - x, 0, x - rEdge);
        const dy = Math.max(tEdge - y, 0, y - bEdge);
        const distanceFromMenu = Math.sqrt(dx * dx + dy * dy);

        // Lazily calculate and cache the initial click distance from the menu bounding rect
        if (initialClickDistanceRef.current === null && initialClickPosRef.current) {
          const ix = initialClickPosRef.current.x;
          const iy = initialClickPosRef.current.y;
          const idx = Math.max(lEdge - ix, 0, ix - rEdge);
          const idy = Math.max(tEdge - iy, 0, iy - bEdge);
          initialClickDistanceRef.current = Math.sqrt(idx * idx + idy * idy);
        }

        const initialDist = initialClickDistanceRef.current || 0;
        const distance = Math.max(0, distanceFromMenu - initialDist);

        // Sinusoidal decay curve that hits a firm minScale at d_control, making the absolute limit less spongy/soft
        const minScale = 0.80;
        const d_control = 85;
        const normDistance = Math.min(1.0, distance / d_control);
        const calculatedScale = 1.0 - (1.0 - minScale) * Math.sin(normDistance * Math.PI / 2);

        // Let the opening spring entrance bounce finish completely untouched at full scale.
        // Lock to exactly 1.0 until 120ms (letting the primary overshoot bounce happen), then
        // smoothly blend to the calculated target scale over 80ms using a C2-continuous smoothstep.
        let blendFactor = 0;
        if (elapsed > 120) {
          const t = Math.min((elapsed - 120) / 80, 1.0);
          blendFactor = t * t * (3 - 2 * t); // smoothstep ease-in-out
        }
        
        const targetScale = 1.0 + (calculatedScale - 1.0) * blendFactor;
        targetDragScaleRef.current = targetScale;
      } else if (!isPointerActive && !isInitialDragActive) {
        targetDragScaleRef.current = 1.0;
        initialClickPosRef.current = null;
        initialClickDistanceRef.current = null;
      }

      // Smooth damping interpolation for fluid scale transitions with a protective dynamic cushion
      const target = targetDragScaleRef.current;
      const current = currentDragScaleRef.current;
      const diff = target - current;
      if (Math.abs(diff) > 0.0001) {
        // Unified damping factor of 0.22 for both shrinking and expanding to ensure a soft but fast-stabilizing cushion
        const factor = 0.22;
        let step = diff * factor;
        if (target > current) {
          const maxStep = 0.018; // Slightly faster constant velocity limit when returning to full size
          if (step > maxStep) {
            step = maxStep;
          }
        }
        const next = current + step;
        currentDragScaleRef.current = next;
        setDragScale(next);
      } else if (current !== target) {
        currentDragScaleRef.current = target;
        setDragScale(target);
      }

      animationFrameId = requestAnimationFrame(updateScale);
    };

    animationFrameId = requestAnimationFrame(updateScale);

    const handleWindowPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const target = e.target as HTMLElement;
      const isOnMenu = menuRef.current?.contains(target);
      const isOnTrigger = buttonRef.current?.contains(target);
      if (isOnMenu || isOnTrigger) {
        activePointerIdRef.current = e.pointerId;
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
        initialClickPosRef.current = { x: e.clientX, y: e.clientY };
        initialClickDistanceRef.current = null;
        setIsPointerActive(true);
        targetDragScaleRef.current = 1.0;

        if (isOnMenu) {
          const button = target.closest('button[data-option-id]');
          if (button) {
            const id = button.getAttribute('data-option-id');
            if (id) {
              setHighlightedId(id);
              triggerHaptic();
            }
          }
        }
      }
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

      if (isInitialDragActive || isSliding) {
        // Find element under point for drag-to-highlight selection
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const button = element?.closest('button[data-option-id]');
        
        if (button) {
          const id = button.getAttribute('data-option-id');
          if (id && id !== highlightedId) {
            setHighlightedId(id);
            triggerHaptic();
          }
        } else {
          if (highlightedId !== null) setHighlightedId(null);
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
        return;
      }
      if (isInitialDragActive && highlightedId) {
        executeAction(highlightedId);
      }
      setIsPointerActive(false);
      setIsInitialDragActive(false);
      setIsSliding(false);
      setHighlightedId(null);
      initialClickPosRef.current = null;
      initialClickDistanceRef.current = null;
      activePointerIdRef.current = null;
    };

    const handleWindowTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isOnMenu = menuRef.current?.contains(target);
      const isOnTrigger = buttonRef.current?.contains(target);
      if (isOnMenu || isOnTrigger) {
        const touch = e.touches[0];
        lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
        initialClickPosRef.current = { x: touch.clientX, y: touch.clientY };
        initialClickDistanceRef.current = null;
        setIsPointerActive(true);
        targetDragScaleRef.current = 1.0;

        if (isOnMenu) {
          const button = target.closest('button[data-option-id]');
          if (button) {
            const id = button.getAttribute('data-option-id');
            if (id) {
              setHighlightedId(id);
              triggerHaptic();
              setIsSliding(true);
            }
          }
        }
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (isPointerActive && !isSliding) {
        setIsSliding(true);
      }

      if (isInitialDragActive || isSliding || isPointerActive) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }

      if (isInitialDragActive || isSliding) {
        // Find element under point for drag-to-highlight selection
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const button = element?.closest('button[data-option-id]');
        
        if (button) {
          const id = button.getAttribute('data-option-id');
          if (id && id !== highlightedId) {
            setHighlightedId(id);
            triggerHaptic();
          }
        } else {
          if (highlightedId !== null) setHighlightedId(null);
        }
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      const wasDragOrSliding = isInitialDragActive || isSliding;
      if (isInitialDragActive && highlightedId) {
        executeAction(highlightedId);
      } else if (isSliding && highlightedId) {
        executeAction(highlightedId);
      }
      if (wasDragOrSliding) {
        justFinishedTouchDragRef.current = true;
        setTimeout(() => {
          justFinishedTouchDragRef.current = false;
        }, 150);
      }
      setIsPointerActive(false);
      setIsInitialDragActive(false);
      setIsSliding(false);
      setHighlightedId(null);
      initialClickPosRef.current = null;
      initialClickDistanceRef.current = null;
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    window.addEventListener('touchstart', handleWindowTouchStart);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);

      window.removeEventListener('touchstart', handleWindowTouchStart);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isOpen, isPointerActive, isInitialDragActive, isSliding, highlightedId, menuPos, executeAction, isTriggerPressed]);

  // --- History Management for Menu ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.debugMenu) {
        setIsOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);



  // Close menu if parent visibility is disabled
  useEffect(() => {
    if (!isVisible && isOpen) {
      closeMenu();
    }
  }, [isVisible]);

  // --- Animation Lifecycle ---
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = performance.now();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.top + 40,
          right: window.innerWidth - rect.right
        });
      }
      setIsMounted(true);
      setHighlightedId(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisibleState(true);
        });
      });
    } else {
      setIsVisibleState(false);
      const timer = setTimeout(() => setIsMounted(false), 300); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // --- Long Press Logic on Trigger Button ---
  const handleTriggerPointerDown = (e: React.PointerEvent) => {
    if (!isVisible) return;
    if (e.pointerType === 'touch') {
      wasLongPressRef.current = false;
      return;
    }
    
    cleanupTriggerTracking();
    
    wasLongPressRef.current = false;
    activePointerIdRef.current = e.pointerId;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    initialClickPosRef.current = { x: e.clientX, y: e.clientY };
    initialClickDistanceRef.current = null;
    
    setTriggerPressed(true);
    
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      triggerHaptic();
      openMenu();
      setIsInitialDragActive(true);
      setIsSliding(true);
      setIsPointerActive(true);
      targetDragScaleRef.current = 1.0;
      currentDragScaleRef.current = 1.0;
      setTriggerPressed(false);
      cleanupTriggerTracking();
    }, 300); 

    const handleWindowMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== e.pointerId) return;
      lastPointerPosRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const isInside = (
          moveEvent.clientX >= rect.left &&
          moveEvent.clientX <= rect.right &&
          moveEvent.clientY >= rect.top &&
          moveEvent.clientY <= rect.bottom
        );
        
        if (isInside) {
          if (!isTriggerPressedRef.current) {
            setTriggerPressed(true);
          }
        } else {
          if (isTriggerPressedRef.current) {
            setTriggerPressed(false);
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
        }
      }
    };

    const handleWindowUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== e.pointerId) return;
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      if (isTriggerPressedRef.current && !wasLongPressRef.current) {
        if (isOpen) closeMenu();
        else openMenu();
      }
      
      setTriggerPressed(false);
      cleanupTriggerTracking();
    };

    const handleWindowCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== e.pointerId) return;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setTriggerPressed(false);
      cleanupTriggerTracking();
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowCancel);

    triggerCleanupRef.current = () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowCancel);
    };
  };

  const handleTriggerPointerUp = () => {};
  const handleTriggerPointerCancel = () => {};

  // --- Touch Event Handlers on Trigger Button ---
  const handleTriggerTouchStart = (e: React.TouchEvent) => {
    if (!isVisible) return;
    
    cleanupTriggerTracking();
    
    wasLongPressRef.current = false;
    const touch = e.touches[0];
    lastPointerPosRef.current = { x: touch.clientX, y: touch.clientY };
    initialClickPosRef.current = { x: touch.clientX, y: touch.clientY };
    initialClickDistanceRef.current = null;
    
    setTriggerPressed(true);
    
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      triggerHaptic();
      openMenu();
      setIsInitialDragActive(true);
      setIsSliding(true);
      setIsPointerActive(true);
      targetDragScaleRef.current = 1.0;
      currentDragScaleRef.current = 1.0;
      setTriggerPressed(false);
      cleanupTriggerTracking();
    }, 300);

    const handleWindowTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      const t = moveEvent.touches[0];
      lastPointerPosRef.current = { x: t.clientX, y: t.clientY };
      
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const isInside = (
          t.clientX >= rect.left &&
          t.clientX <= rect.right &&
          t.clientY >= rect.top &&
          t.clientY <= rect.bottom
        );
        
        if (isInside) {
          if (!isTriggerPressedRef.current) {
            setTriggerPressed(true);
          }
        } else {
          if (isTriggerPressedRef.current) {
            setTriggerPressed(false);
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
        }
      }
    };

    const handleWindowTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      
      if (isTriggerPressedRef.current && !wasLongPressRef.current) {
        if (isOpen) closeMenu();
        else openMenu();
      }
      
      setTriggerPressed(false);
      cleanupTriggerTracking();
    };

    const handleWindowTouchCancel = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setTriggerPressed(false);
      cleanupTriggerTracking();
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchCancel);

    triggerCleanupRef.current = () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchCancel);
    };
  };

  const handleTriggerTouchEnd = () => {};
  const handleTriggerTouchCancel = () => {};

  // --- Menu Gesture Handlers (for when already open) ---
  const handlePointerDownMenu = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    setIsSliding(false);
    const target = e.target as HTMLElement;
    const button = target.closest('button[data-option-id]');
    if (button) {
      const id = button.getAttribute('data-option-id');
      if (id) setHighlightedId(id);
    }
  };

  const handlePointerMoveMenu = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!isSliding) setIsSliding(true);
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const button = element?.closest('button[data-option-id]');
    if (button) {
      const id = button.getAttribute('data-option-id');
      if (id && id !== highlightedId) {
        setHighlightedId(id);
        triggerHaptic();
      }
    } else if (highlightedId !== null) {
      setHighlightedId(null);
    }
  };

  const handlePointerUpMenu = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (highlightedId) {
      executeAction(highlightedId);
    }
    setHighlightedId(null);
    setIsSliding(false);
  };

  const springTransition = 'duration-500 ease-[cubic-bezier(0.25,1.25,0.35,1)]';

  return (
    <div className={`relative z-40 transition-all duration-300 ease-in-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
      {/* Trigger Button */}
      {renderTrigger ? (
        renderTrigger({
          isOpen,
          buttonRef,
          onPointerDown: handleTriggerPointerDown,
          onPointerUp: handleTriggerPointerUp,
          onPointerCancel: handleTriggerPointerCancel,
          onTouchStart: handleTriggerTouchStart,
          onTouchEnd: handleTriggerTouchEnd,
          onTouchCancel: handleTriggerTouchCancel
        })
      ) : (
        <button 
          ref={buttonRef}
          onPointerDown={handleTriggerPointerDown}
          onTouchStart={handleTriggerTouchStart}
          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 outline-none border-[2.5px] border-[#007AFF] bg-transparent text-[#007AFF] touch-none select-none after:absolute after:-inset-4 after:content-[''] after:rounded-full cursor-pointer ${
              isOpen 
              ? 'opacity-50' 
              : isTriggerPressed
                ? 'opacity-50'
                : 'opacity-100'
          }`}
          aria-label="Options Menu"
          tabIndex={isVisible ? 0 : -1} 
        >
           <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="2.15" />
              <circle cx="19" cy="12" r="2.15" />
              <circle cx="5" cy="12" r="2.15" />
          </svg>
        </button>
      )}

      {/* iOS Style Pull-down Menu & Backdrop */}
      {isMounted && createPortal(
        <>
            {/* 
              Invisible backdrop that catches clicks to close the menu.
              z-index 99990 is below Dialog (99999).
            */}
            <div 
                className="fixed inset-0 z-[99990] bg-transparent touch-none" 
                onClick={(e) => {
                  if (justFinishedTouchDragRef.current) return;
                  closeMenu();
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'touch') {
                    return;
                  }
                  closeMenu();
                }}
            />

            <div 
                ref={menuRef}
                style={{ 
                    top: `${menuPos.top}px`, 
                    right: `${menuPos.right}px`,
                    scale: isVisibleState ? dragScale : 0,
                    transformOrigin: 'calc(100% - 2px) 0px',
                    transition: isScalingActive ? 'none' : undefined,
                }}
                onPointerDown={handlePointerDownMenu}
                onPointerMove={handlePointerMoveMenu}
                onPointerUp={handlePointerUpMenu}
                onPointerLeave={() => setHighlightedId(null)}
                onPointerCancel={() => { setHighlightedId(null); setIsSliding(false); }}
                className={`
                    fixed w-[250px] bg-[#F9F9F9]/90 dark:bg-[#2c2c2e]/90 backdrop-blur-xl backdrop-saturate-[180%] rounded-[14px] shadow-2xl overflow-hidden flex flex-col
                    origin-top-right 
                    transition-all will-change-transform touch-none select-none
                    z-[99991]
                    ${isVisibleState 
                        ? `opacity-100 translate-x-0 translate-y-0 ${springTransition}` 
                        : 'opacity-0 -translate-x-4 -translate-y-5 duration-300 ease-in-out'}
                `}
            >
                {options.map((opt, idx) => {
                  if (opt.type === 'separator') {
                    return (
                      <div key={opt.id} className="h-[1px] bg-gray-300/40 dark:bg-white/10" />
                    );
                  }
                  if (opt.type === 'big-separator') {
                    return (
                      <div key={opt.id} className="h-2 bg-gray-300/40 dark:bg-black/20" />
                    );
                  }

                  const isSelected = selectedId === opt.id;
                  const isHighlighted = highlightedId === opt.id;
                  
                  const nextOpt = options[idx + 1];
                  const isNextHighlighted = nextOpt && nextOpt.type === 'item' && highlightedId === nextOpt.id;

                  const alignWithCheck = opt.alignWithCheck !== false;
                  const hasCheck = opt.showCheck !== false;

                  return (
                    <button
                       key={opt.id}
                       data-option-id={opt.id}
                       onClick={(e) => {
                         e.stopPropagation();
                         executeAction(opt.id);
                       }}
                       className={`
                           relative flex items-center justify-between w-full px-4 py-[12px] text-left outline-none
                           group transition-none duration-0
                           ${isHighlighted ? 'bg-gray-300/40 dark:bg-white/10' : 'bg-transparent'}
                           md:hover:bg-gray-300/40 md:dark:hover:bg-white/10
                       `}
                    >
                        <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                            {alignWithCheck && (
                                <div className="w-5 flex justify-center shrink-0">
                                  {hasCheck && (
                                    <Check 
                                      className={`w-4 h-4 text-black dark:text-white transition-none duration-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} 
                                      strokeWidth={2.5} 
                                    />
                                  )}
                                </div>
                            )}
                            <span className={`text-[17px] truncate leading-none pb-[1px] ${alignWithCheck ? '' : 'pl-[28px]'} ${opt.labelClass || 'text-black dark:text-white'}`}>
                              {opt.label}
                            </span>
                        </div>
                        <div className={`shrink-0 ml-3 opacity-100 pointer-events-none ${opt.iconClass || 'text-black dark:text-white'}`}>
                            {opt.icon}
                        </div>
                        {idx < options.length - 1 && options[idx + 1].type !== 'separator' && options[idx + 1].type !== 'big-separator' && (
                            <div className={`absolute bottom-0 right-0 left-0 h-[1px] ${isHighlighted || isNextHighlighted ? 'bg-transparent' : 'bg-gray-300/40 dark:bg-white/10'} pointer-events-none`} />
                        )}
                    </button>
                  );
                })}
            </div>
        </>,
        document.body
      )}
    </div>
  );
}
