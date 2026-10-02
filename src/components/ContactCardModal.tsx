import React, { useState, useEffect } from 'react';
import { Link, Phone, MapPin, Newspaper, X, MessageCircle, Video, Info } from 'lucide-react';
import config from '../config.json';
import { DesktopModal } from './ui/DesktopModal';
import { BottomSheet } from './ui/BottomSheet';
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from '../hooks/useMediaQuery';

interface ContactCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Hook to provide exact iOS button press physics (with cursor-out cancellation & re-entry) matching Button X
function useIOSButtonPress(onTrigger?: () => void) {
  const [isActive, setIsActive] = useState(false);
  const [isReentry, setIsReentry] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const isPointerDown = React.useRef(false);
  const hasExitedRef = React.useRef(false);
  const lastDistRef = React.useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    isPointerDown.current = true;
    setIsReentry(false);
    setIsActive(true);
    hasExitedRef.current = false;
    lastDistRef.current = 0;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDown.current) return;
    e.stopPropagation();

    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const extraMargin = 50;
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const dist = Math.max(dx, dy);

    if (dist === 0) {
      hasExitedRef.current = false;
      lastDistRef.current = 0;
      if (!isActive) {
        setIsReentry(true);
        setIsActive(true);
      }
    } else {
      const prevDist = lastDistRef.current;
      lastDistRef.current = dist;

      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        if (isActive) {
          setIsActive(false);
        }
      } else {
        if (dist < prevDist - 0.5) {
          if (dist <= extraMargin) {
            if (!isActive) {
              setIsReentry(true);
              setIsActive(true);
            }
          }
        } else if (dist > prevDist + 0.5) {
          if (isActive) {
            setIsActive(false);
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (!isPointerDown.current) return;
    isPointerDown.current = false;

    const wasActive = isActive;

    if (wasActive) {
      if (onTrigger) onTrigger();
      setTimeout(() => {
        setIsActive(false);
        setIsReentry(false);
      }, 300);
    } else {
      setIsActive(false);
      setIsReentry(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    isPointerDown.current = false;
    setIsActive(false);
    setIsReentry(false);
  };

  return {
    isActive,
    isReentry,
    buttonRef,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    style: {
      transitionDuration: (!isActive || isReentry) ? '300ms' : '0ms'
    }
  };
}

export const ContactCardModal: React.FC<ContactCardModalProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [isDismissable, setIsDismissable] = useState(false);

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

  // Button tracking hooks with the exact cursor-out physics as button X
  const closeBtn = useIOSButtonPress(onClose);
  const webBtn = useIOSButtonPress(handleWeb);
  const callBtn = useIOSButtonPress(handleCall);
  const mapBtn = useIOSButtonPress(handleMap);
  const articleBtn = useIOSButtonPress(handleArticle);

  useEffect(() => {
    if (isOpen) {
      setIsDismissable(false);
      const timer = setTimeout(() => {
        setIsDismissable(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDrag = () => {
    // Resizing background animation is disabled for contact card
  };

  const handleRelease = () => {
    // Resizing background animation is disabled for contact card
  };

  const contentJSX = (
    <div className={`flex flex-col relative w-full rounded-t-[13px] md:rounded-[16px] overflow-hidden ${isDesktop ? 'bg-transparent' : 'bg-[#f2f2f7] dark:bg-[#1c1c1e]'}`}>
      {isDesktop && (
        <div 
          className="absolute inset-0 backdrop-blur-xl -z-10 pointer-events-none" 
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        />
      )}
      
      {/* Botón X con estilo RisksModal */}
      <button 
        ref={closeBtn.buttonRef}
        {...closeBtn.handlers}
        className={`absolute right-4 top-4 w-10 h-10 bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 outline-none touch-none pointer-events-auto cursor-pointer z-50 transition-opacity duration-300 gpu-accelerated ${
            closeBtn.isActive ? 'opacity-30' : 'opacity-100'
        }`}
        style={closeBtn.style}
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
          <button 
            ref={webBtn.buttonRef}
            {...webBtn.handlers}
            className={`flex-1 rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] transition-colors duration-300 outline-none touch-none select-none cursor-pointer gpu-accelerated ${
              webBtn.isActive ? 'bg-[#e5e5ea] dark:bg-[#3a3a3c]' : 'bg-white dark:bg-[#242426]'
            }`}
            style={webBtn.style}
          >
            <Link className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Web</span>
          </button>
          <button 
            ref={callBtn.buttonRef}
            {...callBtn.handlers}
            className={`flex-1 rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] transition-colors duration-300 outline-none touch-none select-none cursor-pointer gpu-accelerated ${
              callBtn.isActive ? 'bg-[#e5e5ea] dark:bg-[#3a3a3c]' : 'bg-white dark:bg-[#242426]'
            }`}
            style={callBtn.style}
          >
            <Phone className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Llamar</span>
          </button>
          <button 
            ref={mapBtn.buttonRef}
            {...mapBtn.handlers}
            className={`flex-1 rounded-[12px] pt-[15px] pb-[6px] flex flex-col items-center justify-between min-h-[78px] transition-colors duration-300 outline-none touch-none select-none cursor-pointer gpu-accelerated ${
              mapBtn.isActive ? 'bg-[#e5e5ea] dark:bg-[#3a3a3c]' : 'bg-white dark:bg-[#242426]'
            }`}
            style={mapBtn.style}
          >
            <MapPin className="w-[26px] h-[26px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[17px] text-black dark:text-white font-medium">Dirección</span>
          </button>
        </div>

        <button 
          ref={articleBtn.buttonRef}
          {...articleBtn.handlers}
          className={`w-full rounded-[12px] pl-4 pr-3 py-[12px] flex items-center justify-between transition-colors duration-300 outline-none touch-none select-none cursor-pointer gpu-accelerated ${
            articleBtn.isActive ? 'bg-[#e5e5ea] dark:bg-[#3a3a3c]' : 'bg-white dark:bg-[#242426]'
          }`}
          style={articleBtn.style}
        >
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
