/**
 * Analytics Tracking Service
 * Tracks user engagement: page views, widget interactions, session duration
 */

import { API_BASE_URL } from '@/config';
import { authService } from '@/lib/auth';

interface AnalyticsEvent {
    type: 'pageview' | 'widget' | 'feature';
    data: Record<string, unknown>;
}

class AnalyticsService {
    private sessionId: string | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private eventQueue: AnalyticsEvent[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;
    private isInitialized = false;
    private lastPage: string | null = null;

    /**
     * Initialize analytics tracking
     * Call this when the user logs in or the app mounts
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Start a new session
            await this.startSession();
            this.isInitialized = true;

            // Set up page visibility handlers
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', this.handleVisibilityChange);
                window.addEventListener('beforeunload', this.handleUnload);
            }

            // Track initial page view
            this.trackPageView(window.location.pathname);
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
        }
    }

    /**
     * Clean up analytics tracking
     * Call this when user logs out or component unmounts
     */
    async destroy(): Promise<void> {
        if (!this.isInitialized) return;

        // Flush any remaining events
        await this.flushEvents();

        // End the session
        await this.endSession();

        // Clear intervals and listeners
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }

        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('beforeunload', this.handleUnload);
        }

        this.isInitialized = false;
        this.sessionId = null;
    }

    /**
     * Start a new activity session
     */
    private async startSession(): Promise<void> {
        try {
            const response = await authService.fetchWithAuth(
                `${API_BASE_URL}/api/analytics/session/start`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_type: this.getDeviceType(),
                        user_agent: navigator.userAgent
                    })
                }
            );
            const data = await response.json();
            if (data.success && data.session_id) {
                this.sessionId = data.session_id;
                // Start heartbeat to keep session alive
                this.startHeartbeat();
            }
        } catch (error) {
            console.error('Failed to start session:', error);
        }
    }

    /**
     * End the current session
     */
    private async endSession(): Promise<void> {
        if (!this.sessionId) return;

        try {
            await authService.fetchWithAuth(
                `${API_BASE_URL}/api/analytics/session/end`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: this.sessionId })
                }
            );
        } catch (error) {
            console.error('Failed to end session:', error);
        }
    }

    /**
     * Send heartbeat to update session activity
     */
    private async sendHeartbeat(): Promise<void> {
        if (!this.sessionId) return;

        try {
            await authService.fetchWithAuth(
                `${API_BASE_URL}/api/analytics/session/heartbeat`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: this.sessionId })
                }
            );
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    /**
     * Start heartbeat interval (every 30 seconds)
     */
    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
    }

    /**
     * Track a page view
     */
    trackPageView(page: string, referrer?: string): void {
        // Avoid duplicate tracking of the same page
        if (page === this.lastPage) return;
        this.lastPage = page;

        this.queueEvent({
            type: 'pageview',
            data: {
                page,
                referrer: referrer || document.referrer || null,
                session_id: this.sessionId
            }
        });
    }

    /**
     * Track a widget interaction
     */
    trackWidgetInteraction(
        widgetType: string,
        widgetId: string | null,
        interactionType: 'view' | 'click' | 'configure' | 'resize' | 'move' | 'add' | 'remove',
        metadata?: Record<string, unknown>
    ): void {
        this.queueEvent({
            type: 'widget',
            data: {
                widget_type: widgetType,
                widget_id: widgetId,
                interaction_type: interactionType,
                metadata,
                session_id: this.sessionId
            }
        });
    }

    /**
     * Track feature usage
     */
    trackFeature(featureName: string, metadata?: Record<string, unknown>): void {
        this.queueEvent({
            type: 'feature',
            data: {
                feature_name: featureName,
                metadata,
                session_id: this.sessionId
            }
        });
    }

    /**
     * Queue an event for batch sending
     */
    private queueEvent(event: AnalyticsEvent): void {
        this.eventQueue.push(event);

        // Flush after a short delay or when queue gets large
        if (this.eventQueue.length >= 10) {
            this.flushEvents();
        } else if (!this.flushTimeout) {
            this.flushTimeout = setTimeout(() => this.flushEvents(), 5000);
        }
    }

    /**
     * Send queued events to the server
     */
    private async flushEvents(): Promise<void> {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }

        if (this.eventQueue.length === 0) return;

        const events = [...this.eventQueue];
        this.eventQueue = [];

        try {
            await authService.fetchWithAuth(
                `${API_BASE_URL}/api/analytics/batch`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                }
            );
        } catch (error) {
            // Put events back in queue on failure
            this.eventQueue.unshift(...events);
            console.error('Failed to flush analytics events:', error);
        }
    }

    /**
     * Handle page visibility changes
     */
    private handleVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            // User switched tabs or minimized - flush events
            this.flushEvents();
        } else if (document.visibilityState === 'visible') {
            // User returned - send heartbeat
            this.sendHeartbeat();
        }
    };

    /**
     * Handle page unload
     */
    private handleUnload = (): void => {
        // Try to flush remaining events using sendBeacon
        if (this.eventQueue.length > 0 && navigator.sendBeacon) {
            const token = localStorage.getItem('token');
            if (token) {
                navigator.sendBeacon(
                    `${API_BASE_URL}/api/analytics/batch`,
                    JSON.stringify({ events: this.eventQueue })
                );
            }
        }

        // End session
        if (this.sessionId && navigator.sendBeacon) {
            const token = localStorage.getItem('token');
            if (token) {
                navigator.sendBeacon(
                    `${API_BASE_URL}/api/analytics/session/end`,
                    JSON.stringify({ session_id: this.sessionId })
                );
            }
        }
    };

    /**
     * Detect device type from user agent
     */
    private getDeviceType(): string {
        const ua = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
            if (/tablet|ipad/i.test(ua)) {
                return 'tablet';
            }
            return 'mobile';
        }
        return 'desktop';
    }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export convenience functions
export const trackPageView = (page: string, referrer?: string) =>
    analytics.trackPageView(page, referrer);

export const trackWidgetInteraction = (
    widgetType: string,
    widgetId: string | null,
    interactionType: 'view' | 'click' | 'configure' | 'resize' | 'move' | 'add' | 'remove',
    metadata?: Record<string, unknown>
) => analytics.trackWidgetInteraction(widgetType, widgetId, interactionType, metadata);

export const trackFeature = (featureName: string, metadata?: Record<string, unknown>) =>
    analytics.trackFeature(featureName, metadata);
