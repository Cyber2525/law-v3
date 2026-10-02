import React from 'react';

export interface DesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  containerClassName?: string;
  style?: React.CSSProperties;
}

export const DesktopModal = React.forwardRef<HTMLDivElement, DesktopModalProps>(({
  isOpen,
  onClose,
  children,
  containerClassName = '',
  style
}, ref) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'visible' : 'invisible delay-[800ms] pointer-events-none'}`}>
      <div 
          className={`absolute inset-0 bg-black/[0.13] transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
      />
      <div 
          ref={ref}
          style={style}
          className={`relative overflow-hidden rounded-[16px] shadow-2xl max-w-[calc(100vw-32px)] bg-[#F2F2F7]/70 dark:bg-[#1c1c1e]/70 transform transition-all duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-[100vh]'} ${containerClassName}`}
      >
          <div 
            className="absolute inset-0 backdrop-blur-xl -z-10 pointer-events-none" 
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          />
          {children}
      </div>
    </div>
  );
});
