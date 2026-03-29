import React from 'react';
import { Music, Film, Tv, ChevronRight } from 'lucide-react';

export const Alternatives: React.FC = () => {
  return (
    <div className="w-full max-w-md px-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-4">
            Alternativas Legales Sugeridas
        </h3>
        <div className="glass-panel rounded-2xl overflow-hidden">
            <AlternativeItem 
                icon={<Film className="text-purple-400" />} 
                title="Cine y Series" 
                subtitle="Netflix, Prime Video, HBO Max"
            />
            <div className="h-[1px] bg-gray-700 ml-14" />
            <AlternativeItem 
                icon={<Music className="text-green-400" />} 
                title="Música" 
                subtitle="Spotify, Apple Music"
            />
             <div className="h-[1px] bg-gray-700 ml-14" />
            <AlternativeItem 
                icon={<Tv className="text-blue-400" />} 
                title="Televisión" 
                subtitle="RTVE Play, Atresplayer"
            />
        </div>
    </div>
  );
};

const AlternativeItem: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors duration-300 cursor-pointer group">
        <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
    </div>
);
