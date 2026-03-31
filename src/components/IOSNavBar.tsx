import React from 'react';
import { ChevronLeft, X } from 'lucide-react';

interface IOSNavBarProps {
  /** 
   * El título de la vista raíz (ej. "Ajustes").
   * Aparece centrado cuando no hay vista hija, o se desplaza a la izquierda al navegar.
   */
  rootTitle: string;

  /** 
   * El título de la vista hija/detalle.
   * Si está presente (no es null), se activa el estado "Atrás" y este título entra desde la derecha.
   */
  childTitle?: string | null;

  /** Acción al pulsar el botón Atrás */
  onBack: () => void;

  /** Acción al pulsar el botón de cerrar (derecha) */
  onClose?: () => void;

  /** Texto o etiqueta personalizada para el botón de volver (por defecto "Atrás") */
  backLabel?: string;

  /** 
   * Permite ocultar el botón de cerrar si se desea usar la barra en una pantalla completa
   * y no en un modal.
   */
  showCloseButton?: boolean;
}

/**
 * Barra de navegación estilo iOS (UINavigationBar).
 * Maneja las transiciones animadas entre títulos y la aparición del botón de retroceso.
 */
export const IOSNavBar: React.FC<IOSNavBarProps> = ({ 
  rootTitle, 
  childTitle, 
  onBack, 
  onClose, 
  backLabel = "Atrás",
  showCloseButton = true
}) => {
  // Determina si estamos en la vista profunda (detalle) basándonos en si hay un título hijo
  const isDeep = !!childTitle;

  return (
    <div className="relative h-[70px] flex items-center justify-between pl-4 pr-[15.5px] shrink-0 bg-[#F2F2F7]/90 dark:bg-[rgba(24,24,26,0.70)] backdrop-blur-xl z-20 select-none transition-colors duration-1000 border-b border-black/10 dark:border-black/30">
      
      {/* Zona Izquierda: Botón Atrás */}
      <div className="flex-1 flex justify-start min-w-[80px]">
        <button 
          onClick={onBack}
          disabled={!isDeep}
          className={`flex items-center text-[#007AFF] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:opacity-50 outline-none ${
            isDeep ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-8 h-8 -ml-1" strokeWidth={2.5} />
          <span className="text-[17px] sm:text-[20px] leading-none pb-0.5 font-normal">{backLabel}</span>
        </button>
      </div>

      {/* Zona Central: Títulos Animados */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-2/3 h-full flex items-center justify-center overflow-hidden pointer-events-none">
        
        {/* Título Raíz (se desliza a la izquierda y se desvanece) */}
        <span className={`absolute w-full text-[17px] sm:text-[20px] font-semibold text-gray-900 dark:text-white transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDeep ? '-translate-x-20 opacity-0' : 'translate-x-0 opacity-100'
        }`}>
          {rootTitle}
        </span>
        
        {/* Título Hijo (entra desde la derecha) */}
        <span className={`absolute w-full text-[17px] sm:text-[20px] font-semibold text-gray-900 dark:text-white transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDeep ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'
        }`}>
          {childTitle}
        </span>
      </div>

      {/* Zona Derecha: Botón Cerrar mejorado */}
      <div className="flex-1 flex justify-end min-w-[80px]">
        {showCloseButton && (
          <button 
            onClick={onClose}
            className="bg-[rgba(235,235,235,0.70)] dark:bg-[rgba(44,44,46,0.70)] backdrop-blur-xl w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10 active:opacity-60 active:scale-90 transition-all duration-1000 outline-none"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};
