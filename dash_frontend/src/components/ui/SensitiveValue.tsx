'use client';

import React, { ElementType } from 'react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { 
    obfuscateCurrency, 
    obfuscateNumber, 
    obfuscateName, 
    obfuscatePercentage 
} from '@/utils/privacyUtils';

/**
 * SensitiveValue Component
 * 
 * A wrapper component for displaying sensitive data that automatically
 * handles obfuscation based on the current privacy mode settings.
 * 
 * Usage:
 *   <SensitiveValue type="currency" value="$1,234.56" />
 *   <SensitiveValue type="name" value="ACME Corporation" />
 *   <SensitiveValue type="number" value="1,500" />
 *   <SensitiveValue type="percentage" value="45.5%" />
 */

export type SensitiveValueType = 'currency' | 'number' | 'name' | 'percentage';

export interface SensitiveValueProps {
    /** The type of sensitive data */
    type: SensitiveValueType;
    /** The value to display (will be obfuscated if privacy mode is on) */
    value: string | number;
    /** Optional className for styling */
    className?: string;
    /** Optional style object */
    style?: React.CSSProperties;
    /** Custom component to wrap the value (default: span) */
    as?: ElementType;
    /** Children to render instead of value (value still used for obfuscation) */
    children?: React.ReactNode;
    /** Force obfuscation regardless of privacy settings (for testing) */
    forceObfuscate?: boolean;
}

/**
 * Format value based on type for obfuscation
 */
function obfuscateByType(
    value: string | number, 
    type: SensitiveValueType,
    forceObfuscate?: boolean
): string {
    const stringValue = String(value);
    
    switch (type) {
        case 'currency':
            return obfuscateCurrency(stringValue, forceObfuscate);
        case 'number':
            return obfuscateNumber(stringValue, forceObfuscate);
        case 'name':
            return obfuscateName(stringValue, forceObfuscate);
        case 'percentage':
            return obfuscatePercentage(stringValue, forceObfuscate);
        default:
            return stringValue;
    }
}

/**
 * SensitiveValue Component
 * 
 * Wraps sensitive data and handles obfuscation based on privacy mode.
 */
export function SensitiveValue({
    type,
    value,
    className = '',
    style,
    as: Component = 'span',
    children,
    forceObfuscate,
}: SensitiveValueProps) {
    const { settings, shouldObfuscate } = usePrivacy();
    
    const shouldHide = forceObfuscate || shouldObfuscate(type);
    const displayValue = shouldHide 
        ? obfuscateByType(value, type, forceObfuscate) 
        : String(value);
    
    // For blur style, add CSS class
    const blurClass = shouldHide && settings.style === 'blur' ? 'privacy-blur' : '';
    const combinedClassName = `${className} ${blurClass}`.trim();
    
    const Tag = Component as ElementType;
    
    return (
        <Tag 
            className={combinedClassName || undefined}
            style={style}
            data-privacy-type={type}
            data-privacy-active={shouldHide ? 'true' : undefined}
        >
            {children || displayValue}
        </Tag>
    );
}

/**
 * Convenience components for specific types
 */

export function SensitiveCurrency({ 
    value, 
    ...props 
}: Omit<SensitiveValueProps, 'type'>) {
    return <SensitiveValue type="currency" value={value} {...props} />;
}

export function SensitiveNumber({ 
    value, 
    ...props 
}: Omit<SensitiveValueProps, 'type'>) {
    return <SensitiveValue type="number" value={value} {...props} />;
}

export function SensitiveName({ 
    value, 
    ...props 
}: Omit<SensitiveValueProps, 'type'>) {
    return <SensitiveValue type="name" value={value} {...props} />;
}

export function SensitivePercentage({ 
    value, 
    ...props 
}: Omit<SensitiveValueProps, 'type'>) {
    return <SensitiveValue type="percentage" value={value} {...props} />;
}

/**
 * Higher-order component for making any component privacy-aware
 */
export function withPrivacy<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    sensitiveProps: { [K in keyof P]?: SensitiveValueType }
): React.FC<P> {
    return function PrivacyAwareComponent(props: P) {
        const { shouldObfuscate, settings } = usePrivacy();
        
        const processedProps = { ...props };
        
        (Object.entries(sensitiveProps) as [keyof P, SensitiveValueType | undefined][]).forEach(([propName, type]) => {
            if (type && shouldObfuscate(type)) {
                const originalValue = props[propName];
                if (typeof originalValue === 'string' || typeof originalValue === 'number') {
                    (processedProps as Record<keyof P, unknown>)[propName] = obfuscateByType(originalValue, type);
                }
            }
        });
        
        return <WrappedComponent {...processedProps} />;
    };
}

/**
 * Hook for getting obfuscated values
 */
export function useSensitiveValue(
    value: string | number,
    type: SensitiveValueType
): { displayValue: string; isObfuscated: boolean; blurClass: string } {
    const { shouldObfuscate, settings } = usePrivacy();
    
    const isObfuscated = shouldObfuscate(type);
    const displayValue = isObfuscated 
        ? obfuscateByType(value, type) 
        : String(value);
    const blurClass = isObfuscated && settings.style === 'blur' ? 'privacy-blur' : '';
    
    return { displayValue, isObfuscated, blurClass };
}
