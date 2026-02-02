/**
 * Number formatting utilities with user preference support
 * Handles currency, percentages, and general number formatting
 */

import { preferencesService } from '@/lib/preferences';
import { DATA_SETTINGS } from '@/constants/settings';
import { isPrivacyModeEnabled, getPrivacySettings } from '@/contexts/PrivacyContext';

// ============================================
// DEFAULTS - Use settings constants
// ============================================
const DEFAULT_NUMBER_FORMAT = DATA_SETTINGS.numberFormat.default;
const DEFAULT_CURRENCY = 'USD'; // Currency code for Intl, not symbol
const DEFAULT_COMPACT_NUMBERS = true;

// Map currency symbols to currency codes
const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
};

// ============================================
// USER PREFERENCE GETTERS
// ============================================

/**
 * Get user's preferred number format locale
 */
function getUserNumberFormat(): string {
    try {
        // Use the correct key from settings constants
        const format = preferencesService.get(DATA_SETTINGS.numberFormat.key);
        return format || DEFAULT_NUMBER_FORMAT;
    } catch {
        return DEFAULT_NUMBER_FORMAT;
    }
}

/**
 * Get user's preferred currency code
 */
function getUserCurrency(): string {
    try {
        // Use the correct key from settings constants
        const symbol = preferencesService.get(DATA_SETTINGS.currencySymbol.key);
        if (!symbol) return DEFAULT_CURRENCY;
        // Convert symbol to currency code for Intl.NumberFormat
        return CURRENCY_SYMBOL_TO_CODE[symbol] || DEFAULT_CURRENCY;
    } catch {
        return DEFAULT_CURRENCY;
    }
}

/**
 * Get user's preference for compact numbers
 */
function getUserCompactNumbers(): boolean {
    try {
        const compact = preferencesService.get('data.compactNumbers');
        return compact === undefined ? DEFAULT_COMPACT_NUMBERS : compact;
    } catch {
        return DEFAULT_COMPACT_NUMBERS;
    }
}

// ============================================
// NUMBER FORMATTING
// ============================================

interface FormatNumberOptions {
    /** Number of decimal places */
    decimals?: number;
    /** Use compact notation (e.g., 1.2K, 3.4M) */
    compact?: boolean;
    /** Force sign display */
    signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
    /** Use grouping separators (commas/spaces) */
    useGrouping?: boolean;
}

/**
 * Format a number according to user preferences
 */
export function formatNumber(
    value: number,
    options: FormatNumberOptions = {}
): string {
    const locale = getUserNumberFormat();
    const {
        decimals,
        compact = getUserCompactNumbers(),
        signDisplay = 'auto',
        useGrouping = true,
    } = options;

    const formatOptions: Intl.NumberFormatOptions = {
        signDisplay,
        useGrouping,
    };

    if (compact && Math.abs(value) >= 1000) {
        formatOptions.notation = 'compact';
        formatOptions.compactDisplay = 'short';
        formatOptions.maximumFractionDigits = decimals ?? 1;
    } else {
        formatOptions.minimumFractionDigits = decimals ?? 0;
        formatOptions.maximumFractionDigits = decimals ?? 2;
    }

    return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Format an integer (no decimals)
 */
export function formatInteger(value: number, options: Omit<FormatNumberOptions, 'decimals'> = {}): string {
    return formatNumber(value, { ...options, decimals: 0 });
}

// ============================================
// CURRENCY FORMATTING
// ============================================

interface FormatCurrencyOptions {
    /** Number of decimal places (default: 2) */
    decimals?: number;
    /** Use compact notation for large numbers */
    compact?: boolean;
    /** Override currency code */
    currency?: string;
    /** Display format: 'symbol' ($), 'code' (USD), 'name' (US dollars) */
    currencyDisplay?: 'symbol' | 'code' | 'name' | 'narrowSymbol';
}

/**
 * Format a number as currency
 */
export function formatCurrency(
    value: number,
    options: FormatCurrencyOptions = {}
): string {
    // Check privacy mode
    const privacySettings = getPrivacySettings();
    if (privacySettings.enabled && privacySettings.obfuscateCurrency) {
        switch (privacySettings.style) {
            case 'blur':
                // For blur style, continue with formatting (CSS handles blur)
                break;
            case 'redact':
                return '$••••';
            case 'asterisk':
                return '$***';
            case 'placeholder':
                return '$•••••';
        }
    }

    const locale = getUserNumberFormat();
    const currency = options.currency ?? getUserCurrency();
    const {
        decimals = 2,
        compact = getUserCompactNumbers() && Math.abs(value) >= 10000,
        currencyDisplay = 'symbol',
    } = options;

    const formatOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        currencyDisplay,
    };

    if (compact && Math.abs(value) >= 1000) {
        formatOptions.notation = 'compact';
        formatOptions.compactDisplay = 'short';
        formatOptions.maximumFractionDigits = 1;
    } else {
        formatOptions.minimumFractionDigits = decimals;
        formatOptions.maximumFractionDigits = decimals;
    }

    return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Format currency without cents for whole dollar amounts
 */
export function formatCurrencyWhole(value: number, options: Omit<FormatCurrencyOptions, 'decimals'> = {}): string {
    return formatCurrency(value, { ...options, decimals: 0 });
}

// ============================================
// PERCENTAGE FORMATTING
// ============================================

interface FormatPercentOptions {
    /** Number of decimal places (default: 1) */
    decimals?: number;
    /** Include sign for positive values */
    signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/**
 * Format a number as percentage
 * @param value - The decimal value (0.15 = 15%)
 */
export function formatPercent(
    value: number,
    options: FormatPercentOptions = {}
): string {
    const locale = getUserNumberFormat();
    const { decimals = 1, signDisplay = 'auto' } = options;

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay,
    }).format(value);
}

/**
 * Format a percentage with +/- sign for changes
 * @param value - Already a percentage number (15 = 15%)
 */
export function formatPercentChange(value: number, options: FormatPercentOptions = {}): string {
    const locale = getUserNumberFormat();
    const { decimals = 2, signDisplay = 'exceptZero' } = options;

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay,
    }).format(value / 100);
}

// ============================================
// COMPACT NUMBER FORMATTING
// ============================================

/**
 * Format number with SI suffixes (K, M, B, T)
 * This is the settings-aware version of nFormatter
 */
export function formatCompact(value: number, decimals = 1): string {
    const locale = getUserNumberFormat();

    if (Math.abs(value) < 1000) {
        return formatNumber(value, { compact: false, decimals: decimals > 0 ? decimals : 0 });
    }

    return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Legacy nFormatter replacement that respects user settings
 * @deprecated Use formatCompact instead
 */
export function nFormatter(num: number, digits: number): string {
    // Check privacy mode
    const privacySettings = getPrivacySettings();
    if (privacySettings.enabled && privacySettings.obfuscateCurrency) {
        switch (privacySettings.style) {
            case 'blur':
                // For blur style, return original value (CSS handles blur)
                break;
            case 'redact':
                return '••••';
            case 'asterisk':
                return '***';
            case 'placeholder':
                return '•••••';
        }
    }

    if (!getUserCompactNumbers()) {
        return formatNumber(num, { decimals: digits, compact: false });
    }

    const lookup = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'K' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'B' },
        { value: 1e12, symbol: 'T' },
    ];

    const item = lookup.findLast((item) => Math.abs(num) >= item.value);
    if (!item || item.value === 1) {
        return formatNumber(num, { decimals: digits, compact: false });
    }

    return (num / item.value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/, '') + item.symbol;
}

// ============================================
// UNIT FORMATTING
// ============================================

type UnitType = 'kilogram' | 'pound' | 'meter' | 'foot' | 'liter' | 'gallon' | 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte';

/**
 * Format a number with a unit
 */
export function formatUnit(
    value: number,
    unit: UnitType,
    options: { style?: 'narrow' | 'short' | 'long'; decimals?: number } = {}
): string {
    const locale = getUserNumberFormat();
    const { style = 'short', decimals = 1 } = options;

    return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        unitDisplay: style,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// ============================================
// ORDINAL FORMATTING
// ============================================

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(value: number): string {
    const locale = getUserNumberFormat();

    // Use PluralRules for locale-aware ordinal suffixes
    const pr = new Intl.PluralRules(locale, { type: 'ordinal' });
    const suffixes: Record<string, string> = {
        one: 'st',
        two: 'nd',
        few: 'rd',
        other: 'th',
    };

    const rule = pr.select(value);
    const suffix = suffixes[rule] || suffixes.other;

    return `${formatInteger(value, { compact: false })}${suffix}`;
}

// ============================================
// RANGE FORMATTING
// ============================================

/**
 * Format a range of numbers
 */
export function formatRange(start: number, end: number): string {
    const locale = getUserNumberFormat();

    // @ts-ignore - NumberRangeFormat is available in modern browsers
    if (typeof Intl.NumberFormat.prototype.formatRange === 'function') {
        return new Intl.NumberFormat(locale).formatRange(start, end);
    }

    // Fallback for older browsers
    return `${formatNumber(start)} – ${formatNumber(end)}`;
}

/**
 * Format a currency range
 */
export function formatCurrencyRange(start: number, end: number): string {
    const locale = getUserNumberFormat();
    const currency = getUserCurrency();

    // @ts-ignore - NumberRangeFormat is available in modern browsers
    if (typeof Intl.NumberFormat.prototype.formatRange === 'function') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
        }).formatRange(start, end);
    }

    // Fallback
    return `${formatCurrency(start)} – ${formatCurrency(end)}`;
}
