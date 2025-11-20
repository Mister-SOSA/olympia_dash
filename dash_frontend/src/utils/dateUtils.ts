/**
 * Date and time formatting utilities with proper timezone handling
 */

const TIMEZONE = 'America/Chicago';

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
 * Format a date/time string to local time with date and time
 * @param dateString - ISO date string or timestamp (assumes UTC if no timezone specified)
 * @param options - Intl.DateTimeFormatOptions to customize format
 */
export function formatDateTime(
    dateString: string | Date,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = parseUTCDate(dateString);

    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
}

/**
 * Format a date string to local date only (no time)
 */
export function formatDate(dateString: string | Date): string {
    const date = parseUTCDate(dateString);

    return new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}

/**
 * Format a date string to local time only (no date)
 */
export function formatTime(dateString: string | Date): string {
    const date = parseUTCDate(dateString);

    return new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

/**
 * Format a date for display in charts (short format)
 */
export function formatChartDate(dateString: string | Date, granularity: 'hour' | 'day' = 'day'): string {
    const date = parseUTCDate(dateString);

    if (granularity === 'hour') {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: TIMEZONE,
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            hour12: false,
        }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        month: 'numeric',
        day: 'numeric',
    }).format(date);
}

/**
 * Get the hour in local timezone
 */
export function getLocalHour(dateString: string | Date): number {
    const date = parseUTCDate(dateString);

    const hourString = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
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

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
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
