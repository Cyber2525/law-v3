import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Smartphone, Monitor, Laptop, Globe, Trash2 } from 'lucide-react';
import { Dialog, AlertAction } from './Dialog';

type OverrideType = 'default' | 'windows' | 'ios' | 'android' | 'macos' | 'chromeos';

interface StoreProviderSwitcherProps {
    isVisible?: boolean;
    onDisable?: () => void;
}

export const StoreProviderSwitcher: React.FC<StoreProviderSwitcherProps> = ({ isVisible = false, onDisable }) => {
  const [override, setOverride] = useState<OverrideType>('default');
  
  // Animation states
  const [isOpen, setIsOpen] = useState(false);        // User intent (Open/Closed)
  const [isMounted, setIsMounted] = useState(false);  // DOM presence
  const [isVisibleState, setIsVisibleState] = useState(false);  // CSS opacity/scale trigger
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  // Interaction & Selection State
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [isInitialDragActive, setIsInitialDragActive] = useState(false);

  // Disable Confirmation Alert State
  const [showDisableAlert, setShowDisableAlert] = useState(false);
  
  // Detected Device Label
  const [detectedType, setDetectedType] = useState('Device Type');

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  useEffect(() => {
    // Set global variable for other components to read
    if (typeof window !== 'undefined') {
        (window as any).__DEBUG_OS_OVERRIDE__ = override;
    }
  }, [override]);

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

  const openMenu = () => {
      if (isOpen) return;
      window.history.pushState({ ...window.history.state, debugMenu: true }, '');
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
      if (id === 'disable_debug') {
          setShowDisableAlert(true);
      } else {
          setOverride(id as OverrideType);
          closeMenu();
      }
  };

  // --- OS Detection ---
  useEffect(() => {
      if (typeof navigator !== 'undefined') {
          const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
          const platform = navigator.platform || '';
          let type = 'Other';
          if (/android/i.test(userAgent)) type = 'Android';
          else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) type = 'iOS';
          else if (/\bCrOS\b/.test(userAgent)) type = 'ChromeOS';
          else if (platform.toUpperCase().indexOf('MAC') >= 0) type = 'MacOS';
          else if (platform.indexOf('Win') > -1) type = 'Windows';
          setDetectedType(type);
      }
  }, []);

  // --- Animation Lifecycle ---
  useEffect(() => {
    if (isOpen) {
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

  // --- Global Event Handlers for Drag Selection ---
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
        if (!isInitialDragActive && !isSliding) return;
        
        // Find element under point
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
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
        if (isInitialDragActive) {
            if (highlightedId) {
                executeAction(highlightedId);
            }
            setIsInitialDragActive(false);
            setIsSliding(false);
            setHighlightedId(null);
        }
    };

    if (isInitialDragActive) {
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isInitialDragActive, highlightedId, isSliding]);

  // --- Long Press Logic on Trigger Button ---
  const handleTriggerPointerDown = (e: React.PointerEvent) => {
      if (!isVisible) return;
      wasLongPressRef.current = false;
      
      longPressTimerRef.current = setTimeout(() => {
          wasLongPressRef.current = true;
          triggerHaptic();
          openMenu();
          setIsInitialDragActive(true);
          setIsSliding(true);
      }, 300); 
  };

  const handleTriggerPointerUp = (e: React.PointerEvent) => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
      
      // If it wasn't a long press, handle it as a normal toggle click
      if (!wasLongPressRef.current) {
          if (isOpen) closeMenu();
          else openMenu();
      }
  };

  const handleTriggerPointerCancel = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const confirmDisable = () => {
      setShowDisableAlert(false);
      closeMenu(); 
      setTimeout(() => {
          setOverride('default'); 
          if (onDisable) onDisable();
      }, 300);
  };

  // --- Menu Gesture Handlers (for when already open) ---
  const handlePointerDownMenu = (e: React.PointerEvent) => {
      setIsSliding(false);
      const target = e.target as HTMLElement;
      const button = target.closest('button[data-option-id]');
      if (button) {
          const id = button.getAttribute('data-option-id');
          if (id) setHighlightedId(id);
      }
  };

  const handlePointerMoveMenu = (e: React.PointerEvent) => {
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
      if (highlightedId) {
          executeAction(highlightedId);
      }
      setHighlightedId(null);
      setIsSliding(false);
  };

  const options: { id: OverrideType; label: string; icon: React.ReactNode }[] = [
    { id: 'default', label: `Default (${detectedType})`, icon: <Globe className="w-[18px] h-[18px]" /> },
    { id: 'ios', label: 'iOS', icon: <Smartphone className="w-[18px] h-[18px]" /> },
    { id: 'android', label: 'Android', icon: <Smartphone className="w-[18px] h-[18px]" /> },
    { id: 'macos', label: 'MacOS', icon: <Laptop className="w-[18px] h-[18px]" /> },
    { id: 'chromeos', label: 'ChromeOS', icon: <Laptop className="w-[18px] h-[18px]" /> },
    { id: 'windows', label: 'Windows', icon: <Monitor className="w-[18px] h-[18px]" /> },
  ];

  const disableActions: AlertAction[] = [
      { label: 'Cancelar', onClick: () => setShowDisableAlert(false), style: 'bold' },
      { label: 'Desactivar', onClick: confirmDisable, style: 'destructive' }
  ];

  return (
    <div className={`relative z-40 transition-all duration-300 ease-in-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
      {/* Trigger Button */}
      <button 
        ref={buttonRef}
        onPointerDown={handleTriggerPointerDown}
        onPointerUp={handleTriggerPointerUp}
        onPointerCancel={handleTriggerPointerCancel}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 outline-none border-[2.5px] border-[#007AFF] bg-transparent text-[#007AFF] touch-none select-none ${
            isOpen 
            ? 'opacity-50' 
            : 'opacity-100 active:opacity-50'
        }`}
        aria-label="Debug Options"
        tabIndex={isVisible ? 0 : -1} 
      >
         <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="2.15" />
            <circle cx="19" cy="12" r="2.15" />
            <circle cx="5" cy="12" r="2.15" />
        </svg>
      </button>

      {/* iOS Style Pull-down Menu & Backdrop */}
      {isMounted && createPortal(
        <>
            {/* 
              Invisible backdrop that catches clicks to close the menu.
              z-index 99990 is below Dialog (99999) as requested.
            */}
            <div 
                className="fixed inset-0 z-[99990] bg-transparent touch-none" 
                onClick={closeMenu}
                onPointerDown={closeMenu}
            />

            <div 
                ref={menuRef}
                style={{ 
                    top: `${menuPos.top}px`, 
                    right: `${menuPos.right}px` 
                }}
                onPointerDown={handlePointerDownMenu}
                onPointerMove={handlePointerMoveMenu}
                onPointerUp={handlePointerUpMenu}
                onPointerLeave={() => setHighlightedId(null)}
                onPointerCancel={() => { setHighlightedId(null); setIsSliding(false); }}
                className={`
                    fixed w-[250px] 
                    bg-[#F9F9F9]/90 dark:bg-[#2c2c2e]/90 backdrop-blur-xl backdrop-saturate-[180%] 
                    rounded-[14px] shadow-2xl overflow-hidden 
                    origin-top-right 
                    transition-all will-change-transform touch-none select-none
                    z-[99991]
                    ${isVisibleState 
                        ? 'opacity-100 scale-100 translate-x-0 translate-y-0 duration-500 ease-[cubic-bezier(0.25,1.25,0.35,1)]' 
                        : 'opacity-0 scale-0 -translate-x-4 -translate-y-5 duration-300 ease-in-out'}
                `}
            >
              <div className="flex flex-col">
                 {options.map((opt, idx) => {
                     const isSelected = override === opt.id;
                     const isHighlighted = highlightedId === opt.id;
                     const isNextHighlighted = highlightedId === options[idx + 1]?.id;
                     const durationClass = (isSliding || isInitialDragActive) ? 'duration-0' : 'duration-200';

                     return (
                        <button
                           key={opt.id}
                           data-option-id={opt.id}
                           className={`
                               relative flex items-center justify-between w-full px-4 py-[12px] text-left outline-none
                               group transition-colors ${durationClass}
                               ${isHighlighted ? 'bg-gray-300/40 dark:bg-[#505050]/50' : 'bg-transparent'}
                           `}
                        >
                            <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                                 <div className="w-5 flex justify-center shrink-0">
                                    <Check 
                                        className={`w-4 h-4 text-black dark:text-white transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0'}`} 
                                        strokeWidth={2.5} 
                                    />
                                 </div>
                                 <span className="text-[17px] truncate text-black dark:text-white leading-none pb-[1px]">
                                    {opt.label}
                                 </span>
                            </div>
                            <div className="shrink-0 ml-3 text-black dark:text-white opacity-100 pointer-events-none">
                                {opt.icon}
                            </div>
                            {idx < options.length - 1 && (
                                <div className={`absolute bottom-0 right-0 left-0 h-[1px] ${isHighlighted || isNextHighlighted ? 'bg-transparent' : 'bg-gray-300/40 dark:bg-white/10'} pointer-events-none`} />
                            )}
                        </button>
                     );
                 })}
                 <div className="h-2 bg-gray-300/40 dark:bg-black/20" />
                 <button
                    data-option-id="disable_debug"
                    className={`
                        relative flex items-center justify-between w-full px-4 py-[12px] text-left outline-none
                        group transition-colors ${(isSliding || isInitialDragActive) ? 'duration-0' : 'duration-200'}
                        ${highlightedId === 'disable_debug' ? 'bg-gray-300/40 dark:bg-[#505050]/50' : 'bg-transparent'}
                    `}
                 >
                     <div className="flex items-center gap-3 min-w-0 pl-[28px] pointer-events-none">
                         <span className="text-[17px] truncate text-red-500 leading-none pb-[1px]">
                            Disable Debug
                         </span>
                     </div>
                     <div className="shrink-0 ml-3 text-red-500 opacity-100 pointer-events-none">
                        <Trash2 className="w-[18px] h-[18px]" />
                     </div>
                 </button>
              </div>
            </div>
        </>,
        document.body
      )}

      <Dialog 
        isOpen={showDisableAlert}
        onClose={() => setShowDisableAlert(false)}
        title="Desactivar debug mode"
        message="Ya no podrás acceder al menú hasta que lo vuelvas a activar"
        actions={disableActions}
      />
    </div>
  );
};
