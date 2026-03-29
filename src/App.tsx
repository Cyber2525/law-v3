import React, { useState, useEffect, useCallback } from 'react';
import { IOSHeader } from './components/IOSHeader';
import { ActionButtons } from './components/ActionButtons';
import { StreamingModal } from './components/StreamingModal';
import { RisksModal } from './components/RisksModal';
import { IOSToggle } from './components/IOSToggle';
import { DebugOSOverride } from './components/DebugOSOverride';

const App: React.FC = () => {
  // Detect system preference initially
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [risksModalOpen, setRisksModalOpen] = useState(false);
  const [hasViewedRisks, setHasViewedRisks] = useState(false);
  const [isStreamingCooldown, setIsStreamingCooldown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Manage isAnimating state to sync with drawer transitions
  useEffect(() => {
    const isOpen = risksModalOpen || streamingModalOpen;
    if (isOpen) {
      setIsAnimating(true);
    } else {
      // Wait for the 0.5s transition to finish before showing the filler
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [risksModalOpen, streamingModalOpen]);

  // Debug Visibility State (Persistent)
  const [isDebugVisible, setIsDebugVisible] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('DEBUG_MODE_ENABLED') === 'true';
    }
    return false;
  });

  // --- History Management for Modals ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
        const state = e.state || {};
        
        if (state.modal === 'streaming') {
            setStreamingModalOpen(true);
            setRisksModalOpen(false);
        } else if (state.modal === 'risks') {
            setRisksModalOpen(true);
            setStreamingModalOpen(false);
        } else {
            setStreamingModalOpen(false);
            setRisksModalOpen(false);
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openStreamingModal = useCallback(() => {
      if (isStreamingCooldown || streamingModalOpen) return;
      window.history.pushState({ ...window.history.state, modal: 'streaming' }, '');
      setStreamingModalOpen(true);
  }, [isStreamingCooldown, streamingModalOpen]);

  /**
   * Cierra el modal de streaming
   * @param wasInSubpage Indica si el usuario estaba en una categoría al cerrar
   */
  const closeStreamingModal = useCallback((wasInSubpage: boolean = false) => {
      // 1. Cerramos el modal visualmente
      setStreamingModalOpen(false);
      
      // 2. Activamos el cooldown SIEMPRE para dar feedback visual y bloqueo en el botón.
      // - Desde subpágina: 1.5s (permite limpiar navegación interna)
      // - Desde raíz: 0.5s (rápido, pero da feedback de cierre)
      setIsStreamingCooldown(true);
      const cooldownTime = wasInSubpage ? 1500 : 500;
      setTimeout(() => setIsStreamingCooldown(false), cooldownTime);

      // 3. Limpiamos el historial de navegación interna del modal
      const state = window.history.state || {};
      let depth = 0;
      if (state.streamingAlert) depth++;
      if (state.streamingCategory) depth++;
      if (state.modal === 'streaming') depth++;

      if (depth > 0) {
          window.history.go(-depth);
      }
  }, []);

  const openRisksModal = () => {
      setHasViewedRisks(true);
      window.history.pushState({ ...window.history.state, modal: 'risks' }, '');
      setRisksModalOpen(true);
  };

  const closeRisksModal = () => {
      setRisksModalOpen(false);
      if (window.history.state?.modal === 'risks') {
          window.history.back();
      }
  };
  // -------------------------------------

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const enableDebugMode = () => {
    setIsDebugVisible(true);
    localStorage.setItem('DEBUG_MODE_ENABLED', 'true');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const disableDebugMode = () => {
    setIsDebugVisible(false);
    localStorage.removeItem('DEBUG_MODE_ENABLED');
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Filler Background to hide rounded corners when static */}
      <div 
        className={`fixed inset-0 z-0 transition-colors duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'} ${isDarkMode ? 'bg-black' : 'bg-[#F2F2F7]'}`} 
      />

      <div vaul-drawer-wrapper="" className={`min-h-screen ${isDarkMode ? 'dark' : ''} relative z-10 overflow-hidden transition-colors duration-300`}>
        <div className={`min-h-screen flex flex-col items-center relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'text-white selection:bg-red-500/30' : 'text-black selection:bg-blue-500/30'}`}>
          
          {/* Base Background Layer */}
          <div className={`absolute inset-0 transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-[#F2F2F7]'}`} />
          
          {/* Smalling Dark Mode Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none portrait:block hidden"
            style={{
              backgroundColor: '#242426',
              opacity: isDarkMode ? 'var(--drawer-progress)' : '0',
              transition: 'opacity var(--drawer-transition-duration) cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          />
        
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg z-10">
        <IOSHeader 
            onOpenRisks={openRisksModal} 
            stopAnimation={hasViewedRisks}
        />
        
        <div className="absolute top-6 right-6 z-30 landscape:top-[70px] landscape:right-6 md:top-[70px] md:right-6 transition-all duration-300">
            <DebugOSOverride isVisible={isDebugVisible} onDisable={disableDebugMode} />
        </div>

        <div className={`
            flex items-center gap-3 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md pl-4 pr-1 py-1 rounded-full border border-black/5 dark:border-white/10 transition-colors duration-300 z-30
            relative -mt-[15px] mb-6
            landscape:absolute landscape:top-[17px] landscape:right-6 landscape:mt-0 landscape:mb-0
            md:absolute md:top-[17px] md:right-6 md:mt-0 md:mb-0
        `}>
            <span className="text-[15px] font-medium text-gray-900 dark:text-white mr-1 select-none">Modo Oscuro</span>
            <IOSToggle checked={isDarkMode} onChange={setIsDarkMode} />
        </div>
        
        <div className="flex-1" />

        <ActionButtons 
          onOpenStreaming={openStreamingModal} 
          onEnableDebug={enableDebugMode}
          isStreamingCooldown={isStreamingCooldown}
          isStreamingOpen={streamingModalOpen}
        />
      </div>

      <StreamingModal 
        isOpen={streamingModalOpen} 
        onClose={closeStreamingModal} 
      />

      <RisksModal
        isOpen={risksModalOpen}
        onClose={closeRisksModal}
      />
    </div>
    </div>
    </div>
  );
};

export default App;
