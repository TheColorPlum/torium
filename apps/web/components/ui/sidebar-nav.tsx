'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

const SidebarNav = forwardRef<HTMLElement, SidebarNavProps>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      {children}
    </nav>
  )
);

SidebarNav.displayName = 'SidebarNav';

export interface SidebarNavItemProps extends HTMLAttributes<HTMLAnchorElement> {
  href: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const SidebarNavItem = forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  ({ className, href, active, icon, children, ...props }, ref) => (
    <a
      ref={ref}
      href={href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 text-sm rounded-sm',
        'transition-colors duration-150 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
        
        // Active state: left accent bar (2px), NO accent background wash
        active
          ? 'text-text-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-accent-500 before:rounded-full'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        
        className
      )}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {icon && (
        <span className={cn('w-5 h-5 flex-shrink-0', active ? 'text-accent-500' : '')}>
          {icon}
        </span>
      )}
      {children}
    </a>
  )
);

SidebarNavItem.displayName = 'SidebarNavItem';

export interface SidebarNavGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

const SidebarNavGroup = forwardRef<HTMLDivElement, SidebarNavGroupProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn('py-2', className)} {...props}>
      {title && (
        <h3 className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
);

SidebarNavGroup.displayName = 'SidebarNavGroup';

export { SidebarNav, SidebarNavItem, SidebarNavGroup };
