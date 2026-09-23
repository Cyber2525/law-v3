import React, { useState, useEffect, useRef } from 'react';

export interface DragControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface DragControlProps<T extends string = string> {
  /** Current active segment / value */
  activeSegment?: T;
  value?: T;
  /** Callback when the selected segment changes */
  onChange: (value: T) => void;
  /** The two options to switch between (defaults to Legal / Security if not provided) */
  options?: [DragControlOption<T>, DragControlOption<T>] | DragControlOption<T>[];
  /** Whether interaction is disabled */
  disabled?: boolean;
  /** Optional custom container CSS classes */
  className?: string;
  /** HTML id attribute for testing / scripting */
  id?: string;
}

const DEFAULT_OPTIONS: [DragControlOption<'legal' | 'security'>, DragControlOption<'legal' | 'security'>] = [
  { value: 'legal', label: 'Riesgos Legales' },
  { value: 'security', label: 'Seguridad' },
];

/**
 * Reusable iOS-style draggable segmented control (Drag Control).
 * Provides fluid dragging physics, magnetic snapping, and scale/opacity transitions.
 */
export function DragControl<T extends string = string>({
  activeSegment,
  value,
  onChange,
  options = DEFAULT_OPTIONS as unknown as DragControlOption<T>[],
  disabled = false,
  className = '',
  id,
}: DragControlProps<T>) {
  const currentActive = (value !== undefined ? value : activeSegment) ?? options[0]?.value;
  const firstOption = options[0] || { value: 'legal' as T, label: 'Legal' };
  const secondOption = options[1] || { value: 'security' as T, label: 'Security' };

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressingInactive, setIsPressingInactive] = useState<T | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const startX = useRef(0);
  const initialOffset = useRef(0);
  const containerWidth = useRef(0);

  // Sync dragOffset with currentActive when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragOffset(currentActive === secondOption.value ? 100 : 0);
    }
  }, [currentActive, isDragging, secondOption.value]);

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || disabled) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSide = clickX > rect.width / 2 ? secondOption.value : firstOption.value;

    if (targetSide !== currentActive) {
      setIsPressingInactive(targetSide);
    }
  };

  const handleContainerPointerUp = () => {
    if (isPressingInactive) {
      onChange(isPressingInactive);
      setIsPressingInactive(null);
    }
  };

  const handlePillPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || disabled) return;
    e.stopPropagation();

    setIsDragging(true);
    startX.current = e.clientX;
    containerWidth.current = containerRef.current.offsetWidth;
    initialOffset.current = currentActive === secondOption.value ? 100 : 0;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePillPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const currentX = e.clientX;
    const deltaX = currentX - startX.current;
    const slideWidth = containerWidth.current / 2;

    const deltaPercent = (deltaX / slideWidth) * 100;
    let newOffset = initialOffset.current + deltaPercent;

    newOffset = Math.max(0, Math.min(100, newOffset));
    setDragOffset(newOffset);
  };

  const handlePillPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragOffset > 50) {
      onChange(secondOption.value);
      setDragOffset(100);
    } else {
      onChange(firstOption.value);
      setDragOffset(0);
    }
  };

  const isFirstSide = dragOffset < 50;
  const isSecondSide = !isFirstSide;

  const BEZIER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const scaleTransition = `scale 0.45s ${BEZIER}`;
  const fadeTransition = `opacity 0.1s ease-out`;

  const scaleFactor = isDragging ? 0.92 : 1;

  /**
   * GEOMETRÍA iOS EXTRA-REFINADA:
   * Padding aumentado a 4px para un efecto de "encapsulado" más moderno.
   * Con h-12 (48px) y p-[4px], la píldora mide 40px de alto.
   * El centro de transformación radial se sitúa a 4px + 20px = 24px.
   */
  const pillOriginX = `calc(24px + (${dragOffset} * (100% - 48px) / 100))`;
  const pillOrigin = `${pillOriginX} center`;

  return (
    <div
      id={id || 'drag-control-container'}
      ref={containerRef}
      className={`bg-[#767680]/15 dark:bg-black/20 p-[4px] rounded-[16px] flex h-12 relative cursor-pointer touch-none select-none ${className}`}
      onPointerDown={handleContainerPointerDown}
      onPointerUp={handleContainerPointerUp}
      role="tablist"
    >
      {/* Draggable Background Pill: Margen de 4px para un look más marcado */}
      <div
        id="drag-control-pill"
        className="absolute top-[4px] bottom-[4px] w-[calc(50%-4px)] bg-white dark:bg-[#2C2C2E] rounded-[12px] shadow-[0_3px_8px_rgba(0,0,0,0.08)] dark:shadow-none z-20 cursor-grab active:cursor-grabbing transform-gpu"
        onPointerDown={handlePillPointerDown}
        onPointerMove={handlePillPointerMove}
        onPointerUp={handlePillPointerUp}
        onPointerCancel={handlePillPointerUp}
        style={{
          left: '4px',
          translate: `${dragOffset}% 0`,
          scale: scaleFactor,
          transformOrigin: pillOrigin,
          transition: isDragging
            ? `scale 0.45s ${BEZIER}`
            : `translate 0.45s ${BEZIER}, scale 0.45s ${BEZIER}, transform-origin 0.45s ${BEZIER}`,
        }}
      />

      {/* Label 1: First Option */}
      <div
        id="drag-control-option-0"
        role="tab"
        aria-selected={currentActive === firstOption.value}
        className="flex-1 z-30 flex items-center justify-center pointer-events-none transform-gpu"
        style={{
          scale: isDragging && isFirstSide ? scaleFactor : 1,
          transformOrigin: '24px center',
          opacity: isPressingInactive === firstOption.value ? 0.6 : 1,
          transition: `${scaleTransition}, ${fadeTransition}`,
        }}
      >
        <span
          className={`text-[15px] font-semibold transition-colors duration-300 ${
            isFirstSide ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {firstOption.label}
        </span>
      </div>

      {/* Label 2: Second Option */}
      <div
        id="drag-control-option-1"
        role="tab"
        aria-selected={currentActive === secondOption.value}
        className="flex-1 z-30 flex items-center justify-center pointer-events-none transform-gpu"
        style={{
          scale: isDragging && isSecondSide ? scaleFactor : 1,
          transformOrigin: 'calc(100% - 24px) center',
          opacity: isPressingInactive === secondOption.value ? 0.6 : 1,
          transition: `${scaleTransition}, ${fadeTransition}`,
        }}
      >
        <span
          className={`text-[15px] font-semibold transition-colors duration-300 ${
            isSecondSide ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {secondOption.label}
        </span>
      </div>
    </div>
  );
}

// Alias for DraggableSegmentedControl
export const DraggableSegmentedControl = DragControl;
export default DragControl;
