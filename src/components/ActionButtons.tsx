import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, PlayCircle, ExternalLink } from 'lucide-react';
import { IOSAlert } from './IOSAlert';

interface ActionButtonsProps {
  onOpenStreaming: () => void;
  onEnableDebug?: () => void;
  isStreamingCooldown?: boolean;
  isStreamingOpen?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onOpenStreaming, 
  onEnableDebug,
  isStreamingCooldown = false,
  isStreamingOpen = false
}) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const externalLink = "https://www.cultura.gob.es/cultura/propiedadintelectual/lucha-contra-la-pirateria.html";
  
  // Long Press Refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // --- History Management for Alert ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
        if (!e.state?.externalAlert) {
            setIsAlertOpen(false);
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAlert = () => {
      window.history.pushState({ ...window.history.state, externalAlert: true }, '');
      setIsAlertOpen(true);
  };

  const closeAlert = () => {
      if (window.history.state?.externalAlert) {
          window.history.back();
      } else {
          setIsAlertOpen(false);
      }
  };
  // ------------------------------------

  // --- Long Press Handlers ---
  const handleMouseDown = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        if (onEnableDebug) onEnableDebug();
    }, 5000); // 5 Seconds
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPress.current) {
        isLongPress.current = false;
        return;
    }
    const debugOverride = (window as any).__DEBUG_OS_OVERRIDE__;
    if (debugOverride && debugOverride !== 'default') {
        if (debugOverride === 'windows') {
            window.open(externalLink, '_blank', 'noopener,noreferrer');
            return;
        }
    }
    const isSmallScreen = window.innerWidth < 768;
    let isIOS = false;
    let isAndroid = false;
    let isMacOS = false;
    let isChromeOS = false;
    if (debugOverride && debugOverride !== 'default') {
        if (debugOverride === 'ios') isIOS = true;
        if (debugOverride === 'android') isAndroid = true;
        if (debugOverride === 'macos') isMacOS = true;
        if (debugOverride === 'chromeos') isChromeOS = true;
    } else {
        if (typeof navigator !== 'undefined') {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            isAndroid = /android/i.test(userAgent);
            isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
            if (!isIOS && !isAndroid) {
                isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                isChromeOS = /\bCrOS\b/.test(userAgent);
            }
        }
    }
    if ((isSmallScreen || isIOS || isAndroid) && !isMacOS && !isChromeOS) {
      openAlert();
    } else {
      window.open(externalLink, '_blank', 'noopener,noreferrer');
    }
  };

  const confirmExternalLink = () => {
    window.open(externalLink, '_blank', 'noopener,noreferrer');
    closeAlert();
  };

  // El botón es gris si el modal está abierto O si está en cooldown tras cerrar
  const isInactive = isStreamingOpen || isStreamingCooldown;

  return (
    <>
      <div className="w-full max-w-md px-6 pb-10 flex flex-col gap-4">
        <div className="flex flex-col gap-4 landscape:flex-row w-full">
          <button 
            onClick={() => window.location.href = 'https://www.google.com'}
            className="w-full h-14 min-h-[56px] landscape:flex-none landscape:w-[38%] shrink-0 glass-panel bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 border-2 border-black/5 dark:border-white/10 active:scale-[0.94] transition-all duration-300 rounded-2xl font-medium text-lg flex items-center justify-center text-gray-900 dark:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2 text-black dark:text-white transition-colors duration-300" />
            Volver atrás
          </button>

          <button 
            onClick={onOpenStreaming}
            disabled={isInactive}
            className={`
              w-full h-14 min-h-[56px] landscape:flex-1 shrink-0 
              rounded-2xl font-semibold text-lg flex items-center justify-center shadow-lg transition-all duration-300
              ${isInactive 
                ? 'bg-gray-400 dark:bg-gray-700 shadow-none cursor-not-allowed text-gray-200 dark:text-gray-500' 
                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 active:scale-[0.94] shadow-blue-500/20 text-white cursor-pointer'
              }
            `}
          >
            <PlayCircle className={`w-5 h-5 mr-2 transition-colors duration-300 ${isInactive ? 'text-gray-200 dark:text-gray-500' : 'text-white'}`} />
            alternativas legales
          </button>
        </div>
        
        <div className="pt-4 flex justify-center">
          <button 
            onClick={handleExternalClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className="text-base text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 flex items-center transition-colors duration-300 outline-none select-none"
          >
              🇪🇸 Ministerio de Cultura y Deporte <ExternalLink className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      <IOSAlert 
        isOpen={isAlertOpen}
        onClose={closeAlert}
        onAction={confirmExternalLink}
        title='¿Abrir "Ministerio de Cultura"?'
        message='Serás redirigido a "cultura.gob.es"'
      />
    </>
  );
};
