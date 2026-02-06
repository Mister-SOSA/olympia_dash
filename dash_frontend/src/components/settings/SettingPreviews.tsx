'use client';

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// Real Drag Handle Component
// =============================================================================

interface RealDragHandleProps {
    style: 'pill' | 'bar' | 'dots' | 'minimal';
    size: 'small' | 'medium' | 'large';
}

export function RealDragHandle({ style, size }: RealDragHandleProps) {
    // Size configurations - exactly matching globals.css values
    const sizeConfig = {
        small: {
            padding: '4px 12px',
            borderRadius: '0 0 10px 10px',
            dotSize: 3,
            peekWidth: 24,
            peekHeight: 2,
            dotOffset: 9,
            minWidth: 50,
            dotsMinWidth: 70,
        },
        medium: {
            padding: '6px 16px',
            borderRadius: '0 0 14px 14px',
            dotSize: 4,
            peekWidth: 32,
            peekHeight: 3,
            dotOffset: 12,
            minWidth: 70,
            dotsMinWidth: 100,
        },
        large: {
            padding: '8px 24px',
            borderRadius: '0 0 18px 18px',
            dotSize: 5,
            peekWidth: 40,
            peekHeight: 4,
            dotOffset: 14,
            minWidth: 90,
            dotsMinWidth: 120,
        },
    };

    const config = sizeConfig[size];
    const isDots = style === 'dots';
    const effectiveMinWidth = isDots ? config.dotsMinWidth : config.minWidth;

    // For 'dots' style (5 dots), we need double the offset for outer dots
    const dotsOuterOffset = config.dotOffset * 2;

    // Base container styles
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: config.padding,
        minWidth: effectiveMinWidth,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: config.borderRadius,
        borderLeft: '0.5px solid rgba(255, 255, 255, 0.15)',
        borderRight: '0.5px solid rgba(255, 255, 255, 0.15)',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
    };

    // Peek indicator (the line above the handle)
    const peekStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%) translateY(-100%)',
        width: config.peekWidth,
        height: config.peekHeight,
        borderRadius: `${config.peekHeight}px ${config.peekHeight}px 0 0`,
        background: 'rgba(255, 255, 255, 0.2)',
    };

    // Dot style
    const dotStyle: React.CSSProperties = {
        width: config.dotSize,
        height: config.dotSize,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.7)',
        flexShrink: 0,
    };

    // Bar style
    const barStyle: React.CSSProperties = {
        width: 32,
        height: 3,
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.7)',
    };

    // Render dots using absolute positioning
    const renderDots = (count: 3 | 5) => {
        const positions = count === 3
            ? [-config.dotOffset, 0, config.dotOffset]
            : [-dotsOuterOffset, -config.dotOffset, 0, config.dotOffset, dotsOuterOffset];

        return (
            <div style={{
                position: 'relative',
                height: config.dotSize,
                width: count === 3 ? config.dotOffset * 2 + config.dotSize : dotsOuterOffset * 2 + config.dotSize
            }}>
                {positions.map((offset, i) => (
                    <div
                        key={i}
                        style={{
                            ...dotStyle,
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            transform: `translateX(calc(-50% + ${offset}px))`,
                        }}
                    />
                ))}
            </div>
        );
    };

    if (style === 'minimal') {
        return (
            <div style={{ padding: '4px 16px' }}>
                <div style={{
                    width: config.peekWidth + 16,
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.3)'
                }} />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={peekStyle} />
            {style === 'pill' && renderDots(3)}
            {style === 'bar' && <div style={barStyle} />}
            {style === 'dots' && renderDots(5)}
        </div>
    );
}

// =============================================================================
// Obfuscation Style Preview
// =============================================================================

interface ObfuscationPreviewProps {
    style: 'blur' | 'redact' | 'asterisk' | 'placeholder';
    sampleText?: string;
}

export function ObfuscationPreview({ style, sampleText = "$1,234.56" }: ObfuscationPreviewProps) {
    switch (style) {
        case 'blur':
            return (
                <span
                    className="text-sm font-medium text-ui-text-primary"
                    style={{ filter: 'blur(6px)', userSelect: 'none', WebkitFilter: 'blur(6px)' }}
                >
                    {sampleText}
                </span>
            );
        case 'redact':
            return (
                <span
                    className="text-sm font-medium px-1 rounded select-none"
                    style={{
                        backgroundColor: 'var(--ui-text-primary, #1f2937)',
                        color: 'transparent',
                    }}
                >
                    {sampleText}
                </span>
            );
        case 'asterisk':
            return <span className="text-sm font-mono text-ui-text-secondary">$***</span>;
        case 'placeholder':
            return <span className="text-sm text-ui-text-secondary">$••••</span>;
    }
}

// =============================================================================
// Dock Preview
// =============================================================================

interface DockPreviewProps {
    settings: {
        dockOpacity: number;
        dockIconSize: number;
        dockMagnification: boolean;
        dockMagnificationScale: number;
        dockAutoHide: boolean;
        dockTriggerDistance: number;
        dockBorderRadius: 'none' | 'small' | 'medium' | 'large' | 'pill';
        dockIconBorderRadius: 'square' | 'rounded' | 'circle';
        dockStyle: 'opaque' | 'glass' | 'clear';
        dockGap: number;
        dockPadding: number;
    };
}

const PREVIEW_DOCK_RADIUS = {
    none: 'rounded-none',
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-[18px]',
    pill: 'rounded-full',
} as const;

const PREVIEW_ICON_RADIUS = {
    square: 'rounded-sm',
    rounded: 'rounded-xl',
    circle: 'rounded-full',
} as const;

export function DockPreview({ settings }: DockPreviewProps) {
    return (
        <div className="relative h-28 bg-ui-bg-tertiary/30 rounded-xl overflow-hidden border border-ui-border-primary">
            {/* Mock screen content */}
            <div className="absolute inset-x-4 top-3 h-6 bg-ui-bg-tertiary/30 rounded" />
            <div className="absolute inset-x-4 top-11 h-3 bg-ui-bg-tertiary/20 rounded" />
            <div className="absolute left-4 right-20 top-16 h-3 bg-ui-bg-tertiary/15 rounded" />

            {/* Preview Dock */}
            <div
                className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end pt-2 shadow-lg",
                    PREVIEW_DOCK_RADIUS[settings.dockBorderRadius],
                    settings.dockStyle === 'opaque'
                        ? 'bg-ui-bg-secondary border border-white/10'
                        : settings.dockStyle === 'glass'
                            ? 'bg-ui-bg-secondary/60 backdrop-blur-xl border border-white/10'
                            : 'bg-transparent',
                )}
                style={{
                    opacity: settings.dockOpacity / 100,
                    gap: `${Math.max(settings.dockGap / 3, 1)}px`,
                    paddingLeft: `${Math.max(settings.dockPadding / 3, 2)}px`,
                    paddingRight: `${Math.max(settings.dockPadding / 3, 2)}px`,
                    paddingBottom: `${Math.max(settings.dockPadding / 6, 2)}px`,
                }}
            >
                {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                        key={i}
                        className={cn(
                            PREVIEW_ICON_RADIUS[settings.dockIconBorderRadius],
                            i === 3 ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary',
                        )}
                        style={{
                            width: `${settings.dockIconSize / 3.5}px`,
                            height: `${settings.dockIconSize / 3.5}px`,
                        }}
                        whileHover={settings.dockMagnification ? {
                            scale: settings.dockMagnificationScale,
                            y: -4
                        } : {}}
                    />
                ))}
            </div>

            {/* Trigger zone indicator */}
            {settings.dockAutoHide && (
                <div
                    className="absolute bottom-0 left-0 right-0 bg-ui-accent-primary/10 border-t border-dashed border-ui-accent-primary/30"
                    style={{ height: `${Math.min(settings.dockTriggerDistance / 2, 40)}%` }}
                >
                    <span className="absolute right-2 top-1 text-[9px] text-ui-accent-primary/60 font-medium">trigger zone</span>
                </div>
            )}
        </div>
    );
}
