import React, { useState, useRef, useEffect, useCallback } from 'react';

function getCurrentTranslateX(element: HTMLElement | null): number {
  if (!element) return 0;
  const style = window.getComputedStyle(element);
  const transform = style.transform || (style as any).webkitTransform;
  if (!transform || transform === 'none') return 0;
  const mat = transform.match(/^matrix\((.+)\)$/);
  if (mat) {
    const values = mat[1].split(',');
    return parseFloat(values[4]?.trim() || '0') || 0;
  }
  const mat3d = transform.match(/^matrix3d\((.+)\)$/);
  if (mat3d) {
    const values = mat3d[1].split(',');
    return parseFloat(values[12]?.trim() || '0') || 0;
  }
  return 0;
}

interface UsePressTrackingOptions {
  disabled?: boolean;
  onTrigger?: () => void;
  onLongPress?: {
    callback: () => void;
    durationMs: number;
  };
  extraMargin?: number;
  sliderRef?: React.RefObject<HTMLElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onPressChange?: (pressed: boolean) => void;
}

export function usePressTracking({
  disabled = false,
  onTrigger,
  onLongPress,
  extraMargin = 50,
  sliderRef,
  scrollContainerRef,
  onPressChange,
}: UsePressTrackingOptions = {}) {
  const [isPressed, setIsPressed] = useState(false);
  const [isReentry, setIsReentry] = useState(false);
  const isPointerDown = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const buttonRef = useRef<any>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);
  const hasExitedRef = useRef(false);
  const lastDistRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const initialSliderTxRef = useRef(0);
  const initialScrollTopRef = useRef(0);

  const cancelPress = useCallback(() => {
    isPointerDown.current = false;
    setIsPressed(false);
    setIsReentry(false);
    isLongPressActive.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    onPressChange?.(false);
    if (buttonRef.current && activePointerIdRef.current !== null) {
      try {
        buttonRef.current.releasePointerCapture(activePointerIdRef.current);
      } catch (_) {}
    }
  }, [onPressChange]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // When disabled changes to true: immediately cancel and reset press state
  // to allow smooth transition back to unpressed state ("volver a su color con su transicion")
  useEffect(() => {
    if (disabled && (isPressed || isPointerDown.current)) {
      cancelPress();
    }
  }, [disabled, isPressed, cancelPress]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    
    // Only respond to main/left button interactions
    if (e.button !== 0) return;

    isPointerDown.current = true;
    activePointerIdRef.current = e.pointerId;
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    setIsReentry(false);
    setIsPressed(true);
    onPressChange?.(true);
    isLongPressActive.current = false;
    hasExitedRef.current = false;
    lastDistRef.current = 0;

    if (sliderRef?.current) {
      initialSliderTxRef.current = getCurrentTranslateX(sliderRef.current);
    }
    if (scrollContainerRef?.current) {
      initialScrollTopRef.current = scrollContainerRef.current.scrollTop;
    }

    // Start long press timer if provided
    if (onLongPress) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressActive.current = true;
        onLongPress.callback();
      }, onLongPress.durationMs);
    }

    // Capture the pointer to receive events even if they drag outside
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      // Fail-safe
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || disabled) {
      if (disabled && isPressed) {
        cancelPress();
      }
      return;
    }

    // Check if modal slider moved (horizontal drag/swipe of the modal)
    if (sliderRef?.current) {
      const currentTx = getCurrentTranslateX(sliderRef.current);
      if (Math.abs(currentTx - initialSliderTxRef.current) > 3) {
        cancelPress();
        return;
      }
      const diffX = Math.abs(e.clientX - touchStartXRef.current);
      if (diffX > 15) {
        cancelPress();
        return;
      }
    }

    // Check if scroll container moved (vertical list scroll)
    if (scrollContainerRef?.current) {
      if (Math.abs(scrollContainerRef.current.scrollTop - initialScrollTopRef.current) > 4) {
        cancelPress();
        return;
      }
    }

    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const dist = Math.max(dx, dy);

    if (dist === 0) {
      // Inside original initial radius of the button
      hasExitedRef.current = false;
      lastDistRef.current = 0;
      if (!isPressed) {
        setIsReentry(true);
        setIsPressed(true);
        onPressChange?.(true);
        // Resume long press timer if it was cleared and we returned
        if (onLongPress && !isLongPressActive.current && !longPressTimerRef.current) {
          longPressTimerRef.current = setTimeout(() => {
            isLongPressActive.current = true;
            onLongPress.callback();
          }, onLongPress.durationMs);
        }
      }
    } else {
      // Outside the original button frame
      const prevDist = lastDistRef.current;
      lastDistRef.current = dist;

      if (!hasExitedRef.current) {
        // Just crossed outside the initial radius -> immediately deselect
        hasExitedRef.current = true;
        if (isPressed) {
          setIsPressed(false);
          setIsReentry(false);
          onPressChange?.(false);
          // Clear long press timer if we exit the button area
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      } else {
        // In slide mode outside the button
        if (dist < prevDist - 0.5) {
          // Moving back towards the button (reactivation on slide within extraMargin)
          if (dist <= extraMargin) {
            if (!isPressed) {
              setIsReentry(true);
              setIsPressed(true);
              onPressChange?.(true);
              if (onLongPress && !isLongPressActive.current && !longPressTimerRef.current) {
                longPressTimerRef.current = setTimeout(() => {
                  isLongPressActive.current = true;
                  onLongPress.callback();
                }, onLongPress.durationMs);
              }
            }
          }
        } else if (dist > prevDist + 0.5) {
          // Moving farther away from the button
          if (isPressed) {
            setIsPressed(false);
            setIsReentry(false);
            onPressChange?.(false);
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Release pointer capture
    if (activePointerIdRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(activePointerIdRef.current);
      } catch (err) {}
    }

    if (!isPointerDown.current) return;

    // Save state before resetting
    const wasPressed = isPressed;
    const wasLongPress = isLongPressActive.current;

    // Reset state
    isPointerDown.current = false;
    setIsPressed(false);
    setIsReentry(false);
    onPressChange?.(false);
    isLongPressActive.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (disabled) return;

    // Trigger onTrigger ONLY if we released inside the button AND it wasn't a completed long press
    if (wasPressed && !wasLongPress && onTrigger) {
      onTrigger();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    cancelPress();
  };

  // Window pointer listeners as robust fallback during swipes / transitions
  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (isPointerDown.current) {
        cancelPress();
      }
    };
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      if (disabled) {
        cancelPress();
        return;
      }
      if (sliderRef?.current) {
        const currentTx = getCurrentTranslateX(sliderRef.current);
        if (Math.abs(currentTx - initialSliderTxRef.current) > 3) {
          cancelPress();
          return;
        }
        const diffX = Math.abs(e.clientX - touchStartXRef.current);
        if (diffX > 15) {
          cancelPress();
          return;
        }
      }
      if (scrollContainerRef?.current) {
        if (Math.abs(scrollContainerRef.current.scrollTop - initialScrollTopRef.current) > 4) {
          cancelPress();
          return;
        }
      }
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointermove', handleWindowPointerMove);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointermove', handleWindowPointerMove);
    };
  }, [disabled, sliderRef, scrollContainerRef, cancelPress]);

  return {
    isPressed,
    isReentry,
    buttonRef,
    pointerEvents: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    }
  };
}
