import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Building2, 
  Scale, 
  BookOpen, 
  CloudSun,
  Compass,
  Plus,
  X,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';

interface BrowserStartPageProps {
  isDarkMode: boolean;
  onReturnToNotice: () => void;
  onToggleDarkMode?: (isDark: boolean) => void;
}

interface PublicFavorite {
  title: string;
  category: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PUBLIC_FAVORITES: PublicFavorite[] = [
  {
    title: 'Boletín Oficial del Estado',
    category: 'BOE',
    url: 'https://www.boe.es',
    icon: Scale,
    color: 'from-amber-500 to-amber-700'
  },
  {
    title: 'Portal de la Administración',
    category: 'administracion.gob.es',
    url: 'https://administracion.gob.es',
    icon: Building2,
    color: 'from-blue-600 to-blue-800'
  },
  {
    title: 'Ministerio de Cultura',
    category: 'cultura.gob.es',
    url: 'https://www.cultura.gob.es',
    icon: Compass,
    color: 'from-red-600 to-red-800'
  },
  {
    title: 'Seguridad Ciudadana (INCIBE)',
    category: 'incibe.es',
    url: 'https://www.incibe.es',
    icon: ShieldCheck,
    color: 'from-emerald-600 to-emerald-800'
  },
  {
    title: 'Biblioteca Nacional de España',
    category: 'bne.es',
    url: 'https://www.bne.es',
    icon: BookOpen,
    color: 'from-indigo-600 to-indigo-800'
  },
  {
    title: 'Meteorología del Estado (AEMET)',
    category: 'aemet.es',
    url: 'https://www.aemet.es',
    icon: CloudSun,
    color: 'from-sky-500 to-blue-600'
  }
];

export const BrowserStartPage: React.FC<BrowserStartPageProps> = ({
  isDarkMode,
  onReturnToNotice,
  onToggleDarkMode
}) => {
  const [addressInput, setAddressInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenNewWindow = () => {
    try {
      window.open('about:blank', '_blank');
    } catch (e) {
      console.warn('No se pudo abrir ventana nueva:', e);
    }
  };

  const handleCloseWindow = () => {
    try {
      window.close();
    } catch (e) {
      console.warn('El navegador no permitió cerrar la pestaña:', e);
    }
  };

  const handleSubmitUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = addressInput.trim();
    if (!query) return;

    setErrorMessage(null);

    // Si parece una URL (contiene punto o protocolo)
    const hasProtocol = /^https?:\/\//i.test(query);
    const looksLikeUrl = hasProtocol || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(query);

    if (looksLikeUrl) {
      const targetUrl = hasProtocol ? query : `https://${query}`;
      window.location.href = targetUrl;
    } else {
      setErrorMessage(
        'Para garantizar la estricta neutralidad pública y las leyes de competencia, no se fuerza ningún motor de búsqueda privado. Escribe un dominio o URL directa (ejemplo: boe.es).'
      );
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-between transition-colors duration-400 select-none ${
      isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#F2F2F7] text-gray-900'
    }`}>
      {/* Barra superior de navegación / herramientas de navegador */}
      <header className="w-full max-w-4xl px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onReturnToNotice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            isDarkMode 
              ? 'bg-white/10 hover:bg-white/15 text-white/90' 
              : 'bg-white hover:bg-gray-100 text-gray-700 shadow-xs'
          }`}
          title="Regresar a la advertencia de acceso restringido"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Aviso anterior</span>
        </button>

        <div className="flex items-center gap-2">
          {onToggleDarkMode && (
            <button
              onClick={() => onToggleDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl text-sm transition-colors cursor-pointer ${
                isDarkMode 
                  ? 'bg-white/10 hover:bg-white/15 text-yellow-300' 
                  : 'bg-white hover:bg-gray-100 text-gray-700 shadow-xs'
              }`}
              title="Cambiar tema claro / oscuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleOpenNewWindow}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/15 text-white/90' 
                : 'bg-white hover:bg-gray-100 text-gray-700 shadow-xs'
            }`}
            title="Abrir nueva ventana en blanco"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva pestaña</span>
          </button>

          <button
            onClick={handleCloseWindow}
            className={`p-1.5 rounded-xl text-sm transition-colors cursor-pointer ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400' 
                : 'bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 shadow-xs'
            }`}
            title="Cerrar pestaña"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenido principal: Estilo Página de Inicio / Nueva Pestaña */}
      <main className="w-full max-w-xl px-6 py-8 flex flex-col items-center flex-1 justify-center">
        {/* Título de la página de inicio */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl mb-3 bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Página de inicio
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            Navegación neutral institucional
          </p>
        </div>

        {/* Barra de Direcciones / URL Neutral (sin motores privados impuestos) */}
        <form onSubmit={handleSubmitUrl} className="w-full mb-8 relative">
          <div className={`flex items-center w-full px-4 h-13 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#1c1c1e] border-white/10 focus-within:border-blue-500/60 shadow-lg' 
              : 'bg-white border-black/10 focus-within:border-blue-500/60 shadow-md'
          }`}>
            <Globe className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Escribe una dirección web (ej. boe.es)..."
              className="w-full bg-transparent outline-none text-[15px] placeholder-gray-400"
            />
            {addressInput && (
              <button
                type="button"
                onClick={() => setAddressInput('')}
                className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Ir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-amber-600 dark:text-amber-400 px-2 text-center"
            >
              {errorMessage}
            </motion.p>
          )}
        </form>

        {/* Sección de Accesos Rápidos Institucionales y Públicos Neutrales */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Portales públicos oficiales
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Neutralidad de Estado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PUBLIC_FAVORITES.map((fav) => {
              const Icon = fav.icon;
              return (
                <a
                  key={fav.url}
                  href={fav.url}
                  target="_self"
                  rel="noopener noreferrer"
                  className={`p-3.5 rounded-2xl flex flex-col items-start gap-2.5 transition-all duration-200 cursor-pointer border ${
                    isDarkMode 
                      ? 'bg-[#1c1c1e] hover:bg-[#252528] border-white/5 hover:border-white/15' 
                      : 'bg-white hover:bg-gray-50/80 border-black/5 hover:border-black/10 shadow-xs'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${fav.color} flex items-center justify-center text-white shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left w-full overflow-hidden">
                    <p className="text-xs font-medium truncate leading-tight">
                      {fav.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 flex items-center gap-0.5">
                      <span>{fav.category}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 inline" />
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </main>

      {/* Pie de página con aviso de neutralidad y legalidad */}
      <footer className="w-full max-w-md px-6 pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>
          Entorno de inicio neutral conforme a las directivas de neutralidad institucional y normativa antimonopolio.
        </p>
      </footer>
    </div>
  );
};
