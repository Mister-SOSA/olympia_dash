/**
 * Date and time formatting utilities with proper timezone handling
 * Supports user preferences for timezone and date format
 */

import { preferencesService } from '@/lib/preferences';
import { DATETIME_SETTINGS } from '@/constants/settings';

// Default timezone fallback
const DEFAULT_TIMEZONE = DATETIME_SETTINGS.timezone.default;

/**
 * Get the user's preferred timezone from settings
 * Falls back to DEFAULT_TIMEZONE if not set
 */
function getUserTimezone(): string {
    try {
        // Use the correct key from settings constants
        const timezone = preferencesService.get(DATETIME_SETTINGS.timezone.key);
        return timezone || DEFAULT_TIMEZONE;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

/**
 * Get the user's preferred date format from settings
 * Returns 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
 */
function getUserDateFormat(): string {
    try {
        // Use the correct key from settings constants
        const format = preferencesService.get(DATETIME_SETTINGS.dateFormat.key);
        return format || DATETIME_SETTINGS.dateFormat.default;
    } catch {
        return DATETIME_SETTINGS.dateFormat.default;
    }
}

/**
 * Get the user's preferred time format from settings
 * Returns true for 12-hour, false for 24-hour
 */
function getUserTimeFormat(): boolean {
    try {
        // Use the correct key from settings constants
        const format = preferencesService.get(DATETIME_SETTINGS.clockFormat.key);
        return format === undefined ? DATETIME_SETTINGS.clockFormat.default === '12h' : format === '12h';
    } catch {
        return DATETIME_SETTINGS.clockFormat.default === '12h';
    }
}

/**
 * Get locale string based on date format preference
 */
function getLocaleForFormat(format: string): string {
    switch (format) {
        case 'DD/MM/YYYY':
            return 'en-GB'; // British format: day/month/year
        case 'YYYY-MM-DD':
            return 'sv-SE'; // Swedish/ISO format: year-month-day
        case 'MM/DD/YYYY':
        default:
            return 'en-US'; // US format: month/day/year
    }
}

/**
 * Parse a date string from the backend (SQLite UTC timestamp)
 * SQLite returns timestamps without timezone info, so we need to explicitly treat them as UTC
 */
function parseUTCDate(dateString: string | Date): Date {
    if (dateString instanceof Date) {
        return dateString;
    }

    // If the string doesn't have a 'Z' or timezone offset, assume it's UTC from SQLite
    if (!dateString.includes('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        // Append 'Z' to treat it as UTC
        return new Date(dateString + 'Z');
    }

    return new Date(dateString);
}

/**
 * Format options builder that respects user preferences
 */
interface FormatOptions {
    includeDate?: boolean;
    includeTime?: boolean;
    includeSeconds?: boolean;
    timezone?: string;
    locale?: string;
}

function buildFormatOptions(opts: FormatOptions = {}): {
    options: Intl.DateTimeFormatOptions;
    locale: string;
} {
    const timezone = opts.timezone || getUserTimezone();
    const dateFormat = getUserDateFormat();
    const hour12 = getUserTimeFormat();
    const locale = opts.locale || getLocaleForFormat(dateFormat);

    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
    };

    if (opts.includeDate !== false) {
        options.year = 'numeric';
        options.month = 'numeric';
        options.day = 'numeric';
    }

    if (opts.includeTime !== false) {
        options.hour = 'numeric';
        options.minute = '2-digit';
        options.hour12 = hour12;

        if (opts.includeSeconds) {
            options.second = '2-digit';
        }
    }

    return { options, locale };
}

/**
 * Format a date/time string to local time with date and time
 * Respects user timezone and format preferences
 * @param dateString - ISO date string or timestamp (assumes UTC if no timezone specified)
 * @param options - Intl.DateTimeFormatOptions to customize format
 */
export function formatDateTime(
    dateString: string | Date,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = parseUTCDate(dateString);
    const { options: defaultOpts, locale } = buildFormatOptions({
        includeDate: true,
        includeTime: true,
        includeSeconds: true,
    });

    return new Intl.DateTimeFormat(locale, {
        ...defaultOpts,
        ...options,
    }).format(date);
}

/**
 * Format a date string to local date only (no time)
 * Respects user timezone and format preferences
 */
export function formatDate(dateString: string | Date): string {
    const date = parseUTCDate(dateString);
    const { options, locale } = buildFormatOptions({
        includeDate: true,
        includeTime: false,
    });

    return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format a date string to local time only (no date)
 * Respects user timezone and format preferences
 */
export function formatTime(dateString: string | Date, showSeconds = false): string {
    const date = parseUTCDate(dateString);
    const { options, locale } = buildFormatOptions({
        includeDate: false,
        includeTime: true,
        includeSeconds: showSeconds,
    });

    return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format a date for display in charts (short format)
 * Uses a consistent format for chart axes
 */
export function formatChartDate(dateString: string | Date, granularity: 'hour' | 'day' = 'day'): string {
    const date = parseUTCDate(dateString);
    const timezone = getUserTimezone();
    const locale = getLocaleForFormat(getUserDateFormat());

    if (granularity === 'hour') {
        return new Intl.DateTimeFormat(locale, {
            timeZone: timezone,
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            hour12: false,
        }).format(date);
    }

    return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}

/**
 * Get the hour in local timezone
 */
export function getLocalHour(dateString: string | Date): number {
    const date = parseUTCDate(dateString);
    const timezone = getUserTimezone();

    const hourString = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
    }).format(date);

    return parseInt(hourString, 10);
}

/**
 * Convert ISO string to local date parts for grouping
 */
export function getLocalDateParts(dateString: string | Date): {
    year: number;
    month: number;
    day: number;
    hour: number;
} {
    const date = parseUTCDate(dateString);
    const timezone = getUserTimezone();

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);

    return {
        year: parseInt(parts.find(p => p.type === 'year')?.value || '0', 10),
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0', 10),
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0', 10),
        hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10),
    };
}

/**
 * Format a relative time string (e.g., "2 hours ago", "in 5 minutes")
 */
export function formatRelativeTime(dateString: string | Date): string {
    const date = parseUTCDate(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) {
        return rtf.format(diffSec, 'second');
    } else if (Math.abs(diffMin) < 60) {
        return rtf.format(diffMin, 'minute');
    } else if (Math.abs(diffHour) < 24) {
        return rtf.format(diffHour, 'hour');
    } else {
        return rtf.format(diffDay, 'day');
    }
}

/**
 * Get current time formatted for user's timezone
 */
export function getCurrentTime(showSeconds = true): string {
    return formatTime(new Date(), showSeconds);
}

/**
 * Get current date formatted for user's timezone and format preference
 */
export function getCurrentDate(): string {
    return formatDate(new Date());
}
