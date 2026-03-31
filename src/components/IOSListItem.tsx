import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';

interface IOSListItemProps {
  /** Icono o elemento visual a la izquierda */
  icon?: React.ReactNode;
  /** Texto principal */
  label: string;
  /** Función al hacer click */
  onClick?: () => void;
  /** Muestra el chevron (flecha) a la derecha */
  showChevron?: boolean;
  /** Indica si es un enlace externo (muestra icono de link y texto "Abrir") */
  external?: boolean;
  /** Texto secundario a la derecha (opcional, si no es externo) */
  rightLabel?: string;
  /** Color de fondo personalizado (opcional) */
  className?: string;
  /** Indica si debe mostrar un separador al final */
  showSeparator?: boolean;
  /** Inset del separador (ej: 'ml-14') */
  separatorInset?: string;
}

/**
 * Elemento de lista estilo iOS (UITableViewCell).
 * Soporta iconos, etiquetas, enlaces externos y estados de "active".
 */
export const IOSListItem: React.FC<IOSListItemProps> = ({ 
  icon, 
  label, 
  onClick, 
  showChevron = false, 
  external = false,
  rightLabel,
  className = '',
  showSeparator = false,
  separatorInset = 'ml-14'
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <div className="relative">
      <button 
        onClick={onClick}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
        className={`w-full flex items-center justify-between p-3 pl-4 min-h-[50px] bg-transparent active:bg-gray-400/30 dark:active:bg-white/10 select-none outline-none group transition-colors duration-200 ${className}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {icon && (
            <div className="shrink-0">
              {icon}
            </div>
          )}
          <span className="text-[17px] text-gray-900 dark:text-white font-normal truncate transition-colors duration-1000">
            {label}
          </span>
        </div>

        <div className="flex items-center text-gray-400 gap-1 pr-1 shrink-0">
          {/* Etiqueta derecha o indicador de enlace externo */}
          {external ? (
            <span className="text-[15px] text-blue-500 mr-1">Abrir</span>
          ) : (
            rightLabel && <span className="text-[15px] text-gray-400 mr-1">{rightLabel}</span>
          )}

          {/* Iconos de navegación */}
          {(showChevron || external) && (
            external ? (
              <ExternalLink className="w-4 h-4 text-blue-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" strokeWidth={2} />
            )
          )}
        </div>
      </button>
      {showSeparator && (
        <div className={`absolute bottom-0 right-0 h-[1px] bg-black/50 dark:bg-white/50 ${separatorInset}`} />
      )}
    </div>
  );
};
