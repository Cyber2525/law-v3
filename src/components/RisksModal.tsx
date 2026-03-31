import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, Eye, Gavel, Bug, Lock, Cpu, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Drawer } from 'vaul';

// --- Types & Data ---

type RiskType = 'legal' | 'security';

interface RiskItemData {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// Custom Icon Component for Fingerprint (Robo de Datos)
const FingerprintIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 -960 960 960" 
    fill="currentColor"
    className={className}
  >
    <path d="M440-120q-100 0-170-70t-70-170v-192q0-14 12-19t22 5l138 138q11 11 11 27.5T372-372q-12 12-28.5 12T315-372l-35-35v47q0 66 47 113t113 47q66 0 113-47t47-113v-127q-36-14-58-44.5T520-600q0-38 22-68.5t58-44.5v-127q0-17 11.5-28.5T640-880q17 0 28.5 11.5T680-840v127q36 14 58 44.5t22 68.5q0 38-22 69t-58 44v127q0 100-70 170t-170 70Zm200-440q17 0 28.5-11.5T680-600q0-17-11.5-28.5T640-640q-17 0-28.5 11.5T600-600q0 17 11.5 28.5T640-560Zm0-40Z"/>
  </svg>
);

const LEGAL_RISKS: RiskItemData[] = [
  { 
    title: "Infracción Legal", 
    description: "Acceder y consumir contenido protegido infringe el Art. 195 de la Ley de Propiedad Intelectual.", 
    icon: <Scale className="w-6 h-6 text-white" />,
    color: "bg-blue-500"
  },
  { 
    title: "Rastreo de Actividad", 
    description: "Los proveedores de internet (ISP) pueden estar obligados a registrar accesos a dominios bloqueados.", 
    icon: <Eye className="w-6 h-6 text-white" />,
    color: "bg-purple-500"
  },
  { 
    title: "Posibles Sanciones", 
    description: "Aunque es raro para usuarios finales, la legislación evoluciona para permitir multas administrativas.", 
    icon: <Gavel className="w-6 h-6 text-white" />,
    color: "bg-orange-500"
  },
];

const SECURITY_RISKS: RiskItemData[] = [
  { 
    title: "Malware y Virus", 
    description: "Los usuarios que acceden a contenido clandestino tienen X65 un mas de probababilidades de ser hackeados (tambien incluyen 'chetos' y cracks)", 
    icon: <Bug className="w-6 h-6 text-white" />,
    color: "bg-red-500"
  },
  { 
    title: "Robo de Datos (Phishing)", 
    description: "Las ventanas emergentes suelen imitar bancos o sorteos para robar credenciales y datos de tarjetas.", 
    icon: <FingerprintIcon className="w-6 h-6 text-white" />,
    color: "bg-yellow-500"
  },
  { 
    title: "Cryptojacking", 
    description: "Scripts ocultos usan la potencia de tu procesador para minar criptomonedas, dañando tu hardware.", 
    icon: <Cpu className="w-6 h-6 text-white" />,
    color: "bg-indigo-500"
  },
];

// --- Helper Hooks ---

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

// --- Draggable Segmented Control ---

interface DraggableSegmentedControlProps {
    activeSegment: RiskType;
    onChange: (val: RiskType) => void;
    disabled?: boolean;
}

const DraggableSegmentedControl: React.FC<DraggableSegmentedControlProps> = ({ activeSegment, onChange, disabled }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isPressingInactive, setIsPressingInactive] = useState<RiskType | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    
    const startX = useRef(0);
    const initialOffset = useRef(0);
    const containerWidth = useRef(0);

    // Sync dragOffset with activeSegment when not dragging
    useEffect(() => {
        if (!isDragging) {
             setDragOffset(activeSegment === 'security' ? 100 : 0);
        }
    }, [activeSegment, isDragging]);

    const handleContainerPointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current || disabled) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const targetSide = clickX > rect.width / 2 ? 'security' : 'legal';
        
        if (targetSide !== activeSegment) {
            setIsPressingInactive(targetSide);
        }
    };

    const handleContainerPointerUp = () => {
        if (isPressingInactive) {
            onChange(isPressingInactive);
            setIsPressingInactive(null);
        }
    };

    const handlePillPointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current || disabled) return;
        e.stopPropagation(); 
        
        setIsDragging(true);
        startX.current = e.clientX;
        containerWidth.current = containerRef.current.offsetWidth;
        initialOffset.current = activeSegment === 'security' ? 100 : 0;
        
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePillPointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();

        const currentX = e.clientX;
        const deltaX = currentX - startX.current;
        const slideWidth = containerWidth.current / 2; 
        
        const deltaPercent = (deltaX / slideWidth) * 100;
        let newOffset = initialOffset.current + deltaPercent;
        
        newOffset = Math.max(0, Math.min(100, newOffset));
        setDragOffset(newOffset);
    };

    const handlePillPointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

        if (dragOffset > 50) {
            onChange('security');
            setDragOffset(100);
        } else {
            onChange('legal');
            setDragOffset(0);
        }
    };

    const isLegalSide = dragOffset < 50;
    const isSecuritySide = !isLegalSide;
    
    const BEZIER = 'cubic-bezier(0.32, 0.72, 0, 1)';
    const scaleTransition = `scale 0.45s ${BEZIER}`;
    const fadeTransition = `opacity 0.1s ease-out`;
    
    const scaleFactor = (isDragging) ? 0.92 : 1;
    
    /**
     * GEOMETRÍA iOS EXTRA-REFINADA:
     * Padding aumentado a 4px para un efecto de "encapsulado" más moderno.
     * Con h-12 (48px) y p-[4px], la píldora mide 40px de alto.
     * El centro de transformación radial se sitúa a 4px + 20px = 24px.
     */
    const pillOriginX = `calc(24px + (${dragOffset} * (100% - 48px) / 100))`;
    const pillOrigin = `${pillOriginX} center`;

    return (
        <div 
            ref={containerRef}
            className="bg-[#767680]/15 dark:bg-black/20 p-[4px] rounded-[16px] flex h-12 relative cursor-pointer touch-none select-none"
            onPointerDown={handleContainerPointerDown}
            onPointerUp={handleContainerPointerUp}
        >
            {/* Draggable Background Pill: Margen de 4px para un look más marcado */}
            <div 
                className="absolute top-[4px] bottom-[4px] w-[calc(50%-4px)] bg-white dark:bg-[#2C2C2E] rounded-[12px] shadow-[0_3px_8px_rgba(0,0,0,0.08)] dark:shadow-none z-20 cursor-grab active:cursor-grabbing transform-gpu"
                onPointerDown={handlePillPointerDown}
                onPointerMove={handlePillPointerMove}
                onPointerUp={handlePillPointerUp}
                onPointerCancel={handlePillPointerUp}
                style={{
                    left: '4px', 
                    translate: `${dragOffset}% 0`,
                    scale: scaleFactor,
                    transformOrigin: pillOrigin,
                    transition: isDragging ? `scale 0.45s ${BEZIER}` : `translate 0.45s ${BEZIER}, scale 0.45s ${BEZIER}, transform-origin 0.45s ${BEZIER}`
                }}
            />

            {/* Label 1: Legal */}
            <div 
              className="flex-1 z-30 flex items-center justify-center pointer-events-none transform-gpu"
              style={{ 
                scale: (isDragging && isLegalSide) ? scaleFactor : 1,
                transformOrigin: '24px center',
                opacity: (isPressingInactive === 'legal') ? 0.6 : 1,
                transition: `${scaleTransition}, ${fadeTransition}`
              }}
            >
                <span className={`text-[15px] font-semibold transition-colors duration-300 ${
                    isLegalSide ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                    Riesgos Legales
                </span>
            </div>

            {/* Label 2: Security */}
            <div 
              className="flex-1 z-30 flex items-center justify-center pointer-events-none transform-gpu"
              style={{ 
                scale: (isDragging && isSecuritySide) ? scaleFactor : 1,
                transformOrigin: 'calc(100% - 24px) center',
                opacity: (isPressingInactive === 'security') ? 0.6 : 1,
                transition: `${scaleTransition}, ${fadeTransition}`
              }}
            >
                <span className={`text-[15px] font-semibold transition-colors duration-300 ${
                    isSecuritySide ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                    Seguridad
                </span>
            </div>
        </div>
    );
}

// --- Components ---

interface RisksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RisksModal: React.FC<RisksModalProps> = ({ isOpen, onClose }) => {
  const isDesktop = useMediaQuery('(min-width: 600px) and (min-height: 600px)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [activeSegment, setActiveSegment] = useState<RiskType>('legal');
  const [isDismissable, setIsDismissable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [menuHeight, setMenuHeight] = useState<number | undefined>(undefined);
  const [isAnimating, setIsAnimatingInternal] = useState(false);
  
  const legalRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isSwipingRef = useRef<boolean | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Reset scroll progress when segment or open state changes
  useEffect(() => {
    setScrollProgress(0);
  }, [activeSegment, isOpen]);

  useEffect(() => {
    if (isOpen) {
        setIsDismissable(false);
        const timer = setTimeout(() => {
            setIsDismissable(true);
        }, 600);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setActiveSegment('legal');
    
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveSegment('legal');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isDesktop) {
        setMenuHeight(undefined);
        return;
    }
    const updateHeight = () => {
        const currentRef = activeSegment === 'legal' ? legalRef.current : securityRef.current;
        if (currentRef) {
            const contentElement = currentRef.querySelector('.risks-content-inner');
            if (contentElement) {
                const contentHeight = (contentElement as HTMLElement).offsetHeight;
                const maxHeight = window.innerHeight * 0.85;
                setMenuHeight(Math.min(contentHeight, maxHeight));
            }
        }
    };
    const timer = setTimeout(updateHeight, 0);
    window.addEventListener('resize', updateHeight);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateHeight);
    };
  }, [activeSegment, isDesktop, isOpen]);

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

  const startLockout = () => {
    setIsAnimatingInternal(true);
    setTimeout(() => {
      setIsAnimatingInternal(false);
    }, 800);
  };

  const changeSegment = (newSegment: RiskType) => {
    if (isAnimating || newSegment === activeSegment) return;
    startLockout();
    setActiveSegment(newSegment);
  };

  const onPointerDown = (e: React.PointerEvent) => {
      if (isAnimating) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      touchStartXRef.current = e.clientX;
      touchStartYRef.current = e.clientY;
      isSwipingRef.current = null;

      if (sliderRef.current) {
          sliderRef.current.style.transition = 'none';
      }
  };

  const onPointerMove = (e: React.PointerEvent) => {
      if (touchStartXRef.current === 0) return; // Not dragging
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      const diffX = currentX - touchStartXRef.current;
      const diffY = currentY - touchStartYRef.current;

      if (isSwipingRef.current === null) {
          const absX = Math.abs(diffX);
          const absY = Math.abs(diffY);
          if (absX > 5 || absY > 5) {
              if (absX > absY) {
                  isSwipingRef.current = true;
              } else {
                  isSwipingRef.current = false;
              }
          }
      }

      if (isSwipingRef.current === true && sliderRef.current) {
          if (e.cancelable) e.preventDefault();
          const containerWidth = sliderRef.current.offsetWidth / 2;
          const baseOffset = activeSegment === 'legal' ? 0 : -containerWidth;
          let move = baseOffset + diffX;

          if (move > 0) {
               move *= 0.3; 
          } else if (move < -containerWidth) {
               const extra = move - (-containerWidth);
               move = -containerWidth + (extra * 0.3);
          }

          sliderRef.current.style.transform = `translateX(${move}px)`;
      }
  };

  const onPointerUp = (e: React.PointerEvent) => {
      if (touchStartXRef.current === 0) return;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
      
      if (sliderRef.current) {
          sliderRef.current.style.transition = 'transform 800ms cubic-bezier(0.32, 0.72, 0, 1)';

          if (isSwipingRef.current === true) {
              const diffX = e.clientX - touchStartXRef.current;
              const containerWidth = sliderRef.current.offsetWidth / 2;
              const threshold = containerWidth * 0.25;

              if (activeSegment === 'legal') {
                  if (diffX < -threshold) {
                      changeSegment('security');
                  } else {
                      startLockout();
                      sliderRef.current.style.transform = 'translateX(0%)'; 
                  }
              } else {
                  if (diffX > threshold) {
                      changeSegment('legal');
                  } else {
                      startLockout();
                      sliderRef.current.style.transform = 'translateX(-50%)';
                  }
              }
          } else {
              sliderRef.current.style.transform = activeSegment === 'legal' ? 'translateX(0%)' : 'translateX(-50%)';
          }
      }
      isSwipingRef.current = null;
      touchStartXRef.current = 0;
  };

  const containerClass = "flex flex-col w-full h-full bg-[#F2F2F7] dark:bg-[#1E1E20] landscape:bg-[#F2F2F7]/70 landscape:dark:bg-[#1E1E20]/70 md:bg-[#F2F2F7]/70 md:dark:bg-[#1E1E20]/70 relative";

  const scrollAreaClass = "flex-1 overflow-hidden w-full";

  const content = (
    <div className={containerClass}>
        <div className="absolute inset-0 backdrop-blur-xl -z-10 hidden md:block" />
        {/* Fixed Header */}
        <div 
            className="absolute top-0 left-0 right-0 z-30 backdrop-blur-xl flex flex-col"
            style={{
                backgroundColor: isDesktop 
                    ? (isDarkMode ? `rgba(30, 30, 32, ${scrollProgress * 0.7})` : `rgba(242, 242, 247, ${scrollProgress * 0.7})`)
                    : (isDarkMode ? `rgba(30, 30, 32, 0.7)` : `rgba(242, 242, 247, 0.7)`)
            }}
        >
            <div className="relative w-full flex items-center justify-center h-10 mt-4 shrink-0">
                <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white leading-none">
                    Riesgos y Amenazas
                </h2>
                
                {/* Botón X con feedback mejorado */}
                <motion.button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    whileTap={{ opacity: 0.6, scale: 0.9 }}
                    className="absolute right-4 top-0 w-10 h-10 bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10 transition-all duration-300 outline-none touch-none pointer-events-auto cursor-pointer z-50"
                    aria-label="Cerrar"
                >
                    <X className="w-6 h-6" strokeWidth={2.5} />
                </motion.button>
            </div>

            {/* Segmented Control sincronizado con el grid de contenido (px-4 = 16px) */}
            <div className="px-4 mt-4 mb-4 w-full shrink-0">
                <DraggableSegmentedControl 
                    activeSegment={activeSegment} 
                    onChange={changeSegment} 
                    disabled={isAnimating}
                />
            </div>
        </div>

        {/* Scrollable Content Wrapper */}
        <div 
            className={scrollAreaClass}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {/* Swipeable View Container */}
            <div 
                ref={sliderRef}
                className="flex w-[200%] h-full transition-transform duration-800 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform touch-none select-none"
                style={{
                    transform: activeSegment === 'legal' ? 'translateX(0%)' : 'translateX(-50%)'
                }}
            >
                {/* Left Slide: Legal */}
                <div 
                    ref={legalRef}
                    onScroll={(e) => setScrollProgress(Math.min(e.currentTarget.scrollTop / 15, 1))}
                    className="w-[50%] h-full overflow-y-auto no-scrollbar px-4 pb-4 touch-pan-y"
                >
                    <div className="risks-content-inner">
                        <div className="h-[136px] shrink-0" />
                        <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide pl-4 mb-2">
                            Marco Legal y Sanciones
                        </h3>
                        <div className="bg-white dark:bg-[#2C2C2E]/70 rounded-[12px] overflow-hidden">
                            {LEGAL_RISKS.map((item, index, arr) => {
                                return (
                                    <div key={index} className="relative">
                                        <div className="p-4 flex items-start space-x-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mt-0.5`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-1">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-snug">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                        {index < arr.length - 1 && (
                                            <div className="absolute bottom-0 left-[72px] right-0 h-[1px] bg-black/10 dark:bg-white/10" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[13px] text-blue-700 dark:text-blue-300 leading-normal">
                                La legislación actual permite el cierre cautelar de páginas web sin necesidad de identificar al usuario final, pero el registro de IPs permanece.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Slide: Security */}
                <div 
                    ref={securityRef}
                    onScroll={(e) => setScrollProgress(Math.min(e.currentTarget.scrollTop / 15, 1))}
                    className="w-[50%] h-full overflow-y-auto no-scrollbar px-4 pb-4 touch-pan-y"
                >
                    <div className="risks-content-inner">
                        <div className="h-[136px] shrink-0" />
                        <h3 className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wide pl-4 mb-2">
                            Amenazas Técnicas
                        </h3>
                        <div className="bg-white dark:bg-[#2C2C2E]/70 rounded-[12px] overflow-hidden">
                            {SECURITY_RISKS.map((item, index, arr) => {
                                return (
                                    <div key={index} className="relative">
                                        <div className="p-4 flex items-start space-x-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mt-0.5`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-1">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-snug">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                        {index < arr.length - 1 && (
                                            <div className="absolute bottom-0 left-[72px] right-0 h-[1px] bg-black/10 dark:bg-white/10" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[13px] text-blue-700 dark:text-blue-300 leading-normal">
                                El uso de VPNs gratuitas no garantiza la seguridad ante malware incrustado en los reproductores de video de estos sitios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'visible' : 'invisible delay-[800ms] pointer-events-none'}`}>
        <div 
            className={`absolute inset-0 bg-black/[0.13] transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        />
        <div 
            style={{ height: isDesktop ? (menuHeight ? `${menuHeight}px` : 'auto') : '100%' }}
            className={`relative w-[480px] ${isDesktop ? 'max-h-[85vh]' : 'h-[85vh]'} flex flex-col overflow-hidden isolation-isolate bg-[#F2F2F7]/70 dark:bg-[#1c1c1e]/70 rounded-[16px] shadow-2xl transform transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[100vh]'} transition-[height]`}
        >
            {content}
        </div>
      </div>
    );
  }

  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      dismissible={isDismissable} 
      shouldScaleBackground={true}
      onDrag={handleDrag}
      onRelease={handleRelease}
    >
      <Drawer.Portal>
        <Drawer.Overlay 
          className="fixed inset-0 bg-black/[0.13] z-50 transition-opacity duration-[800ms]"
        />
        <Drawer.Content className="bg-[#F2F2F7] dark:bg-[#1E1E20] flex flex-col rounded-t-[13px] fixed bottom-0 left-0 right-0 z-50 outline-none shadow-2xl h-[calc(90.7vh-0.84px)] landscape:rounded-t-[13px] landscape:rounded-b-none landscape:left-[19px] landscape:right-[19px] landscape:bottom-0 landscape:mx-auto landscape:max-w-lg">
            
            <Drawer.Title className="sr-only">Riesgos y Seguridad</Drawer.Title>
            <Drawer.Description className="sr-only">Detalles sobre riesgos legales y de seguridad</Drawer.Description>

            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 z-50 pointer-events-none opacity-80" />

            <div className="flex-1 relative bg-[#F2F2F7] dark:bg-[#1E1E20] overflow-hidden rounded-t-[13px] landscape:rounded-t-[13px] landscape:rounded-b-none">
                 {content}
            </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
