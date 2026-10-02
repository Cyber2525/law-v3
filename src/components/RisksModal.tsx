import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, Eye, Gavel, Bug, Lock, Cpu, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { DesktopModal } from './ui/DesktopModal';
import { BottomSheet } from './ui/BottomSheet';
import { DragControl } from './ui/DragControl';
import { useMediaQuery, DESKTOP_MEDIA_QUERY } from '../hooks/useMediaQuery';

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

// --- Components ---

interface RisksModalProps {
  isOpen: boolean;
  onClose: (segment: RiskType) => void;
  isDarkMode?: boolean;
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
const TRANSITION_CLASSES = "transform 800ms cubic-bezier(0.16, 1, 0.3, 1)";
const easeIOS = cubicBezier(0.16, 1, 0.3, 1);

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

export const RisksModal: React.FC<RisksModalProps> = ({ isOpen, onClose, isDarkMode: isDarkModeProp }) => {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const [activeSegment, setActiveSegment] = useState<RiskType>('legal');
  const [isDismissable, setIsDismissable] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollAnimRef = useRef<number | null>(null);
  const prevSegmentRef = useRef<RiskType>(activeSegment);
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

  const [menuHeight, setMenuHeight] = useState<number | undefined>(undefined);
  const [isAnimating, setIsAnimatingInternal] = useState(false);

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
          onClose(activeSegment);
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
  
  const legalRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isSwipingRef = useRef<boolean | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const activeSegmentRef = useRef<RiskType>('legal');
  const desktopModalRef = useRef<HTMLDivElement>(null);
  const heightsRef = useRef({ legal: 0, security: 0 });

  useEffect(() => {
    const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Sync scroll progress with active segment or open state changes
  useEffect(() => {
    if (!isOpen) {
        if (scrollAnimRef.current) {
            cancelAnimationFrame(scrollAnimRef.current);
            scrollAnimRef.current = null;
        }
        setScrollProgress(0);
        prevSegmentRef.current = 'legal';
        return;
    }

    if (prevSegmentRef.current !== activeSegment) {
        startLockout(800);
        prevSegmentRef.current = activeSegment;
    }
  }, [activeSegment, isOpen]);

  useEffect(() => {
    if (isOpen) {
        setIsDismissable(false);
        const timer = setTimeout(() => {
            setIsDismissable(true);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMenuHeight(undefined);
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
      setIsAnimatingInternal(false);
      // Clear style overrides immediately to ensure the close animation works perfectly
      if (desktopModalRef.current) {
        desktopModalRef.current.style.transition = '';
        desktopModalRef.current.style.height = '';
      }
      if (sliderRef.current) {
        sliderRef.current.style.transition = '';
      }
      
      const timer = setTimeout(() => {
        setActiveSegment('legal');
        activeSegmentRef.current = 'legal';
        if (sliderRef.current) {
          sliderRef.current.style.transform = '';
        }
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

  const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const startTranslateXRef = useRef(0);
  const previousMoveXRef = useRef(0);
  const lastDirectionRef = useRef<'left' | 'right' | null>(null);

  const updateLiveScrollProgress = () => {
    if (!sliderRef.current) return;
    const containerWidth = sliderRef.current.offsetWidth / 2;
    const currentTx = getCurrentTranslateX(sliderRef.current);
    const ratio = Math.max(0, Math.min(1, -currentTx / containerWidth));
    const scroll1 = legalRef.current ? Math.min(legalRef.current.scrollTop / 15, 1) : 0;
    const scroll2 = securityRef.current ? Math.min(securityRef.current.scrollTop / 15, 1) : 0;
    
    const wCurrent = Math.min(1, (1 - ratio) / 0.075);
    const wTarget = Math.min(1, ratio / 0.075);
    const interpolatedScroll = Math.max(scroll1 * wCurrent, scroll2 * wTarget);
    setScrollProgress(prev => (Math.abs(prev - interpolatedScroll) < 0.01 ? prev : interpolatedScroll));
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
    }, duration);
  };

  const changeSegment = (newSegment: RiskType) => {
    if (newSegment === activeSegment && !isTransitioningRef.current) return;
    if (sliderRef.current) {
      sliderRef.current.style.transition = TRANSITION_CLASSES;
      sliderRef.current.style.transform = newSegment === 'legal' ? 'translateX(0%)' : 'translateX(-50%)';
    }
    startLockout(800);
    setActiveSegment(newSegment);
    activeSegmentRef.current = newSegment;
  };

  const onPointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      touchStartXRef.current = e.clientX;
      touchStartYRef.current = e.clientY;
      previousMoveXRef.current = e.clientX;
      lastDirectionRef.current = null;
      isDraggingRef.current = true;
      isSwipingRef.current = null;
      
      let fromH = 0, toH = 0;
      const maxHeight = window.innerHeight * 0.85;
      if (legalRef.current) {
          const contentElement = legalRef.current.querySelector('.risks-content-inner');
          if (contentElement) fromH = Math.min((contentElement as HTMLElement).offsetHeight, maxHeight);
      }
      if (securityRef.current) {
          const contentElement = securityRef.current.querySelector('.risks-content-inner');
          if (contentElement) toH = Math.min((contentElement as HTMLElement).offsetHeight, maxHeight);
      }
      heightsRef.current = { legal: fromH, security: toH };
  };

  const onPointerMove = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      const diffX = currentX - touchStartXRef.current;
      const diffY = currentY - touchStartYRef.current;

      // Detección directa del movimiento real en horizontal unificado con streaming
      if (isSwipingRef.current === null) {
          const absX = Math.abs(diffX);
          const absY = Math.abs(diffY);
          if (absY > absX && absY >= 7) {
              isSwipingRef.current = false;
              return;
          }
          if (absX > absY && absX >= 7) {
              // ACTIVAR EL AGARRE INMEDIATO
              isSwipingRef.current = true;

              if (lockoutTimerRef.current) {
                  clearTimeout(lockoutTimerRef.current);
                  lockoutTimerRef.current = null;
              }
              setIsAnimatingInternal(false);
              isTransitioningRef.current = false;
              if (scrollAnimRef.current) {
                  cancelAnimationFrame(scrollAnimRef.current);
                  scrollAnimRef.current = null;
              }

              const currentTx = sliderRef.current ? getCurrentTranslateX(sliderRef.current) : 0;
              startTranslateXRef.current = currentTx - diffX;

              if (sliderRef.current) {
                  sliderRef.current.style.setProperty('transition', 'none', 'important');
                  sliderRef.current.style.transform = `translateX(${currentTx}px)`;
              }

              if (desktopModalRef.current && isDesktop) {
                  desktopModalRef.current.style.setProperty('transition', 'none', 'important');
              }

              try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch (err) {}
          }
      }

      if (isSwipingRef.current === true && sliderRef.current) {
          if (e.cancelable) e.preventDefault();
          const containerWidth = sliderRef.current.offsetWidth / 2;
          let move = startTranslateXRef.current + diffX;

          if (move > 0) {
               move *= 0.3; 
          } else if (move < -containerWidth) {
               const extra = move - (-containerWidth);
               move = -containerWidth + (extra * 0.3);
          }

          if (currentX < previousMoveXRef.current) lastDirectionRef.current = 'left';
          else if (currentX > previousMoveXRef.current) lastDirectionRef.current = 'right';
          previousMoveXRef.current = currentX;

          sliderRef.current.style.transform = `translateX(${move}px)`;
          updateLiveScrollProgress();

          if (desktopModalRef.current && isDesktop) {
              const ratio = Math.max(0, Math.min(1, -move / containerWidth));
              const interpolatedHeight = heightsRef.current.legal + (heightsRef.current.security - heightsRef.current.legal) * ratio;
              desktopModalRef.current.style.setProperty('transition', 'none', 'important');
              desktopModalRef.current.style.height = `${interpolatedHeight}px`;
          }
      }
  };

  const onPointerUp = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
      
      // Solo actuar sobre el slider si el agarre se activó
      if (isSwipingRef.current === true && sliderRef.current) {
          sliderRef.current.style.setProperty('transition', TRANSITION_CLASSES, 'important');
          const containerWidth = sliderRef.current.offsetWidth / 2;

          let targetSegment: RiskType = activeSegment;
          const currentTx = getCurrentTranslateX(sliderRef.current);
          
          if (lastDirectionRef.current === 'left') {
              targetSegment = 'security';
          } else if (lastDirectionRef.current === 'right') {
              targetSegment = 'legal';
          } else {
              targetSegment = currentTx < -containerWidth / 2 ? 'security' : 'legal';
          }

          if (desktopModalRef.current && isDesktop) {
              desktopModalRef.current.style.setProperty('transition', 'height 800ms cubic-bezier(0.16, 1, 0.3, 1)', 'important');
              desktopModalRef.current.style.height = `${heightsRef.current[targetSegment]}px`; 
          }

          sliderRef.current.style.transform = targetSegment === 'legal' ? 'translateX(0%)' : 'translateX(-50%)';

          if (targetSegment !== activeSegment) {
              changeSegment(targetSegment);
          } else {
              startLockout(800);
          }

          // Clear override styles once the 800ms transition finishes
          setTimeout(() => {
              if (sliderRef.current) {
                  sliderRef.current.style.transition = '';
              }
              if (desktopModalRef.current && isDesktop) {
                  desktopModalRef.current.style.transition = '';
              }
          }, 800);
      }
      isSwipingRef.current = null;
      touchStartXRef.current = 0;
  };

  const containerClass = `flex flex-col w-full h-full relative ${isDesktop ? 'bg-transparent' : 'bg-[#F2F2F7] dark:bg-[#1c1c1e]'}`;

  const scrollAreaClass = "flex-1 overflow-hidden w-full";
  const navTransition = isOpen ? TRANSITION_CLASSES : "none";

  const content = (
    <div className={containerClass}>
        {isDesktop && (
          <div 
            className="absolute inset-0 backdrop-blur-xl -z-10 pointer-events-none" 
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          />
        )}
        {/* Fixed Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex flex-col pointer-events-none">
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
            <div className="relative z-20 flex flex-col pointer-events-auto">
                <div className="relative w-full flex items-center justify-center h-10 mt-4 shrink-0">
                    <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white leading-none">
                        Riesgos y Amenazas
                    </h2>
                    
                    {/* Botón X con feedback mejorado */}
                    <button 
                        ref={closeButtonRef}
                        onPointerDown={handleClosePointerDown}
                        onPointerMove={handleClosePointerMove}
                        onPointerUp={handleClosePointerUp}
                        onPointerCancel={handleClosePointerCancel}
                        className={`absolute right-4 top-0 w-10 h-10 bg-[#767680]/15 dark:bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 outline-none touch-none pointer-events-auto cursor-pointer z-50 transition-opacity duration-300 gpu-accelerated ${
                            isCloseActive ? 'opacity-30' : 'opacity-100'
                        }`}
                        style={{
                            transitionDuration: (!isCloseActive || isCloseReentry) ? '300ms' : '0ms'
                        }}
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Segmented Control sincronizado con el grid de contenido (px-4 = 16px) */}
                <div className="px-4 mt-4 mb-4 w-full shrink-0">
                    <DragControl 
                        activeSegment={activeSegment} 
                        onChange={changeSegment} 
                        disabled={false}
                    />
                </div>
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
                className="flex w-[200%] h-full will-change-transform touch-none select-none"
                style={{
                    transition: navTransition,
                    transform: activeSegment === 'legal' ? 'translateX(0%)' : 'translateX(-50%)'
                }}
            >
                {/* Left Slide: Legal */}
                <div 
                    ref={legalRef}
                    onScroll={() => {
                        updateLiveScrollProgress();
                    }}
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
                    onScroll={() => {
                        updateLiveScrollProgress();
                    }}
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
      <DesktopModal
        ref={desktopModalRef}
        isOpen={isOpen}
        onClose={() => onClose(activeSegment)}
        containerClassName={`flex flex-col w-[480px] max-h-[85vh] transition-[height]`}
        style={{ height: menuHeight ? `${menuHeight}px` : 'auto' }}
      >
        {content}
      </DesktopModal>
    );
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => onClose(activeSegment)}
      isDismissable={isDismissable}
      shouldScaleBackground={true}
      title="Riesgos y Seguridad"
      description="Detalles sobre riesgos legales y de seguridad"
      onDrag={handleDrag}
      onRelease={handleRelease}
      contentClassName="h-[calc(90.7vh-0.84px)] flex-1"
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 z-50 pointer-events-none opacity-80" />
      <div className="flex-1 relative bg-[#F2F2F7] dark:bg-[#1c1c1e] overflow-hidden rounded-t-[13px] landscape:rounded-t-[13px] landscape:rounded-b-none">
           {content}
      </div>
    </BottomSheet>
  );
};
