import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { TbPointer } from "react-icons/tb";

interface IOSHeaderProps {
  onOpenRisks?: () => void;
  stopAnimation?: boolean;
  isRisksOpen?: boolean;
  isRisksCooldown?: boolean;
}

export const IOSHeader: React.FC<IOSHeaderProps> = ({ 
  onOpenRisks, 
  stopAnimation,
  isRisksOpen = false,
  isRisksCooldown = false
}) => {
  const handleShieldClick = () => {
    if (onOpenRisks && !isRisksOpen && !isRisksCooldown) {
      onOpenRisks();
    }
  };

  const isInactive = isRisksOpen || isRisksCooldown;

  return (
    <div className="flex flex-col items-center justify-center pt-12 pb-8 px-6 text-center space-y-6">
      <div className="relative group">
        {/* Background glow with fixed opacity (via color alpha) and scale animation only */}
        <div className={`absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-breathe pointer-events-none transition-opacity duration-300 ${isInactive ? 'opacity-0' : 'opacity-100'}`}></div>
        
        <button 
          onClick={handleShieldClick}
          disabled={isInactive}
          className={`
            relative w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all duration-300 z-10 outline-none focus-visible:ring-4 focus-visible:ring-red-500/50
            ${isInactive 
              ? 'bg-gray-400 dark:bg-gray-700 border-gray-400 dark:border-gray-700 shadow-none cursor-not-allowed scale-100' 
              : 'bg-red-500 border border-white/20 dark:border-white/10 shadow-2xl shadow-red-500/30 active:scale-95 cursor-pointer'
            }
          `}
          aria-label="Ver detalles de riesgos"
        >
          <ShieldAlert className={`w-12 h-12 transition-colors duration-300 ${isInactive ? 'text-gray-200 dark:text-gray-500' : 'text-white drop-shadow-md'}`} strokeWidth={1.5} />
          
          {/* Hint indicator for interactivity */}
          <div className={`absolute inset-0 rounded-[2rem] transition-colors duration-300 ${isInactive ? 'bg-transparent' : 'bg-white/0 group-hover:bg-white/10'}`} />
        </button>

        {/* Animated Pointer pointing to the icon */}
        <div className={`absolute -bottom-2 -right-2 bg-white/50 dark:bg-black/50 backdrop-blur-xl p-1.5 rounded-full z-20 pointer-events-none transition-all duration-300 ease-in-out ${stopAnimation ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
            <div className="animate-float-diagonal">
                {/* @ts-ignore */}
                <TbPointer className="w-7 h-7 text-black dark:text-white transition-colors duration-300" />
            </div>
        </div>
      </div>
      
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
          Acceso Restringido
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed transition-colors duration-300">
          Esta pagina ha sido bloqueada por facilitar ilegalmente acceso a contenido protegido por derechos de autor. Dale al boton rojo para ver mas
        </p>
      </div>
    </div>
  );
};
