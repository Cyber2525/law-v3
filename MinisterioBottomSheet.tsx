import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import * as Dialog from '@radix-ui/react-dialog';
import { Link, Phone, MapPin, Newspaper, X, MessageCircle, Video, Info } from 'lucide-react';
// @ts-ignore
import ministerioLogo from './Ministerio-de-Cultura.png';
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from './src/hooks/useMediaQuery';

interface MinisterioBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MinisterioBottomSheet: React.FC<MinisterioBottomSheetProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [isDismissable, setIsDismissable] = useState(false);

  // Custom Close Button states and handlers (matching Back Button physics)
  const [isCloseActive, setIsCloseActive] = useState(false);
  const [isCloseReentry, setIsCloseReentry] = useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const isPointerDownOnClose = React.useRef(false);

  const handleClosePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      isPointerDownOnClose.current = true;
      setIsCloseReentry(false);
      setIsCloseActive(true);

      try {
          e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
  };

  const handleClosePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!isPointerDownOnClose.current) return;
      e.stopPropagation();

      if (!closeButtonRef.current) return;
      const rect = closeButtonRef.current.getBoundingClientRect();

      const isInside = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
      );

      if (isInside) {
          if (!isCloseActive) {
              setIsCloseReentry(true);
              setIsCloseActive(true);
          }
      } else {
          if (isCloseActive) {
              setIsCloseActive(false);
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
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDrag = () => {
    // Resizing background animation is disabled for contact card
  };

  const handleRelease = () => {
    // Resizing background animation is disabled for contact card
  };

  const handleWeb = () => {
    window.open('https://www.cultura.gob.es/', '_blank', 'noopener,noreferrer');
  };

  const handleCall = () => {
    window.location.href = 'tel:917017000';
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
      window.location.href = 'https://maps.apple/p/gVv1Mf3fF0rhE4';
    } else {
      window.open('https://maps.app.goo.gl/F8wScksuT1ubGc8L9', '_blank', 'noopener,noreferrer');
    }
  };

  const handleArticle = () => {
    window.open('https://www.cultura.gob.es/cultura/propiedadintelectual/lucha-contra-la-pirateria.html', '_blank', 'noopener,noreferrer');
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
        <div className="w-[100px] h-[100px] rounded-full overflow-hidden mb-2">
          <img 
            src={ministerioLogo} 
            alt="Ministerio de Cultura" 
            className="w-full h-full object-cover bg-white" 
          />
        </div>
        <h2 className="text-[30px] font-bold text-black dark:text-white mb-0 tracking-tight">Ministerio de cultura</h2>
        <p className="text-[#8e8e93] dark:text-gray-400 text-[18px] font-medium">+34 917 017 000</p>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        <div className="flex justify-center gap-3">
          <button onClick={handleWeb} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[24px] pb-[14px] flex flex-col items-center justify-center gap-2 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Link className="w-[28px] h-[28px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[14px] text-black dark:text-white font-medium">Web</span>
          </button>
          <button onClick={handleCall} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[24px] pb-[14px] flex flex-col items-center justify-center gap-2 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Phone className="w-[28px] h-[28px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[14px] text-black dark:text-white font-medium">Llamar</span>
          </button>
          <button onClick={handleMap} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[12px] pt-[24px] pb-[14px] flex flex-col items-center justify-center gap-2 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <MapPin className="w-[28px] h-[28px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[14px] text-black dark:text-white font-medium">Dirección</span>
          </button>
        </div>

        <button onClick={handleArticle} className="w-full bg-white dark:bg-[#2c2c2e] rounded-[12px] pl-5 pr-4 py-5 flex items-center justify-between active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
          <span className="text-black dark:text-white text-[19px] font-medium">Ver el artículo anti piratería</span>
          <Info className="w-[28px] h-[28px] text-black dark:text-white" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'visible' : 'invisible delay-[800ms] pointer-events-none'}`}>
        <div 
          className={`absolute inset-0 bg-black/[0.13] transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <div 
          className={`relative w-[480px] max-w-[calc(100vw-32px)] max-h-[85vh] flex flex-col overflow-hidden isolation-isolate bg-[#f2f2f7]/70 dark:bg-[#1c1c1e]/70 rounded-[16px] shadow-2xl transform transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[100vh]'}`}
        >
          {contentJSX}
        </div>
      </div>
    );
  }

  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      shouldScaleBackground={false}
      dismissible={isDismissable}
      onDrag={handleDrag}
      onRelease={handleRelease}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/[0.13] z-50 transition-opacity" />
        <Drawer.Content className="bg-[#f2f2f7] dark:bg-[#1c1c1e] flex flex-col rounded-t-[13px] h-auto fixed bottom-0 left-0 right-0 z-50 outline-none shadow-2xl landscape:rounded-t-[13px] landscape:rounded-b-none landscape:left-[19px] landscape:right-[19px] landscape:bottom-0 landscape:mx-auto landscape:max-w-lg">
          <Drawer.Title className="sr-only">Ministerio de cultura</Drawer.Title>
          {contentJSX}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
