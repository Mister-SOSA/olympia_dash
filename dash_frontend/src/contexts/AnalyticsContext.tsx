'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { analytics, trackPageView, trackWidgetInteraction, trackFeature } from '@/lib/analytics';
import { authService } from '@/lib/auth';

interface AnalyticsContextType {
    trackWidgetInteraction: typeof trackWidgetInteraction;
    trackFeature: typeof trackFeature;
    trackPageView: typeof trackPageView;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const initialized = useRef(false);
    const lastPath = useRef<string | null>(null);

    // Initialize analytics when user is authenticated
    useEffect(() => {
        const initAnalytics = async () => {
            // Only initialize if authenticated and not already initialized
            if (!authService.isAuthenticated() || initialized.current) {
                return;
            }

            try {
                await analytics.init();
                initialized.current = true;
            } catch (error) {
                console.error('Failed to initialize analytics:', error);
            }
        };

        initAnalytics();

        // Cleanup on unmount
        return () => {
            if (initialized.current) {
                analytics.destroy();
                initialized.current = false;
            }
        };
    }, []);

    // Track page views on route change
    useEffect(() => {
        if (!initialized.current || !pathname || pathname === lastPath.current) {
            return;
        }

        lastPath.current = pathname;
        trackPageView(pathname);
    }, [pathname]);

    const contextValue: AnalyticsContextType = {
        trackWidgetInteraction,
        trackFeature,
        trackPageView,
    };

    return (
        <AnalyticsContext.Provider value={contextValue}>
            {children}
        </AnalyticsContext.Provider>
    );
}

export function useAnalytics(): AnalyticsContextType {
    const context = useContext(AnalyticsContext);
    if (!context) {
        // Return no-op functions if used outside provider
        return {
            trackWidgetInteraction: () => { },
            trackFeature: () => { },
            trackPageView: () => { },
        };
    }
    return context;
}
