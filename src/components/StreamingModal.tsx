import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, ExternalLink, ShoppingBag } from 'lucide-react';
import { Drawer } from 'vaul';
import { IOSAlert, AlertAction } from './IOSAlert';
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

interface IOSListItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    showChevron?: boolean;
    external?: boolean;
    actionLabel?: string;
}

const IOSListItem: React.FC<IOSListItemProps> = ({ icon, label, onClick, showChevron, external, actionLabel }) => {
    const isWeb = actionLabel === 'Web';
    const textColor = isWeb ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500';

    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between p-3 pl-4 min-h-[50px] active:bg-gray-100 dark:active:bg-[#323234] transition-colors"
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
        </button>
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
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // RESET INSTANTÁNEO AL CERRAR (Solo cuando termina la animación)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (isOpen) {
        // 1. Prepare starting state (0 progress, 0s transition)
        document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
        
        // 2. Wait for Vaul to mount and apply its transform style
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 3. Enable transition and animate to ending state
                document.documentElement.style.setProperty('--drawer-transition-duration', '1s');
                document.documentElement.style.setProperty('--drawer-progress', '1');
            });
        });
    } else {
        // Closing animation
        document.documentElement.style.setProperty('--drawer-transition-duration', '1s');
        document.documentElement.style.setProperty('--drawer-progress', '0');
        
        timer = setTimeout(() => {
            document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
            setActiveCategory(null);
        }, 1000);
    }
    
    return () => {
        if (timer) clearTimeout(timer);
    };
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
    document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
    document.documentElement.style.setProperty('--drawer-progress', progress.toString());
  };

  const handleRelease = (e: React.PointerEvent<HTMLDivElement>, open: boolean) => {
    document.documentElement.style.setProperty('--drawer-transition-duration', '1s');
    document.documentElement.style.setProperty('--drawer-progress', open ? '1' : '0');
  };
  // ------------------------------------------------

  // --- Render Desktop ---
  if (isDesktop) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 duration-500 transition-all ${isOpen ? 'visible' : 'invisible delay-300'}`}>
        {/* Backdrop */}
        <div 
            className={`absolute inset-0 bg-black/[0.13] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100 backdrop-blur-[15px]' : 'opacity-0 backdrop-blur-[0px]'}`}
            onClick={handleManualClose}
        />
        
        {/* Modal Container */}
        <div className={`relative w-[420px] bg-[#F2F2F7] dark:bg-[#1c1c1e] rounded-[16px] shadow-2xl transform transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] border border-white/10 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
            <IOSNavigationStack 
                activeCategory={activeCategory}
                onClose={handleManualClose}
                onBack={handleBack}
                onSelectCategory={selectCategory}
                isModalOpen={isOpen}
                isDesktop={true}
                isLandscape={isLandscape}
            />
        </div>
      </div>
    );
  }

  // --- Render Mobile (Bottom Sheet / Drawer) ---
  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => !open && handleManualClose()} 
      dismissible={isDismissable} 
      shouldScaleBackground={true}
      onDrag={handleDrag}
      onRelease={handleRelease}
    >
      <Drawer.Portal>
        <Drawer.Overlay 
          className="fixed inset-0 bg-black/[0.13] z-50 transition-opacity duration-[1000ms]"
        />
        <Drawer.Content className="bg-[#F2F2F7] dark:bg-[#1c1c1e] flex flex-col rounded-t-[13px] fixed bottom-0 left-0 right-0 z-50 outline-none shadow-2xl h-[calc(90.7vh-0.84px)] landscape:h-auto landscape:max-h-[96vh] landscape:rounded-t-[13px] landscape:rounded-b-none landscape:left-[19px] landscape:right-[19px] landscape:bottom-0 landscape:mx-auto landscape:max-w-lg">
            
            <Drawer.Title className="sr-only">Alternativas Legales</Drawer.Title>
            <Drawer.Description className="sr-only">Seleccione un servicio de streaming</Drawer.Description>

            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 z-50 pointer-events-none opacity-80" />

            <div className="flex-1 relative bg-[#F2F2F7] dark:bg-[#1c1c1e] rounded-t-[13px] landscape:rounded-t-[13px] landscape:rounded-b-none transform-gpu">
                 <IOSNavigationStack 
                    activeCategory={activeCategory}
                    onClose={handleManualClose}
                    onBack={handleBack}
                    onSelectCategory={selectCategory}
                    isModalOpen={isOpen}
                    isDesktop={false}
                    isLandscape={isLandscape}
                />
            </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
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
}

const TRANSITION_CLASSES = "all 1000ms cubic-bezier(0.32,0.72,0,1)";

const IOSNavigationStack: React.FC<NavigationProps> = ({ activeCategory, onClose, onBack, onSelectCategory, isModalOpen, isDesktop, isLandscape }) => {
    const [menuHeight, setMenuHeight] = useState<number | undefined>(undefined);
    const [displayedCategory, setDisplayedCategory] = useState<CategoryData | null>(activeCategory);

    const categoriesRef = useRef<HTMLDivElement>(null);
    const servicesRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);

    const [pendingService, setPendingService] = useState<Service | null>(null);

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

    useEffect(() => {
        if (activeCategory) {
            setDisplayedCategory(activeCategory);
        }
    }, [activeCategory]);

    useEffect(() => {
        if (contentWrapperRef.current) {
            contentWrapperRef.current.scrollTop = 0;
        }
    }, [activeCategory]);

    useEffect(() => {
        if (!isDesktop && !isLandscape) {
            setMenuHeight(undefined);
            return;
        }
        const updateHeight = () => {
            const currentRef = activeCategory ? servicesRef.current : categoriesRef.current;
            if (currentRef) {
                const contentHeight = currentRef.offsetHeight;
                const maxHeight = window.innerHeight * (isDesktop ? 0.85 : 0.95);
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

    const onTouchStart = (e: React.TouchEvent) => {
        if (!activeCategory) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        previousMoveX.current = e.touches[0].clientX;
        lastDirectionRef.current = null;
        isHorizontalSwipeRef.current = null;
        isDraggingRef.current = true;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDraggingRef.current || !activeCategory) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX.current;
        const diffY = currentY - touchStartY.current;
        if (isHorizontalSwipeRef.current === null) {
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);
            if (absX > 5 || absY > 5) {
                if (absX > absY) {
                    isHorizontalSwipeRef.current = true;
                    if (categoriesRef.current) categoriesRef.current.style.transition = 'none';
                    if (servicesRef.current) servicesRef.current.style.transition = 'none';
                } else isHorizontalSwipeRef.current = false;
            }
        }
        if (isHorizontalSwipeRef.current === true) {
             if (e.cancelable) e.stopPropagation();
             if (diffX > 0) {
                 if (currentX < previousMoveX.current) lastDirectionRef.current = 'left';
                 else if (currentX > previousMoveX.current) lastDirectionRef.current = 'right';
                 previousMoveX.current = currentX;
                 if (servicesRef.current) servicesRef.current.style.transform = `translateX(${diffX}px)`;
                 if (categoriesRef.current) {
                     const scrollTop = contentWrapperRef.current?.scrollTop || 0;
                     categoriesRef.current.style.transform = `translateX(calc(-100% + ${diffX}px)) translateY(${scrollTop}px)`;
                 }
             }
        }
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (!isDraggingRef.current || !activeCategory) return;
        isDraggingRef.current = false;
        if (categoriesRef.current) categoriesRef.current.style.transition = TRANSITION_CLASSES;
        if (servicesRef.current) servicesRef.current.style.transition = TRANSITION_CLASSES;
        if (isHorizontalSwipeRef.current === true) {
            const currentX = e.changedTouches[0].clientX;
            const diffX = currentX - touchStartX.current;
            const containerWidth = contentWrapperRef.current?.offsetWidth || window.innerWidth;
            const threshold = containerWidth / 5;
            const shouldGoBack = diffX > threshold && lastDirectionRef.current !== 'left';
            if (shouldGoBack) {
                onBack();
                requestAnimationFrame(() => {
                    if (categoriesRef.current) categoriesRef.current.style.transform = '';
                    if (servicesRef.current) servicesRef.current.style.transform = '';
                });
            } else {
                if (categoriesRef.current) categoriesRef.current.style.transform = '';
                if (servicesRef.current) servicesRef.current.style.transform = '';
            }
        } else {
            if (categoriesRef.current) categoriesRef.current.style.transform = '';
            if (servicesRef.current) servicesRef.current.style.transform = '';
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

    return (
        <div className={`flex flex-col w-full relative ${!isDesktop ? 'h-full' : ''}`}>
            <div className="absolute top-0 left-0 right-0 h-[70px] bg-[#F2F2F7]/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl z-20 border-b border-gray-200 dark:border-gray-800/50">
                {/* Back Button Area */}
                <button 
                    onClick={onBack}
                    disabled={!activeCategory}
                    className={`absolute top-0 left-0 h-full pl-4 pr-12 flex items-center text-[#007AFF] transition-all duration-300 active:opacity-50 z-30 ${
                        activeCategory ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
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
                <div className="absolute top-0 right-0 h-full flex items-center pr-[15.5px] z-30">
                    <button 
                        onClick={onClose}
                        className="bg-[#767680]/15 dark:bg-black/20 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-[#767680]/25 dark:hover:bg-black/30 active:opacity-60 active:scale-90 transition-all duration-300 outline-none"
                    >
                        <X className="w-6 h-6" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <div 
                ref={contentWrapperRef}
                style={{ height: (isDesktop || isLandscape) ? (menuHeight ? `${menuHeight}px` : 'auto') : '100%' }} 
                className={`relative w-full ${isDesktop || isLandscape ? 'max-h-[95vh]' : 'flex-1'} overflow-y-auto no-scrollbar transition-[height] ${isModalOpen ? 'duration-[1000ms]' : 'duration-0'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                data-vaul-no-drag
            >
                <div 
                    ref={categoriesRef}
                    style={{ transition: navTransition }}
                    className={`w-full transition-transform ${
                        activeCategory ? '-translate-x-full pointer-events-none absolute top-0 h-full' : 'translate-x-0 relative'
                    }`}
                >
                    <div className="pb-8 pt-[86px]">
                         <div className="px-4 mb-2">
                            <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-4">Categorías</h3>
                        </div>
                        <div className="mx-4 bg-white dark:bg-[#2C2C2E] rounded-[12px] overflow-hidden">
                            {CATEGORIES.map((cat, i) => (
                                <div key={cat.id} className="relative">
                                    <IOSListItem icon={<div className="w-7 h-7 rounded-[6px] bg-blue-500 flex items-center justify-center">{cat.icon}</div>} label={cat.title} onClick={() => onSelectCategory(cat)} showChevron />
                                    {i < CATEGORIES.length - 1 && <div className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-gray-200 dark:bg-gray-700/60" />}
                                </div>
                            ))}
                        </div>
                        <p className="px-8 mt-4 text-[13px] text-gray-400 dark:text-gray-500 text-center leading-normal">Selecciona una categoría para ver los servicios legales disponibles en tu región.</p>
                    </div>
                </div>

                <div 
                    ref={servicesRef}
                    style={{ transition: navTransition }}
                    className={`w-full transition-transform ${
                        activeCategory ? 'translate-x-0 relative' : 'translate-x-full pointer-events-none absolute top-0 h-full'
                    }`}
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
                                        <div className={`mx-4 bg-white dark:bg-[#2C2C2E] ${isSystemStoreSection ? 'rounded-[20px]' : 'rounded-[12px]'} overflow-hidden`}>
                                            {sectionServices.map((service, idx) => {
                                                if (service.isSystemStore) {
                                                    const storeData = getSystemStoreData();
                                                    return (
                                                        <div key={service.name} className="relative">
                                                            <div className="w-full flex items-center justify-between p-3 pl-4 min-h-[72px]">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-[14px] ${storeData.color} flex items-center justify-center shrink-0 transition-opacity ${storeData.disabled ? 'opacity-50' : 'opacity-100'}`}>{storeData.icon}</div>
                                                                    <div className="flex flex-col justify-center">
                                                                        <h4 className={`text-[17px] font-semibold mb-0 leading-tight ${storeData.disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{storeData.name}</h4>
                                                                        {storeData.disabled && <span className="text-[13px] text-gray-400">No compatible</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="pr-1"><button onClick={(e) => { e.stopPropagation(); if (!storeData.disabled) handleServiceClick(service); }} disabled={storeData.disabled} className={`px-5 py-1.5 rounded-full text-[15px] font-bold transition-all ${storeData.disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-[#007AFF] text-white active:opacity-80'}`}>{storeData.buttonLabel}</button></div>
                                                            </div>
                                                             {idx < sectionServices.length - 1 && <div className="absolute bottom-0 left-[72px] right-0 h-[1px] bg-gray-200 dark:bg-gray-700/60" />}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div key={service.name} className="relative">
                                                        <IOSListItem icon={<div className={`w-7 h-7 rounded-[6px] flex items-center justify-center text-[12px] font-bold ${service.color}`}>{service.iconContent ? service.iconContent : (service.iconLabel || service.name[0])}</div>} label={service.name} onClick={() => handleServiceClick(service)} external actionLabel={getActionLabel(service)} />
                                                        {idx < sectionServices.length - 1 && <div className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-gray-200 dark:bg-gray-700/60" />}
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

            <IOSAlert isOpen={!!pendingService} onClose={closeServiceAlert} title={alertTitle} message={alertMessage} actions={alertActions} />
        </div>
    );
};
