import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MainContent } from './components/MainContent';
import { ActionButtons } from './components/ActionButtons';
import { StreamingModal } from './components/StreamingModal';
import { RisksModal } from './components/RisksModal';
import { ContactCardModal } from './components/ContactCardModal';
import { BrowserStartPage } from './components/BrowserStartPage';
import { NativeToggle } from './components/ui/NativeToggle';
import { StoreProviderSwitcher } from './components/StoreProviderSwitcher';
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from './hooks/useMediaQuery';

const App: React.FC = () => {
  // Detect system preference initially
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const isLandscape = useMediaQuery('(orientation: landscape)');
  
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [risksModalOpen, setRisksModalOpen] = useState(false);
  const [ministerioModalOpen, setMinisterioModalOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.history.state?.page === 'home';
    }
    return false;
  });
  const [hasViewedRisks, setHasViewedRisks] = useState(false);
  const [isStreamingCooldown, setIsStreamingCooldown] = useState(false);
  const [isRisksCooldown, setIsRisksCooldown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastModalRef = useRef<'risks' | 'streaming' | 'ministerio' | null>(null);

  // Sync document title with current page
  useEffect(() => {
    if (isHomePage) {
      document.title = 'Página de inicio';
    } else {
      document.title = 'Acceso Restringido';
    }
  }, [isHomePage]);

  // Track which modal was last opened to maintain correct colors during closing animation
  useEffect(() => {
    if (risksModalOpen) lastModalRef.current = 'risks';
    else if (streamingModalOpen) lastModalRef.current = 'streaming';
    else if (ministerioModalOpen) lastModalRef.current = 'ministerio';
  }, [risksModalOpen, streamingModalOpen, ministerioModalOpen]);

  // Refs for cooldown timers and transition state to prevent race conditions
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const risksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const isInitialMount = useRef(true);

  // Manage global CSS variables and transition state
  useEffect(() => {
    // Only Streaming and Risks modals animate/scale the background
    const isScalingModalOpen = risksModalOpen || streamingModalOpen;
    const isAnyModalOpen = isScalingModalOpen || ministerioModalOpen;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
      document.documentElement.style.setProperty('--drawer-progress', '0');
      if (!isAnyModalOpen) return; // Skip closing animation on mount
    }

    if (isAnyModalOpen) {
      setIsAnimating(true);
      isTransitioningRef.current = true;
      
      // Specifically disable background resizing animation for Contact Card (ministerio)
      if (!isDesktop && isScalingModalOpen) {
        document.documentElement.style.setProperty('--drawer-transition-duration', '0.5s');
        document.documentElement.style.setProperty('--drawer-progress', '1');
      } else {
        document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
      }

      const timer = setTimeout(() => {
        setIsAnimating(false); // Reset animating state after opening
        isTransitioningRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true); // Set animating to true when starting to close
      isTransitioningRef.current = true;
      
      // Only animate background back if the closing modal had scaling enabled
      if (!isDesktop && lastModalRef.current !== 'ministerio') {
        document.documentElement.style.setProperty('--drawer-transition-duration', '0.5s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
      } else {
        document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
      }

      const timer = setTimeout(() => {
        setIsAnimating(false);
        isTransitioningRef.current = false;
        document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [risksModalOpen, streamingModalOpen, ministerioModalOpen, isDesktop]);

  // Debug Visibility State (Persistent)
  const [isDebugVisible, setIsDebugVisible] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('DEBUG_MODE_ENABLED') === 'true';
    }
    return false;
  });

  // --- History Management for Modals and Home Page ---
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
        const state = e.state || {};
        
        if (state.page === 'home') {
            setIsHomePage(true);
            setStreamingModalOpen(false);
            setRisksModalOpen(false);
            setMinisterioModalOpen(false);
        } else {
            setIsHomePage(false);
            if (state.modal === 'streaming') {
                setStreamingModalOpen(true);
                setRisksModalOpen(false);
                setMinisterioModalOpen(false);
            } else if (state.modal === 'risks') {
                setRisksModalOpen(true);
                setStreamingModalOpen(false);
                setMinisterioModalOpen(false);
            } else if (state.modal === 'ministerio' || state.externalAlert) {
                setMinisterioModalOpen(true);
                setStreamingModalOpen(false);
                setRisksModalOpen(false);
            } else {
                setStreamingModalOpen(false);
                setRisksModalOpen(false);
                setMinisterioModalOpen(false);
            }
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGoHome = useCallback(() => {
    window.history.pushState({ ...window.history.state, page: 'home' }, '');
    setIsHomePage(true);
  }, []);

  const handleReturnFromHome = useCallback(() => {
    if (window.history.state?.page === 'home') {
      window.history.back();
    } else {
      setIsHomePage(false);
    }
  }, []);

  const openStreamingModal = useCallback(() => {
      // Prevent opening if already open, in cooldown, or transitioning
      if (isStreamingCooldown || streamingModalOpen || risksModalOpen || ministerioModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      window.history.pushState({ ...window.history.state, modal: 'streaming' }, '');
      setStreamingModalOpen(true);
  }, [isStreamingCooldown, streamingModalOpen, risksModalOpen, ministerioModalOpen]);

  /**
   * Cierra el modal de streaming
   * @param wasInSubpage Indica si el usuario estaba en una categoría al cerrar
   */
  const closeStreamingModal = useCallback((wasInSubpage: boolean = false) => {
      if (!streamingModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      // 1. Cerramos el modal visualmente
      setStreamingModalOpen(false);
      
      // 2. Activamos el cooldown SIEMPRE para dar feedback visual y bloqueo en el botón.
      if (streamingTimerRef.current) clearTimeout(streamingTimerRef.current);
      
      setIsStreamingCooldown(true);
      const cooldownTime = wasInSubpage ? 1000 : 500;
      streamingTimerRef.current = setTimeout(() => {
          setIsStreamingCooldown(false);
          streamingTimerRef.current = null;
      }, cooldownTime);

      // 3. Limpiamos el historial de navegación interna del modal
      const state = window.history.state || {};
      let depth = 0;
      if (state.streamingAlert) depth++;
      if (state.streamingCategory) depth++;
      if (state.modal === 'streaming') depth++;

      if (depth > 0) {
          window.history.go(-depth);
      }
  }, [streamingModalOpen]);

  const openRisksModal = useCallback(() => {
      if (isRisksCooldown || risksModalOpen || streamingModalOpen || ministerioModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      setHasViewedRisks(true);
      window.history.pushState({ ...window.history.state, modal: 'risks' }, '');
      setRisksModalOpen(true);
  }, [isRisksCooldown, risksModalOpen, streamingModalOpen, ministerioModalOpen]);

  const closeRisksModal = useCallback((activeSegment?: 'legal' | 'security') => {
      if (!risksModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      setRisksModalOpen(false);
      
      // Cooldown for Risks button (500ms for legal, 1000ms for security)
      if (risksTimerRef.current) clearTimeout(risksTimerRef.current);
      
      setIsRisksCooldown(true);
      const cooldownTime = activeSegment === 'security' ? 1000 : 500;
      risksTimerRef.current = setTimeout(() => {
          setIsRisksCooldown(false);
          risksTimerRef.current = null;
      }, cooldownTime);

      if (window.history.state?.modal === 'risks') {
          window.history.back();
      }
  }, [risksModalOpen]);

  const openMinisterioModal = useCallback(() => {
      if (ministerioModalOpen || streamingModalOpen || risksModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      window.history.pushState({ ...window.history.state, modal: 'ministerio', externalAlert: true }, '');
      setMinisterioModalOpen(true);
  }, [ministerioModalOpen, streamingModalOpen, risksModalOpen]);

  const closeMinisterioModal = useCallback(() => {
      if (!ministerioModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      setMinisterioModalOpen(false);
      setTimeout(() => {
          isTransitioningRef.current = false;
      }, 500);

      if (window.history.state?.externalAlert || window.history.state?.modal === 'ministerio') {
          window.history.back();
      }
  }, [ministerioModalOpen]);
  // -------------------------------------

  // --- Theme Color Management ---
  const lastTopColorRef = useRef<string | null>(null);
  
  useEffect(() => {
    const anyDrawerOpen = streamingModalOpen || risksModalOpen || ministerioModalOpen;
    // We want to keep the drawer theme color while it's opening OR closing (animating)
    const activeDrawer = anyDrawerOpen || isAnimating;
    const isBottomSheet = activeDrawer && !isDesktop;
    
    // Default App Backgrounds
    const APP_BG_LIGHT = '#F2F2F7';
    const APP_BG_DARK = '#0a0a0a';
    
    // Drawer Backgrounds
    const DRAWER_BG_LIGHT = '#F2F2F7';
    const DRAWER_BG_DARK = '#1c1c1e';

    let topColor = isDarkMode ? APP_BG_DARK : APP_BG_LIGHT;
    let bottomColor = isDarkMode ? APP_BG_DARK : APP_BG_LIGHT;

    if (isBottomSheet) {
      // Bottom color matches drawer background
      bottomColor = isDarkMode ? DRAWER_BG_DARK : DRAWER_BG_LIGHT;
      
      const currentModal = streamingModalOpen ? 'streaming' : risksModalOpen ? 'risks' : ministerioModalOpen ? 'ministerio' : lastModalRef.current;
      if (!isLandscape && currentModal !== 'ministerio') {
        // Portrait bottom sheet with scaled background: Top turns black
        topColor = '#000000';
      } else {
        // Horizontal bottom sheet or non-scaling contact card: Top remains app background
        topColor = isDarkMode ? APP_BG_DARK : APP_BG_LIGHT;
      }
    }

    // Update meta tags with optimization to avoid unnecessary updates (helps with Safari lag)
    const updateMeta = (color: string) => {
      if (lastTopColorRef.current === color) return false;
      lastTopColorRef.current = color;

      const metas = document.querySelectorAll('meta[name="theme-color"]');
      let changed = false;
      metas.forEach(meta => {
        if (meta.getAttribute('content') !== color) {
          meta.setAttribute('content', color);
          changed = true;
        }
      });
      
      if (metas.length === 0) {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', color);
        document.head.appendChild(meta);
        changed = true;
      }
      return changed;
    };

    updateMeta(topColor);
    if (document.body.style.backgroundColor !== bottomColor) {
      document.body.style.backgroundColor = bottomColor;
    }

  }, [isDarkMode, streamingModalOpen, risksModalOpen, ministerioModalOpen, isDesktop, isLandscape, isAnimating]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleRef = useRef<HTMLDivElement>(null);
  const isDarkModeRef = useRef(isDarkMode);
  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  // Listener del navegador (Opción 2):
  // Si el modo del navegador difiere del de la página (por evento de cambio o al regresar el foco/visibilidad),
  // se hace click sobre el toggle en lugar de mutar el estado directamente.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncWithBrowserIfDifferent = () => {
      const browserIsDark = mediaQuery.matches;
      if (browserIsDark !== isDarkModeRef.current) {
        const toggleEl = toggleRef.current || document.getElementById('native-toggle-theme');
        if (toggleEl) {
          toggleEl.click();
        } else {
          setIsDarkMode(browserIsDark);
        }
      }
    };

    const handleMediaChange = () => {
      syncWithBrowserIfDifferent();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    const handleFocusOrVisibility = () => {
      syncWithBrowserIfDifferent();
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, []);

  const enableDebugMode = () => {
    setIsDebugVisible(true);
    localStorage.setItem('DEBUG_MODE_ENABLED', 'true');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const disableDebugMode = () => {
    setIsDebugVisible(false);
    localStorage.removeItem('DEBUG_MODE_ENABLED');
  };

  if (isHomePage) {
    return (
      <BrowserStartPage
        isDarkMode={isDarkMode}
        onReturnToNotice={handleReturnFromHome}
        onToggleDarkMode={setIsDarkMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      <div vaul-drawer-wrapper="" className={`min-h-screen ${isDarkMode ? 'dark' : ''} relative z-10 overflow-hidden`}>
        <div className={`min-h-screen flex flex-col items-center relative overflow-hidden transition-colors duration-[400ms] ${isDarkMode ? 'text-white selection:bg-red-500/30' : 'text-black selection:bg-blue-500/30'}`}>
          
          {/* Base Background Layer */}
          <div className={`absolute inset-0 transition-colors duration-[400ms] ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F2F2F7]'}`} />
          
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
        <MainContent 
            onOpenRisks={openRisksModal} 
            stopAnimation={hasViewedRisks}
            isRisksCooldown={isRisksCooldown}
            isRisksOpen={risksModalOpen}
        />
        
        <div className="absolute top-6 right-6 z-30 landscape:top-[70px] landscape:right-6 md:top-[70px] md:right-6 transition-all duration-300">
            <StoreProviderSwitcher isVisible={isDebugVisible} onDisable={disableDebugMode} />
        </div>

        <div 
            style={{ willChange: 'background-color, border-color, color' }}
            className={`
            flex items-center gap-3 pl-4 pr-1 py-1 rounded-full transition-colors duration-[400ms] z-30
            ${isDarkMode 
              ? 'bg-[rgba(24,24,26,0.70)] border border-white/10' 
              : 'bg-white border border-black/5'}
            relative -mt-[15px] mb-6
            landscape:absolute landscape:top-[17px] landscape:right-6 landscape:mt-0 landscape:mb-0
            md:absolute md:top-[17px] md:right-6 md:mt-0 md:mb-0
        `}>
            <span className={`text-[15px] font-medium mr-1 select-none transition-colors duration-[400ms] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Modo Oscuro</span>
            <NativeToggle ref={toggleRef} checked={isDarkMode} onChange={setIsDarkMode} />
        </div>
        
        <div className="flex-1" />

        <ActionButtons 
          onOpenStreaming={openStreamingModal} 
          onOpenMinisterio={openMinisterioModal}
          onEnableDebug={enableDebugMode}
          onGoBack={handleGoHome}
          isStreamingCooldown={isStreamingCooldown}
          isStreamingOpen={streamingModalOpen}
          isRisksCooldown={isRisksCooldown}
          isRisksOpen={risksModalOpen}
          isMinisterioOpen={ministerioModalOpen}
          isDarkMode={isDarkMode}
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

      <ContactCardModal
        isOpen={ministerioModalOpen}
        onClose={closeMinisterioModal}
      />
    </div>
    </div>
    </div>
  );
};

export default App;
