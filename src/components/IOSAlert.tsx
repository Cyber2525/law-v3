import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface AlertAction {
  label: string;
  onClick: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'bold';
}

interface IOSAlertProps {
  isOpen: boolean;
  onClose: () => void;
  /** Legacy: Callback for primary action */
  onAction?: () => void;
  title?: string;
  message: string;
  /** Legacy: Label for primary action */
  actionLabel?: string;
  /** Legacy: Label for cancel action */
  cancelLabel?: string;
  /** New: Custom actions array. If present, overrides legacy props */
  actions?: AlertAction[];
}

export const IOSAlert: React.FC<IOSAlertProps> = ({ 
  isOpen, 
  onClose, 
  onAction, 
  title = "Sitio Web Externo", 
  message, 
  actionLabel = "Abrir", 
  cancelLabel = "Cancelar",
  actions
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  
  // --- Gesture & Slide State ---
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const actionsContainerRef = useRef<HTMLDivElement>(null);

  // Snapshot state to persist content during exit animation.
  const [snapshot, setSnapshot] = useState({ 
      title, 
      message, 
      actions: actions || [
          { label: cancelLabel, onClick: onClose, style: 'cancel' as const }, 
          { label: actionLabel, onClick: onAction || (() => {}), style: 'bold' as const }
      ]
  });

  useEffect(() => {
    if (isOpen) {
      let displayActions: AlertAction[] = [];
      if (actions && actions.length > 0) {
          displayActions = actions;
      } else {
          displayActions = [
              { label: cancelLabel, onClick: onClose, style: 'cancel' },
              { label: actionLabel, onClick: onAction || (() => {}), style: 'bold' }
          ];
      }

      setSnapshot({ title, message, actions: displayActions });
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, title, message, actionLabel, cancelLabel, onAction, onClose, actions]);

  // --- Haptic Feedback ---
  const triggerHaptic = () => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10); 
      }
  };

  // --- Pointer Handlers (iOS Pull-down Style) ---
  const handlePointerDown = (e: React.PointerEvent) => {
      setIsSliding(false);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const target = e.target as HTMLElement;
      const button = target.closest('button[data-action-index]');
      if (button) {
          const idx = parseInt(button.getAttribute('data-action-index') || '-1');
          if (idx !== -1) setHighlightedIndex(idx);
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.buttons !== 1) return;
      
      if (!isSliding) setIsSliding(true);

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const button = element?.closest('button[data-action-index]');

      if (button) {
          const idx = parseInt(button.getAttribute('data-action-index') || '-1');
          if (idx !== -1 && idx !== highlightedIndex) {
              setHighlightedIndex(idx);
              triggerHaptic();
          }
      } else {
          if (highlightedIndex !== null) setHighlightedIndex(null);
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
      if (highlightedIndex !== null) {
          const action = snapshot.actions[highlightedIndex];
          if (action) {
              // Pequeño delay para visualización del estado activo
              setTimeout(() => action.onClick(), 50);
          }
      }
      setHighlightedIndex(null);
      setIsSliding(false);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
      setHighlightedIndex(null);
      setIsSliding(false);
  };

  if (!mounted) return null;

  const { title: displayTitle, message: displayMessage, actions: displayActions } = snapshot;
  const isVertical = displayActions.length > 2;

  const animationClass = !isOpen 
    ? 'animate-ios-alert-exit' 
    : (visible ? 'animate-ios-alert-enter' : 'opacity-0');

  const backdropClass = !isOpen
    ? 'opacity-0'
    : (visible ? 'opacity-100' : 'opacity-0');

  const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  return createPortal(
    <div 
        className="fixed inset-0 flex items-center justify-center p-4 z-[99999] isolate touch-none"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        style={{ pointerEvents: 'auto' }}
    >
       <div 
         className={`absolute inset-0 bg-black/[0.125] transition-opacity duration-300 ease-in-out ${backdropClass}`}
         onClick={(e) => e.stopPropagation()}
       />

       <div 
          className={`relative w-[270px] bg-[rgba(245,245,245,0.80)] dark:bg-[rgba(48,48,50,0.80)] backdrop-blur-xl backdrop-saturate-[180%] rounded-[14px] overflow-hidden gpu-accelerated text-center z-10 ${animationClass}`}
          onClick={stopPropagation}
        >
         
         <div className="pt-[19px] pb-[19px] px-4">
           {displayTitle && (
             <h3 className="text-[17px] font-semibold text-black dark:text-white mb-1 leading-snug">
               {displayTitle}
             </h3>
           )}
           <p className="text-[13px] text-black/80 dark:text-white/80 leading-tight font-normal">
             {displayMessage}
           </p>
         </div>

         <div 
            ref={actionsContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={`w-full touch-none select-none ${isVertical ? 'flex flex-col' : 'grid grid-cols-2 h-[44px]'}`}
         >
            {displayActions.map((action, idx) => {
                let textColor = 'text-[#007AFF] dark:text-[#0A84FF]';
                if (action.style === 'destructive') textColor = 'text-red-500';
                
                const fontWeight = (action.style === 'bold') ? 'font-semibold' : 'font-normal';
                const isHighlighted = highlightedIndex === idx;
                
                let borderClass = '';
                const borderColor = 'border-black/10 dark:border-white/10';
                
                if (isVertical) {
                    const isPrevHighlighted = idx > 0 && highlightedIndex === idx - 1;
                    const hideTop = isHighlighted || isPrevHighlighted;
                    borderClass = `border-t ${hideTop ? 'border-transparent' : borderColor}`;
                } else {
                    const hideTop = isHighlighted;
                    const topBorder = `border-t ${hideTop ? 'border-transparent' : borderColor}`;
                    
                    if (idx === 0) {
                        const hideRight = highlightedIndex !== null;
                        const rightBorder = `border-r ${hideRight ? 'border-transparent' : borderColor}`;
                        borderClass = `${topBorder} ${rightBorder}`;
                    } else {
                        borderClass = topBorder;
                    }
                }

                const heightClass = isVertical ? 'h-[44px]' : 'h-full';
                const durationClass = isSliding ? 'duration-0' : 'duration-200';

                return (
                    <button
                        key={idx}
                        data-action-index={idx}
                        className={`relative ${heightClass} ${textColor} ${fontWeight} text-[17px]
                                   ${isHighlighted ? 'bg-gray-400/30 dark:bg-white/10' : 'bg-transparent'}
                                   ${durationClass} transition-colors
                                   outline-none select-none cursor-pointer ${borderClass}`}
                    >
                        {action.label}
                    </button>
                );
            })}
         </div>
       </div>
    </div>,
    document.body
  );
};
