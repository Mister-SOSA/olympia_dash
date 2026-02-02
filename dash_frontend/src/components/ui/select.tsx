import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown } from 'react-icons/io5';
import { cn } from '@/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50",
                    "bg-ui-bg-tertiary border-ui-border-primary text-ui-text-primary",
                    "hover:bg-ui-bg-quaternary",
                    disabled && "opacity-50 cursor-not-allowed",
                    isOpen && "ring-2 ring-ui-accent-primary/50 border-ui-accent-primary"
                )}
                disabled={disabled}
            >
                <span className={cn("truncate", !selectedOption && "text-ui-text-muted")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <IoChevronDown
                    className={cn(
                        "w-4 h-4 ml-2 text-ui-text-secondary transition-transform duration-200",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 overflow-hidden rounded-lg shadow-lg bg-ui-bg-secondary border border-ui-border-primary"
                    >
                        <div className="max-h-60 overflow-y-auto py-1">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "flex items-center w-full px-4 py-2 text-sm text-left transition-colors",
                                        "hover:bg-ui-bg-tertiary hover:text-ui-text-primary",
                                        value === option.value
                                            ? "bg-ui-accent-primary/10 text-ui-accent-primary font-medium"
                                            : "text-ui-text-secondary"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="px-4 py-2 text-sm text-ui-text-muted">
                                    No options available
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
