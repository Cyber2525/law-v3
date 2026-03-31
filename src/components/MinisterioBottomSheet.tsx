import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import * as Dialog from '@radix-ui/react-dialog';
import { Link, Phone, MapPin, Newspaper, X, MessageCircle, Video, Info } from 'lucide-react';
// @ts-ignore
import ministerioLogo from './Ministerio-de-Cultura.png';

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

interface MinisterioBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MinisterioBottomSheet: React.FC<MinisterioBottomSheetProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery('(min-width: 600px) and (min-height: 600px)');
  const [isDismissable, setIsDismissable] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDismissable(false);
      const timer = setTimeout(() => {
        setIsDismissable(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDrag = (e: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => {
    const progress = Math.max(0, Math.min(1, 1 - percentageDragged));
    document.documentElement.setAttribute('data-drawer-dragging', 'true');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
    document.documentElement.style.setProperty('--drawer-progress', progress.toString());
  };

  const handleRelease = (e: React.PointerEvent<HTMLDivElement>, open: boolean) => {
    document.documentElement.removeAttribute('data-drawer-dragging');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0.8s');
    document.documentElement.style.setProperty('--drawer-progress', open ? '1' : '0');
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
        <div className="w-[84px] h-[84px] rounded-full overflow-hidden mb-1.5">
          <img 
            src={ministerioLogo} 
            alt="Ministerio de Cultura" 
            className="w-full h-full object-cover bg-white" 
          />
        </div>
        <h2 className="text-[24px] font-bold text-black dark:text-white mb-0 tracking-tight">Ministerio de cultura</h2>
        <p className="text-[#8e8e93] dark:text-gray-400 text-[14px]">+34 917 017 000</p>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        <div className="flex justify-center gap-3">
          <button onClick={handleWeb} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[10px] pt-[14px] pb-[6px] flex flex-col items-center justify-center gap-1.5 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Link className="w-[20px] h-[20px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-black dark:text-white font-normal">Web</span>
          </button>
          <button onClick={handleCall} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[10px] pt-[14px] pb-[6px] flex flex-col items-center justify-center gap-1.5 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <Phone className="w-[20px] h-[20px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-black dark:text-white font-normal">Llamar</span>
          </button>
          <button onClick={handleMap} className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-[10px] pt-[14px] pb-[6px] flex flex-col items-center justify-center gap-1.5 active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
            <MapPin className="w-[20px] h-[20px] text-black dark:text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-black dark:text-white font-normal">Dirección</span>
          </button>
        </div>

        <button onClick={handleArticle} className="w-full bg-white dark:bg-[#2c2c2e] rounded-[10px] pl-4 pr-3 py-2 flex items-center justify-between active:bg-[#e5e5ea] dark:active:bg-[#3a3a3c] transition-colors">
          <span className="text-black dark:text-white text-[15px] font-normal">Ver el artículo anti piratería</span>
          <Info className="w-[20px] h-[20px] text-black dark:text-white" strokeWidth={1.5} />
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
          className={`relative w-[480px] max-h-[85vh] flex flex-col overflow-hidden isolation-isolate bg-[#f2f2f7]/70 dark:bg-[#1c1c1e]/70 rounded-[16px] shadow-2xl transform transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[100vh]'}`}
        >
          <Content />
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
          <Content />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
