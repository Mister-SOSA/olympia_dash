/**
 * usePresetAutoCycle Hook
 * 
 * Manages automatic cycling through dashboard presets with robust pause/resume logic.
 * Features:
 * - Configurable cycle interval
 * - Pause on user interaction with resume delay
 * - Only cycles through selected and valid presets
 * - Respects UI modal states
 */

import { useEffect, useRef, useCallback } from 'react';
import { DashboardPreset } from '@/types';
import { useSettings } from './useSettings';

interface UsePresetAutoCycleProps {
    presets: Array<DashboardPreset | null>;
    currentPresetIndex: number | null;
    onLoadPreset: (index: number) => void;
    isAnyModalOpen: boolean;
}

export function usePresetAutoCycle({
    presets,
    currentPresetIndex,
    onLoadPreset,
    isAnyModalOpen,
}: UsePresetAutoCycleProps) {
    const { settings } = useSettings();

    const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isPausedRef = useRef(false);
    const lastInteractionRef = useRef<number>(Date.now());

    // Get valid preset indices that can be cycled
    const getValidCycleIndices = useCallback((): number[] => {
        if (!settings.autoCycleEnabled || settings.autoCyclePresets.length === 0) {
            return [];
        }

        return settings.autoCyclePresets.filter(index => {
            const preset = presets[index];
            return preset && preset.layout && preset.layout.some(w => w.enabled);
        }).sort((a, b) => a - b);
    }, [settings.autoCycleEnabled, settings.autoCyclePresets, presets]);

    // Find next preset in cycle
    const getNextPresetIndex = useCallback((currentIndex: number | null, validIndices: number[]): number | null => {
        if (validIndices.length === 0) return null;
        if (validIndices.length === 1) return validIndices[0];

        const currentPos = currentIndex !== null ? validIndices.indexOf(currentIndex) : -1;
        const nextPos = (currentPos + 1) % validIndices.length;
        return validIndices[nextPos];
    }, []);

    // Clear all timers
    const clearTimers = useCallback(() => {
        if (cycleTimerRef.current) {
            clearInterval(cycleTimerRef.current);
            cycleTimerRef.current = null;
        }
        if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
        }
    }, []);

    // Pause cycling
    const pause = useCallback(() => {
        if (!isPausedRef.current) {
            isPausedRef.current = true;
            clearTimers();
        }
    }, [clearTimers]);

    // Resume cycling after delay
    const scheduleResume = useCallback(() => {
        if (!settings.autoCyclePauseOnInteraction || !settings.autoCycleEnabled) {
            return;
        }

        // Clear existing resume timer
        if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
        }

        // Schedule resume
        resumeTimerRef.current = setTimeout(() => {
            isPausedRef.current = false;
            lastInteractionRef.current = Date.now();
        }, settings.autoCycleResumeDelay * 1000);
    }, [settings.autoCyclePauseOnInteraction, settings.autoCycleEnabled, settings.autoCycleResumeDelay]);

    // Handle user interaction
    const handleInteraction = useCallback(() => {
        if (!settings.autoCycleEnabled || !settings.autoCyclePauseOnInteraction) {
            return;
        }

        lastInteractionRef.current = Date.now();
        pause();
        scheduleResume();
    }, [settings.autoCycleEnabled, settings.autoCyclePauseOnInteraction, pause, scheduleResume]);

    // Main cycle effect
    useEffect(() => {
        if (!settings.autoCycleEnabled) {
            clearTimers();
            isPausedRef.current = false;
            return;
        }

        const validIndices = getValidCycleIndices();
        if (validIndices.length === 0) {
            clearTimers();
            return;
        }

        // Don't cycle if modals are open
        if (isAnyModalOpen) {
            pause();
            return;
        }

        // Don't start a new timer if paused
        if (isPausedRef.current) {
            return;
        }

        // Clear existing timer
        if (cycleTimerRef.current) {
            clearInterval(cycleTimerRef.current);
        }

        // Start cycling
        cycleTimerRef.current = setInterval(() => {
            // Skip if paused or modal is open
            if (isPausedRef.current || isAnyModalOpen) {
                return;
            }

            const currentValidIndices = getValidCycleIndices();
            if (currentValidIndices.length === 0) {
                return;
            }

            const nextIndex = getNextPresetIndex(currentPresetIndex, currentValidIndices);
            if (nextIndex !== null && nextIndex !== currentPresetIndex) {
                onLoadPreset(nextIndex);
            }
        }, settings.autoCycleInterval * 1000);

        return () => {
            clearTimers();
        };
    }, [
        settings.autoCycleEnabled,
        settings.autoCycleInterval,
        currentPresetIndex,
        isAnyModalOpen,
        getValidCycleIndices,
        getNextPresetIndex,
        onLoadPreset,
        pause,
        clearTimers,
    ]);

    // Listen for user interactions to pause cycling
    useEffect(() => {
        if (!settings.autoCycleEnabled || !settings.autoCyclePauseOnInteraction) {
            return;
        }

        const events = ['mousedown', 'keydown', 'wheel', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, handleInteraction, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleInteraction);
            });
        };
    }, [settings.autoCycleEnabled, settings.autoCyclePauseOnInteraction, handleInteraction]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);

    return {
        isPaused: isPausedRef.current,
        validCyclePresets: getValidCycleIndices(),
    };
}
