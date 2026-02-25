'use client';

import { createContext, useContext, useState, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value: controlledValue, defaultValue = '', onValueChange, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;

    const onChange = (newValue: string) => {
      setUncontrolledValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value, onChange }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'flex border-b border-border',
        className
      )}
      {...props}
    />
  )
);

TabsList.displayName = 'TabsList';

export interface TabProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const { value: selectedValue, onChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        disabled={disabled}
        onClick={() => onChange(value)}
        className={cn(
          'px-4 py-2 text-sm font-medium',
          'transition-colors duration-150 ease-out',
          'border-b-2 -mb-px',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          isSelected
            ? 'border-accent-500 text-accent-500'
            : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border',
          
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Tab.displayName = 'Tab';

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        tabIndex={0}
        className={cn('pt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabPanel.displayName = 'TabPanel';

export { Tabs, TabsList, Tab, TabPanel };
