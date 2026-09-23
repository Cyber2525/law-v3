import React, { useState, useEffect } from 'react';
import { Link, Phone, MapPin, Newspaper, X, MessageCircle, Video, Info } from 'lucide-react';
import config from '../config.json';
import { DesktopModal } from './ui/DesktopModal';
import { BottomSheet } from './ui/BottomSheet';

function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }
    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);
    return () => result.removeEventListener("change", onChange);
  }, [query]);
  return value;
}

interface ContactCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactCardModal: React.FC<ContactCardModalProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery('(min-width: 600px) and (min-height: 600px)');
  const [isDismissable, setIsDismissable] = useState(false);

  // Custom Close Button states and handlers (matching Back Button physics)
  const [isCloseActive, setIsCloseActive] = useState(false);
  const [isCloseReentry, setIsCloseReentry] = useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const isPointerDownOnClose = React.useRef(false);
  const hasExitedCloseRef = React.useRef(false);
  const lastCloseDistRef = React.useRef(0);

  const handleClosePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      isPointerDownOnClose.current = true;
      setIsCloseReentry(false);
      setIsCloseActive(true);
      hasExitedCloseRef.current = false;
      lastCloseDistRef.current = 0;

      try {
          e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
  };

  const handleClosePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isPointerDownOnClose.current) return;
      e.stopPropagation();

      if (!closeButtonRef.current) return;
      const rect = closeButtonRef.current.getBoundingClientRect();
      const extraMargin = 50;
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.max(dx, dy);

      if (dist === 0) {
          hasExitedCloseRef.current = false;
          lastCloseDistRef.current = 0;
          if (!isCloseActive) {
              setIsCloseReentry(true);
              setIsCloseActive(true);
          }
      } else {
          const prevDist = lastCloseDistRef.current;
          lastCloseDistRef.current = dist;

          if (!hasExitedCloseRef.current) {
              hasExitedCloseRef.current = true;
              if (isCloseActive) {
                  setIsCloseActive(false);
              }
          } else {
              if (dist < prevDist - 0.5) {
                  if (dist <= extraMargin) {
                      if (!isCloseActive) {
                          setIsCloseReentry(true);
                          setIsCloseActive(true);
                      }
                  }
              } else if (dist > prevDist + 0.5) {
                  if (isCloseActive) {
                      setIsCloseActive(false);
                  }
              }
          }
      }
  };

  const handleClosePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
          e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (!isPointerDownOnClose.current) return;
      isPointerDownOnClose.current = false;

      const wasActive = isCloseActive;

      if (wasActive) {
          onClose();
          setTimeout(() => {
              setIsCloseActive(false);
              setIsCloseReentry(false);
          }, 300);
      } else {
          setIsCloseActive(false);
          setIsCloseReentry(false);
      }
  };

  const handleClosePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
          e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      isPointerDownOnClose.current = false;
      setIsCloseActive(false);
      setIsCloseReentry(false);
  };

  useEffect(() => {
    if (isOpen) {
      setIsDismissable(false);
      const timer = setTimeout(() => {
        setIsDismissable(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDrag = (e: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => {
    document.documentElement.setAttribute('data-drawer-dragging', 'true');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
  };

  const handleRelease = (e: React.PointerEvent<HTMLDivElement>, open: boolean) => {
    document.documentElement.removeAttribute('data-drawer-dragging');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0.8s');
  };

  const handleWeb = () => {
    window.open(config.contactCard.webUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCall = () => {
    window.location.href = `tel:${config.contactCard.phoneNumber}`;
  };

  const handleMap = () => {
    const debugOverride = (window as any).__DEBUG_OS_OVERRIDE__;
    let isIOS = false;
    if (debugOverride && debugOverride !== 'default') {
      if (debugOverride === 'ios') isIOS = true;
    } else {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    }

    if (isIOS) {
      window.location.href = config.contactCard.addressUrlApple;
    } else {
      window.open(config.contactCard.addressUrlGoogle, '_blank', 'noopener,noreferrer');
    }
  };

  const handleArticle = () => {
    window.open(config.contactCard.articleUrl, '_blank', 'noopener,noreferrer');
  };

  const contentJSX = (
    <div className="flex flex-col relative w-full rounded-t-[13px] md:rounded-[16px] overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e] md:bg-[#f2f2f7]/70 md:dark:bg-[#1c1c1e]/70 landscape:bg-[#f2f2f7]/70 landscape:dark:bg-[#1c1c1e]/70">
      <div className="absolute inset-0 backdrop-blur-xl -z-10 hidden md:block" />
      
      {/* Botón X con estilo RisksModal */}
      <button 
        ref={closeButtonRef}
        onPointerDown={handleClosePointerDown}
        onPointerMove={handleClosePointerMove}
        onPointerUp={handleClosePointerUp}
        onPointerCancel={handleClosePointerCancel}
        className={`absolute right-4 top-4 w-10 h-10 bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 outline-none touch-none pointer-events-auto cursor-pointer z-50 transition-opacity duration-300 gpu-accelerated ${
            isCloseActive ? 'opacity-30' : 'opacity-100'
        }`}
        style={{
            transitionDuration: (!isCloseActive || isCloseReentry) ? '300ms' : '0ms'
        }}
        aria-label="Cerrar"
      >
        <X className="w-6 h-6" strokeWidth={2.5} />
      </button>

      <div className="flex flex-col items-center pt-6 pb-3 px-4">
        <div className="w-[88px] h-[88px] rounded-full overflow-hidden mb-1.5">
          <img 
            src={config.contactCard.photo} 
            alt={config.contactCard.name} 
            className="w-full h-full object-cover bg-white" 
          />
        </div>
        <h2 className="text-[30px] font-bold text-black dark:text-white mb-0 tracking-tight">{config.contactCard.name}</h2>
        <p className="text-[#8e8e93] dark:text-gray-400 text-[17px] font-medium">{config.contactCard.subName}</p>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        <div className="flex justify-center gap-3">
          <button onClick={handleWeb} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Link className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Web</span>
          </button>
          <button onClick={handleCall} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Phone className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Llamar</span>
          </button>
          <button onClick={handleMap} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <MapPin className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Dirección</span>
          </button>
        </div>

        <button onClick={handleArticle} className="w-full bg-white dark:bg-[#2c2c2e] rounded-[12px] pl-4 pr-3 py-[12px] flex items-center justify-between active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
          <span className="text-black dark:text-white text-[18px] font-medium">{config.contactCard.articleButtonText}</span>
          <Info className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopModal
        isOpen={isOpen}
        onClose={onClose}
        containerClassName="flex flex-col w-[480px] max-h-[85vh]"
      >
        {contentJSX}
      </DesktopModal>
    );
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      isDismissable={isDismissable}
      shouldScaleBackground={false}
      title={config.contactCard.name}
      onDrag={handleDrag}
      onRelease={handleRelease}
      contentClassName="h-auto"
    >
      {contentJSX}
    </BottomSheet>
  );
};
