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

  const Content = () => (
    <div className="flex flex-col relative w-full rounded-t-[13px] md:rounded-[16px] overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e] md:bg-[#f2f2f7]/70 md:dark:bg-[#1c1c1e]/70 landscape:bg-[#f2f2f7]/70 landscape:dark:bg-[#1c1c1e]/70">
      <div className="absolute inset-0 backdrop-blur-xl -z-10 hidden md:block" />
      
      {/* Botón X con estilo RisksModal */}
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 w-10 h-10 bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10 active:opacity-60 active:scale-90 transition-all duration-300 outline-none touch-none pointer-events-auto cursor-pointer z-50"
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
        <Content />
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
      <Content />
    </BottomSheet>
  );
};
