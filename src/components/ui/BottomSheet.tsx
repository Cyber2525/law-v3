import React from 'react';
import { Drawer } from 'vaul';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDismissable?: boolean;
  shouldScaleBackground?: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
  contentClassName?: string;
  onDrag?: (e: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void;
  onRelease?: (e: React.PointerEvent<HTMLDivElement>, open: boolean) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  isDismissable = true,
  shouldScaleBackground = true,
  title,
  description,
  children,
  contentClassName = '',
  onDrag,
  onRelease
}) => {
  const defaultHandleDrag = (e: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => {
    const progress = Math.max(0, Math.min(1, 1 - percentageDragged));
    document.documentElement.setAttribute('data-drawer-dragging', 'true');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0s');
    document.documentElement.style.setProperty('--drawer-progress', progress.toString());
  };

  const defaultHandleRelease = (e: React.PointerEvent<HTMLDivElement>, open: boolean) => {
    document.documentElement.removeAttribute('data-drawer-dragging');
    document.documentElement.style.setProperty('--drawer-transition-duration', '0.8s');
    document.documentElement.style.setProperty('--drawer-progress', open ? '1' : '0');
  };

  return (
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      dismissible={isDismissable} 
      shouldScaleBackground={shouldScaleBackground}
      onDrag={onDrag || defaultHandleDrag}
      onRelease={onRelease || defaultHandleRelease}
    >
      <Drawer.Portal>
        <Drawer.Overlay 
          className="fixed inset-0 bg-black/[0.13] z-50 transition-opacity duration-[800ms]"
        />
        <Drawer.Content className={`bg-[#F2F2F7] dark:bg-[#1c1c1e] flex flex-col rounded-t-[13px] fixed bottom-0 left-0 right-0 z-50 outline-none shadow-2xl landscape:rounded-t-[13px] landscape:rounded-b-none landscape:left-[19px] landscape:right-[19px] landscape:bottom-0 landscape:mx-auto landscape:max-w-lg ${contentClassName}`}>
            {title && <Drawer.Title className="sr-only">{title}</Drawer.Title>}
            {description && <Drawer.Description className="sr-only">{description}</Drawer.Description>}
            {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
