import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* -------------------------------------- */
/* Mobile Table Card Component             */
/* -------------------------------------- */

/**
 * A professional mobile-first card component for displaying table data
 * in compact/vertical layouts. Designed to replace cramped table views
 * on mobile devices or narrow widget sizes.
 * 
 * Features:
 * - Clean, scannable layout with clear visual hierarchy
 * - Support for badges, status indicators, and icons
 * - Animations for new/highlighted items
 * - Consistent spacing and typography
 */

export interface MobileCardField {
    label?: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    /** Display as a badge with optional style */
    badge?: {
        style?: React.CSSProperties;
        className?: string;
    };
    /** Make text monospace */
    mono?: boolean;
    /** Secondary/muted styling */
    secondary?: boolean;
    /** Align to the right */
    alignRight?: boolean;
    /** Full width (span entire row) */
    fullWidth?: boolean;
    /** Custom className */
    className?: string;
    /** Tooltip content */
    tooltip?: string;
}

export interface MobileCardRow {
    fields: MobileCardField[];
    /** Gap between fields: 'tight' | 'normal' | 'wide' */
    gap?: 'tight' | 'normal' | 'wide';
}

export interface MobileTableCardProps {
    /** Unique key for the card */
    id: string;
    /** Array of rows, each containing fields */
    rows: MobileCardRow[];
    /** Whether this card should be highlighted as new */
    isNew?: boolean;
    /** Additional highlight animation class */
    highlightClass?: string;
    /** Custom onClick handler */
    onClick?: () => void;
    /** Whether the card is in a selected/active state */
    isActive?: boolean;
    /** Status indicator on the left edge */
    statusIndicator?: {
        color: string;
        label?: string;
    };
    /** Additional className */
    className?: string;
    /** Style variant */
    variant?: 'default' | 'compact' | 'minimal';
}

const gapClasses = {
    tight: 'gap-1.5',
    normal: 'gap-2',
    wide: 'gap-3',
};

const CardField = memo(({ field }: { field: MobileCardField }) => {
    const content = (
        <div
            className={cn(
                "flex items-center",
                field.fullWidth && "w-full",
                field.alignRight && "justify-end ml-auto",
                field.className
            )}
        >
            {field.icon && (
                <span className="mr-1.5 opacity-70 flex-shrink-0">
                    {field.icon}
                </span>
            )}
            {field.badge ? (
                <span
                    className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border",
                        field.badge.className
                    )}
                    style={field.badge.style}
                >
                    {field.value}
                </span>
            ) : (
                <span
                    className={cn(
                        field.mono && "font-mono",
                        field.secondary ? "text-muted-foreground text-xs" : "text-sm",
                        !field.secondary && "font-medium"
                    )}
                    style={{ color: field.secondary ? 'var(--table-text-secondary)' : 'var(--table-text-primary)' }}
                >
                    {field.label && (
                        <span className="text-xs text-muted-foreground mr-1">{field.label}:</span>
                    )}
                    {field.value}
                </span>
            )}
        </div>
    );

    if (field.tooltip) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-help">{content}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">{field.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return content;
});
CardField.displayName = 'CardField';

export const MobileTableCard = memo(({
    id,
    rows,
    isNew = false,
    highlightClass,
    onClick,
    isActive = false,
    statusIndicator,
    className,
    variant = 'default',
}: MobileTableCardProps) => {
    const paddingClasses = {
        default: 'p-3',
        compact: 'p-2.5',
        minimal: 'p-2',
    };

    const spacingClasses = {
        default: 'space-y-2.5',
        compact: 'space-y-2',
        minimal: 'space-y-1.5',
    };

    return (
        <div
            className={cn(
                "mobile-table-card",
                paddingClasses[variant],
                spacingClasses[variant],
                isActive && "ring-2 ring-primary/50",
                isNew && "inventory-new-row",
                highlightClass,
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {/* Status indicator bar */}
            {statusIndicator && (
                <div
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                    style={{ backgroundColor: statusIndicator.color }}
                    title={statusIndicator.label}
                />
            )}

            {/* Card content */}
            <div className={cn(statusIndicator && "pl-2")}>
                {rows.map((row, rowIndex) => (
                    <div
                        key={rowIndex}
                        className={cn(
                            "flex items-center flex-wrap",
                            gapClasses[row.gap || 'normal']
                        )}
                    >
                        {row.fields.map((field, fieldIndex) => (
                            <CardField key={fieldIndex} field={field} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
});
MobileTableCard.displayName = 'MobileTableCard';

/* -------------------------------------- */
/* Mobile Table Container                  */
/* -------------------------------------- */

interface MobileTableContainerProps {
    children: React.ReactNode;
    className?: string;
    /** Gap between cards */
    gap?: 'tight' | 'normal' | 'wide';
}

const containerGapClasses = {
    tight: 'gap-2',
    normal: 'gap-2.5',
    wide: 'gap-3',
};

export const MobileTableContainer = memo(({
    children,
    className,
    gap = 'normal'
}: MobileTableContainerProps) => {
    return (
        <div className={cn("mobile-cards-container", containerGapClasses[gap], className)}>
            {children}
        </div>
    );
});
MobileTableContainer.displayName = 'MobileTableContainer';

/* -------------------------------------- */
/* Preset Badge Styles                     */
/* -------------------------------------- */

export const BADGE_STYLES = {
    success: {
        backgroundColor: 'var(--badge-success-bg)',
        color: 'var(--badge-success-text)',
        borderColor: 'var(--badge-success-border)',
    },
    error: {
        backgroundColor: 'var(--badge-error-bg)',
        color: 'var(--badge-error-text)',
        borderColor: 'var(--badge-error-border)',
    },
    warning: {
        backgroundColor: 'var(--badge-warning-bg)',
        color: 'var(--badge-warning-text)',
        borderColor: 'var(--badge-warning-border)',
    },
    primary: {
        backgroundColor: 'var(--badge-primary-bg)',
        color: 'var(--badge-primary-text)',
        borderColor: 'var(--badge-primary-border)',
    },
    secondary: {
        backgroundColor: 'var(--ui-accent-secondary-bg)',
        color: 'var(--ui-accent-secondary-text)',
        borderColor: 'var(--ui-accent-secondary-border)',
    },
    accent: {
        backgroundColor: 'var(--ui-accent-primary-bg)',
        color: 'var(--ui-accent-primary-text)',
        borderColor: 'var(--ui-accent-primary-border)',
    },
    muted: {
        backgroundColor: 'var(--ui-bg-tertiary)',
        color: 'var(--text-muted)',
        borderColor: 'var(--ui-border-primary)',
    },
} as const;

/* -------------------------------------- */
/* Status Color Helpers                    */
/* -------------------------------------- */

export const STATUS_COLORS = {
    received: 'rgb(34, 197, 94)',      // Green
    cancelled: 'rgb(239, 68, 68)',     // Red
    pending: 'rgb(234, 179, 8)',       // Yellow
    released: 'rgb(59, 130, 246)',     // Blue
    entered: 'rgb(156, 163, 175)',     // Gray
    default: 'rgb(107, 114, 128)',     // Dark gray
} as const;

export default MobileTableCard;
