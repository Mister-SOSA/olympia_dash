import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import NumberFlow from "@number-flow/react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'DateTimeWidget';

interface TimeParts {
    hours: string;
    minutes: string;
    seconds: string;
    period: string;
    hour24: number;
    minute: number;
    second: number;
    secondWithMs: number;
}

interface DateParts {
    dayNum: number;
    dayName: string;
    dayNameShort: string;
    monthName: string;
    monthNameShort: string;
    monthNum: number;
    year: number;
}

// Adaptive layout decisions based on dimensions
interface LayoutDecision {
    showClock: boolean;
    showDate: boolean;
    clockStyle: 'digital' | 'analog' | 'minimal' | 'vertical' | 'micro';
    dateStyle: 'full' | 'stacked' | 'editorial' | 'badge' | 'compact' | 'micro' | 'hidden';
    layout: 'inline' | 'stacked' | 'clock-only' | 'date-only';
    clockSize: number;
    dateFontSize: number;
    showSeconds: boolean;
    showAnalogNumbers: boolean;
    showWeekday: boolean;
    showYear: boolean;
}

function getLayoutDecision(width: number, height: number, userShowSeconds: boolean): LayoutDecision {
    const area = width * height;
    const aspectRatio = width / height;
    const minDim = Math.min(width, height);

    // Usable space (account for padding)
    const usableWidth = width - 32;
    const usableHeight = height - 20;

    // Size categories
    const isTiny = area < 8000 || minDim < 60;
    const isSmall = area < 20000 || minDim < 100;
    const isMedium = area < 50000;

    // Aspect ratio categories
    const isVeryWide = aspectRatio > 3;
    const isWide = aspectRatio > 1.8;
    const isTall = aspectRatio < 0.7;
    const isVeryTall = aspectRatio < 0.4;

    let decision: LayoutDecision = {
        showClock: true,
        showDate: true,
        clockStyle: 'digital',
        dateStyle: 'compact',
        layout: 'stacked',
        clockSize: 48,
        dateFontSize: 14,
        showSeconds: userShowSeconds,
        showAnalogNumbers: false,
        showWeekday: true,
        showYear: true,
    };

    // Helper: Calculate inline digital + editorial sizes
    // CRITICAL: Width ratios are conservative estimates - actual rendering may vary
    // "12:35 PM" ≈ 5.5ch, "12:35:30 PM" ≈ 7.5ch - at fontSize, width ≈ fontSize * ratio
    const calculateInlineDigitalSizes = (showSeconds: boolean) => {
        const separatorWidth = 40;

        // Conservative width ratios (chars * ~0.65 avg char width + PM spacing)
        const clockWidthRatio = showSeconds ? 5.0 : 3.8;

        // Editorial date: day number (~3.2x fontSize width) + gap (~0.8x) + month col (~1.5x)
        const dateWidthRatio = 6.0;

        const availableForContent = usableWidth - separatorWidth;

        // Height constraints (hard limits)
        const maxClockFromHeight = usableHeight * 0.85;
        const maxDateFontFromHeight = usableHeight / 4;

        // Width constraints - solve: clockSize * clockRatio + dateFontSize * dateRatio = availableForContent
        // Allocate proportionally: clock gets 55%, date gets 45%
        const clockWidthBudget = availableForContent * 0.55;
        const dateWidthBudget = availableForContent * 0.45;

        // Calculate sizes from width budget
        const clockFromWidth = clockWidthBudget / clockWidthRatio;
        const dateFontFromWidth = dateWidthBudget / dateWidthRatio;

        // Take minimum of height and width constraints
        let clockSize = Math.min(clockFromWidth, maxClockFromHeight);
        let dateFontSize = Math.min(dateFontFromWidth, maxDateFontFromHeight);

        // Final safety check: ensure total estimated width doesn't exceed available
        let estimatedTotal = clockSize * clockWidthRatio + separatorWidth + dateFontSize * dateWidthRatio;
        if (estimatedTotal > usableWidth) {
            const scale = (usableWidth - separatorWidth) / (clockSize * clockWidthRatio + dateFontSize * dateWidthRatio);
            clockSize *= scale * 0.95; // Extra 5% safety margin
            dateFontSize *= scale * 0.95;
        }

        return {
            clockSize: Math.max(Math.min(clockSize, 120), 20),
            dateFontSize: Math.max(Math.min(dateFontSize, 36), 12)
        };
    };

    // Helper: Calculate inline compact date sizes
    const calculateInlineCompactSizes = () => {
        const separatorWidth = 30;

        // "12:35 PM" clock + "Wed | Feb 4" date
        const clockWidthRatio = 3.8;
        const dateWidthRatio = 7.0; // Compact date with weekday is wider

        const availableForContent = usableWidth - separatorWidth;

        const maxClockFromHeight = usableHeight * 0.8;
        const maxDateFontFromHeight = usableHeight * 0.4;

        const clockWidthBudget = availableForContent * 0.45;
        const dateWidthBudget = availableForContent * 0.55;

        const clockFromWidth = clockWidthBudget / clockWidthRatio;
        const dateFontFromWidth = dateWidthBudget / dateWidthRatio;

        let clockSize = Math.min(clockFromWidth, maxClockFromHeight);
        let dateFontSize = Math.min(dateFontFromWidth, maxDateFontFromHeight);

        // Safety check
        let estimatedTotal = clockSize * clockWidthRatio + separatorWidth + dateFontSize * dateWidthRatio;
        if (estimatedTotal > usableWidth) {
            const scale = (usableWidth - separatorWidth) / (clockSize * clockWidthRatio + dateFontSize * dateWidthRatio);
            clockSize *= scale * 0.95;
            dateFontSize *= scale * 0.95;
        }

        return {
            clockSize: Math.max(Math.min(clockSize, 80), 18),
            dateFontSize: Math.max(Math.min(dateFontSize, 24), 11)
        };
    };

    // Force analog clock when width is narrow - digital text doesn't fit well
    const forceAnalog = width < 500;

    // ═══════════════════════════════════════════
    // TINY: Show only one element
    // ═══════════════════════════════════════════
    if (isTiny) {
        if (isWide || isVeryWide) {
            decision.showDate = false;
            decision.layout = 'clock-only';
            decision.clockStyle = forceAnalog ? 'analog' : 'micro';
            decision.clockSize = forceAnalog
                ? Math.min(usableWidth, usableHeight) * 0.9
                : Math.min(usableHeight * 0.8, usableWidth / 3.5);
            decision.showSeconds = false;
        } else if (isTall || isVeryTall) {
            decision.clockStyle = forceAnalog ? 'analog' : 'micro';
            decision.dateStyle = 'micro';
            decision.layout = 'stacked';
            decision.clockSize = forceAnalog
                ? Math.min(usableWidth * 0.9, usableHeight * 0.5)
                : height * 0.35;
            decision.dateFontSize = Math.min(height * 0.15, width * 0.2);
            decision.showSeconds = false;
            decision.showWeekday = false;
            decision.showYear = false;
        } else {
            decision.showDate = false;
            decision.layout = 'clock-only';
            decision.clockStyle = forceAnalog ? 'analog' : 'minimal';
            decision.clockSize = minDim * (forceAnalog ? 0.85 : 0.6);
            decision.showSeconds = false;
        }
        return decision;
    }

    // ═══════════════════════════════════════════
    // SMALL
    // ═══════════════════════════════════════════
    if (isSmall) {
        if (forceAnalog && (isTall || isVeryTall)) {
            // Narrow and vertical: stacked analog
            decision.layout = 'stacked';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.55);
            decision.dateFontSize = Math.min(usableWidth * 0.1, usableHeight * 0.06);
            decision.showYear = false;
            decision.showWeekday = false;
            decision.showSeconds = false;
        } else if (forceAnalog) {
            // Narrow but horizontal: inline analog + date
            decision.layout = 'inline';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'compact';
            decision.clockSize = Math.min(usableHeight * 0.9, usableWidth * 0.4);
            decision.dateFontSize = Math.min(usableHeight * 0.25, usableWidth * 0.06);
            decision.showYear = false;
            decision.showWeekday = usableWidth > 350;
            decision.showSeconds = false;
        } else if (isVeryWide || isWide) {
            decision.layout = 'inline';
            decision.clockStyle = 'digital';
            decision.dateStyle = 'compact';
            const sizes = calculateInlineCompactSizes();
            decision.clockSize = sizes.clockSize;
            decision.dateFontSize = sizes.dateFontSize;
            decision.showSeconds = false;
            decision.showYear = false;
            decision.showWeekday = usableWidth > 280;
        } else if (isVeryTall) {
            decision.layout = 'stacked';
            decision.clockStyle = 'vertical';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth * 0.5, usableHeight * 0.22);
            decision.dateFontSize = Math.min(usableWidth * 0.14, usableHeight * 0.055);
            decision.showSeconds = false;
            decision.showYear = false;
        } else if (isTall) {
            decision.layout = 'stacked';
            decision.clockStyle = 'digital';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth * 0.4, usableHeight * 0.2);
            decision.dateFontSize = Math.min(usableWidth * 0.11, usableHeight * 0.045);
            decision.showSeconds = false;
        } else {
            // Small square
            decision.layout = 'stacked';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'compact';
            decision.clockSize = Math.min(usableWidth, usableHeight * 0.72) * 0.95;
            decision.dateFontSize = minDim * 0.1;
            decision.showYear = false;
            decision.showWeekday = false;
        }
        return decision;
    }

    // ═══════════════════════════════════════════
    // MEDIUM
    // ═══════════════════════════════════════════
    if (isMedium) {
        if (forceAnalog && (isTall || isVeryTall)) {
            // Narrow and vertical: stacked analog
            decision.layout = 'stacked';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.55);
            decision.dateFontSize = Math.min(usableWidth * 0.1, usableHeight * 0.05);
            decision.showAnalogNumbers = usableWidth > 150;
        } else if (forceAnalog) {
            // Narrow but horizontal: inline analog + editorial date
            decision.layout = 'inline';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'editorial';
            decision.clockSize = Math.min(usableHeight * 0.9, usableWidth * 0.45);
            decision.dateFontSize = Math.min(usableHeight * 0.22, usableWidth * 0.05);
            decision.showAnalogNumbers = decision.clockSize > 100;
        } else if (isVeryWide || isWide) {
            decision.layout = 'inline';
            decision.clockStyle = 'digital';
            decision.dateStyle = 'editorial';
            const showSecs = userShowSeconds && usableWidth > 450;
            const sizes = calculateInlineDigitalSizes(showSecs);
            decision.clockSize = sizes.clockSize;
            decision.dateFontSize = sizes.dateFontSize;
            decision.showSeconds = showSecs;
        } else if (isVeryTall) {
            decision.layout = 'stacked';
            decision.clockStyle = 'vertical';
            decision.dateStyle = 'badge';
            decision.clockSize = Math.min(usableWidth * 0.5, usableHeight * 0.18);
            decision.dateFontSize = Math.min(usableWidth * 0.12, usableHeight * 0.038);
        } else if (isTall) {
            decision.layout = 'stacked';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.58);
            decision.dateFontSize = Math.min(usableWidth * 0.1, usableHeight * 0.045);
        } else {
            // Medium square
            decision.layout = 'stacked';
            decision.clockStyle = 'analog';
            decision.dateStyle = 'stacked';
            decision.clockSize = Math.min(usableWidth, usableHeight * 0.7) * 0.9;
            decision.dateFontSize = minDim * 0.075;
            decision.showAnalogNumbers = minDim > 180;
        }
        return decision;
    }

    // ═══════════════════════════════════════════
    // LARGE
    // ═══════════════════════════════════════════
    if (forceAnalog && (isTall || isVeryTall)) {
        // Narrow and vertical: stacked analog
        decision.layout = 'stacked';
        decision.clockStyle = 'analog';
        decision.dateStyle = 'stacked';
        decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.55);
        decision.dateFontSize = Math.min(usableWidth * 0.08, usableHeight * 0.04);
        decision.showAnalogNumbers = usableWidth > 180;
    } else if (forceAnalog) {
        // Narrow but horizontal: inline analog + editorial date
        decision.layout = 'inline';
        decision.clockStyle = 'analog';
        decision.dateStyle = 'editorial';
        decision.clockSize = Math.min(usableHeight * 0.9, usableWidth * 0.45);
        decision.dateFontSize = Math.min(usableHeight * 0.2, usableWidth * 0.05);
        decision.showAnalogNumbers = decision.clockSize > 120;
    } else if (isVeryWide || isWide) {
        decision.layout = 'inline';
        decision.clockStyle = 'digital';
        decision.dateStyle = 'editorial';
        const sizes = calculateInlineDigitalSizes(userShowSeconds);
        decision.clockSize = sizes.clockSize;
        decision.dateFontSize = sizes.dateFontSize;
    } else if (isVeryTall) {
        decision.layout = 'stacked';
        decision.clockStyle = 'analog';
        decision.dateStyle = 'badge';
        decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.5);
        decision.dateFontSize = Math.min(usableWidth * 0.1, usableHeight * 0.032);
        decision.showAnalogNumbers = true;
    } else if (isTall) {
        decision.layout = 'stacked';
        decision.clockStyle = 'analog';
        decision.dateStyle = 'stacked';
        decision.clockSize = Math.min(usableWidth * 0.92, usableHeight * 0.58);
        decision.dateFontSize = Math.min(usableWidth * 0.08, usableHeight * 0.038);
        decision.showAnalogNumbers = true;
    } else {
        // Large square
        decision.layout = 'stacked';
        decision.clockStyle = 'analog';
        decision.dateStyle = 'stacked';
        decision.clockSize = Math.min(usableWidth, usableHeight * 0.72) * 0.9;
        decision.dateFontSize = minDim * 0.06;
        decision.showAnalogNumbers = true;
    }

    return decision;
}

// ============================================
// ANALOG CLOCK
// ============================================
const AnalogClock = memo(({
    timeParts,
    size,
    showSeconds,
    showNumbers,
}: {
    timeParts: TimeParts;
    size: number;
    showSeconds: boolean;
    showNumbers: boolean;
}) => {
    const center = size / 2;
    const strokeWidth = Math.max(1.5, size / 80);

    const secondAngle = (timeParts.secondWithMs / 60) * 360 - 90;
    const minuteAngle = ((timeParts.minute + timeParts.second / 60) / 60) * 360 - 90;
    const hourAngle = ((timeParts.hour24 % 12 + timeParts.minute / 60) / 12) * 360 - 90;

    const hourLength = size * 0.25;
    const minuteLength = size * 0.36;
    const secondLength = size * 0.40;

    const polarToCartesian = (angle: number, length: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: center + length * Math.cos(rad),
            y: center + length * Math.sin(rad),
        };
    };

    const hourEnd = polarToCartesian(hourAngle, hourLength);
    const minuteEnd = polarToCartesian(minuteAngle, minuteLength);
    const secondEnd = polarToCartesian(secondAngle, secondLength);

    const markers = Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 60) * 360 - 90;
        const isHour = i % 5 === 0;
        const isMainHour = i % 15 === 0;
        const outerRadius = size * 0.44;
        const innerRadius = isMainHour ? size * 0.36 : isHour ? size * 0.39 : size * 0.42;
        const outer = polarToCartesian(angle, outerRadius);
        const inner = polarToCartesian(angle, innerRadius);
        const numberPos = polarToCartesian(angle, size * 0.28);
        const hour = i === 0 ? 12 : i / 5;
        return { outer, inner, isHour, isMainHour, numberPos, hour, index: i };
    });

    const showMinuteMarkers = size > 100;

    return (
        <svg width={size} height={size} className="overflow-visible flex-shrink-0">
            <circle
                cx={center}
                cy={center}
                r={size * 0.42}
                fill="var(--ui-accent-primary-bg)"
                opacity={0.2}
            />

            <circle
                cx={center}
                cy={center}
                r={size * 0.45}
                fill="none"
                stroke="var(--ui-border-primary)"
                strokeWidth={strokeWidth * 0.5}
            />

            {markers.map((marker) => (
                <g key={marker.index}>
                    {(marker.isHour || showMinuteMarkers) && (
                        <line
                            x1={marker.inner.x}
                            y1={marker.inner.y}
                            x2={marker.outer.x}
                            y2={marker.outer.y}
                            stroke={marker.isMainHour ? 'var(--ui-text-primary)' : marker.isHour ? 'var(--ui-text-muted)' : 'var(--ui-border-primary)'}
                            strokeWidth={marker.isMainHour ? strokeWidth * 2 : marker.isHour ? strokeWidth : strokeWidth * 0.5}
                            strokeLinecap="round"
                        />
                    )}
                    {showNumbers && marker.isHour && (
                        <text
                            x={marker.numberPos.x}
                            y={marker.numberPos.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={marker.isMainHour ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)'}
                            fontSize={size * 0.09}
                            fontWeight={marker.isMainHour ? 600 : 400}
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                            {marker.hour}
                        </text>
                    )}
                </g>
            ))}

            <line
                x1={center - (hourEnd.x - center) * 0.15}
                y1={center - (hourEnd.y - center) * 0.15}
                x2={hourEnd.x}
                y2={hourEnd.y}
                stroke="var(--ui-text-primary)"
                strokeWidth={strokeWidth * 4}
                strokeLinecap="round"
            />

            <line
                x1={center - (minuteEnd.x - center) * 0.1}
                y1={center - (minuteEnd.y - center) * 0.1}
                x2={minuteEnd.x}
                y2={minuteEnd.y}
                stroke="var(--ui-text-primary)"
                strokeWidth={strokeWidth * 2.5}
                strokeLinecap="round"
            />

            {showSeconds && (
                <>
                    <line
                        x1={center - (secondEnd.x - center) * 0.2}
                        y1={center - (secondEnd.y - center) * 0.2}
                        x2={secondEnd.x}
                        y2={secondEnd.y}
                        stroke="var(--ui-accent-primary)"
                        strokeWidth={strokeWidth * 1.2}
                        strokeLinecap="round"
                    />
                    <circle
                        cx={center - (secondEnd.x - center) * 0.15}
                        cy={center - (secondEnd.y - center) * 0.15}
                        r={strokeWidth * 2}
                        fill="var(--ui-accent-primary)"
                    />
                </>
            )}

            <circle cx={center} cy={center} r={strokeWidth * 3.5} fill="var(--ui-accent-primary)" />
            <circle cx={center} cy={center} r={strokeWidth * 1.5} fill="var(--ui-bg-secondary)" />
        </svg>
    );
});

AnalogClock.displayName = 'AnalogClock';

// ============================================
// DIGITAL CLOCK
// ============================================
const DigitalClock = memo(({
    timeParts,
    fontSize,
    showSeconds,
    clockFormat,
    animateDigits = true,
}: {
    timeParts: TimeParts;
    fontSize: number;
    showSeconds: boolean;
    clockFormat: '12h' | '24h';
    animateDigits?: boolean;
}) => {
    const hoursNum = parseInt(timeParts.hours);
    const minutesNum = parseInt(timeParts.minutes);
    const secondsNum = parseInt(timeParts.seconds);
    const periodSize = fontSize * 0.35;

    const timing = animateDigits
        ? { duration: 350, easing: 'cubic-bezier(0.22, 1.12, 0.36, 1)' }
        : { duration: 0 };

    return (
        <div className="flex items-center justify-center flex-shrink-0">
            <div
                className="flex items-baseline justify-center text-[var(--ui-text-primary)]"
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 200,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                }}
            >
                <NumberFlow
                    value={hoursNum}
                    format={{ minimumIntegerDigits: 2 }}
                    transformTiming={timing}
                    spinTiming={timing}
                />

                <span className="text-[var(--ui-accent-primary)]" style={{ margin: '0 0.05em' }}>:</span>

                <NumberFlow
                    value={minutesNum}
                    format={{ minimumIntegerDigits: 2 }}
                    transformTiming={timing}
                    spinTiming={timing}
                />

                {showSeconds && (
                    <>
                        <span className="text-[var(--ui-text-muted)]" style={{ margin: '0 0.05em' }}>:</span>
                        <span className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize * 0.7}px` }}>
                            <NumberFlow
                                value={secondsNum}
                                format={{ minimumIntegerDigits: 2 }}
                                transformTiming={timing}
                                spinTiming={timing}
                            />
                        </span>
                    </>
                )}

                {clockFormat === '12h' && (
                    <span
                        className="text-[var(--ui-text-muted)] uppercase font-medium ml-1"
                        style={{ fontSize: `${periodSize}px`, letterSpacing: '0.05em' }}
                    >
                        {timeParts.period}
                    </span>
                )}
            </div>
        </div>
    );
});

DigitalClock.displayName = 'DigitalClock';

// ============================================
// MINIMAL CLOCK
// ============================================
const MinimalClock = memo(({
    timeParts,
    fontSize,
    showSeconds,
    clockFormat,
}: {
    timeParts: TimeParts;
    fontSize: number;
    showSeconds: boolean;
    clockFormat: '12h' | '24h';
}) => {
    const dotSize = Math.max(3, fontSize * 0.06);

    return (
        <div className="flex items-center flex-shrink-0" style={{ gap: fontSize * 0.08 }}>
            <span
                className="text-[var(--ui-text-primary)] font-light"
                style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
            >
                {timeParts.hours}
            </span>
            <div className="flex flex-col justify-center" style={{ gap: dotSize * 0.8 }}>
                <div className="rounded-full bg-[var(--ui-accent-primary)]" style={{ width: dotSize, height: dotSize }} />
                <div className="rounded-full bg-[var(--ui-accent-primary)]" style={{ width: dotSize, height: dotSize }} />
            </div>
            <span
                className="text-[var(--ui-text-primary)] font-light"
                style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
            >
                {timeParts.minutes}
            </span>
            {showSeconds && (
                <span
                    className="text-[var(--ui-text-muted)] font-light self-end"
                    style={{ fontSize: `${fontSize * 0.45}px`, marginBottom: fontSize * 0.08 }}
                >
                    {timeParts.seconds}
                </span>
            )}
            {clockFormat === '12h' && (
                <span
                    className="text-[var(--ui-accent-primary-text)] font-semibold uppercase self-start"
                    style={{ fontSize: `${fontSize * 0.2}px`, marginTop: fontSize * 0.1 }}
                >
                    {timeParts.period}
                </span>
            )}
        </div>
    );
});

MinimalClock.displayName = 'MinimalClock';

// ============================================
// MICRO CLOCK - Ultra compact
// ============================================
const MicroClock = memo(({
    timeParts,
    fontSize,
    clockFormat,
}: {
    timeParts: TimeParts;
    fontSize: number;
    clockFormat: '12h' | '24h';
}) => {
    return (
        <div
            className="text-[var(--ui-text-primary)] font-medium flex-shrink-0"
            style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
        >
            {timeParts.hours}
            <span className="text-[var(--ui-accent-primary)]">:</span>
            {timeParts.minutes}
            {clockFormat === '12h' && (
                <span className="text-[var(--ui-text-muted)] ml-0.5" style={{ fontSize: `${fontSize * 0.6}px` }}>
                    {timeParts.period}
                </span>
            )}
        </div>
    );
});

MicroClock.displayName = 'MicroClock';

// ============================================
// VERTICAL CLOCK
// ============================================
const VerticalClock = memo(({
    timeParts,
    fontSize,
    showSeconds,
    clockFormat,
    animateDigits = true,
}: {
    timeParts: TimeParts;
    fontSize: number;
    showSeconds: boolean;
    clockFormat: '12h' | '24h';
    animateDigits?: boolean;
}) => {
    const timing = animateDigits
        ? { duration: 350, easing: 'cubic-bezier(0.22, 1.12, 0.36, 1)' }
        : { duration: 0 };

    const hoursNum = parseInt(timeParts.hours);
    const minutesNum = parseInt(timeParts.minutes);
    const secondsNum = parseInt(timeParts.seconds);

    return (
        <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ gap: fontSize * 0.02 }}>
            <div
                className="text-[var(--ui-text-primary)] font-extralight leading-none"
                style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums' }}
            >
                <NumberFlow value={hoursNum} format={{ minimumIntegerDigits: 2 }} transformTiming={timing} spinTiming={timing} />
            </div>
            <div className="flex items-center" style={{ gap: fontSize * 0.1, width: fontSize * 0.7 }}>
                <div className="flex-1 h-px bg-[var(--ui-accent-primary)] opacity-50" />
                <div className="rounded-full bg-[var(--ui-accent-primary)]" style={{ width: fontSize * 0.08, height: fontSize * 0.08 }} />
                <div className="flex-1 h-px bg-[var(--ui-accent-primary)] opacity-50" />
            </div>
            <div
                className="text-[var(--ui-text-primary)] font-extralight leading-none"
                style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums' }}
            >
                <NumberFlow value={minutesNum} format={{ minimumIntegerDigits: 2 }} transformTiming={timing} spinTiming={timing} />
            </div>
            {showSeconds && (
                <div className="text-[var(--ui-text-muted)] font-light" style={{ fontSize: `${fontSize * 0.4}px` }}>
                    <NumberFlow value={secondsNum} format={{ minimumIntegerDigits: 2 }} transformTiming={timing} spinTiming={timing} />
                </div>
            )}
            {clockFormat === '12h' && (
                <div className="text-[var(--ui-accent-primary-text)] font-semibold uppercase tracking-widest" style={{ fontSize: `${fontSize * 0.18}px` }}>
                    {timeParts.period}
                </div>
            )}
        </div>
    );
});

VerticalClock.displayName = 'VerticalClock';

// ============================================
// DATE COMPONENTS
// ============================================

const FullDate = memo(({ dateParts, fontSize, showWeekday, showYear }: { dateParts: DateParts; fontSize: number; showWeekday: boolean; showYear: boolean }) => (
    <div className="text-[var(--ui-text-secondary)] whitespace-nowrap" style={{ fontSize: `${fontSize}px` }}>
        {showWeekday && <span className="text-[var(--ui-text-muted)]">{dateParts.dayName}, </span>}
        <span>{dateParts.monthName} {dateParts.dayNum}</span>
        {showYear && <span className="text-[var(--ui-text-muted)]">, {dateParts.year}</span>}
    </div>
));
FullDate.displayName = 'FullDate';

const StackedDate = memo(({ dateParts, fontSize, showWeekday, showYear }: { dateParts: DateParts; fontSize: number; showWeekday: boolean; showYear: boolean }) => (
    <div className="flex flex-col items-center" style={{ gap: fontSize * 0.15 }}>
        {showWeekday && (
            <div className="text-[var(--ui-accent-primary-text)] uppercase tracking-[0.15em] font-semibold" style={{ fontSize: `${fontSize * 0.7}px` }}>
                {dateParts.dayNameShort}
            </div>
        )}
        <div className="text-[var(--ui-text-primary)] font-extralight leading-none" style={{ fontSize: `${fontSize * 2.8}px`, fontVariantNumeric: 'tabular-nums' }}>
            {dateParts.dayNum}
        </div>
        <div className="flex items-center gap-2">
            <div className="text-[var(--ui-text-secondary)] uppercase tracking-wider font-medium" style={{ fontSize: `${fontSize}px` }}>
                {dateParts.monthNameShort}
            </div>
            {showYear && (
                <>
                    <div className="w-1 h-1 rounded-full bg-[var(--ui-border-primary)]" />
                    <div className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums' }}>
                        {dateParts.year}
                    </div>
                </>
            )}
        </div>
    </div>
));
StackedDate.displayName = 'StackedDate';

const EditorialDate = memo(({ dateParts, fontSize, showWeekday, showYear }: { dateParts: DateParts; fontSize: number; showWeekday: boolean; showYear: boolean }) => (
    <div className="flex items-center" style={{ gap: fontSize * 0.8 }}>
        <div className="text-[var(--ui-accent-primary)] font-black leading-none" style={{ fontSize: `${fontSize * 3.2}px`, fontVariantNumeric: 'tabular-nums' }}>
            {dateParts.dayNum}
        </div>
        <div className="flex flex-col justify-center" style={{ gap: fontSize * 0.2 }}>
            <div className="text-[var(--ui-text-primary)] font-semibold uppercase tracking-wide leading-none" style={{ fontSize: `${fontSize * 0.85}px` }}>
                {dateParts.monthName}
            </div>
            <div className="flex items-center gap-2">
                {showWeekday && <span className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize * 0.7}px` }}>{dateParts.dayName}</span>}
                {showYear && showWeekday && <span className="text-[var(--ui-border-primary)]">•</span>}
                {showYear && <span className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize * 0.7}px`, fontVariantNumeric: 'tabular-nums' }}>{dateParts.year}</span>}
            </div>
        </div>
    </div>
));
EditorialDate.displayName = 'EditorialDate';

const BadgeDate = memo(({ dateParts, fontSize, showWeekday, showYear }: { dateParts: DateParts; fontSize: number; showWeekday: boolean; showYear: boolean }) => {
    const badgeWidth = fontSize * 4;
    return (
        <div className="flex flex-col items-center">
            <div className="overflow-hidden rounded-xl" style={{ width: badgeWidth, background: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border-primary)' }}>
                <div className="w-full flex items-center justify-center" style={{ background: 'var(--ui-accent-primary)', padding: `${fontSize * 0.2}px 0` }}>
                    <span className="text-[var(--ui-bg-primary)] font-bold uppercase tracking-wider" style={{ fontSize: `${fontSize * 0.6}px` }}>
                        {dateParts.monthNameShort}
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center" style={{ padding: `${fontSize * 0.3}px 0` }}>
                    <div className="text-[var(--ui-text-primary)] font-bold leading-none" style={{ fontSize: `${fontSize * 2}px`, fontVariantNumeric: 'tabular-nums' }}>
                        {dateParts.dayNum}
                    </div>
                    {showWeekday && (
                        <div className="text-[var(--ui-text-muted)] font-medium uppercase" style={{ fontSize: `${fontSize * 0.5}px`, letterSpacing: '0.08em', marginTop: fontSize * 0.1 }}>
                            {dateParts.dayNameShort}
                        </div>
                    )}
                </div>
            </div>
            {showYear && <div className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize * 0.6}px`, marginTop: fontSize * 0.3 }}>{dateParts.year}</div>}
        </div>
    );
});
BadgeDate.displayName = 'BadgeDate';

const CompactDate = memo(({ dateParts, fontSize, showWeekday, showYear }: { dateParts: DateParts; fontSize: number; showWeekday: boolean; showYear: boolean }) => (
    <div className="flex items-center whitespace-nowrap" style={{ gap: fontSize * 0.4 }}>
        {showWeekday && (
            <>
                <span className="text-[var(--ui-accent-primary-text)] font-medium uppercase" style={{ fontSize: `${fontSize * 0.85}px`, letterSpacing: '0.03em' }}>
                    {dateParts.dayNameShort}
                </span>
                <span className="bg-[var(--ui-border-primary)]" style={{ width: 1, height: fontSize * 0.8 }} />
            </>
        )}
        <span className="text-[var(--ui-text-primary)]" style={{ fontSize: `${fontSize}px` }}>
            {dateParts.monthNameShort} {dateParts.dayNum}
        </span>
        {showYear && <span className="text-[var(--ui-text-muted)]" style={{ fontSize: `${fontSize * 0.8}px` }}>{dateParts.year}</span>}
    </div>
));
CompactDate.displayName = 'CompactDate';

const MicroDate = memo(({ dateParts, fontSize }: { dateParts: DateParts; fontSize: number }) => (
    <div className="text-[var(--ui-text-secondary)] whitespace-nowrap" style={{ fontSize: `${fontSize}px`, fontVariantNumeric: 'tabular-nums' }}>
        {dateParts.monthNum}/{dateParts.dayNum}
    </div>
));
MicroDate.displayName = 'MicroDate';

// ============================================
// MAIN CONTENT
// ============================================
const DateTimeContent: React.FC = () => {
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [dimensions, setDimensions] = useState({ width: 200, height: 100 });
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { settings } = useWidgetSettings(WIDGET_ID);

    const clockFormat = (settings.clockFormat as '12h' | '24h') || '12h';
    const userShowSeconds = settings.showSeconds !== false;
    const timezone = (settings.timezone as string) || 'America/Chicago';
    const animateDigits = settings.animateDigits !== false;

    const layout = useMemo(() => getLayoutDecision(dimensions.width, dimensions.height, userShowSeconds), [dimensions.width, dimensions.height, userShowSeconds]);

    const useAnalog = layout.clockStyle === 'analog';

    useEffect(() => {
        let cleanupFn: () => void;

        if (layout.showClock && useAnalog) {
            let animationId: number;
            const tick = () => { setCurrentDateTime(new Date()); animationId = requestAnimationFrame(tick); };
            animationId = requestAnimationFrame(tick);
            cleanupFn = () => cancelAnimationFrame(animationId);
        } else if (layout.showClock) {
            const syncAndStart = () => {
                const now = new Date();
                setCurrentDateTime(now);
                const delay = 1000 - now.getMilliseconds();
                const timeoutId = setTimeout(() => {
                    setCurrentDateTime(new Date());
                    const intervalId = setInterval(() => setCurrentDateTime(new Date()), 1000);
                    (window as any).__dateTimeInterval = intervalId;
                }, delay);
                return timeoutId;
            };
            const timeoutId = syncAndStart();
            cleanupFn = () => { clearTimeout(timeoutId); if ((window as any).__dateTimeInterval) clearInterval((window as any).__dateTimeInterval); };
        } else {
            const interval = setInterval(() => setCurrentDateTime(new Date()), 60000);
            cleanupFn = () => clearInterval(interval);
        }
        return cleanupFn;
    }, [layout.showClock, useAnalog]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const timeParts = useMemo((): TimeParts => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: clockFormat === '12h' }).formatToParts(currentDateTime);
        let hours = '00', minutes = '00', seconds = '00', period = '';
        for (const part of parts) {
            if (part.type === 'hour') hours = part.value.padStart(2, '0');
            if (part.type === 'minute') minutes = part.value;
            if (part.type === 'second') seconds = part.value;
            if (part.type === 'dayPeriod') period = part.value;
        }
        const h24Parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(currentDateTime);
        let hour24 = 0, minute = 0, second = 0;
        for (const part of h24Parts) {
            if (part.type === 'hour') hour24 = parseInt(part.value);
            if (part.type === 'minute') minute = parseInt(part.value);
            if (part.type === 'second') second = parseInt(part.value);
        }
        return { hours, minutes, seconds, period, hour24, minute, second, secondWithMs: second + currentDateTime.getMilliseconds() / 1000 };
    }, [currentDateTime, timezone, clockFormat]);

    const dateParts = useMemo((): DateParts => {
        const date = new Date(currentDateTime.toLocaleString('en-US', { timeZone: timezone }));
        return {
            dayNum: date.getDate(),
            dayName: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }),
            dayNameShort: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone }),
            monthName: date.toLocaleDateString('en-US', { month: 'long', timeZone: timezone }),
            monthNameShort: date.toLocaleDateString('en-US', { month: 'short', timeZone: timezone }),
            monthNum: date.getMonth() + 1,
            year: date.getFullYear(),
        };
    }, [currentDateTime, timezone]);

    const clockEl = useMemo(() => {
        if (!layout.showClock) return null;
        const props = { timeParts, clockFormat, showSeconds: layout.showSeconds, animateDigits };
        switch (layout.clockStyle) {
            case 'analog': return <AnalogClock timeParts={timeParts} size={layout.clockSize} showSeconds={layout.showSeconds} showNumbers={layout.showAnalogNumbers} />;
            case 'vertical': return <VerticalClock {...props} fontSize={layout.clockSize} />;
            case 'minimal': return <MinimalClock {...props} fontSize={layout.clockSize} />;
            case 'micro': return <MicroClock timeParts={timeParts} fontSize={layout.clockSize} clockFormat={clockFormat} />;
            default: return <DigitalClock {...props} fontSize={layout.clockSize} />;
        }
    }, [layout, timeParts, clockFormat, animateDigits]);

    const dateEl = useMemo(() => {
        if (!layout.showDate || layout.dateStyle === 'hidden') return null;
        const props = { dateParts, fontSize: layout.dateFontSize, showWeekday: layout.showWeekday, showYear: layout.showYear };
        switch (layout.dateStyle) {
            case 'stacked': return <StackedDate {...props} />;
            case 'editorial': return <EditorialDate {...props} />;
            case 'badge': return <BadgeDate {...props} />;
            case 'compact': return <CompactDate {...props} />;
            case 'micro': return <MicroDate dateParts={dateParts} fontSize={layout.dateFontSize} />;
            default: return <FullDate {...props} />;
        }
    }, [layout, dateParts]);

    const content = useMemo(() => {
        if (layout.layout === 'clock-only') return clockEl;
        if (layout.layout === 'date-only') return dateEl;
        if (layout.layout === 'inline') {
            // Calculate separator height based on content
            const separatorHeight = Math.min(layout.clockSize * 1.2, dimensions.height * 0.6);
            return (
                <div className="flex items-center justify-center w-full h-full px-3" style={{ gap: Math.max(12, dimensions.width * 0.03) }}>
                    {clockEl}
                    <div
                        className="flex-shrink-0 flex flex-col items-center justify-center"
                        style={{ height: separatorHeight, gap: 4 }}
                    >
                        <div
                            className="w-px flex-1 bg-gradient-to-b from-transparent via-[var(--ui-border-primary)] to-transparent"
                            style={{ opacity: 0.6 }}
                        />
                        <div
                            className="rounded-full bg-[var(--ui-accent-primary)]"
                            style={{ width: Math.max(4, separatorHeight * 0.04), height: Math.max(4, separatorHeight * 0.04) }}
                        />
                        <div
                            className="w-px flex-1 bg-gradient-to-b from-transparent via-[var(--ui-border-primary)] to-transparent"
                            style={{ opacity: 0.6 }}
                        />
                    </div>
                    {dateEl}
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full" style={{ gap: Math.max(4, dimensions.height * 0.03) }}>
                {clockEl}
                {dateEl}
            </div>
        );
    }, [layout.layout, clockEl, dateEl, layout.clockSize, dimensions.width, dimensions.height]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center select-none overflow-hidden">
            {content}
        </div>
    );
};

const DateTimeWidget: React.FC = () => (
    <Widget endpoint={undefined} payload={undefined} title="" refreshInterval={undefined}>
        {() => <DateTimeContent />}
    </Widget>
);

export default DateTimeWidget;
