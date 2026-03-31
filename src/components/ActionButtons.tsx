import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, ExternalLink } from 'lucide-react';
import { MinisterioBottomSheet } from './MinisterioBottomSheet';

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
  const externalLink = "https://www.cultura.gob.es/cultura/propiedadintelectual/lucha-contra-la-pirateria.html";
  
  // Long Press Refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

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
    openAlert();
  };

  // El botón azul (alternativas legales) es gris SOLO si el modal de streaming está abierto O en cooldown de streaming
  const isStreamingInactive = isStreamingOpen || isStreamingCooldown;
  // El link externo solo se bloquea si el modal de streaming está abierto
  const isLinkInactive = isStreamingOpen;

  return (
    <>
      <div className="w-full max-w-md px-6 pb-10 flex flex-col gap-4">
        <div className="flex flex-col gap-4 landscape:flex-row w-full">
          <motion.button 
            onClick={() => window.location.href = 'https://www.google.com'}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            style={{ willChange: 'transform, background-color, border-color, color' }}
            className="w-full h-14 min-h-[56px] landscape:flex-none landscape:w-[38%] shrink-0 bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 border-2 border-black/5 dark:border-white/10 transition-[background-color,border-color,color] duration-300 rounded-2xl font-medium text-lg flex items-center justify-center text-gray-900 dark:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 mr-2 text-black dark:text-white transition-colors duration-300" />
            Volver atrás
          </motion.button>

          <motion.button 
            onClick={onOpenStreaming}
            disabled={isStreamingInactive}
            whileTap={!isStreamingInactive ? { scale: 0.92 } : {}}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`
              w-full h-14 min-h-[56px] landscape:flex-1 shrink-0 
              rounded-2xl font-semibold text-lg flex items-center justify-center shadow-lg transition-[background-color,border-color,color,box-shadow] duration-300
              ${isStreamingInactive 
                ? 'bg-gray-400 dark:bg-gray-700 shadow-none cursor-not-allowed text-gray-200 dark:text-gray-500' 
                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 shadow-blue-500/20 text-white cursor-pointer'
              }
            `}
          >
            <PlayCircle className={`w-5 h-5 mr-2 transition-colors duration-300 ${isStreamingInactive ? 'text-gray-200 dark:text-gray-500' : 'text-white'}`} />
            alternativas legales
          </motion.button>
        </div>
        
        <div className="pt-4 flex justify-center">
          <button 
            onClick={handleExternalClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={isLinkInactive}
            className={`text-base flex items-center transition-all duration-200 outline-none select-none ${
                isLinkInactive 
                ? 'text-gray-400 dark:text-gray-700 cursor-not-allowed' 
                : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer opacity-100 active:opacity-50'
            }`}
          >
              🇪🇸 Ministerio de Cultura y Deporte <ExternalLink className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      <MinisterioBottomSheet 
        isOpen={isBottomSheetOpen}
        onClose={closeAlert}
      />
    </>
  );
};
