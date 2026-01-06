"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Fallback UI to show when an error occurs */
    fallback?: ReactNode;
    /** Called when an error is caught */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /** Whether to show a retry button */
    showRetry?: boolean;
    /** Custom retry handler */
    onRetry?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });

        // Log to console in development
        console.error("[ErrorBoundary] Caught error:", error);
        console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        this.props.onRetry?.();
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <DefaultErrorFallback
                    error={this.state.error}
                    showRetry={this.props.showRetry ?? true}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
    error: Error | null;
    showRetry?: boolean;
    onRetry?: () => void;
}

function DefaultErrorFallback({ error, showRetry = true, onRetry }: DefaultErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center">
            <div
                className="p-3 rounded-full mb-4"
                style={{ backgroundColor: "var(--ui-danger-bg)" }}
            >
                <AlertTriangle
                    className="w-8 h-8"
                    style={{ color: "var(--ui-danger)" }}
                />
            </div>
            <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--ui-text-primary)" }}
            >
                Something went wrong
            </h3>
            <p
                className="text-sm mb-4 max-w-sm"
                style={{ color: "var(--ui-text-secondary)" }}
            >
                {error?.message || "An unexpected error occurred"}
            </p>
            {showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                        backgroundColor: "var(--ui-bg-secondary)",
                        color: "var(--ui-text-primary)",
                    }}
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>
            )}
        </div>
    );
}

/**
 * Widget-specific error boundary with compact UI
 */
interface WidgetErrorBoundaryProps {
    children: ReactNode;
    widgetName?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface WidgetErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class WidgetErrorBoundary extends Component<
    WidgetErrorBoundaryProps,
    WidgetErrorBoundaryState
> {
    constructor(props: WidgetErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): Partial<WidgetErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(
            `[WidgetErrorBoundary] Error in ${this.props.widgetName || "widget"}:`,
            error
        );
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full w-full p-4">
                    <div
                        className="p-2 rounded-full mb-3"
                        style={{ backgroundColor: "var(--ui-danger-bg)" }}
                    >
                        <Bug className="w-5 h-5" style={{ color: "var(--ui-danger)" }} />
                    </div>
                    <p
                        className="text-sm font-medium mb-1"
                        style={{ color: "var(--ui-text-primary)" }}
                    >
                        Widget Error
                    </p>
                    <p
                        className="text-xs mb-3 text-center max-w-[200px]"
                        style={{ color: "var(--ui-text-muted)" }}
                    >
                        {this.state.error?.message || "Failed to render"}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"
                        style={{
                            backgroundColor: "var(--ui-bg-tertiary)",
                            color: "var(--ui-text-secondary)",
                        }}
                    >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
