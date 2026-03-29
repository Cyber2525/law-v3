import React from 'react';
import { X, ShieldCheck, AlertTriangle, Scale } from 'lucide-react';
import { LegalSummary } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LegalSummary | null;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#1c1c1e] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden transform transition-all animate-in slide-in-from-bottom-10 duration-300 border border-white/10">
        
        {/* Handle bar for mobile feeling */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>

        <div className="p-6 pt-2 sm:pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-full">
                    <Scale className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{data.title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 active:opacity-60 active:scale-90 transition-all duration-200 outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-green-400" />
                Explicación Simplificada
              </h3>
              <p className="text-gray-200 leading-relaxed">
                {data.explanation}
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-400" />
                Riesgos y Consecuencias
              </h3>
              <p className="text-gray-200 leading-relaxed">
                {data.consequences}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <button 
                onClick={onClose}
                className="w-full bg-white text-black font-semibold h-12 rounded-xl active:scale-[0.98] transition-transform"
            >
                Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
