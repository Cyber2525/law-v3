import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IOSHeader } from './components/IOSHeader';
import { ActionButtons } from './components/ActionButtons';
import { StreamingModal } from './components/StreamingModal';
import { RisksModal } from './components/RisksModal';
import { IOSToggle } from './components/IOSToggle';
import { DebugOSOverride } from './components/DebugOSOverride';

// --- Hooks ---
function useMediaQuery(query: string) {
  const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
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
  const [isRisksCooldown, setIsRisksCooldown] = useState(false);
  const [safariTopColor, setSafariTopColor] = useState<string>('');
  const [safariBottomColor, setSafariBottomColor] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const lastModalRef = useRef<'risks' | 'streaming' | null>(null);

  // Track which modal was last opened to maintain correct colors during closing animation
  useEffect(() => {
    if (risksModalOpen) lastModalRef.current = 'risks';
    else if (streamingModalOpen) lastModalRef.current = 'streaming';
  }, [risksModalOpen, streamingModalOpen]);

  // Refs for cooldown timers and transition state to prevent race conditions
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const risksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const isInitialMount = useRef(true);

  // Manage global CSS variables and transition state
  useEffect(() => {
    const isOpen = risksModalOpen || streamingModalOpen;
    const isDesktop = window.matchMedia('(min-width: 600px) and (min-height: 600px)').matches;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
      document.documentElement.style.setProperty('--drawer-progress', '0');
      if (!isOpen) return; // Skip closing animation on mount
    }

    if (isOpen) {
      setIsAnimating(true);
      isTransitioningRef.current = true;
      
      if (!isDesktop) {
        // Prepare starting state
        document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
        
        // Trigger animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--drawer-transition-duration', '0.5s');
            document.documentElement.style.setProperty('--drawer-progress', '1');
          });
        });
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
      
      if (!isDesktop) {
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
      // Prevent opening if already open, in cooldown, or transitioning
      if (isStreamingCooldown || streamingModalOpen || risksModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      window.history.pushState({ ...window.history.state, modal: 'streaming' }, '');
      setStreamingModalOpen(true);
  }, [isStreamingCooldown, streamingModalOpen, risksModalOpen]);

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
      if (isRisksCooldown || risksModalOpen || streamingModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      setHasViewedRisks(true);
      window.history.pushState({ ...window.history.state, modal: 'risks' }, '');
      setRisksModalOpen(true);
  }, [isRisksCooldown, risksModalOpen, streamingModalOpen]);

  const closeRisksModal = useCallback(() => {
      if (!risksModalOpen || isTransitioningRef.current) return;
      
      isTransitioningRef.current = true;
      setRisksModalOpen(false);
      
      // Cooldown for Risks button (500ms)
      if (risksTimerRef.current) clearTimeout(risksTimerRef.current);
      
      setIsRisksCooldown(true);
      risksTimerRef.current = setTimeout(() => {
          setIsRisksCooldown(false);
          risksTimerRef.current = null;
      }, 500);

      if (window.history.state?.modal === 'risks') {
          window.history.back();
      }
  }, [risksModalOpen]);
  // -------------------------------------

  // --- Theme Color Management ---
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isDesktop = useMediaQuery('(min-width: 600px) and (min-height: 600px)');
  const lastTopColorRef = useRef<string | null>(null);
  
  useEffect(() => {
    const anyDrawerOpen = streamingModalOpen || risksModalOpen;
    // We want to keep the drawer theme color while it's opening OR closing (animating)
    const activeDrawer = anyDrawerOpen || isAnimating;
    const isBottomSheet = activeDrawer && !isDesktop;
    
    // Default App Backgrounds
    const APP_BG_LIGHT = '#F2F2F7';
    const APP_BG_DARK = '#0a0a0a';
    
    // Drawer Backgrounds
    const DRAWER_BG_LIGHT = '#F2F2F7';
    // Use lastModalRef to ensure the correct background color during the closing animation
    const isRisksActive = risksModalOpen || (isAnimating && lastModalRef.current === 'risks');
    const DRAWER_BG_DARK = isRisksActive ? '#1E1E20' : '#1c1c1e';

    let topColor = isDarkMode ? APP_BG_DARK : APP_BG_LIGHT;
    let bottomColor = isDarkMode ? APP_BG_DARK : APP_BG_LIGHT;

    if (isBottomSheet) {
      // Bottom color matches drawer background
      bottomColor = isDarkMode ? DRAWER_BG_DARK : DRAWER_BG_LIGHT;
      
      if (!isLandscape) {
        // Portrait bottom sheet: Top turns black
        topColor = '#000000';
      } else {
        // Horizontal bottom sheet: Top remains app background
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
    setSafariTopColor(topColor);
    setSafariBottomColor(bottomColor);

  }, [isDarkMode, streamingModalOpen, risksModalOpen, isDesktop, isLandscape, isAnimating]);

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
    <div className="min-h-screen bg-[#0a0a0a] relative">
      {/* Safari Theme Color Hacks */}
      {safariTopColor && (
        <div 
          className="fixed top-0 left-0 right-0 h-[1px] z-[999999] pointer-events-none" 
          style={{ backgroundColor: safariTopColor }} 
        />
      )}
      {safariBottomColor && (
        <div 
          className="fixed bottom-0 left-0 right-0 h-[1px] z-[999999] pointer-events-none" 
          style={{ backgroundColor: safariBottomColor }} 
        />
      )}
      <div vaul-drawer-wrapper="" className={`min-h-screen ${isDarkMode ? 'dark' : ''} relative z-10 overflow-hidden`}>
        <div className={`min-h-screen flex flex-col items-center relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'text-white selection:bg-red-500/30' : 'text-black selection:bg-blue-500/30'}`}>
          
          {/* Base Background Layer */}
          <div className={`absolute inset-0 transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F2F2F7]'}`} />
          
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
            isRisksCooldown={isRisksCooldown}
            isRisksOpen={risksModalOpen}
        />
        
        <div className="absolute top-6 right-6 z-30 landscape:top-[70px] landscape:right-6 md:top-[70px] md:right-6 transition-all duration-300">
            <DebugOSOverride isVisible={isDebugVisible} onDisable={disableDebugMode} />
        </div>

        <div 
            style={{ willChange: 'background-color, border-color, color' }}
            className={`
            flex items-center gap-3 bg-white dark:bg-[rgba(24,24,26,0.70)] pl-4 pr-1 py-1 rounded-full border border-black/5 dark:border-white/10 transition-all duration-300 z-30
            relative -mt-[15px] mb-6
            landscape:absolute landscape:top-[17px] landscape:right-6 landscape:mt-0 landscape:mb-0
            md:absolute md:top-[17px] md:right-6 md:mt-0 md:mb-0
        `}>
            <span className="text-[15px] font-medium text-gray-900 dark:text-white mr-1 select-none transition-colors duration-300">Modo Oscuro</span>
            <IOSToggle checked={isDarkMode} onChange={setIsDarkMode} />
        </div>
        
        <div className="flex-1" />

        <ActionButtons 
          onOpenStreaming={openStreamingModal} 
          onEnableDebug={enableDebugMode}
          isStreamingCooldown={isStreamingCooldown}
          isStreamingOpen={streamingModalOpen}
          isRisksCooldown={isRisksCooldown}
          isRisksOpen={risksModalOpen}
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
