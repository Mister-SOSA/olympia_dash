'use client';

import { motion } from "framer-motion";
import { MdCheck } from "react-icons/md";

// =============================================================================
// Toggle Setting
// =============================================================================

interface ToggleSettingProps {
    label: string;
    description: string;
    enabled?: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}

export function ToggleSetting({
    label,
    description,
    enabled,
    onChange,
    disabled = false,
}: ToggleSettingProps) {
    const isEnabled = enabled ?? false;
    return (
        <div className={`flex items-center justify-between p-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0 mr-3">
                <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                <div className="text-xs text-ui-text-secondary">{description}</div>
            </div>
            <button
                onClick={() => !disabled && onChange(!isEnabled)}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}

// =============================================================================
// Select Setting
// =============================================================================

interface SelectSettingProps {
    label: string;
    description: string;
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
}

export function SelectSetting({
    label,
    description,
    value,
    onChange,
    options,
}: SelectSettingProps) {
    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex-1 min-w-0 mr-3">
                <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                <div className="text-xs text-ui-text-secondary">{description}</div>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-1.5 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all cursor-pointer max-w-[180px]"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// =============================================================================
// Slider Setting
// =============================================================================

interface SliderSettingProps {
    label: string;
    description: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    unit?: string;
    decimals?: number;
}

export function SliderSetting({
    label,
    description,
    value,
    onChange,
    min,
    max,
    step = 1,
    disabled = false,
    unit = '',
    decimals = 0,
}: SliderSettingProps) {
    const percentage = ((value - min) / (max - min)) * 100;
    const displayValue = decimals > 0 ? value.toFixed(decimals) : value;

    return (
        <div className={`p-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ui-text-primary">{label}</div>
                    <div className="text-xs text-ui-text-secondary">{description}</div>
                </div>
                <span className="text-sm font-semibold text-ui-accent-primary ml-3 tabular-nums">
                    {displayValue}{unit}
                </span>
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center">
                    <div
                        className="h-2 bg-ui-accent-primary/30 rounded-l-lg"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => !disabled && onChange(Number(e.target.value))}
                    disabled={disabled}
                    className={`relative w-full h-2 bg-ui-bg-tertiary rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ui-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white`}
                />
            </div>
        </div>
    );
}

// =============================================================================
// Shortcut Item
// =============================================================================

interface ShortcutItemProps {
    shortcut: string;
    description: string;
}

export function ShortcutItem({ shortcut, description }: ShortcutItemProps) {
    return (
        <div className="flex items-center justify-between p-3">
            <span className="text-sm text-ui-text-primary">{description}</span>
            <kbd className="px-2.5 py-1 bg-ui-bg-tertiary text-ui-text-primary rounded-md text-xs font-mono border border-ui-border-primary min-w-[2.5rem] text-center">
                {shortcut}
            </kbd>
        </div>
    );
}

// =============================================================================
// Dock Item Toggle
// =============================================================================

interface DockItemToggleProps {
    icon: React.ReactNode;
    label: string;
    enabled: boolean;
    onChange: (val: boolean) => void;
    variant?: 'default' | 'privacy' | 'autocycle';
}

export function DockItemToggle({
    icon,
    label,
    enabled,
    onChange,
    variant = 'default',
}: DockItemToggleProps) {
    const getClassName = () => {
        if (!enabled) {
            return 'bg-ui-bg-tertiary/50 border-ui-border-primary/50 text-ui-text-secondary/20 grayscale';
        }

        switch (variant) {
            case 'privacy':
                return 'bg-amber-500/20 border-amber-500/50 text-amber-400 ring-2 ring-amber-500/30';
            case 'autocycle':
                return 'bg-blue-500/20 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/30';
            default:
                return 'bg-ui-accent-primary-bg border-ui-accent-primary-border text-ui-accent-primary ring-2 ring-ui-accent-primary/30';
        }
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                onClick={() => onChange(!enabled)}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all shadow-lg hover:shadow-xl relative ${getClassName()}`}
            >
                {icon}
                {enabled && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-ui-accent-primary rounded-full flex items-center justify-center">
                        <MdCheck className="w-3 h-3 text-white" />
                    </div>
                )}
            </button>
            <span className={`text-[10px] font-medium text-center leading-tight ${enabled ? 'text-ui-text-primary' : 'text-ui-text-secondary/50'}`}>
                {label}
            </span>
        </div>
    );
}

// =============================================================================
// Subsection
// =============================================================================

interface SubsectionProps {
    title: string;
    children: React.ReactNode;
}

export function Subsection({ title, children }: SubsectionProps) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider">{title}</h4>
            {children}
        </div>
    );
}
