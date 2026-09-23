import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, ExternalLink } from 'lucide-react';
import { ContactCardModal } from './ContactCardModal';
import { usePressTracking } from '../hooks/usePressTracking';
import config from '../config.json';

interface ActionButtonsProps {
  onOpenStreaming: () => void;
  onEnableDebug?: () => void;
  isStreamingOpen?: boolean;
  isRisksOpen?: boolean;
  isStreamingCooldown?: boolean;
  isRisksCooldown?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onOpenStreaming, 
  onEnableDebug,
  isStreamingOpen = false,
  isRisksOpen = false,
  isStreamingCooldown = false,
  isRisksCooldown = false
}) => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // --- History Management for Alert ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
        if (!e.state?.externalAlert) {
            setIsBottomSheetOpen(false);
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAlert = () => {
      window.history.pushState({ ...window.history.state, externalAlert: true }, '');
      setIsBottomSheetOpen(true);
  };

  const closeAlert = () => {
      if (window.history.state?.externalAlert) {
          window.history.back();
      } else {
          setIsBottomSheetOpen(false);
      }
  };
  // ------------------------------------

  // El botón azul (alternativas legales) es gris SOLO si el modal de streaming está abierto O en cooldown de streaming
  const isStreamingInactive = isStreamingOpen || isStreamingCooldown;
  // El link externo solo se bloquea si el modal de streaming está abierto
  const isLinkInactive = isStreamingOpen;

  // --- Button 1: Volver atrás ---
  const backButtonTracking = usePressTracking({
    onTrigger: () => {
      window.location.href = 'https://www.google.com';
    }
  });

  // --- Button 2: alternativas legales ---
  const streamingButtonTracking = usePressTracking({
    disabled: isStreamingInactive,
    onTrigger: onOpenStreaming,
  });

  // --- Button 3: Ministerio de Cultura ---
  const ministerioButtonTracking = usePressTracking({
    disabled: isLinkInactive,
    onTrigger: openAlert,
    onLongPress: onEnableDebug ? {
      callback: onEnableDebug,
      durationMs: 5000,
    } : undefined,
  });

  return (
    <>
      <div className="w-full max-w-md px-6 pb-10 flex flex-col gap-4">
        <div className="flex flex-col gap-4 landscape:flex-row md:flex-row w-full">
          <motion.button 
            ref={backButtonTracking.buttonRef}
            {...backButtonTracking.pointerEvents}
            animate={backButtonTracking.isPressed ? { scale: 0.92 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            style={{ willChange: 'transform, background-color, border-color, color' }}
            className="w-full h-14 min-h-[56px] landscape:flex-none landscape:w-[38%] md:flex-none md:w-[38%] shrink-0 bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 border-2 border-black/5 dark:border-white/10 transition-[background-color,border-color,color] duration-300 rounded-2xl font-medium text-lg flex items-center justify-center text-gray-900 dark:text-white cursor-pointer select-none touch-none"
          >
            <ArrowLeft className="w-5 h-5 mr-2 text-black dark:text-white transition-colors duration-300 pointer-events-none" />
            Volver atrás
          </motion.button>

          <motion.button 
            ref={streamingButtonTracking.buttonRef}
            {...streamingButtonTracking.pointerEvents}
            disabled={isStreamingInactive}
            animate={streamingButtonTracking.isPressed && !isStreamingInactive ? { scale: 0.92 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`
              w-full h-14 min-h-[56px] landscape:flex-1 md:flex-1 shrink-0 
              rounded-2xl font-semibold text-lg flex items-center justify-center shadow-lg transition-[background-color,border-color,color,box-shadow] duration-300 select-none touch-none
              ${isStreamingInactive 
                ? 'bg-gray-400 dark:bg-gray-700 shadow-none cursor-not-allowed text-gray-200 dark:text-gray-500' 
                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 shadow-blue-500/20 text-white cursor-pointer'
              }
            `}
          >
            <PlayCircle className={`w-5 h-5 mr-2 transition-colors duration-300 pointer-events-none ${isStreamingInactive ? 'text-gray-200 dark:text-gray-500' : 'text-white'}`} />
            alternativas legales
          </motion.button>
        </div>
        
        <div className="pt-4 flex justify-center">
          <button 
            ref={ministerioButtonTracking.buttonRef}
            {...ministerioButtonTracking.pointerEvents}
            disabled={isLinkInactive}
            className={`text-base flex items-center outline-none select-none touch-none transition-opacity duration-300 gpu-accelerated ${
                isLinkInactive 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer ${
                    ministerioButtonTracking.isPressed ? 'opacity-30' : 'opacity-100'
                  }`
            }`}
            style={{
              transitionDuration: (!ministerioButtonTracking.isPressed || ministerioButtonTracking.isReentry) ? '300ms' : '0ms'
            }}
          >
              {config.mainPage.bottomButtonText} <ExternalLink className="w-5 h-5 ml-1 pointer-events-none" />
          </button>
        </div>
      </div>

      <ContactCardModal 
        isOpen={isBottomSheetOpen}
        onClose={closeAlert}
      />
    </>
  );
};
