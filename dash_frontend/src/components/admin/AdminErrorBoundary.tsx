'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MdError, MdRefresh } from 'react-icons/md';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Admin panel error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary p-4">
                    <Card className="bg-ui-bg-secondary border-ui-border-primary shadow-lg max-w-2xl w-full">
                        <CardHeader className="text-center border-b border-ui-border-primary pb-6">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-ui-danger-bg rounded-full">
                                    <MdError className="w-12 h-12 text-ui-danger-text" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-ui-text-primary">
                                Admin Panel Error
                            </CardTitle>
                            <CardDescription className="text-ui-text-secondary mt-2">
                                Something went wrong while loading the admin panel
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {this.state.error && (
                                <div className="bg-ui-bg-tertiary border border-ui-border-primary rounded-lg p-4">
                                    <p className="font-mono text-xs text-ui-danger-text break-all">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}

                            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                                <details className="bg-ui-bg-tertiary border border-ui-border-primary rounded-lg p-4">
                                    <summary className="cursor-pointer text-sm font-medium text-ui-text-primary mb-2">
                                        Stack Trace (Development Only)
                                    </summary>
                                    <pre className="text-xs text-ui-text-secondary overflow-auto max-h-64">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}

                            <div className="flex gap-3 justify-center pt-4">
                                <Button
                                    onClick={this.handleReset}
                                    className="bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-white"
                                >
                                    <MdRefresh className="mr-2" />
                                    Reload Admin Panel
                                </Button>
                                <Button
                                    onClick={() => window.location.href = '/'}
                                    variant="outline"
                                    className="border-ui-border-primary hover:bg-ui-bg-tertiary"
                                >
                                    Return to Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
