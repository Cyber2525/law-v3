import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, ExternalLink, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { Drawer } from 'vaul';
import { Dialog, AlertAction } from './ui/Dialog';
import { DesktopModal } from './ui/DesktopModal';
import { BottomSheet } from './ui/BottomSheet';
import { CATEGORIES, Service, CategoryData } from '../data/streamingServices';
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from '../hooks/useMediaQuery';
import { usePressTracking } from '../hooks/usePressTracking';

// --- Componentes de Fila y Lógica de Interacción (iOS Style) ---

interface UseStreamingListInteractionProps {
    onClick: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    sliderRef: React.RefObject<HTMLDivElement | null>;
    isCategory?: boolean;
    disabled?: boolean;
    onHold200ms?: () => void;
    onLongPressStart?: () => void;
    onLongPressEnd?: () => void;
    onPressStart?: () => void;
    onPressEnd?: () => void;
}

function useStreamingListInteraction({
    onClick,
    scrollContainerRef,
    sliderRef,
    isCategory = false,
    disabled = false,
    onHold200ms,
    onLongPressStart,
    onLongPressEnd,
    onPressStart,
    onPressEnd
}: UseStreamingListInteractionProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isPointerDownRef = useRef(false);
    const activePointerIdRef = useRef<number | null>(null);
    const isCancelledRef = useRef(false);
    const isInsideRef = useRef(false);
    const initialScrollTopRef = useRef(0);
    const initialSliderTxRef = useRef(0);
    const touchStartXRef = useRef(0);
    const touchStartYRef = useRef(0);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHeldOver200msRef = useRef(false);

    const [isPressed, setIsPressed] = useState(false);
    const [isAbruptPressed, setIsAbruptPressed] = useState(false);

    // Mantener referencias estables para que los callbacks no reinicien el timer al re-renderizar
    const onClickRef = useRef(onClick);
    onClickRef.current = onClick;
    const onHold200msRef = useRef(onHold200ms);
    onHold200msRef.current = onHold200ms;
    const onLongPressStartRef = useRef(onLongPressStart);
    onLongPressStartRef.current = onLongPressStart;
    const onLongPressEndRef = useRef(onLongPressEnd);
    onLongPressEndRef.current = onLongPressEnd;
    const onPressStartRef = useRef(onPressStart);
    onPressStartRef.current = onPressStart;
    const onPressEndRef = useRef(onPressEnd);
    onPressEndRef.current = onPressEnd;
    const scrollContainerRef_ = useRef(scrollContainerRef);
    scrollContainerRef_.current = scrollContainerRef;
    const sliderRef_ = useRef(sliderRef);
    sliderRef_.current = sliderRef;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    const scrollCleanupRef = useRef<(() => void) | null>(null);

    const cancelInteraction = () => {
        isCancelledRef.current = true;
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (scrollCleanupRef.current) {
            scrollCleanupRef.current();
            scrollCleanupRef.current = null;
        }
        setIsPressed(false);
        setIsAbruptPressed(false);
        onPressEndRef.current?.();
        if (isHeldOver200msRef.current) {
            isHeldOver200msRef.current = false;
            onLongPressEndRef.current?.();
        }
    };

    useEffect(() => {
        if (disabled && isPointerDownRef.current) {
            cancelInteraction();
        }
    }, [disabled]);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0 || disabledRef.current) return;

        isPointerDownRef.current = true;
        activePointerIdRef.current = e.pointerId;
        isCancelledRef.current = false;
        isInsideRef.current = true;
        isHeldOver200msRef.current = false;

        touchStartXRef.current = e.clientX;
        touchStartYRef.current = e.clientY;

        const container = scrollContainerRef_.current.current;
        initialScrollTopRef.current = container ? container.scrollTop : 0;
        const slider = sliderRef_.current.current;
        initialSliderTxRef.current = slider ? getCurrentTranslateX(slider) : 0;

        if (scrollCleanupRef.current) {
            scrollCleanupRef.current();
            scrollCleanupRef.current = null;
        }

        const handleScrollCancel = () => {
            if (isPointerDownRef.current && !isCancelledRef.current) {
                cancelInteraction();
            }
        };

        if (container) {
            container.addEventListener('scroll', handleScrollCancel, { passive: true, once: true });
        }
        window.addEventListener('scroll', handleScrollCancel, { passive: true, capture: true, once: true });
        window.addEventListener('modal-vertical-drag', handleScrollCancel, { passive: true, once: true });

        scrollCleanupRef.current = () => {
            if (container) {
                container.removeEventListener('scroll', handleScrollCancel);
            }
            window.removeEventListener('scroll', handleScrollCancel, true);
            window.removeEventListener('modal-vertical-drag', handleScrollCancel);
        };

        if (isCategory) {
            setIsAbruptPressed(false);
            if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
            }
            holdTimerRef.current = setTimeout(() => {
                if (isPointerDownRef.current && !isCancelledRef.current && isInsideRef.current && !disabledRef.current) {
                    isHeldOver200msRef.current = true;
                    setIsAbruptPressed(true);
                    onHold200msRef.current?.();
                    onLongPressStartRef.current?.();
                }
            }, 200);
        } else {
            // Botones de servicios: entrada abrupta inmediata
            setIsPressed(true);
            onPressStartRef.current?.();
        }
    };

    useEffect(() => {
        const handleWindowPointerMove = (e: PointerEvent) => {
            if (!isPointerDownRef.current || e.pointerId !== activePointerIdRef.current) return;

            if (isCancelledRef.current) return;

            // Cancelar solo si hubo cambio físico real en el scroll o si se está arrastrando el slider de la página
            const container = scrollContainerRef_.current.current;
            const scrollMoved = container && Math.abs(container.scrollTop - initialScrollTopRef.current) > 0;
            const slider = sliderRef_.current.current;
            const sliderMoved = slider && Math.abs(getCurrentTranslateX(slider) - initialSliderTxRef.current) > 2;

            // Detección de cambio físico real en scroll o slider
            if (scrollMoved || sliderMoved) {
                cancelInteraction();
                return;
            }

            // Seguimiento dentro/fuera del área del botón (incluso mientras el botón está en movimiento)
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const isInside = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );

            if (!isInside) {
                // "si te sales se desclica"
                if (isInsideRef.current) {
                    isInsideRef.current = false;
                    if (isCategory) {
                        setIsAbruptPressed(false);
                        onPressEndRef.current?.();
                        if (isHeldOver200msRef.current) {
                            onLongPressEndRef.current?.();
                        }
                    } else {
                        setIsPressed(false);
                        onPressEndRef.current?.();
                    }
                }
            } else {
                // "pero se reprende si vuelves al area"
                if (!isInsideRef.current) {
                    isInsideRef.current = true;
                    if (isCategory) {
                        if (isHeldOver200msRef.current) {
                            setIsAbruptPressed(true);
                            onHold200msRef.current?.();
                            onLongPressStartRef.current?.();
                        } else if (!holdTimerRef.current) {
                            holdTimerRef.current = setTimeout(() => {
                                if (isPointerDownRef.current && !isCancelledRef.current && isInsideRef.current) {
                                    isHeldOver200msRef.current = true;
                                    setIsAbruptPressed(true);
                                    onHold200msRef.current?.();
                                    onLongPressStartRef.current?.();
                                }
                            }, 200);
                        }
                    } else {
                        setIsPressed(true);
                        onPressStartRef.current?.();
                    }
                }
            }
        };

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (!isPointerDownRef.current || e.pointerId !== activePointerIdRef.current) return;

            const wasCancelled = isCancelledRef.current;
            const wasInside = isInsideRef.current;
            const wasHeld = isHeldOver200msRef.current;

            isPointerDownRef.current = false;
            activePointerIdRef.current = null;
            if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
            }
            if (scrollCleanupRef.current) {
                scrollCleanupRef.current();
                scrollCleanupRef.current = null;
            }

            if (!wasCancelled && wasInside && buttonRef.current && !disabledRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const isStillInside = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
                if (isStillInside) {
                    onClickRef.current();
                }
            }

            if (wasHeld) {
                onLongPressEndRef.current?.();
            }

            setIsPressed(false);
            setIsAbruptPressed(false);
            isInsideRef.current = false;
            onPressEndRef.current?.();
        };

        const handleWindowPointerCancel = (e: PointerEvent) => {
            if (!isPointerDownRef.current || e.pointerId !== activePointerIdRef.current) return;
            cancelInteraction();
            isPointerDownRef.current = false;
            activePointerIdRef.current = null;
            isInsideRef.current = false;
        };

        window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
        window.addEventListener('pointerup', handleWindowPointerUp);
        window.addEventListener('pointercancel', handleWindowPointerCancel);

        return () => {
            window.removeEventListener('pointermove', handleWindowPointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
            window.removeEventListener('pointercancel', handleWindowPointerCancel);
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
            if (scrollCleanupRef.current) {
                scrollCleanupRef.current();
                scrollCleanupRef.current = null;
            }
        };
    }, [isCategory]);

    // Escuchar el evento scroll directamente en el contenedor
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            if (isPointerDownRef.current && !isCancelledRef.current) {
                cancelInteraction();
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [scrollContainerRef]);

    return {
        buttonRef,
        isPressed,
        isAbruptPressed,
        isHeldOver200msRef,
        handlePointerDown,
        cancelInteraction
    };
}

interface CategoryListItemProps {
    cat: CategoryData;
    icon: React.ReactNode;
    label: string;
    onClick: (wasHeld: boolean) => void;
    isSelected: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    sliderRef: React.RefObject<HTMLDivElement | null>;
    onPressChange?: (isPressed: boolean) => void;
    onLongPressStart?: () => void;
    onLongPressEnd?: () => void;
    showChevron?: boolean;
    disabled?: boolean;
}

const CategoryListItem: React.FC<CategoryListItemProps> = ({
    cat,
    icon,
    label,
    onClick,
    isSelected,
    scrollContainerRef,
    sliderRef,
    onPressChange,
    onLongPressStart,
    onLongPressEnd,
    showChevron = true,
    disabled = false
}) => {
    const {
        buttonRef,
        isAbruptPressed,
        isHeldOver200msRef,
        handlePointerDown
    } = useStreamingListInteraction({
        onClick: () => {
            if (disabled) return;
            onClick(isHeldOver200msRef.current);
        },
        scrollContainerRef,
        sliderRef,
        isCategory: true,
        disabled,
        onHold200ms: () => {
            if (disabled) return;
            onPressChange?.(true);
        },
        onLongPressStart,
        onLongPressEnd,
        onPressEnd: () => {
            onPressChange?.(false);
        }
    });

    return (
        <div className="relative">
            {/* Capa de highlight: abrupto tras 200ms o progresivo sincronizado al navegar y desvanecer al volver */}
            <div 
                className="absolute inset-0 bg-gray-300 dark:bg-white/20 pointer-events-none"
                style={{
                    opacity: (isAbruptPressed && !disabled) 
                        ? 1 
                        : (isSelected ? 'var(--active-cat-opacity, 0)' : 0),
                    transition: 'opacity 0s'
                }}
            />
            <button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                disabled={disabled}
                className={`relative z-10 w-full flex items-center justify-between p-3 pl-4 min-h-[50px] select-none outline-none bg-transparent ${disabled ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-[17px] text-gray-900 dark:text-white font-normal">
                        {label}
                    </span>
                </div>
                <div className="flex items-center gap-1 pr-1">
                    {showChevron && (
                        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={2} />
                    )}
                </div>
            </button>
        </div>
    );
};

interface ServiceListItemProps {
    service: Service;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    sliderRef: React.RefObject<HTMLDivElement | null>;
    onPressChange?: (isPressed: boolean) => void;
    actionLabel?: string;
    disabled?: boolean;
}

const ServiceListItem: React.FC<ServiceListItemProps> = ({
    service,
    icon,
    label,
    onClick,
    scrollContainerRef,
    sliderRef,
    onPressChange,
    actionLabel,
    disabled = false
}) => {
    const isWeb = actionLabel === 'Web';
    const textColor = isWeb ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500';

    const {
        buttonRef,
        isPressed,
        handlePointerDown
    } = useStreamingListInteraction({
        onClick: () => {
            if (disabled) return;
            onClick();
        },
        scrollContainerRef,
        sliderRef,
        isCategory: false,
        disabled,
        onPressStart: () => {
            if (disabled) return;
            onPressChange?.(true);
        },
        onPressEnd: () => {
            onPressChange?.(false);
        }
    });

    return (
        <div className="relative">
            {/* Capa de highlight de servicio: entrada abrupta (0s) y desclick abrupto (0s) */}
            <div 
                className="absolute inset-0 bg-gray-300 dark:bg-white/20 pointer-events-none"
                style={{
                    opacity: (isPressed && !disabled) ? 1 : 0,
                    transition: 'opacity 0s'
                }}
            />
            <button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                disabled={disabled}
                className={`relative z-10 w-full flex items-center justify-between p-3 pl-4 min-h-[50px] select-none outline-none bg-transparent ${disabled ? 'pointer-events-none cursor-default' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-[17px] text-gray-900 dark:text-white font-normal">
                        {label}
                    </span>
                </div>
                <div className="flex items-center gap-1 pr-1">
                    <span className={`text-[15px] mr-1 ${textColor}`}>{actionLabel || 'Abrir'}</span>
                    <ExternalLink className={`w-4 h-4 ${textColor}`} />
                </div>
            </button>
        </div>
    );
};

interface SystemStoreRowProps {
    service: Service;
    storeData: {
        name: string;
        url: string;
        icon: React.ReactNode;
        color: string;
        buttonLabel: string;
        disabled: boolean;
    };
    disabled: boolean;
    onServiceClick: (service: Service) => void;
    hideDivider: boolean;
    showDivider: boolean;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    sliderRef?: React.RefObject<HTMLDivElement | null>;
}

const SystemStoreRow: React.FC<SystemStoreRowProps> = ({
    service,
    storeData,
    disabled,
    onServiceClick,
    hideDivider,
    showDivider,
    scrollContainerRef,
    sliderRef
}) => {
    const isButtonDisabled = storeData.disabled || disabled;

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isPressed, setIsPressed] = useState(false);
    const [isReentry, setIsReentry] = useState(false);
    const isPointerDownRef = useRef(false);
    const isCancelledRef = useRef(false);
    const activePointerIdRef = useRef<number | null>(null);
    const initialScrollTopRef = useRef(0);
    const initialSliderTxRef = useRef(0);
    const touchStartXRef = useRef(0);
    const touchStartYRef = useRef(0);
    const hasExitedRef = useRef(false);
    const lastDistRef = useRef(0);

    const scrollCleanupRef = useRef<(() => void) | null>(null);

    const cancel = () => {
        if (!isPointerDownRef.current) return;
        isPointerDownRef.current = false;
        isCancelledRef.current = true;
        setIsPressed(false);
        setIsReentry(false);
        if (scrollCleanupRef.current) {
            scrollCleanupRef.current();
            scrollCleanupRef.current = null;
        }
        if (activePointerIdRef.current !== null && buttonRef.current) {
            try { buttonRef.current.releasePointerCapture(activePointerIdRef.current); } catch (err) {}
        }
        activePointerIdRef.current = null;
    };

    // Al deshabilitarse el botón, hacer automáticamente como si se hubiera soltado (volver a su color con su transición)
    useEffect(() => {
        if (isButtonDisabled && isPointerDownRef.current) {
            cancel();
        }
    }, [isButtonDisabled]);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (isButtonDisabled || e.button !== 0) return;

        isPointerDownRef.current = true;
        isCancelledRef.current = false;
        activePointerIdRef.current = e.pointerId;
        hasExitedRef.current = false;
        lastDistRef.current = 0;
        setIsReentry(false);
        setIsPressed(true);

        touchStartXRef.current = e.clientX;
        touchStartYRef.current = e.clientY;

        const container = scrollContainerRef?.current;
        initialScrollTopRef.current = container ? container.scrollTop : 0;
        const slider = sliderRef?.current;
        initialSliderTxRef.current = slider ? getCurrentTranslateX(slider) : 0;

        if (scrollCleanupRef.current) {
            scrollCleanupRef.current();
            scrollCleanupRef.current = null;
        }

        const handleScroll = () => {
            if (isPointerDownRef.current) {
                cancel();
            }
        };

        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true, once: true });
        }
        window.addEventListener('scroll', handleScroll, { passive: true, capture: true, once: true });
        window.addEventListener('modal-vertical-drag', handleScroll, { passive: true, once: true });

        scrollCleanupRef.current = () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('modal-vertical-drag', handleScroll);
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!isPointerDownRef.current || isButtonDisabled || isCancelledRef.current) return;

        // Detección de cambio físico real en scroll o slider (no por mover el cursor arriba o abajo)
        const container = scrollContainerRef?.current;
        if (container && Math.abs(container.scrollTop - initialScrollTopRef.current) > 0) {
            cancel();
            return;
        }

        const slider = sliderRef?.current;
        if (slider && Math.abs(getCurrentTranslateX(slider) - initialSliderTxRef.current) > 1) {
            cancel();
            return;
        }

        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
        const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
        const dist = Math.max(dx, dy);

        if (dist === 0) {
            hasExitedRef.current = false;
            lastDistRef.current = 0;
            if (!isPressed) {
                setIsReentry(true);
                setIsPressed(true);
            }
        } else {
            const prevDist = lastDistRef.current;
            lastDistRef.current = dist;

            if (!hasExitedRef.current) {
                hasExitedRef.current = true;
                if (isPressed) {
                    setIsPressed(false);
                    setIsReentry(false);
                }
            } else {
                if (dist < prevDist - 0.5) {
                    if (dist <= 50) {
                        if (!isPressed) {
                            setIsReentry(true);
                            setIsPressed(true);
                        }
                    }
                } else if (dist > prevDist + 0.5) {
                    if (isPressed) {
                        setIsPressed(false);
                        setIsReentry(false);
                    }
                }
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (!isPointerDownRef.current) return;

        const wasPressed = isPressed;
        const wasCancelled = isCancelledRef.current;

        isPointerDownRef.current = false;
        activePointerIdRef.current = null;
        if (scrollCleanupRef.current) {
            scrollCleanupRef.current();
            scrollCleanupRef.current = null;
        }
        setIsPressed(false);
        setIsReentry(false);

        if (isButtonDisabled || wasCancelled) return;

        if (wasPressed) {
            onServiceClick(service);
        }
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}
        cancel();
    };

    return (
        <div className="relative">
            <div className="w-full flex items-center justify-between p-3 pl-4 min-h-[72px] select-none">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[11px] ${storeData.color} flex items-center justify-center shrink-0 transition-opacity ${storeData.disabled ? 'opacity-50' : 'opacity-100'}`}>
                        {storeData.icon}
                    </div>
                    <div className="flex flex-col justify-center">
                        <h4 className={`text-[17px] font-semibold mb-0 leading-tight ${storeData.disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {storeData.name}
                        </h4>
                        {storeData.disabled && <span className="text-[13px] text-gray-400">No compatible</span>}
                    </div>
                </div>
                <div className="pr-1">
                    <button 
                        ref={buttonRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        disabled={isButtonDisabled}
                        className={`px-5 py-1.5 rounded-full text-[15px] font-bold outline-none select-none touch-none gpu-accelerated transition-opacity duration-300 ${
                            isButtonDisabled 
                                ? 'pointer-events-none cursor-default' 
                                : 'cursor-pointer'
                        } ${storeData.color} ${storeData.disabled ? 'text-gray-500 dark:text-gray-400' : 'text-white'} ${isPressed ? 'opacity-30' : 'opacity-100'}`}
                        style={{
                            transitionDuration: (!isPressed || isReentry) ? '300ms' : '0ms'
                        }}
                    >
                        {storeData.buttonLabel}
                    </button>
                </div>
            </div>
            {showDivider && (
                <div className={`absolute bottom-0 left-[72px] right-0 h-[1px] bg-black/10 dark:bg-white/10 pointer-events-none ${hideDivider ? 'opacity-0' : 'opacity-100'}`} />
            )}
        </div>
    );
};

// --- Componente Principal ---

interface StreamingModalProps {
  isOpen: boolean;
  onClose: (wasInSubpage?: boolean) => void;
  isDarkMode?: boolean;
}

export const StreamingModal: React.FC<StreamingModalProps> = ({ isOpen, onClose, isDarkMode: isDarkModeProp }) => {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [activeCategory, setActiveCategory] = useState<CategoryData | null>(null);
  const [isDismissable, setIsDismissable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof isDarkModeProp === 'boolean') return isDarkModeProp;
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (typeof isDarkModeProp === 'boolean') {
      setIsDarkMode(isDarkModeProp);
    }
  }, [isDarkModeProp]);

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
    if (percentageDragged > 0) {
      window.dispatchEvent(new CustomEvent('modal-vertical-drag'));
    }
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
      <DesktopModal isOpen={isOpen} onClose={handleManualClose} containerClassName="w-[420px] max-w-[calc(100vw-32px)] bg-[#F2F2F7]/70 dark:bg-[#1c1c1e]/70">
        <div 
          className="absolute inset-0 backdrop-blur-xl -z-10 pointer-events-none" 
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        />
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

const TRANSITION_CLASSES = "all 800ms cubic-bezier(0.16, 1, 0.3, 1)";

function getCurrentTranslateX(element: HTMLElement | null): number {
  if (!element) return 0;
  const style = window.getComputedStyle(element);
  const transform = style.transform || (style as any).webkitTransform;
  if (!transform || transform === 'none') return 0;
  const mat = transform.match(/^matrix\((.+)\)$/);
  if (mat) {
    const values = mat[1].split(',');
    return parseFloat(values[4]?.trim() || '0') || 0;
  }
  const mat3d = transform.match(/^matrix3d\((.+)\)$/);
  if (mat3d) {
    const values = mat3d[1].split(',');
    return parseFloat(values[12]?.trim() || '0') || 0;
  }
  return 0;
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return function(t: number) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const currentSlope = 3 * (1 - s) * (1 - s) * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s * s * (1 - x2);
      if (currentSlope === 0) break;
      const currentX = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s - t;
      s -= currentX / currentSlope;
      s = Math.max(0, Math.min(1, s));
    }
    return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  };
}
const easeIOS = cubicBezier(0.16, 1, 0.3, 1);

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
    const displayedCategoryRef = useRef<CategoryData | null>(activeCategory);
    const prevCategoryRef = useRef(activeCategory);
    const categoryScrollPositions = useRef<Record<string, number>>({});
    const isProgrammaticScroll = useRef(false);
    const scrollAnimRef = useRef<number | null>(null);
    const currentRatioRef = useRef(0);

    const categoriesRef = useRef<HTMLDivElement>(null);
    const servicesRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const titleTrackRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);

    const [pressedCatId, setPressedCatId] = useState<string | null>(null);
    const [pressedServiceId, setPressedServiceId] = useState<string | null>(null);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(() => activeCategory ? activeCategory.id : null);
    const selectedCatIdRef = useRef<string | null>(activeCategory ? activeCategory.id : null);
    const [navDirection, setNavDirection] = useState<'idle' | 'forward' | 'services' | 'returning'>(activeCategory ? 'services' : 'idle');
    const navDirectionRef = useRef<'idle' | 'forward' | 'services' | 'returning'>(activeCategory ? 'services' : 'idle');
    const heldOver200msRef = useRef(false);

    const updateNavDirection = (dir: 'idle' | 'forward' | 'services' | 'returning') => {
        navDirectionRef.current = dir;
        setNavDirection(dir);
    };

    const [isAnimatingInternal, setIsAnimatingInternal] = useState(false);
    const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTransitioningRef = useRef(false);
    const startTranslateXRef = useRef(0);
    const hasSwipedRef = useRef(false);

    const isIdaAnimation = navDirection === 'forward' && (isAnimatingInternal || isTransitioningRef.current);
    const isVueltaAnimation = navDirection === 'returning';

    const updateLiveScrollProgress = () => {
        if (!sliderRef.current) return;
        const containerWidth = sliderRef.current.offsetWidth / 2;
        const currentTx = getCurrentTranslateX(sliderRef.current);
        const ratio = Math.max(0, Math.min(1, (currentTx - (-containerWidth)) / containerWidth));
        const scroll1 = categoriesRef.current ? Math.min(categoriesRef.current.scrollTop / 15, 1) : 0;
        const scroll2 = servicesRef.current ? Math.min(servicesRef.current.scrollTop / 15, 1) : 0;
        
        const wCurrent = Math.min(1, (1 - ratio) / 0.075);
        const wTarget = Math.min(1, ratio / 0.075);
        const interpolatedScroll = Math.max(scroll2 * wCurrent, scroll1 * wTarget);
        setScrollProgress(prev => (Math.abs(prev - interpolatedScroll) < 0.01 ? prev : interpolatedScroll));

        // Opacidad del highlight de la categoría vinculada
        let catOpacity = 0;
        if (navDirectionRef.current === 'forward') {
            catOpacity = heldOver200msRef.current ? 1 : Math.max(0, Math.min(1, 1 - ratio));
        } else if (navDirectionRef.current === 'services') {
            catOpacity = 1;
        } else if (navDirectionRef.current === 'returning') {
            // Transición del 100% de la distancia al volver (de click a no click) en todos los casos
            catOpacity = Math.max(0, Math.min(1, 1 - ratio));
        } else {
            catOpacity = 0;
        }
        sliderRef.current.style.setProperty('--active-cat-opacity', catOpacity.toFixed(4));
    };

    const handleSelectCategory = (cat: CategoryData, wasHeld: boolean = false) => {
        heldOver200msRef.current = wasHeld;
        setSelectedCatId(cat.id);
        selectedCatIdRef.current = cat.id;
        updateNavDirection('forward');

        if (sliderRef.current) {
            sliderRef.current.style.setProperty('--active-cat-opacity', wasHeld ? '1' : '0');
        }

        onSelectCategory(cat);
    };

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
        if (e.target !== sliderRef.current) return;
        if (e.propertyName !== 'transform') return;

        if (!activeCategory && navDirectionRef.current === 'returning') {
            const currentTx = getCurrentTranslateX(sliderRef.current);
            if (currentTx >= -2) {
                if (lockoutTimerRef.current) {
                    clearTimeout(lockoutTimerRef.current);
                    lockoutTimerRef.current = null;
                }
                setIsAnimatingInternal(false);
                isTransitioningRef.current = false;
                updateNavDirection('idle');
                setSelectedCatId(null);
                selectedCatIdRef.current = null;
                heldOver200msRef.current = false;
                setDisplayedCategory(null);
                displayedCategoryRef.current = null;
                if (sliderRef.current) {
                    sliderRef.current.style.setProperty('--active-cat-opacity', '0');
                }
                updateLiveScrollProgress();
            }
        } else if (activeCategory && navDirectionRef.current === 'forward') {
            const currentTx = getCurrentTranslateX(sliderRef.current);
            const containerWidth = sliderRef.current.offsetWidth / 2;
            if (currentTx <= -containerWidth + 2) {
                if (lockoutTimerRef.current) {
                    clearTimeout(lockoutTimerRef.current);
                    lockoutTimerRef.current = null;
                }
                setIsAnimatingInternal(false);
                isTransitioningRef.current = false;
                updateNavDirection('services');
                heldOver200msRef.current = false;
                if (sliderRef.current) {
                    sliderRef.current.style.setProperty('--active-cat-opacity', '1');
                }
                updateLiveScrollProgress();
            }
        }
    };

    const startLockout = (duration = 800) => {
        if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
        setIsAnimatingInternal(true);
        isTransitioningRef.current = true;

        if (scrollAnimRef.current) {
            cancelAnimationFrame(scrollAnimRef.current);
            scrollAnimRef.current = null;
        }
        const syncLiveScroll = () => {
            updateLiveScrollProgress();
            if (isTransitioningRef.current) {
                scrollAnimRef.current = requestAnimationFrame(syncLiveScroll);
            } else {
                scrollAnimRef.current = null;
            }
        };
        scrollAnimRef.current = requestAnimationFrame(syncLiveScroll);

        lockoutTimerRef.current = setTimeout(() => {
            setIsAnimatingInternal(false);
            isTransitioningRef.current = false;
            lockoutTimerRef.current = null;
            updateLiveScrollProgress();

            if (!activeCategory) {
                updateNavDirection('idle');
                setSelectedCatId(null);
                selectedCatIdRef.current = null;
                heldOver200msRef.current = false;
                setDisplayedCategory(null);
                displayedCategoryRef.current = null;
                if (sliderRef.current) {
                    sliderRef.current.style.setProperty('--active-cat-opacity', '0');
                }
            } else {
                updateNavDirection('services');
                heldOver200msRef.current = false;
                if (sliderRef.current) {
                    sliderRef.current.style.setProperty('--active-cat-opacity', '1');
                }
            }
        }, duration);
    };

    useEffect(() => {
        if (!isModalOpen) {
            if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
            setIsAnimatingInternal(false);
            isTransitioningRef.current = false;
            updateNavDirection('idle');
            setSelectedCatId(null);
            selectedCatIdRef.current = null;
            setDisplayedCategory(null);
            displayedCategoryRef.current = null;
            if (sliderRef.current) {
                sliderRef.current.style.setProperty('--active-cat-opacity', '0');
            }
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
        if (!activeCategory) return;
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
            updateNavDirection('returning');
            heldOver200msRef.current = false;
            onBack();
            // Delay resetting the active state to allow the back button to fade out smoothly directly from its pressed state
            setTimeout(() => {
                setIsBackButtonActive(false);
                setIsBackReentry(false);
            }, 350);
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

            if (activeCategory) {
                // Navigating TO category - restore scroll position if saved
                setSelectedCatId(activeCategory.id);
                selectedCatIdRef.current = activeCategory.id;
                if (navDirectionRef.current !== 'forward') {
                    updateNavDirection('forward');
                }
                const savedScroll = categoryScrollPositions.current[activeCategory.id] || 0;
                if (servicesRef.current && servicesRef.current.scrollTop !== savedScroll) {
                    isProgrammaticScroll.current = true;
                    servicesRef.current.scrollTop = savedScroll;
                }
            } else {
                // Navigating BACK to home - save scroll position of the category we are leaving
                updateNavDirection('returning');
                heldOver200msRef.current = false;
                if (prevCategoryRef.current && servicesRef.current) {
                    categoryScrollPositions.current[prevCategoryRef.current.id] = servicesRef.current.scrollTop;
                }
            }

            if (sliderRef.current) {
                sliderRef.current.style.transition = TRANSITION_CLASSES;
                sliderRef.current.style.transform = activeCategory ? 'translateX(-50%)' : 'translateX(0%)';
            }

            if (titleTrackRef.current) {
                titleTrackRef.current.style.transition = TRANSITION_CLASSES;
                titleTrackRef.current.style.transform = activeCategory ? 'translateX(-100%)' : 'translateX(0%)';
            }

            prevCategoryRef.current = activeCategory;
        }
    }, [activeCategory, setScrollProgress]);

    const [pendingService, setPendingService] = useState<Service | null>(null);

    useEffect(() => {
        if (activeCategory) {
            setDisplayedCategory(activeCategory);
            displayedCategoryRef.current = activeCategory;
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
                color: "bg-[#00A859]",
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
    const dragPeakXRef = useRef(0);
    const lastDirectionRef = useRef<'left' | 'right' | null>(null);
    const isHorizontalSwipeRef = useRef<boolean | null>(null);
    const heightsRef = useRef({ categories: 0, services: 0 });
    const isCategoryLongPressActiveRef = useRef(false);
    const hasCategoryLongPressedRef = useRef(false);
    const scrollAxisLockRef = useRef<'horizontal' | 'vertical' | null>(null);

    useEffect(() => {
        const handleModalVerticalDrag = () => {
            setPressedCatId(null);
            setPressedServiceId(null);
            isCategoryLongPressActiveRef.current = false;
            hasCategoryLongPressedRef.current = false;
            scrollAxisLockRef.current = 'vertical';
            isHorizontalSwipeRef.current = false;
        };
        window.addEventListener('modal-vertical-drag', handleModalVerticalDrag);
        return () => window.removeEventListener('modal-vertical-drag', handleModalVerticalDrag);
    }, []);

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
        if (e.button !== 0) return;

        scrollAxisLockRef.current = null;
        isCategoryLongPressActiveRef.current = false;
        hasCategoryLongPressedRef.current = false;
        touchStartX.current = e.clientX;
        touchStartY.current = e.clientY;
        previousMoveX.current = e.clientX;
        lastDirectionRef.current = null;
        isDraggingRef.current = true;
        hasSwipedRef.current = false;
        isHorizontalSwipeRef.current = null;

        let fromH = 0, toH = 0;
        const maxHeight = window.innerHeight * 0.85;
        if (categoriesRef.current && categoriesRef.current.firstElementChild) {
            fromH = Math.min((categoriesRef.current.firstElementChild as HTMLElement).offsetHeight, maxHeight);
        }
        if (servicesRef.current && servicesRef.current.firstElementChild) {
            toH = Math.min((servicesRef.current.firstElementChild as HTMLElement).offsetHeight, maxHeight);
        }
        heightsRef.current = { categories: fromH, services: toH };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;

        // Si se activó el press largo en categoría, no permitir hacer scroll hacia la siguiente página
        if (isCategoryLongPressActiveRef.current || hasCategoryLongPressedRef.current) {
            return;
        }

        const currentX = e.clientX;
        const currentY = e.clientY;
        const diffX = currentX - touchStartX.current;
        const diffY = currentY - touchStartY.current;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        // Dentro de servicios el primer tipo de scroll que se haga es el que domina (horizontal / vertical) y no se debe poder hacer el otro eje en ese momento
        if (activeCategory) {
            // Si domina el scroll vertical, bloquear totalmente el swipe horizontal
            if (scrollAxisLockRef.current === 'vertical') {
                isHorizontalSwipeRef.current = false;
                return;
            }

            // Si domina el swipe horizontal, bloquear el scroll vertical en servicios
            if (scrollAxisLockRef.current === 'horizontal') {
                if (servicesRef.current) {
                    if (servicesRef.current.style.overflowY !== 'hidden') {
                        servicesRef.current.style.overflowY = 'hidden';
                        servicesRef.current.style.touchAction = 'none';
                    }
                }
                if (e.cancelable) e.preventDefault();
            }
        }

        // Detección directa del movimiento real en horizontal
        if (isHorizontalSwipeRef.current === null) {
            if (absY > absX && absY >= 7) {
                isHorizontalSwipeRef.current = false;
                if (activeCategory) {
                    scrollAxisLockRef.current = 'vertical';
                }
                return;
            }
            if (absX > absY && absX >= 7) {
                const currentTxNow = sliderRef.current ? getCurrentTranslateX(sliderRef.current) : 0;
                const isReturnActive = Boolean(
                    !activeCategory &&
                    (displayedCategory || displayedCategoryRef.current) &&
                    (
                        navDirectionRef.current === 'returning' ||
                        isTransitioningRef.current ||
                        currentTxNow < -2
                    )
                );
                const canSwipe = Boolean(activeCategory) || isReturnActive;
                if (!canSwipe) {
                    isHorizontalSwipeRef.current = false;
                    return;
                }

                // ACTIVAR EL MOVIMIENTO HORIZONTAL REAL INMEDIATO
                isHorizontalSwipeRef.current = true;
                hasSwipedRef.current = true;
                if (activeCategory) {
                    scrollAxisLockRef.current = 'horizontal';
                    if (servicesRef.current) {
                        servicesRef.current.style.overflowY = 'hidden';
                        servicesRef.current.style.touchAction = 'none';
                    }
                }

                // Ahora sí detenemos la transición en curso para que el elemento siga al dedo exactamente
                if (lockoutTimerRef.current) {
                    clearTimeout(lockoutTimerRef.current);
                    lockoutTimerRef.current = null;
                }
                setIsAnimatingInternal(false);
                isTransitioningRef.current = false;
                heldOver200msRef.current = false;
                if (scrollAnimRef.current) {
                    cancelAnimationFrame(scrollAnimRef.current);
                    scrollAnimRef.current = null;
                }

                const currentTx = sliderRef.current ? getCurrentTranslateX(sliderRef.current) : 0;
                startTranslateXRef.current = currentTx - diffX;

                if (sliderRef.current) {
                    sliderRef.current.style.transition = 'none';
                    sliderRef.current.style.transform = `translateX(${currentTx}px)`;
                }
                if (titleTrackRef.current) {
                    const currentTitleTx = getCurrentTranslateX(titleTrackRef.current);
                    titleTrackRef.current.style.transition = 'none';
                    titleTrackRef.current.style.transform = `translateX(${currentTitleTx}px)`;
                }
                if (contentWrapperRef.current && (isDesktop || isLandscape)) {
                    contentWrapperRef.current.style.transition = 'none';
                }

                try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch(err) {}
            }
        }

        if (isHorizontalSwipeRef.current === true && sliderRef.current) {
             if (e.cancelable) e.preventDefault();
             hasSwipedRef.current = true;
             if (activeCategory) {
                 heldOver200msRef.current = false;
             }
             
             const containerWidth = sliderRef.current.offsetWidth / 2;
             let move = startTranslateXRef.current + diffX;

             // Resistance when swiping past limits
             if (move > 0) {
                 move *= 0.3; 
             } else if (move < -containerWidth) {
                 const extra = move - (-containerWidth);
                 move = -containerWidth + (extra * 0.3);
             }

             if (currentX < previousMoveX.current) {
                 lastDirectionRef.current = 'left';
                 if (navDirectionRef.current === 'returning') {
                     updateNavDirection('forward');
                 }
             } else if (currentX > previousMoveX.current) {
                 lastDirectionRef.current = 'right';
                 if (navDirectionRef.current !== 'returning') {
                     updateNavDirection('returning');
                 }
             }
             previousMoveX.current = currentX;

             sliderRef.current.style.transform = `translateX(${move}px)`;
             updateLiveScrollProgress();

             // Calculate ratio (from 0 = Services to 1 = Categories) and clamp overscroll
             const ratio = Math.max(0, Math.min(1, (move - (-containerWidth)) / containerWidth));
             
             // Move title track horizontally in sync with manual drag
             if (titleTrackRef.current) {
                 const titleOffset = -100 + ratio * 100;
                 titleTrackRef.current.style.transform = `translateX(${titleOffset}%)`;
             }

             if (contentWrapperRef.current && (isDesktop || isLandscape)) {
                 // ratio = 0 when move == baseOffset (services), ratio = 1 when move == 0 (categories)
                 const interpolatedHeight = heightsRef.current.services + (heightsRef.current.categories - heightsRef.current.services) * ratio;
                 contentWrapperRef.current.style.height = `${interpolatedHeight}px`;
             }
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
        
        // Solo actuar sobre el slider si el agarre se activó
        if (isHorizontalSwipeRef.current === true && sliderRef.current) {
            sliderRef.current.style.transition = TRANSITION_CLASSES;
            if (titleTrackRef.current) {
                titleTrackRef.current.style.transition = TRANSITION_CLASSES;
            }

            const containerWidth = sliderRef.current.offsetWidth / 2;
            const currentTx = getCurrentTranslateX(sliderRef.current);
            let shouldGoBack = false;
            
            if (lastDirectionRef.current === 'right') {
                shouldGoBack = true;
            } else if (lastDirectionRef.current === 'left') {
                shouldGoBack = false;
            } else {
                shouldGoBack = currentTx > -containerWidth * 0.65;
            }

            if (contentWrapperRef.current && (isDesktop || isLandscape)) {
                contentWrapperRef.current.style.transition = TRANSITION_CLASSES;
                contentWrapperRef.current.style.height = `${shouldGoBack ? heightsRef.current.categories : heightsRef.current.services}px`; 
            }

            if (shouldGoBack) {
                updateNavDirection('returning');
                heldOver200msRef.current = false;
                startLockout(800);
                sliderRef.current.style.transform = 'translateX(0%)';
                if (titleTrackRef.current) {
                    titleTrackRef.current.style.transform = 'translateX(0%)';
                }
                if (activeCategory) {
                    onBack();
                }
            } else {
                updateNavDirection('forward');
                heldOver200msRef.current = false;
                startLockout(800);
                sliderRef.current.style.transform = 'translateX(-50%)';
                if (titleTrackRef.current) {
                    titleTrackRef.current.style.transform = 'translateX(-100%)';
                }
                
                // If activeCategory was null (transitioning back and caught to stay in services), restore it
                if (!activeCategory && displayedCategory) {
                    onSelectCategory(displayedCategory);
                }
            }
        }

        isHorizontalSwipeRef.current = null;
        scrollAxisLockRef.current = null;
        isCategoryLongPressActiveRef.current = false;
        hasCategoryLongPressedRef.current = false;
        if (servicesRef.current) {
            servicesRef.current.style.overflowY = '';
            servicesRef.current.style.touchAction = '';
        }
        if (categoriesRef.current) {
            categoriesRef.current.style.overflowY = '';
            categoriesRef.current.style.touchAction = '';
        }
        setTimeout(() => {
            hasSwipedRef.current = false;
        }, 100);
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
                        transition: 'none'
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
                        className={`absolute top-0 left-0 h-full pl-4 pr-1 flex items-center text-[#007AFF] transition-opacity ease-out z-50 touch-none cursor-pointer select-none gpu-accelerated ${
                            !activeCategory 
                                ? 'opacity-0 pointer-events-none' 
                                : (isBackButtonActive ? 'opacity-30' : 'opacity-100 pointer-events-auto')
                        }`}
                        style={{
                            transitionDuration: (!activeCategory || !isBackButtonActive || isBackReentry) ? '350ms' : '0ms'
                        }}
                    >
                        <ChevronLeft className="w-8 h-8 -ml-1" strokeWidth={2.5} />
                        <span className="text-[20px] leading-none pb-0.5 font-normal">Atrás</span>
                    </button>

                    {/* Title Area - Masked viewport with Apple-style edge fade, centered between Atrás and X buttons */}
                    <div 
                        className="absolute top-0 bottom-0 overflow-hidden pointer-events-none"
                        style={{
                            left: '101.17px',
                            right: '65.17px',
                            maskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)'
                        }}
                    >
                        {/* Virtual frame matching full header width to keep titles perfectly centered in the modal */}
                        <div 
                            className="absolute top-0 bottom-0 pointer-events-none"
                            style={{
                                left: '-101.17px',
                                right: '-65.17px'
                            }}
                        >
                            <div 
                                ref={titleTrackRef}
                                style={{ 
                                    transition: navTransition,
                                    transform: activeCategory ? 'translateX(-100%)' : 'translateX(0%)'
                                }}
                                className="absolute inset-0 flex w-full h-full will-change-transform"
                            >
                                <div className="w-full h-full shrink-0 flex items-center justify-center px-4">
                                    <span className="text-[18.5px] sm:text-[19px] font-semibold text-gray-900 dark:text-white text-center truncate">
                                        Alternativas legales
                                    </span>
                                </div>
                                <div className="w-full h-full shrink-0 flex items-center justify-center px-4">
                                    <span className="text-[18.5px] sm:text-[19px] font-semibold text-gray-900 dark:text-white text-center truncate">
                                        {renderCategory?.title || " "}
                                    </span>
                                </div>
                            </div>
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
                className={`relative w-full overflow-hidden ${(isDesktop || isLandscape) ? 'transition-[height]' : 'flex-1 h-full'} ${isModalOpen ? 'duration-[800ms]' : 'duration-0'} ease-[cubic-bezier(0.16,1,0.3,1)]`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div 
                    ref={sliderRef}
                    onTransitionEnd={handleTransitionEnd}
                    style={{ 
                        transition: navTransition,
                        transform: activeCategory ? 'translateX(-50%)' : 'translateX(0%)',
                        height: '100%'
                    }}
                    className="flex w-[200%] items-start touch-none select-none will-change-transform"
                >
                    <div 
                        ref={categoriesRef}
                        onScroll={() => {
                            if (isProgrammaticScroll.current) {
                                isProgrammaticScroll.current = false;
                                return;
                            }
                            setPressedCatId(null);
                            isCategoryLongPressActiveRef.current = false;
                            hasCategoryLongPressedRef.current = false;
                            updateLiveScrollProgress();
                        }}
                        className="w-[50%] h-full shrink-0 overflow-y-auto no-scrollbar touch-pan-y"
                    >
                        <div className="pb-8 pt-[86px] flex flex-col">
                            <div>
                                 <div className="px-4 mb-2">
                                    <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-4">Categorías</h3>
                                </div>
                                <div className={`mx-4 bg-white dark:bg-[#2C2C2E]/70 rounded-[12px] overflow-hidden ${isIdaAnimation ? 'pointer-events-none' : ''}`}>
                                    {CATEGORIES.map((cat, i) => {
                                        const activeId = selectedCatIdRef.current || selectedCatId || activeCategory?.id;
                                        const isThisSelected = activeId === cat.id;
                                        const isNextSelected = activeId === CATEGORIES[i + 1]?.id;
                                        const isThisPressed = pressedCatId === cat.id;
                                        const isNextPressed = pressedCatId === CATEGORIES[i + 1]?.id;

                                        const hideDividerImmediate = isThisPressed || isNextPressed;
                                        const isSyncDivider = !hideDividerImmediate && (isThisSelected || isNextSelected);

                                        return (
                                            <div key={cat.id} className="relative">
                                                <CategoryListItem 
                                                    cat={cat}
                                                    icon={<div className="w-7 h-7 rounded-[6px] bg-blue-500 flex items-center justify-center">{cat.icon}</div>} 
                                                    label={cat.title} 
                                                    onClick={(wasHeld) => {
                                                        if (hasSwipedRef.current || isIdaAnimation) return;
                                                        handleSelectCategory(cat, wasHeld);
                                                    }} 
                                                    isSelected={isThisSelected}
                                                    disabled={isIdaAnimation}
                                                    scrollContainerRef={categoriesRef}
                                                    sliderRef={sliderRef}
                                                    onPressChange={(pressed) => setPressedCatId(pressed ? cat.id : null)}
                                                    onLongPressStart={() => {
                                                        isCategoryLongPressActiveRef.current = true;
                                                        hasCategoryLongPressedRef.current = true;
                                                    }}
                                                    onLongPressEnd={() => {
                                                        isCategoryLongPressActiveRef.current = false;
                                                    }}
                                                    showChevron 
                                                />
                                                {i < CATEGORIES.length - 1 && (
                                                    <div 
                                                        className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-black/10 dark:bg-white/10 pointer-events-none" 
                                                        style={{
                                                            opacity: hideDividerImmediate 
                                                                 ? 0 
                                                                 : (isSyncDivider ? 'calc(1 - var(--active-cat-opacity, 0))' : 1)
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="px-8 mt-4 text-[13px] text-gray-400 dark:text-gray-500 text-center leading-normal">Selecciona una categoría para ver los servicios legales disponibles en tu región.</p>
                        </div>
                    </div>

                    <div 
                        ref={servicesRef}
                        onScroll={() => {
                            if (isProgrammaticScroll.current) {
                                isProgrammaticScroll.current = false;
                                return;
                            }
                            if (isDraggingRef.current && scrollAxisLockRef.current === null) {
                                scrollAxisLockRef.current = 'vertical';
                                isHorizontalSwipeRef.current = false;
                            }
                            setPressedServiceId(null);
                            updateLiveScrollProgress();
                        }}
                        className="w-[50%] h-full shrink-0 overflow-y-auto no-scrollbar touch-pan-y"
                    >
                        <div className="pb-8 pt-[86px] flex flex-col">
                            <div>
                                 {renderCategory && renderCategory.id !== 'games' && (
                                     <div className="px-4 mb-2">
                                         <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-4">Servicios</h3>
                                     </div>
                                 )}
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
                                            <div className={`mx-4 bg-white dark:bg-[#2C2C2E]/70 ${isSystemStoreSection ? 'rounded-[20px]' : 'rounded-[12px]'} overflow-hidden ${isVueltaAnimation ? 'pointer-events-none' : ''}`}>
                                                {sectionServices.map((service, idx) => {
                                                    const isPressed = pressedServiceId === service.name;
                                                    const isNextPressed = pressedServiceId === sectionServices[idx + 1]?.name;
                                                    const hideDivider = isPressed || isNextPressed;

                                                    if (service.isSystemStore) {
                                                        const storeData = getSystemStoreData();
                                                        return (
                                                            <SystemStoreRow 
                                                                key={service.name}
                                                                service={service}
                                                                storeData={storeData}
                                                                disabled={isVueltaAnimation}
                                                                onServiceClick={(s) => {
                                                                    if (!hasSwipedRef.current) handleServiceClick(s);
                                                                }}
                                                                hideDivider={hideDivider}
                                                                showDivider={idx < sectionServices.length - 1}
                                                                scrollContainerRef={servicesRef}
                                                                sliderRef={sliderRef}
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <div key={service.name} className="relative">
                                                            <ServiceListItem 
                                                                service={service}
                                                                icon={<div className={`w-7 h-7 rounded-[6px] flex items-center justify-center text-[12px] font-bold ${service.color}`}>{service.iconContent ? service.iconContent : (service.iconLabel || service.name[0])}</div>} 
                                                                label={service.name} 
                                                                onClick={() => {
                                                                    if (hasSwipedRef.current || isVueltaAnimation) return;
                                                                    handleServiceClick(service);
                                                                }} 
                                                                disabled={isVueltaAnimation}
                                                                scrollContainerRef={servicesRef}
                                                                sliderRef={sliderRef}
                                                                onPressChange={(pressed) => setPressedServiceId(pressed ? service.name : null)}
                                                                actionLabel={getActionLabel(service)} 
                                                            />
                                                            {idx < sectionServices.length - 1 && (
                                                                <div 
                                                                    className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-black/10 dark:bg-white/10 pointer-events-none" 
                                                                    style={{ opacity: hideDivider ? 0 : 1 }}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            </div>
                            {renderCategory && <p className="px-8 mt-4 text-[13px] text-gray-400 dark:text-gray-500 text-center leading-normal">El acceso a estos sitios es seguro y apoya a los creadores de contenido.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog isOpen={!!pendingService} onClose={closeServiceAlert} title={alertTitle} message={alertMessage} actions={alertActions} />
        </div>
    );
};
