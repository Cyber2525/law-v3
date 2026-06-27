import React, { useState, useRef, useEffect } from 'react';

interface UsePressTrackingOptions {
  disabled?: boolean;
  onTrigger?: () => void;
  onLongPress?: {
    callback: () => void;
    durationMs: number;
  };
}

export function usePressTracking({
  disabled = false,
  onTrigger,
  onLongPress,
}: UsePressTrackingOptions = {}) {
  const [isPressed, setIsPressed] = useState(false);
  const isPointerDown = useRef(false);
  const buttonRef = useRef<any>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);

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
    setIsPressed(true);
    isLongPressActive.current = false;

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
    
    // Check if pointer coordinates are within the button's boundaries
    const isInside = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );

    if (isInside) {
      if (!isPressed) {
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
      if (isPressed) {
        setIsPressed(false);
        // Clear long press timer if we exit the button area
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
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
    buttonRef,
    pointerEvents: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    }
  };
}
