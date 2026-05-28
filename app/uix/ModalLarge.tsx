// components/Modal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string; // Added optional title prop for better reuse
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Prevent scrolling on the body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      {/* 1. Backdrop: Soft Blur instead of solid heavy gray */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* 2. Modal Content Card */}
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-soft animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {title || 'Sure Imports Details'}
          </h3>
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-sm text-foreground leading-relaxed">
          {children}
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default Modal;