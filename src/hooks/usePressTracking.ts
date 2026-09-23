import React, { useState, useRef, useEffect } from 'react';

interface UsePressTrackingOptions {
  disabled?: boolean;
  onTrigger?: () => void;
  onLongPress?: {
    callback: () => void;
    durationMs: number;
  };
  extraMargin?: number;
}

export function usePressTracking({
  disabled = false,
  onTrigger,
  onLongPress,
  extraMargin = 50,
}: UsePressTrackingOptions = {}) {
  const [isPressed, setIsPressed] = useState(false);
  const [isReentry, setIsReentry] = useState(false);
  const isPointerDown = useRef(false);
  const buttonRef = useRef<any>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);
  const hasExitedRef = useRef(false);
  const lastDistRef = useRef(0);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    
    // Only respond to main/left button interactions
    if (e.button !== 0) return;

    isPointerDown.current = true;
    setIsReentry(false);
    setIsPressed(true);
    isLongPressActive.current = false;
    hasExitedRef.current = false;
    lastDistRef.current = 0;

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
    if (!isPointerDown.current || disabled) return;

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
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Fail-safe
    }

    if (!isPointerDown.current) return;

    // Save state before resetting
    const wasPressed = isPressed;
    const wasLongPress = isLongPressActive.current;

    // Reset state
    isPointerDown.current = false;
    setIsPressed(false);
    setIsReentry(false);
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
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Fail-safe
    }

    isPointerDown.current = false;
    setIsPressed(false);
    setIsReentry(false);
    isLongPressActive.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Listen to window pointerup as a fallback
  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        setIsPressed(false);
        setIsReentry(false);
        isLongPressActive.current = false;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, []);

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
