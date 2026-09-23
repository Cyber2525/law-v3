import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, ExternalLink, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { Drawer } from 'vaul';
import { Dialog, AlertAction } from './ui/Dialog';
import { DesktopModal } from './ui/DesktopModal';
import { BottomSheet } from './ui/BottomSheet';
import { CATEGORIES, Service, CategoryData } from '../data/streamingServices';

// --- Hooks ---

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

// --- Componente de Fila Reutilizable (iOS Style) ---

interface ItemListProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    onPointerDown?: () => void;
    onPointerUp?: () => void;
    onPointerCancel?: () => void;
    showChevron?: boolean;
    external?: boolean;
    actionLabel?: string;
}

const ItemList: React.FC<ItemListProps> = ({ icon, label, onClick, onPointerDown, onPointerUp, onPointerCancel, showChevron, external, actionLabel }) => {
    const isWeb = actionLabel === 'Web';
    const textColor = isWeb ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500';
    const [isPressed, setIsPressed] = useState(false);

    return (
        <div className="relative">
            <motion.button 
                onClick={onClick}
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setIsPressed(true);
                    onPointerDown?.();
                }}
                onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    setIsPressed(false);
                    onPointerUp?.();
                }}
                onPointerCancel={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    setIsPressed(false);
                    onPointerCancel?.();
                }}
                className={`w-full flex items-center justify-between p-3 pl-4 min-h-[50px] select-none transition-colors ${isPressed ? 'bg-gray-100 dark:bg-[#323234]' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-[17px] text-gray-900 dark:text-white font-normal">
                        {label}
                    </span>
                </div>
                <div className="flex items-center gap-1 pr-1">
                    {external && (
                        <span className={`text-[15px] mr-1 ${textColor}`}>{actionLabel || 'Abrir'}</span>
                    )}
                    {(showChevron || external) && (
                        external ? <ExternalLink className={`w-4 h-4 ${textColor}`} /> : <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={2} />
                    )}
                </div>
            </motion.button>
        </div>
    );
};

// --- Componente Principal ---

interface StreamingModalProps {
  isOpen: boolean;
  onClose: (wasInSubpage?: boolean) => void;
}

export const StreamingModal: React.FC<StreamingModalProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery('(min-width: 600px) and (min-height: 600px)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [activeCategory, setActiveCategory] = useState<CategoryData | null>(null);
  const [isDismissable, setIsDismissable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Reset scroll progress when modal opens
  useEffect(() => {
    if (isOpen) {
      setScrollProgress(0);
    }
  }, [isOpen]);

  // Usamos una referencia para saber si el componente debe ignorar popstates visuales
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
      isOpenRef.current = isOpen;
  }, [isOpen]);

  // Lock dismissal during opening animation
  useEffect(() => {
    if (isOpen) {
        setIsDismissable(false);
        const timer = setTimeout(() => {
            setIsDismissable(true);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // RESET INSTANTÁNEO AL CERRAR (Solo cuando termina la animación)
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveCategory(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // --- History Management for Internal Navigation ---
  useEffect(() => {
      const handlePopState = (e: PopStateEvent) => {
          // IMPORTANTE: Si el modal está cerrándose (isOpenRef.current es false), 
          // ignoramos los cambios de categoría para que el contenido no "salte" visualmente de vuelta.
          if (!isOpenRef.current) return;

          const state = e.state || {};
          if (!state.streamingCategory) {
              setActiveCategory(null);
          } else {
             const cat = CATEGORIES.find(c => c.id === state.streamingCategory);
             if (cat) setActiveCategory(cat);
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectCategory = (cat: CategoryData) => {
      window.history.pushState({ ...window.history.state, streamingCategory: cat.id }, '');
      setActiveCategory(cat);
  };

  const handleBack = () => {
      if (window.history.state?.streamingCategory) {
          window.history.back();
      } else {
          setActiveCategory(null);
      }
  };

  // Función para manejar el cierre desde cualquier disparador (X, backdrop, swipe)
  const handleManualClose = () => {
      onClose(activeCategory !== null);
  };

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
  // ------------------------------------------------

  // --- Render Desktop ---
  if (isDesktop) {
    return (
      <DesktopModal isOpen={isOpen} onClose={handleManualClose} containerClassName="w-[420px]">
        <div className="absolute inset-0 backdrop-blur-xl -z-10 hidden md:block" />
        <IOSNavigationStack 
            activeCategory={activeCategory}
            onClose={handleManualClose}
            onBack={handleBack}
            onSelectCategory={selectCategory}
            isModalOpen={isOpen}
            isDesktop={true}
            isLandscape={isLandscape}
            scrollProgress={scrollProgress}
            setScrollProgress={setScrollProgress}
            isDarkMode={isDarkMode}
        />
      </DesktopModal>
    );
  }

  // --- Render Mobile (Bottom Sheet / Drawer) ---
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleManualClose}
      isDismissable={isDismissable}
      shouldScaleBackground={true}
      title="Alternativas Legales"
      description="Seleccione un servicio de streaming"
      onDrag={handleDrag}
      onRelease={handleRelease}
      contentClassName={!isLandscape ? 'h-[calc(90.7vh-0.84px)]' : ''}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 z-50 pointer-events-none opacity-80" />

      <div className="relative bg-[#F2F2F7] dark:bg-[#1c1c1e] overflow-hidden rounded-t-[13px] landscape:rounded-t-[13px] landscape:rounded-b-none transform-gpu flex-1">
            <IOSNavigationStack 
              activeCategory={activeCategory}
              onClose={handleManualClose}
              onBack={handleBack}
              onSelectCategory={selectCategory}
              isModalOpen={isOpen}
              isDesktop={false}
              isLandscape={isLandscape}
              scrollProgress={scrollProgress}
              setScrollProgress={setScrollProgress}
              isDarkMode={isDarkMode}
          />
      </div>
    </BottomSheet>
  );
};

// --- Stack de Navegación y Vistas ---

interface NavigationProps {
    activeCategory: CategoryData | null;
    onClose: () => void;
    onBack: () => void;
    onSelectCategory: (c: CategoryData) => void;
    isModalOpen: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
    scrollProgress: number;
    setScrollProgress: (val: number) => void;
    isDarkMode: boolean;
}

const TRANSITION_CLASSES = "all 800ms cubic-bezier(0.32,0.72,0,1)";

const IOSNavigationStack: React.FC<NavigationProps> = ({ 
    activeCategory, 
    onClose, 
    onBack, 
    onSelectCategory, 
    isModalOpen, 
    isDesktop, 
    isLandscape,
    scrollProgress,
    setScrollProgress,
    isDarkMode
}) => {
    const [menuHeight, setMenuHeight] = useState<number | undefined>(undefined);
    const [displayedCategory, setDisplayedCategory] = useState<CategoryData | null>(activeCategory);
    const [navTransitionType, setNavTransitionType] = useState<'none' | 'fade-out' | 'fade-in'>('none');
    const prevCategoryRef = useRef(activeCategory);
    const categoryScrollPositions = useRef<Record<string, number>>({});
    const isProgrammaticScroll = useRef(false);

    const categoriesRef = useRef<HTMLDivElement>(null);
    const servicesRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);

    const [pressedId, setPressedId] = useState<string | null>(null);

    const [isAnimatingInternal, setIsAnimatingInternal] = useState(false);
    const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startLockout = (duration = 800) => {
        if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
        setIsAnimatingInternal(true);
        lockoutTimerRef.current = setTimeout(() => {
            setIsAnimatingInternal(false);
            lockoutTimerRef.current = null;
        }, duration);
    };

    useEffect(() => {
        if (!isModalOpen) {
            if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
            setIsAnimatingInternal(false);
        }
    }, [isModalOpen]);

    // Custom Back Button states and handlers
    const [isBackButtonActive, setIsBackButtonActive] = useState(false);
    const [isBackReentry, setIsBackReentry] = useState(false);
    const backButtonRef = useRef<HTMLButtonElement>(null);
    const isPointerDownOnBack = useRef(false);

    // Custom Close Button states and handlers (matching Back Button physics)
    const [isCloseActive, setIsCloseActive] = useState(false);
    const [isCloseReentry, setIsCloseReentry] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const isPointerDownOnClose = useRef(false);
    const hasExitedCloseRef = useRef(false);
    const lastCloseDistRef = useRef(0);

    const handleClosePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        isPointerDownOnClose.current = true;
        setIsCloseReentry(false);
        setIsCloseActive(true);
        hasExitedCloseRef.current = false;
        lastCloseDistRef.current = 0;

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handleClosePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!isPointerDownOnClose.current) return;
        e.stopPropagation();

        if (!closeButtonRef.current) return;
        const rect = closeButtonRef.current.getBoundingClientRect();
        const extraMargin = 50;
        const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
        const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
        const dist = Math.max(dx, dy);

        if (dist === 0) {
            hasExitedCloseRef.current = false;
            lastCloseDistRef.current = 0;
            if (!isCloseActive) {
                setIsCloseReentry(true);
                setIsCloseActive(true);
            }
        } else {
            const prevDist = lastCloseDistRef.current;
            lastCloseDistRef.current = dist;

            if (!hasExitedCloseRef.current) {
                hasExitedCloseRef.current = true;
                if (isCloseActive) {
                    setIsCloseActive(false);
                }
            } else {
                if (dist < prevDist - 0.5) {
                    if (dist <= extraMargin) {
                        if (!isCloseActive) {
                            setIsCloseReentry(true);
                            setIsCloseActive(true);
                        }
                    }
                } else if (dist > prevDist + 0.5) {
                    if (isCloseActive) {
                        setIsCloseActive(false);
                    }
                }
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

    const hasExitedBackRef = useRef(false);
    const lastBackDistRef = useRef(0);

    const handleBackPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!activeCategory || isAnimatingInternal) return;
        e.stopPropagation();
        
        // Only respond to main/left button interactions
        if (e.button !== 0) return;

        isPointerDownOnBack.current = true;
        setIsBackReentry(false);
        setIsBackButtonActive(true);
        hasExitedBackRef.current = false;
        lastBackDistRef.current = 0;

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
            // Fail-safe
        }
    };

    const handleBackPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!isPointerDownOnBack.current || !activeCategory) return;
        e.stopPropagation();

        if (!backButtonRef.current) return;
        const rect = backButtonRef.current.getBoundingClientRect();
        const extraMargin = 50;
        const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
        const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
        const dist = Math.max(dx, dy);

        if (dist === 0) {
            hasExitedBackRef.current = false;
            lastBackDistRef.current = 0;
            if (!isBackButtonActive) {
                setIsBackReentry(true);
                setIsBackButtonActive(true);
            }
        } else {
            const prevDist = lastBackDistRef.current;
            lastBackDistRef.current = dist;

            if (!hasExitedBackRef.current) {
                hasExitedBackRef.current = true;
                if (isBackButtonActive) {
                    setIsBackButtonActive(false);
                }
            } else {
                if (dist < prevDist - 0.5) {
                    if (dist <= extraMargin) {
                        if (!isBackButtonActive) {
                            setIsBackReentry(true);
                            setIsBackButtonActive(true);
                        }
                    }
                } else if (dist > prevDist + 0.5) {
                    if (isBackButtonActive) {
                        setIsBackButtonActive(false);
                    }
                }
            }
        }
    };

    const handleBackPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {
            // Fail-safe
        }

        if (!isPointerDownOnBack.current) return;
        isPointerDownOnBack.current = false;

        const wasActive = isBackButtonActive;

        if (wasActive && activeCategory) {
            onBack();
            // Delay resetting the active state to allow the back button to fade out smoothly directly from its pressed state
            setTimeout(() => {
                setIsBackButtonActive(false);
                setIsBackReentry(false);
            }, 300);
        } else {
            setIsBackButtonActive(false);
            setIsBackReentry(false);
        }
    };

    const handleBackPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {
            // Fail-safe
        }
        isPointerDownOnBack.current = false;
        setIsBackButtonActive(false);
        setIsBackReentry(false);
    };

    useEffect(() => {
        if (prevCategoryRef.current !== activeCategory) {
            startLockout(800);
            let srcScroll = 0;
            let destScroll = 0;

            if (activeCategory) {
                // Navigating TO category
                srcScroll = categoriesRef.current ? Math.min(categoriesRef.current.scrollTop / 15, 1) : 0;
                
                // Use saved scroll position for the destination category
                const savedScroll = categoryScrollPositions.current[activeCategory.id] || 0;
                destScroll = Math.min(savedScroll / 15, 1);
                
                // Restore scroll position
                if (servicesRef.current && servicesRef.current.scrollTop !== savedScroll) {
                    isProgrammaticScroll.current = true;
                    servicesRef.current.scrollTop = savedScroll;
                }
            } else {
                // Navigating BACK to home
                // Save scroll position of the category we are leaving
                if (prevCategoryRef.current && servicesRef.current) {
                    categoryScrollPositions.current[prevCategoryRef.current.id] = servicesRef.current.scrollTop;
                }
                
                srcScroll = servicesRef.current ? Math.min(servicesRef.current.scrollTop / 15, 1) : 0;
                destScroll = categoriesRef.current ? Math.min(categoriesRef.current.scrollTop / 15, 1) : 0;
            }

            if (srcScroll > 0 && destScroll === 0) {
                setNavTransitionType('fade-out');
                setTimeout(() => setScrollProgress(destScroll), 50);
            } else if (srcScroll === 0 && destScroll > 0) {
                setNavTransitionType('fade-in');
                setTimeout(() => setScrollProgress(destScroll), 50);
            } else {
                setNavTransitionType('none');
                setScrollProgress(destScroll);
            }

            const timer = setTimeout(() => setNavTransitionType('none'), 1000); // 800ms slide + 200ms blur
            prevCategoryRef.current = activeCategory;
            return () => clearTimeout(timer);
        }
    }, [activeCategory, setScrollProgress]);

    const [pendingService, setPendingService] = useState<Service | null>(null);

    useEffect(() => {
        if (activeCategory) {
            setDisplayedCategory(activeCategory);
        }
    }, [activeCategory]);

    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            if (!e.state?.streamingAlert) {
                setPendingService(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const openServiceAlert = (service: Service) => {
        window.history.pushState({ ...window.history.state, streamingAlert: true }, '');
        setPendingService(service);
    };

    const closeServiceAlert = () => {
        if (window.history.state?.streamingAlert) {
            window.history.back();
        } else {
            setPendingService(null);
        }
    };

    const detectOS = () => {
        let isIOS = false;
        let isAndroid = false;
        let isMacOS = false;
        let isChromeOS = false;
        let isWindows = false;
        const debugOverride = (window as any).__DEBUG_OS_OVERRIDE__;
        if (debugOverride && debugOverride !== 'default') {
             if (debugOverride === 'ios') isIOS = true;
             if (debugOverride === 'android') isAndroid = true;
             if (debugOverride === 'macos') isMacOS = true;
             if (debugOverride === 'chromeos') isChromeOS = true;
             if (debugOverride === 'windows') isWindows = true;
        } else {
             if (typeof navigator !== 'undefined') {
                const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
                isAndroid = /android/i.test(userAgent);
                isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
                if (!isIOS && !isAndroid) {
                    isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                    isChromeOS = /\bCrOS\b/.test(userAgent);
                    isWindows = navigator.platform.indexOf('Win') > -1;
                }
            }
        }
        return { isIOS, isAndroid, isMacOS, isChromeOS, isWindows };
    };

    const getServiceAlertData = (service: Service | null) => {
        if (!service) return null;
        const { isIOS, isAndroid, isMacOS, isChromeOS, isWindows } = detectOS();
        const isMacSafari = isMacOS && typeof navigator !== 'undefined' && 
            navigator.userAgent.includes("Safari") && 
            !navigator.userAgent.includes("Chrome") && 
            !navigator.userAgent.includes("Chromium");
        let hasApp = false;
        let storeLabel = "";
        let storeUrl = "";
        if (isIOS && service.iosAppId) {
            hasApp = true;
            storeLabel = "App Store";
            storeUrl = `https://apps.apple.com/es/app/id${service.iosAppId}`;
        } else if (isMacOS && service.iosAppId) {
            hasApp = true;
            storeLabel = "App Store";
            if (isMacSafari) storeUrl = `https://apps.apple.com/es/app/id${service.iosAppId}`;
            else storeUrl = `itms-apps://itunes.apple.com/app/id${service.iosAppId}`;
        } else if ((isAndroid || isChromeOS) && service.androidPackageId) {
             hasApp = true;
             storeLabel = "Google Play";
             storeUrl = `market://details?id=${service.androidPackageId}`;
        }
        let msStoreUrl = "";
        if (isWindows && service.microsoftStoreId) {
             msStoreUrl = `ms-windows-store://pdp/?ProductId=${service.microsoftStoreId}`;
        }
        let hostname = "";
        try { hostname = new URL(service.url).hostname; } catch (e) { hostname = service.url; }
        return { hasApp, storeLabel, storeUrl, msStoreUrl, hostname, isWindows, isIOS, isMacSafari };
    };

    const getActionLabel = (service: Service) => {
        const { isIOS, isAndroid, isMacOS, isChromeOS, isWindows } = detectOS();
        let hasApp = false;
        if ((isIOS || isMacOS) && service.iosAppId) hasApp = true;
        else if ((isAndroid || isChromeOS) && service.androidPackageId) hasApp = true;
        else if (isWindows && service.microsoftStoreId) hasApp = true;
        return hasApp ? "Abrir" : "Web";
    };

    const getSystemStoreData = () => {
        const { isIOS, isAndroid, isMacOS, isChromeOS, isWindows } = detectOS();
        if (isIOS || isMacOS) {
            return {
                name: "App Store",
                url: "itms-apps://itunes.apple.com/",
                icon: <ShoppingBag className="w-6 h-6 text-white" />,
                color: "bg-[#007AFF]",
                buttonLabel: "Abrir",
                disabled: false
            };
        }
        if (isAndroid || isChromeOS) {
            return {
                name: "Google Play Store",
                url: "https://play.google.com/store/apps?hl=en",
                icon: <ShoppingBag className="w-6 h-6 text-white" />, 
                color: "bg-[#00875F]",
                buttonLabel: "Abrir",
                disabled: false
            };
        }
        if (isWindows) {
            return {
                name: "Microsoft Store",
                url: "ms-windows-store://home",
                icon: <ShoppingBag className="w-6 h-6 text-white" />,
                color: "bg-[#0067B8]",
                buttonLabel: "Abrir",
                disabled: false
            };
        }
        return {
            name: "Navegador no soportado",
            url: "#",
            icon: <ShoppingBag className="w-6 h-6 text-gray-500/50 dark:text-gray-400/50" />,
            color: "bg-gray-200 dark:bg-gray-700/50",
            buttonLabel: "Abrir",
            disabled: true
        };
    };

    const isDraggingRef = useRef(false);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const previousMoveX = useRef(0); 
    const lastDirectionRef = useRef<'left' | 'right' | null>(null);
    const isHorizontalSwipeRef = useRef<boolean | null>(null);
    const heightsRef = useRef({ categories: 0, services: 0 });

    useEffect(() => {
        if (!isDesktop && !isLandscape) {
            setMenuHeight(undefined);
            return;
        }
        const updateHeight = () => {
            const currentRef = activeCategory ? servicesRef.current : categoriesRef.current;
            if (currentRef && currentRef.firstElementChild) {
                // Measure the actual content height from the inner wrapper
                const contentHeight = (currentRef.firstElementChild as HTMLElement).offsetHeight;
                const maxHeight = window.innerHeight * 0.85;
                setMenuHeight(Math.min(contentHeight, maxHeight));
            }
        };
        const timer = setTimeout(updateHeight, 0);
        window.addEventListener('resize', updateHeight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateHeight);
        };
    }, [activeCategory, isDesktop, isLandscape]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (!activeCategory || isAnimatingInternal) return;
        setNavTransitionType('none');
        touchStartX.current = e.clientX;
        touchStartY.current = e.clientY;
        previousMoveX.current = e.clientX;
        lastDirectionRef.current = null;
        isHorizontalSwipeRef.current = null;
        isDraggingRef.current = true;
        
        let fromH = 0, toH = 0;
        const maxHeight = window.innerHeight * 0.85;
        if (categoriesRef.current && categoriesRef.current.firstElementChild) {
            fromH = Math.min((categoriesRef.current.firstElementChild as HTMLElement).offsetHeight, maxHeight);
        }
        if (servicesRef.current && servicesRef.current.firstElementChild) {
            toH = Math.min((servicesRef.current.firstElementChild as HTMLElement).offsetHeight, maxHeight);
        }
        heightsRef.current = { categories: fromH, services: toH };

        if (sliderRef.current) {
            sliderRef.current.style.transition = 'none';
        }
        if (contentWrapperRef.current && (isDesktop || isLandscape)) {
            contentWrapperRef.current.style.transition = 'none';
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDraggingRef.current || !activeCategory) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const diffX = currentX - touchStartX.current;
        const diffY = currentY - touchStartY.current;

        if (isHorizontalSwipeRef.current === null) {
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);
            if (absX > 5 || absY > 5) {
                if (absX > absY) {
                    isHorizontalSwipeRef.current = true;
                    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch(err) {}
                } else {
                    isHorizontalSwipeRef.current = false;
                }
            }
        }

        if (isHorizontalSwipeRef.current === true && sliderRef.current) {
             if (e.cancelable) e.preventDefault();
             
             const containerWidth = sliderRef.current.offsetWidth / 2;
             const baseOffset = -containerWidth; // We are in services (activeCategory is true)
             let move = baseOffset + diffX;

             // Resistance when swiping past limits
             if (move > 0) {
                 move *= 0.3; 
             } else if (move < -containerWidth) {
                 const extra = move - (-containerWidth);
                 move = -containerWidth + (extra * 0.3);
             }

             if (currentX < previousMoveX.current) lastDirectionRef.current = 'left';
             else if (currentX > previousMoveX.current) lastDirectionRef.current = 'right';
             previousMoveX.current = currentX;

             sliderRef.current.style.transform = `translateX(${move}px)`;

             // Calculate ratio (from 0 = Services to 1 = Categories) and clamp overscroll
             const ratio = Math.max(0, Math.min(1, (move - baseOffset) / containerWidth));
             
             // Get vertical scroll progress of both pages
             const scroll1 = categoriesRef.current ? Math.min(categoriesRef.current.scrollTop / 15, 1) : 0;
             const scroll2 = servicesRef.current ? Math.min(servicesRef.current.scrollTop / 15, 1) : 0;
             
             // Fast vertical scroll-based overlap logic for horizontal drag:
             // W(v) = min(1, v / 0.075) allows fast transition at the beginning of swiping to an overscrolled page (halved distance)
             const wCurrent = Math.min(1, (1 - ratio) / 0.075);
             const wTarget = Math.min(1, ratio / 0.075);
             const interpolatedScroll = Math.max(scroll2 * wCurrent, scroll1 * wTarget);
             setScrollProgress(interpolatedScroll);

             if (contentWrapperRef.current && (isDesktop || isLandscape)) {
                 // ratio = 0 when move == baseOffset (services), ratio = 1 when move == 0 (categories)
                 const interpolatedHeight = heightsRef.current.services + (heightsRef.current.categories - heightsRef.current.services) * ratio;
                 contentWrapperRef.current.style.height = `${interpolatedHeight}px`;
             }
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!isDraggingRef.current || !activeCategory) return;
        isDraggingRef.current = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
        
        if (sliderRef.current) {
            sliderRef.current.style.transition = TRANSITION_CLASSES;

            let shouldGoBack = false;

            if (isHorizontalSwipeRef.current === true) {
                const currentX = e.clientX;
                const diffX = currentX - touchStartX.current;
                const containerWidth = sliderRef.current.offsetWidth / 2;
                const threshold = containerWidth * 0.2;
                shouldGoBack = diffX > threshold && lastDirectionRef.current !== 'left';
            }

            if (contentWrapperRef.current && (isDesktop || isLandscape)) {
                contentWrapperRef.current.style.transition = TRANSITION_CLASSES;
                contentWrapperRef.current.style.height = `${shouldGoBack ? heightsRef.current.categories : heightsRef.current.services}px`; 
            }

            if (shouldGoBack) {
                startLockout(800);
                onBack();
            } else {
                if (isHorizontalSwipeRef.current === true) {
                    startLockout(800);
                }
                sliderRef.current.style.transform = 'translateX(-50%)';
                
                // When snapping back to Services, animate the scrollProgress back to services scroll progress
                const scroll1 = categoriesRef.current ? Math.min(categoriesRef.current.scrollTop / 15, 1) : 0;
                const scroll2 = servicesRef.current ? Math.min(servicesRef.current.scrollTop / 15, 1) : 0;
                
                if (scroll1 === 0 && scroll2 > 0) {
                    setNavTransitionType('fade-in');
                    setTimeout(() => {
                        setScrollProgress(scroll2);
                    }, 50);
                    setTimeout(() => {
                        setNavTransitionType('none');
                    }, 1000);
                } else if (scroll1 > 0 && scroll2 === 0) {
                    setNavTransitionType('fade-out');
                    setTimeout(() => {
                        setScrollProgress(scroll2);
                    }, 50);
                    setTimeout(() => {
                        setNavTransitionType('none');
                    }, 1000);
                } else {
                    setScrollProgress(scroll2);
                    setNavTransitionType('none');
                }
            }
        }
        isHorizontalSwipeRef.current = null;
    };

    const handleServiceClick = (service: Service) => {
        if (service.isSystemStore) {
            const storeData = getSystemStoreData();
            if (!storeData.disabled) window.open(storeData.url, '_blank');
            return;
        }
        const { isIOS, isAndroid, isMacOS, isChromeOS, isWindows } = detectOS();
        const isWindowsWebOnly = isWindows && !service.microsoftStoreId;
        const isMacOSWebOnly = isMacOS && !service.iosAppId;
        const isChromeOSWebOnly = isChromeOS && !service.androidPackageId;
        if (isWindowsWebOnly || isMacOSWebOnly || isChromeOSWebOnly) {
            window.open(service.url, '_blank');
            return;
        }
        const isLargeScreen = window.innerWidth >= 768;
        if (isLargeScreen && !isIOS && !isAndroid && !isMacOS && !isChromeOS && !isWindows) {
            window.open(service.url, '_blank');
        } else openServiceAlert(service);
    };

    const alertData = getServiceAlertData(pendingService);
    let alertActions: AlertAction[] = [];
    let alertTitle = '';
    let alertMessage = '';
    if (pendingService && alertData) {
        alertTitle = `¿Abrir "${pendingService.name}"?`;
        const msStoreAction = (alertData.isWindows && alertData.msStoreUrl) ? {
            label: 'Ver en Microsoft Store',
            style: 'bold' as const,
            onClick: () => { window.location.href = alertData.msStoreUrl; closeServiceAlert(); }
        } : null;
        const appStoreAction = alertData.hasApp ? {
            label: `Ver en ${alertData.storeLabel}`,
            style: 'bold' as const,
            onClick: () => {
                 if (alertData.isIOS || alertData.isMacSafari) window.open(alertData.storeUrl, '_blank');
                 else window.location.href = alertData.storeUrl;
                 closeServiceAlert();
            }
        } : null;
        const primaryStoreAction = msStoreAction || appStoreAction;
        if (primaryStoreAction) {
            alertMessage = "Selecciona donde quieres abrir el servicio";
            const webAction: AlertAction = {
                label: pendingService.webButtonLabel || 'Ir a la web',
                style: 'default',
                onClick: () => { window.open(pendingService.url, '_blank'); closeServiceAlert(); }
            };
            const secondaryWebAction = pendingService.secondaryUrl ? {
                label: pendingService.secondaryWebLabel || 'Web alternativa',
                style: 'default' as const,
                onClick: () => { window.open(pendingService.secondaryUrl!, '_blank'); closeServiceAlert(); }
            } : null;
            alertActions = [primaryStoreAction, webAction, ...(secondaryWebAction ? [secondaryWebAction] : []), { label: 'Cancelar', style: 'cancel', onClick: closeServiceAlert }];
        } else {
            alertMessage = `Serás redirigido a "${alertData.hostname}"`;
            if (pendingService.secondaryUrl) {
                alertActions = [
                    { label: pendingService.webButtonLabel || 'Abrir web principal', style: 'default', onClick: () => { window.open(pendingService.url, '_blank'); closeServiceAlert(); } },
                    { label: pendingService.secondaryWebLabel || 'Web secundaria', style: 'default', onClick: () => { window.open(pendingService.secondaryUrl!, '_blank'); closeServiceAlert(); } },
                    { label: 'Cancelar', style: 'cancel', onClick: closeServiceAlert }
                ];
            } else {
                alertActions = [{ label: 'Cancelar', style: 'cancel', onClick: closeServiceAlert }, { label: 'Abrir', style: 'bold', onClick: () => { window.open(pendingService.url, '_blank'); closeServiceAlert(); } }];
            }
        }
    }

    const renderCategory = activeCategory || displayedCategory;
    const navTransition = isModalOpen ? TRANSITION_CLASSES : "none";

    let transitionStyle = 'none';
    if (navTransitionType === 'fade-out') {
        transitionStyle = 'background-color 800ms cubic-bezier(0.32,0.72,0,1), backdrop-filter 200ms ease-in-out 800ms, -webkit-backdrop-filter 200ms ease-in-out 800ms';
    } else if (navTransitionType === 'fade-in') {
        transitionStyle = 'background-color 800ms cubic-bezier(0.32,0.72,0,1), backdrop-filter 200ms ease-in-out 0ms, -webkit-backdrop-filter 200ms ease-in-out 0ms';
    }

    return (
        <div className={`flex flex-col w-full relative ${!isDesktop ? 'h-full' : ''}`}>
            <div className="absolute top-0 left-0 right-0 h-[70px] z-20 pointer-events-none">
                {/* Translucent background with blur - isolated so it doesn't cause text-blur or rendering glitches in buttons */}
                <div 
                    className="absolute inset-0 z-10"
                    style={{
                        backdropFilter: `blur(${scrollProgress * 20}px)`,
                        WebkitBackdropFilter: `blur(${scrollProgress * 20}px)`,
                        backgroundColor: isDarkMode 
                            ? `rgba(28, 28, 30, ${scrollProgress * 0.7})` 
                            : `rgba(242, 242, 247, ${scrollProgress * 0.7})`,
                        transition: transitionStyle
                    }}
                />

                {/* Interactive header elements - pointer-events-auto */}
                <div className="absolute inset-0 z-20 pointer-events-auto">
                    {/* Back Button Area */}
                    <button 
                        ref={backButtonRef}
                        onPointerDown={handleBackPointerDown}
                        onPointerMove={handleBackPointerMove}
                        onPointerUp={handleBackPointerUp}
                        onPointerCancel={handleBackPointerCancel}
                        disabled={!activeCategory}
                        className={`absolute top-0 left-0 h-full pl-4 pr-12 flex items-center text-[#007AFF] transition-opacity z-50 touch-none pointer-events-auto cursor-pointer select-none gpu-accelerated ${
                            !activeCategory 
                                
                                ? 'opacity-0 pointer-events-none' 
                                : (isBackButtonActive ? 'opacity-30' : 'opacity-100')
                        }`}
                        style={{
                            transitionDuration: (!activeCategory || (!isBackButtonActive || isBackReentry)) ? '300ms' : '0ms'
                        }}
                    >
                        <ChevronLeft className="w-8 h-8 -ml-1" strokeWidth={2.5} />
                        <span className="text-[20px] leading-none pb-0.5 font-normal">Atrás</span>
                    </button>

                    {/* Title Area */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-64 h-full flex items-center justify-center overflow-hidden">
                            <span 
                                style={{ transition: navTransition }}
                                className={`absolute w-full text-[20px] font-semibold text-gray-900 dark:text-white transition-all text-center ${
                                    activeCategory ? '-translate-x-20 opacity-0' : 'translate-x-0 opacity-100'
                                }`}
                            >
                                Alternativas legales
                            </span>
                            <span 
                                style={{ transition: navTransition }}
                                className={`absolute w-full text-[20px] font-semibold text-gray-900 dark:text-white transition-all text-center ${
                                    activeCategory ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'
                                }`}
                            >
                                {renderCategory?.title || " "}
                            </span>
                        </div>
                    </div>

                    {/* Close Button Area */}
                    <div className="absolute top-0 right-0 h-full flex items-center pr-[15.5px] z-50">
                        <button 
                            ref={closeButtonRef}
                            onPointerDown={handleClosePointerDown}
                            onPointerMove={handleClosePointerMove}
                            onPointerUp={handleClosePointerUp}
                            onPointerCancel={handleClosePointerCancel}
                            className={`bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 select-none outline-none touch-none pointer-events-auto cursor-pointer transition-opacity duration-300 gpu-accelerated ${
                                isCloseActive ? 'opacity-30' : 'opacity-100'
                            }`}
                            style={{
                                transitionDuration: (!isCloseActive || isCloseReentry) ? '300ms' : '0ms'
                            }}
                        >
                            <X className="w-6 h-6" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            <div 
                ref={contentWrapperRef}
                style={{ height: (isDesktop || isLandscape) ? (menuHeight ? `${menuHeight}px` : 'auto') : '100%' }} 
                className={`relative w-full overflow-hidden ${(isDesktop || isLandscape) ? 'transition-[height]' : 'flex-1 h-full'} ${isModalOpen ? 'duration-[800ms]' : 'duration-0'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div 
                    ref={sliderRef}
                    style={{ 
                        transition: navTransition,
                        transform: activeCategory ? 'translateX(-50%)' : 'translateX(0%)',
                        height: '100%'
                    }}
                    className="flex w-[200%] items-start touch-none select-none will-change-transform"
                >
                    <div 
                        ref={categoriesRef}
                        onScroll={(e) => {
                            if (!activeCategory) {
                                if (isProgrammaticScroll.current) {
                                    isProgrammaticScroll.current = false;
                                } else {
                                    setScrollProgress(Math.min(e.currentTarget.scrollTop / 15, 1));
                                    if (navTransitionType !== 'none') setNavTransitionType('none');
                                }
                            }
                        }}
                        onTouchStart={() => {
                            if (navTransitionType !== 'none') setNavTransitionType('none');
                        }}
                        onWheel={() => {
                            if (navTransitionType !== 'none') setNavTransitionType('none');
                        }}
                        className="w-[50%] h-full shrink-0 overflow-y-auto no-scrollbar touch-pan-y"
                    >
                        <div className="pb-8 pt-[86px]">
                             <div className="px-4 mb-2">
                                <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-4">Categorías</h3>
                            </div>
                            <div className="mx-4 bg-white dark:bg-[#2C2C2E]/70 rounded-[12px] overflow-hidden">
                                {CATEGORIES.map((cat, i) => {
                                    const isPressed = pressedId === cat.id;
                                    const isNextPressed = pressedId === CATEGORIES[i + 1]?.id;
                                    const hideDivider = isPressed || isNextPressed;
                                    return (
                                        <div key={cat.id} className="relative">
                                            <ItemList 
                                                icon={<div className="w-7 h-7 rounded-[6px] bg-blue-500 flex items-center justify-center">{cat.icon}</div>} 
                                                label={cat.title} 
                                                onClick={() => {
                                                    if (isAnimatingInternal) return;
                                                    onSelectCategory(cat);
                                                }} 
                                                onPointerDown={() => setPressedId(cat.id)}
                                                onPointerUp={() => setPressedId(null)}
                                                onPointerCancel={() => setPressedId(null)}
                                                showChevron 
                                            />
                                            {i < CATEGORIES.length - 1 && (
                                                <div className={`absolute bottom-0 left-[56px] right-0 h-[1px] bg-black/10 dark:bg-white/10 transition-opacity duration-100 ${hideDivider ? 'opacity-0' : 'opacity-100'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="px-8 mt-4 text-[13px] text-gray-400 dark:text-gray-500 text-center leading-normal">Selecciona una categoría para ver los servicios legales disponibles en tu región.</p>
                        </div>
                    </div>

                    <div 
                        ref={servicesRef}
                        onScroll={(e) => {
                            if (activeCategory) {
                                if (isProgrammaticScroll.current) {
                                    isProgrammaticScroll.current = false;
                                } else {
                                    setScrollProgress(Math.min(e.currentTarget.scrollTop / 15, 1));
                                    if (navTransitionType !== 'none') setNavTransitionType('none');
                                }
                            }
                        }}
                        onTouchStart={() => {
                            if (navTransitionType !== 'none') setNavTransitionType('none');
                        }}
                        onWheel={() => {
                            if (navTransitionType !== 'none') setNavTransitionType('none');
                        }}
                        className="w-[50%] h-full shrink-0 overflow-y-auto no-scrollbar touch-pan-y"
                    >
                        <div className="pb-8 pt-[86px]">
                            {renderCategory && (() => {
                            const grouped: Record<string, Service[]> = {};
                            const sectionOrder: string[] = [];
                            renderCategory.services.forEach(s => {
                                const sec = s.section || 'General';
                                if (!grouped[sec]) { grouped[sec] = []; sectionOrder.push(sec); }
                                grouped[sec].push(s);
                            });
                            return sectionOrder.map((sectionName) => {
                                const sectionServices = grouped[sectionName];
                                const isSystemStoreSection = sectionName === 'Tienda del Sistema';
                                return (
                                    <div key={sectionName} className="mb-6 last:mb-0">
                                        {sectionName !== 'General' && <div className="px-4 mb-2"><h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-4">{sectionName}</h3></div>}
                                        <div className={`mx-4 bg-white dark:bg-[#2C2C2E]/70 ${isSystemStoreSection ? 'rounded-[20px]' : 'rounded-[12px]'} overflow-hidden`}>
                                            {sectionServices.map((service, idx) => {
                                                const isPressed = pressedId === service.name;
                                                const isNextPressed = pressedId === sectionServices[idx + 1]?.name;
                                                const hideDivider = isPressed || isNextPressed;

                                                if (service.isSystemStore) {
                                                    const storeData = getSystemStoreData();
                                                    return (
                                                        <div key={service.name} className="relative">
                                                            <div 
                                                                className="w-full flex items-center justify-between p-3 pl-4 min-h-[72px] select-none"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-[14px] ${storeData.color} flex items-center justify-center shrink-0 transition-opacity ${storeData.disabled ? 'opacity-50' : 'opacity-100'}`}>{storeData.icon}</div>
                                                                    <div className="flex flex-col justify-center">
                                                                        <h4 className={`text-[17px] font-semibold mb-0 leading-tight ${storeData.disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{storeData.name}</h4>
                                                                        {storeData.disabled && <span className="text-[13px] text-gray-400">No compatible</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="pr-1">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); if (!storeData.disabled) handleServiceClick(service); }} 
                                                                        disabled={storeData.disabled} 
                                                                        className={`px-5 py-1.5 rounded-full text-[15px] font-bold transition-colors duration-300 ease-out ${storeData.disabled ? 'bg-gray-100 dark:bg-800/70 text-gray-400 cursor-not-allowed' : 'bg-[#007AFF] text-white hover:bg-[#1A89FF] active:bg-[#0055D6]'}`}
                                                                    >
                                                                        {storeData.buttonLabel}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {idx < sectionServices.length - 1 && (
                                                                <div className={`absolute bottom-0 left-[72px] right-0 h-[1px] bg-black/10 dark:bg-white/10 transition-opacity duration-100 ${hideDivider ? 'opacity-0' : 'opacity-100'}`} />
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={service.name} className="relative">
                                                        <ItemList 
                                                            icon={<div className={`w-7 h-7 rounded-[6px] flex items-center justify-center text-[12px] font-bold ${service.color}`}>{service.iconContent ? service.iconContent : (service.iconLabel || service.name[0])}</div>} 
                                                            label={service.name} 
                                                            onClick={() => handleServiceClick(service)} 
                                                            onPointerDown={() => setPressedId(service.name)}
                                                            onPointerUp={() => setPressedId(null)}
                                                            onPointerCancel={() => setPressedId(null)}
                                                            external 
                                                            actionLabel={getActionLabel(service)} 
                                                        />
                                                        {idx < sectionServices.length - 1 && (
                                                            <div className={`absolute bottom-0 left-[56px] right-0 h-[1px] bg-black/10 dark:bg-white/10 transition-opacity duration-100 ${hideDivider ? 'opacity-0' : 'opacity-100'}`} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                         {renderCategory && <p className="px-8 mt-4 text-[13px] text-gray-400 dark:text-gray-500 text-center leading-normal">El acceso a estos sitios es seguro y apoya a los creadores de contenido.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog isOpen={!!pendingService} onClose={closeServiceAlert} title={alertTitle} message={alertMessage} actions={alertActions} />
        </div>
    );
};
