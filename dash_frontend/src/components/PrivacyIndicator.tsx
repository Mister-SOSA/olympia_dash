'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdVisibilityOff, MdVisibility } from 'react-icons/md';
import { usePrivacy } from '@/contexts/PrivacyContext';

/**
 * Privacy Mode Indicator
 * 
 * A floating indicator that shows when privacy mode is active.
 * Can be clicked to toggle privacy mode on/off.
 */

interface PrivacyIndicatorProps {
    /** Position on screen */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** Whether to show as a compact icon only */
    compact?: boolean;
}

export function PrivacyIndicator({ 
    position = 'top-right',
    compact = false 
}: PrivacyIndicatorProps) {
    const { isPrivate, toggle, settings } = usePrivacy();

    // Don't render if indicator is disabled
    if (!settings.showIndicator && !isPrivate) {
        return null;
    }

    const positionClasses: Record<string, string> = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-20 left-4',
        'bottom-right': 'bottom-20 right-4',
    };

    return (
        <AnimatePresence>
            {(isPrivate || settings.showIndicator) && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggle}
                    className={`
                        fixed ${positionClasses[position]} z-50
                        flex items-center gap-2 px-3 py-2
                        rounded-full shadow-lg
                        transition-colors cursor-pointer
                        ${isPrivate 
                            ? 'bg-ui-accent-secondary text-white' 
                            : 'bg-ui-bg-secondary text-ui-text-secondary hover:text-ui-text-primary'
                        }
                        border ${isPrivate ? 'border-ui-accent-secondary' : 'border-ui-border-primary'}
                    `}
                    title={isPrivate ? 'Privacy Mode ON - Click to disable' : 'Privacy Mode OFF - Click to enable'}
                >
                    {isPrivate ? (
                        <MdVisibilityOff className="w-5 h-5" />
                    ) : (
                        <MdVisibility className="w-5 h-5" />
                    )}
                    {!compact && (
                        <span className="text-sm font-medium whitespace-nowrap">
                            {isPrivate ? 'Private' : 'Privacy'}
                        </span>
                    )}
                </motion.button>
            )}
        </AnimatePresence>
    );
}

/**
 * Privacy Mode Badge
 * 
 * A smaller, non-interactive badge that indicates privacy mode status.
 */
export function PrivacyBadge() {
    const { isPrivate, settings } = usePrivacy();

    if (!isPrivate || !settings.showIndicator) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 
                       bg-ui-accent-secondary/20 text-ui-accent-secondary
                       rounded-md text-xs font-semibold"
        >
            <MdVisibilityOff className="w-3.5 h-3.5" />
            <span>Private</span>
        </motion.div>
    );
}
