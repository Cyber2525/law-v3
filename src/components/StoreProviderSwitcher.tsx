import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Laptop, Globe, Trash2 } from 'lucide-react';
import { Dialog, AlertAction } from './ui/Dialog';
import { PulldownMenu, PulldownMenuOption } from './ui/PulldownMenu';

type OverrideType = 'default' | 'windows' | 'ios' | 'android' | 'macos' | 'chromeos';

interface StoreProviderSwitcherProps {
    isVisible?: boolean;
    onDisable?: () => void;
}

export const StoreProviderSwitcher: React.FC<StoreProviderSwitcherProps> = ({ isVisible = false, onDisable }) => {
  const [override, setOverride] = useState<OverrideType>('default');
  const [showDisableAlert, setShowDisableAlert] = useState(false);
  const [detectedType, setDetectedType] = useState('Device Type');

  useEffect(() => {
    // Set global variable for other components to read
    if (typeof window !== 'undefined') {
        (window as any).__DEBUG_OS_OVERRIDE__ = override;
    }
  }, [override]);

  // --- OS Detection ---
  useEffect(() => {
      if (typeof navigator !== 'undefined') {
          const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
          const platform = navigator.platform || '';
          let type = 'Other';
          if (/android/i.test(userAgent)) type = 'Android';
          else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) type = 'iOS';
          else if (/\bCrOS\b/.test(userAgent)) type = 'ChromeOS';
          else if (platform.toUpperCase().indexOf('MAC') >= 0) type = 'MacOS';
          else if (platform.indexOf('Win') > -1) type = 'Windows';
          setDetectedType(type);
      }
  }, []);

  const confirmDisable = () => {
      setShowDisableAlert(false);
      setTimeout(() => {
          setOverride('default'); 
          if (onDisable) onDisable();
      }, 300);
  };

  const handleSelect = (id: OverrideType | 'disable_debug') => {
      if (id === 'disable_debug') {
          setShowDisableAlert(true);
      } else {
          setOverride(id);
      }
  };

  const menuOptions: PulldownMenuOption<OverrideType | 'disable_debug'>[] = [
    { id: 'default', label: `Default (${detectedType})`, icon: <Globe className="w-[18px] h-[18px]" /> },
    { id: 'sep1', type: 'separator' },
    { id: 'ios', label: 'iOS', icon: <Smartphone className="w-[18px] h-[18px]" /> },
    { id: 'sep2', type: 'separator' },
    { id: 'android', label: 'Android', icon: <Smartphone className="w-[18px] h-[18px]" /> },
    { id: 'sep3', type: 'separator' },
    { id: 'macos', label: 'MacOS', icon: <Laptop className="w-[18px] h-[18px]" /> },
    { id: 'sep4', type: 'separator' },
    { id: 'chromeos', label: 'ChromeOS', icon: <Laptop className="w-[18px] h-[18px]" /> },
    { id: 'sep5', type: 'separator' },
    { id: 'windows', label: 'Windows', icon: <Monitor className="w-[18px] h-[18px]" /> },
    { id: 'sep-big', type: 'big-separator' },
    { id: 'disable_debug', label: 'Disable Debug', icon: <Trash2 className="w-[18px] h-[18px]" />, labelClass: 'text-red-500', iconClass: 'text-red-500', showCheck: false, alignWithCheck: false, keepOpenOnClick: true }
  ];

  const disableActions: AlertAction[] = [
      { label: 'Cancelar', onClick: () => setShowDisableAlert(false), style: 'bold' },
      { label: 'Desactivar', onClick: confirmDisable, style: 'destructive' }
  ];

  return (
    <>
      <PulldownMenu<OverrideType | 'disable_debug'>
        isVisible={isVisible}
        options={menuOptions}
        selectedId={override}
        onSelect={handleSelect}
      />

      <Dialog 
        isOpen={showDisableAlert}
        onClose={() => setShowDisableAlert(false)}
        title="Desactivar debug mode"
        message="Ya no podrás acceder al menú hasta que lo vuelvas a activar"
        actions={disableActions}
      />
    </>
  );
};
