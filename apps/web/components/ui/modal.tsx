'use client';

import { forwardRef, type HTMLAttributes, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, children, ...props }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);

    // Focus trap
    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key !== 'Tab' || !contentRef.current) return;

        const focusables = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Focus first element on open
    useEffect(() => {
      if (open && contentRef.current) {
        const firstFocusable = contentRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, [open]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center"
        {...props}
      >
        {/* Backdrop with blur */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal content */}
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative z-10 w-full max-w-lg mx-4',
            'bg-surface border border-border rounded-md shadow-modal',
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-border', className)}
      {...props}
    />
  )
);

ModalHeader.displayName = 'ModalHeader';

const ModalTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-text-primary', className)}
      {...props}
    />
  )
);

ModalTitle.displayName = 'ModalTitle';

const ModalContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  )
);

ModalContent.displayName = 'ModalContent';

const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-t border-border flex justify-end gap-3', className)}
      {...props}
    />
  )
);

ModalFooter.displayName = 'ModalFooter';

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter };
