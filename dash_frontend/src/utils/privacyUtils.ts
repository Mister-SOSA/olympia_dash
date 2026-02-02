/**
 * Privacy/Obfuscation Utilities
 * 
 * Provides functions for obfuscating sensitive data when privacy mode is enabled.
 * Supports multiple obfuscation styles and data types.
 */

import { getPrivacySettings, isPrivacyModeEnabled, ObfuscationStyle } from '@/contexts/PrivacyContext';

// ============================================
// Obfuscation Characters & Patterns
// ============================================

const BLUR_PLACEHOLDER = '•••••';
const ASTERISK_PATTERN = '***';
const REDACTED_TEXT = '[REDACTED]';
const CURRENCY_PLACEHOLDER = '$••••';
const NUMBER_PLACEHOLDER = '••••';
const PERCENT_PLACEHOLDER = '••%';
const NAME_PLACEHOLDER = '████████';

// ============================================
// Core Obfuscation Functions
// ============================================

/**
 * Obfuscate a string based on the current style
 */
function obfuscateString(value: string, style: ObfuscationStyle, preserveLength: boolean = false): string {
    switch (style) {
        case 'blur':
            // For blur style, we return the original value but it will be CSS blurred
            return value;
        case 'redact':
            return REDACTED_TEXT;
        case 'asterisk':
            return preserveLength ? '*'.repeat(value.length) : ASTERISK_PATTERN;
        case 'placeholder':
            return BLUR_PLACEHOLDER;
        default:
            return BLUR_PLACEHOLDER;
    }
}

/**
 * Get CSS class for blur obfuscation
 */
export function getBlurClass(shouldBlur: boolean): string {
    return shouldBlur ? 'privacy-blur' : '';
}

// ============================================
// Currency Obfuscation
// ============================================

/**
 * Obfuscate a currency value
 * @param value - The formatted currency string (e.g., "$1,234.56")
 * @param forceObfuscate - Override privacy settings and always obfuscate
 */
export function obfuscateCurrency(value: string, forceObfuscate?: boolean): string {
    const settings = getPrivacySettings();

    if (!forceObfuscate && (!settings.enabled || !settings.obfuscateCurrency)) {
        return value;
    }

    switch (settings.style) {
        case 'blur':
            return value; // CSS will handle blur
        case 'redact':
            return CURRENCY_PLACEHOLDER;
        case 'asterisk':
            // Preserve currency symbol if present
            const currencyMatch = value.match(/^([€$£¥])/);
            const symbol = currencyMatch ? currencyMatch[1] : '$';
            return `${symbol}${ASTERISK_PATTERN}`;
        case 'placeholder':
            return CURRENCY_PLACEHOLDER;
        default:
            return CURRENCY_PLACEHOLDER;
    }
}

/**
 * Obfuscate a numeric currency value before formatting
 * Returns a display value that looks realistic but is not the real number
 * @param value - The numeric value
 */
export function obfuscateCurrencyNumber(value: number): number {
    const settings = getPrivacySettings();

    if (!settings.enabled || !settings.obfuscateCurrency) {
        return value;
    }

    // Return a placeholder number that maintains scale but hides actual value
    // This allows charts to still render with realistic proportions
    const magnitude = Math.floor(Math.log10(Math.abs(value) || 1));
    return Math.pow(10, magnitude) * 1.5; // Normalized placeholder
}

// ============================================
// Number Obfuscation
// ============================================

/**
 * Obfuscate a numeric value (quantities, counts, etc.)
 * @param value - The formatted number string
 * @param forceObfuscate - Override privacy settings
 */
export function obfuscateNumber(value: string, forceObfuscate?: boolean): string {
    const settings = getPrivacySettings();

    if (!forceObfuscate && (!settings.enabled || !settings.obfuscateNumbers)) {
        return value;
    }

    switch (settings.style) {
        case 'blur':
            return value;
        case 'redact':
            return NUMBER_PLACEHOLDER;
        case 'asterisk':
            return ASTERISK_PATTERN;
        case 'placeholder':
            return NUMBER_PLACEHOLDER;
        default:
            return NUMBER_PLACEHOLDER;
    }
}

// ============================================
// Percentage Obfuscation
// ============================================

/**
 * Obfuscate a percentage value
 * @param value - The formatted percentage string (e.g., "45.5%")
 * @param forceObfuscate - Override privacy settings
 */
export function obfuscatePercentage(value: string, forceObfuscate?: boolean): string {
    const settings = getPrivacySettings();

    if (!forceObfuscate && (!settings.enabled || !settings.obfuscatePercentages)) {
        return value;
    }

    switch (settings.style) {
        case 'blur':
            return value;
        case 'redact':
            return PERCENT_PLACEHOLDER;
        case 'asterisk':
            return '**%';
        case 'placeholder':
            return PERCENT_PLACEHOLDER;
        default:
            return PERCENT_PLACEHOLDER;
    }
}

// ============================================
// Name/Text Obfuscation
// ============================================

/**
 * Obfuscate a name (customer, vendor, etc.)
 * @param value - The name string
 * @param forceObfuscate - Override privacy settings
 */
export function obfuscateName(value: string, forceObfuscate?: boolean): string {
    const settings = getPrivacySettings();

    if (!forceObfuscate && (!settings.enabled || !settings.obfuscateNames)) {
        return value;
    }

    switch (settings.style) {
        case 'blur':
            return value;
        case 'redact':
            // Show first letter + redacted
            return value.charAt(0) + '•••';
        case 'asterisk':
            // Show first letter + asterisks
            return value.charAt(0) + '***';
        case 'placeholder':
            return NAME_PLACEHOLDER;
        default:
            return value.charAt(0) + '•••';
    }
}

// ============================================
// Smart Obfuscation (Auto-detect type)
// ============================================

/**
 * Automatically detect the type of value and obfuscate appropriately
 * @param value - Any value to obfuscate
 * @param hint - Optional hint about the data type
 */
export function obfuscateAuto(
    value: string | number,
    hint?: 'currency' | 'number' | 'percentage' | 'name'
): string {
    const stringValue = String(value);

    // Use hint if provided
    if (hint) {
        switch (hint) {
            case 'currency':
                return obfuscateCurrency(stringValue);
            case 'number':
                return obfuscateNumber(stringValue);
            case 'percentage':
                return obfuscatePercentage(stringValue);
            case 'name':
                return obfuscateName(stringValue);
        }
    }

    // Auto-detect based on patterns
    if (/^[€$£¥]/.test(stringValue) || /^\d+(\.\d+)?[KMB]?$/.test(stringValue)) {
        return obfuscateCurrency(stringValue);
    }

    if (/%$/.test(stringValue)) {
        return obfuscatePercentage(stringValue);
    }

    if (/^\d+([,.\s]\d+)*$/.test(stringValue)) {
        return obfuscateNumber(stringValue);
    }

    // Default to name obfuscation for text
    return obfuscateName(stringValue);
}

// ============================================
// Conditional Obfuscation Wrapper
// ============================================

/**
 * Wrapper function that only obfuscates if privacy mode is enabled
 * Useful for inline usage in JSX
 */
export function maybeObfuscate(
    value: string | number,
    type: 'currency' | 'number' | 'percentage' | 'name'
): string {
    if (!isPrivacyModeEnabled()) {
        return String(value);
    }
    return obfuscateAuto(value, type);
}

// ============================================
// CSS Class Helpers
// ============================================

/**
 * Get the appropriate CSS class for a sensitive element
 */
export function getSensitiveClass(type?: 'currency' | 'number' | 'percentage' | 'name'): string {
    const settings = getPrivacySettings();

    if (!settings.enabled) return '';

    // Check if this type should be obfuscated
    if (type) {
        const shouldObfuscate =
            (type === 'currency' && settings.obfuscateCurrency) ||
            (type === 'number' && settings.obfuscateNumbers) ||
            (type === 'percentage' && settings.obfuscatePercentages) ||
            (type === 'name' && settings.obfuscateNames);

        if (!shouldObfuscate) return '';
    }

    return settings.style === 'blur' ? 'privacy-blur' : 'privacy-hidden';
}

// ============================================
// Chart Data Obfuscation
// ============================================

/**
 * Obfuscate chart data while maintaining relative proportions
 * Useful for bar/pie charts where visual relationships matter
 */
export function obfuscateChartData<T extends { [key: string]: any }>(
    data: T[],
    valueKeys: (keyof T)[],
    normalize: boolean = true
): T[] {
    const settings = getPrivacySettings();

    if (!settings.enabled || !settings.obfuscateCurrency) {
        return data;
    }

    if (!normalize) {
        // Just zero out the values
        return data.map(item => {
            const newItem = { ...item };
            valueKeys.forEach(key => {
                newItem[key] = 0 as T[keyof T];
            });
            return newItem;
        });
    }

    // Normalize values to percentages to hide actual amounts
    // while maintaining visual proportions
    const maxValues: { [K in keyof T]?: number } = {};

    valueKeys.forEach(key => {
        const max = Math.max(...data.map(item => Math.abs(Number(item[key]) || 0)));
        maxValues[key] = max || 1;
    });

    return data.map(item => {
        const newItem = { ...item };
        valueKeys.forEach(key => {
            const originalValue = Number(item[key]) || 0;
            const normalized = (originalValue / (maxValues[key] || 1)) * 100;
            newItem[key] = normalized as T[keyof T];
        });
        return newItem;
    });
}
