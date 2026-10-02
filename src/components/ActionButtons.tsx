import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, ExternalLink } from 'lucide-react';
import { ContactCardModal } from './ContactCardModal';
import { usePressTracking } from '../hooks/usePressTracking';
import config from '../config.json';

interface ActionButtonsProps {
  onOpenStreaming: () => void;
  onOpenMinisterio?: () => void;
  onEnableDebug?: () => void;
  onGoBack?: () => void;
  isStreamingOpen?: boolean;
  isRisksOpen?: boolean;
  isMinisterioOpen?: boolean;
  isStreamingCooldown?: boolean;
  isRisksCooldown?: boolean;
  isDarkMode?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onOpenStreaming, 
  onOpenMinisterio,
  onEnableDebug,
  onGoBack,
  isStreamingOpen = false,
  isRisksOpen = false,
  isMinisterioOpen = false,
  isStreamingCooldown = false,
  isRisksCooldown = false,
  isDarkMode = false
}) => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // --- History Management for Alert ---
  useEffect(() => {
    if (onOpenMinisterio) return;
    const handlePopState = (e: PopStateEvent) => {
        if (!e.state?.externalAlert) {
            setIsBottomSheetOpen(false);
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onOpenMinisterio]);

  const openAlert = () => {
      if (onOpenMinisterio) {
          onOpenMinisterio();
          return;
      }
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
  // El link externo solo se bloquea si algún modal está abierto
  const isLinkInactive = isStreamingOpen || isRisksOpen || isMinisterioOpen;

  // --- Button 1: Volver atrás (regresa al origen/inicio nativo sin imponer buscadores comerciales ni violar leyes antimonopolio) ---
  const lastBackTriggerRef = useRef(0);

  const handleBackAction = () => {
    const now = Date.now();
    if (now - lastBackTriggerRef.current < 500) return;
    lastBackTriggerRef.current = now;

    // 1. Si la pestaña tiene historial de navegación, retroceder al origen nativo (la página de inicio/Nueva Pestaña o búsqueda del usuario).
    // Esto preserva la página configurada por el usuario en su navegador sin favorecer a ningún buscador privado.
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }

    // 2. Intentar cerrar la pestaña si fue abierta como ventana emergente o por script
    try {
      window.open('', '_self');
      window.close();
    } catch (_) {}

    try {
      window.close();
    } catch (_) {}

    // 3. Si no hay historial ni el navegador permite cerrar por script:
    // Volver al referrer externo si existe, o al portal institucional público del Ministerio (100% neutral y legal)
    setTimeout(() => {
      try {
        window.close();
      } catch (_) {}

      if (typeof document !== 'undefined' && document.referrer && !document.referrer.includes(window.location.host)) {
        try {
          window.location.replace(document.referrer);
          return;
        } catch (_) {}
      }

      const institutionalUrl = config.contactCard?.webUrl || 'https://www.cultura.gob.es/';
      try {
        window.location.replace(institutionalUrl);
      } catch (_) {
        window.location.href = institutionalUrl;
      }
    }, 150);
  };

  const backButtonTracking = usePressTracking({
    onTrigger: handleBackAction
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
            onClick={handleBackAction}
            animate={backButtonTracking.isPressed ? { scale: 0.92 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            style={{ willChange: 'transform, background-color, border-color, color' }}
            className={`w-full h-14 min-h-[56px] landscape:flex-none landscape:w-[38%] md:flex-none md:w-[38%] shrink-0 border-2 rounded-2xl font-medium text-lg flex items-center justify-center cursor-pointer select-none touch-none transition-colors duration-[400ms] ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white' 
                : 'bg-white/60 hover:bg-white/80 border-black/5 text-gray-900'
            }`}
          >
            <ArrowLeft className={`w-5 h-5 mr-2 pointer-events-none transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-black'}`} />
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

      {!onOpenMinisterio && (
        <ContactCardModal 
          isOpen={isBottomSheetOpen}
          onClose={closeAlert}
        />
      )}
    </>
  );
};
