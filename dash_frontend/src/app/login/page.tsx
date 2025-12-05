'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { FaMicrosoft } from 'react-icons/fa';
import { MdDevices, MdRefresh } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { isIOSPWA, isPWA, openOAuthInBrowser, storeOAuthRedirect } from '@/utils/pwaUtils';
import QRCodeSVG from 'react-qr-code';

export const dynamic = 'force-dynamic';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [userCode, setUserCode] = useState<string>('');
    const [deviceLoading, setDeviceLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [errorVisible, setErrorVisible] = useState(false);
    const [isPWAMode, setIsPWAMode] = useState(false);

    // Track if authentication succeeded to prevent race condition errors
    const authSucceededRef = useRef(false);
    const popupCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Show error with animation
    const showError = (message: string) => {
        // Don't show errors if auth already succeeded
        if (authSucceededRef.current) return;

        setError(message);
        setErrorVisible(true);
    };

    // Clear error with animation
    const clearError = () => {
        setErrorVisible(false);
        setTimeout(() => setError(''), 200);
    };

    useEffect(() => {
        // Detect PWA mode
        setIsPWAMode(isPWA());

        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
            router.push('/');
            return;
        }

        // Handle OAuth callback
        const code = searchParams.get('code');
        if (code) {
            handleOAuthCallback(code);
            return;
        }

        // Auto-generate device code on mount (especially useful for PWA/iOS)
        handleRequestDeviceCode();

        // Cleanup
        return () => {
            if (popupCheckIntervalRef.current) {
                clearInterval(popupCheckIntervalRef.current);
            }
        };
    }, [searchParams, router]);

    const handleOAuthCallback = async (code: string) => {
        setLoading(true);
        setLoadingMessage('Completing authentication...');
        clearError();

        try {
            const result = await authService.handleCallback(code);

            if (result.success) {
                authSucceededRef.current = true;
                setLoadingMessage('Success! Redirecting...');
                router.push('/');
            } else {
                showError(result.error || 'Authentication failed');
            }
        } catch (err) {
            showError('An error occurred during authentication');
            console.error('OAuth callback error:', err);
        } finally {
            if (!authSucceededRef.current) {
                setLoading(false);
                setLoadingMessage('');
            }
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        setLoadingMessage('Preparing authentication...');
        clearError();
        authSucceededRef.current = false;

        try {
            const authUrl = await authService.getLoginUrl();
            const redirectAfterAuth = '/';

            // Check if we're in iOS PWA - use full Safari redirect instead of popups
            if (isIOSPWA()) {
                console.log('iOS PWA detected - redirecting OAuth flow through Safari');
                setLoadingMessage('Opening Safari...');
                openOAuthInBrowser(authUrl, redirectAfterAuth);
                return;
            }

            // For non-iOS PWAs: Open OAuth in a popup window that can be closed after auth
            if (isPWAMode) {
                console.log('Non-iOS PWA mode detected, opening popup for OAuth');
                setLoadingMessage('Opening login window...');

                const width = 600;
                const height = 700;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;

                const popup = window.open(
                    authUrl,
                    'oauth_popup',
                    `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes`
                );

                if (!popup) {
                    console.error('Popup was blocked');
                    showError('Popup was blocked. Please allow popups for this site and try again, or use Device Pairing instead.');
                    setLoading(false);
                    setLoadingMessage('');
                    return;
                }

                console.log('Popup opened successfully');
                setLoadingMessage('Waiting for authentication...');

                // Listen for messages from the popup
                const handleMessage = (event: MessageEvent) => {
                    console.log('Received message from popup:', event.data);

                    // Verify origin
                    if (event.origin !== window.location.origin) {
                        console.log('Message origin mismatch:', event.origin, 'vs', window.location.origin);
                        return;
                    }

                    if (event.data.type === 'oauth_success') {
                        console.log('OAuth success, setting tokens');
                        authSucceededRef.current = true;

                        // Clear popup check interval immediately
                        if (popupCheckIntervalRef.current) {
                            clearInterval(popupCheckIntervalRef.current);
                            popupCheckIntervalRef.current = null;
                        }

                        // Auth successful - set tokens and redirect
                        authService.setTokens(
                            event.data.accessToken,
                            event.data.refreshToken,
                            event.data.user
                        );
                        window.removeEventListener('message', handleMessage);
                        setLoadingMessage('Success! Redirecting...');

                        // Small delay before redirect to show success message
                        setTimeout(() => {
                            router.push('/');
                        }, 300);
                    } else if (event.data.type === 'oauth_error') {
                        console.error('OAuth error:', event.data.error);
                        // Auth failed
                        showError(event.data.error || 'Authentication failed');
                        window.removeEventListener('message', handleMessage);
                        setLoading(false);
                        setLoadingMessage('');
                    }
                };

                window.addEventListener('message', handleMessage);

                // Handle popup being closed manually - with race condition protection
                popupCheckIntervalRef.current = setInterval(() => {
                    if (popup && popup.closed) {
                        console.log('Popup was closed');
                        clearInterval(popupCheckIntervalRef.current!);
                        popupCheckIntervalRef.current = null;
                        window.removeEventListener('message', handleMessage);

                        // Only show error if auth didn't succeed
                        if (!authSucceededRef.current) {
                            setLoading(false);
                            setLoadingMessage('');
                            showError('Login window was closed. You can try again or use Device Pairing.');
                        }
                    }
                }, 500);

                return;
            }

            // Normal flow for non-PWA: Full page redirect
            console.log('Non-PWA mode, redirecting to:', authUrl);
            setLoadingMessage('Redirecting to Microsoft...');

            // Store current path to return after auth
            storeOAuthRedirect(redirectAfterAuth);

            window.location.href = authUrl;
        } catch (err: any) {
            console.error('Login error:', err);
            showError(err.message || 'Failed to initiate login');
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleRequestDeviceCode = async () => {
        setDeviceLoading(true);
        clearError();

        try {
            const response = await fetch('/api/auth/device/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    device_name: 'TV Dashboard'
                }),
            });

            const data = await response.json();

            if (data.success) {
                setDeviceCode(data.device_code);
                setUserCode(data.user_code);
                startPolling(data.device_code);
            } else {
                showError(data.error || 'Failed to generate device code');
            }
        } catch (err) {
            showError(`Failed to generate device code`);
            console.error('Device code error:', err);
        } finally {
            setDeviceLoading(false);
        }
    };

    const startPolling = async (deviceCode: string) => {
        let pollInterval: NodeJS.Timeout | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/auth/device/poll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ device_code: deviceCode }),
                });

                const data = await response.json();

                if (data.status === 'authorized' && data.access_token && data.refresh_token && data.user) {
                    if (pollInterval) clearInterval(pollInterval);
                    if (timeoutId) clearTimeout(timeoutId);
                    authSucceededRef.current = true;
                    setLoading(true);
                    setLoadingMessage('Device paired! Redirecting...');
                    authService.setTokens(data.access_token, data.refresh_token, data.user);
                    setTimeout(() => router.push('/'), 500);
                } else if (data.status === 'expired') {
                    if (pollInterval) clearInterval(pollInterval);
                    if (timeoutId) clearTimeout(timeoutId);
                    showError('Device code expired. Please generate a new one.');
                    setDeviceCode('');
                    setUserCode('');
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 5000); // Poll every 5 seconds

        // Stop polling after 15 minutes
        timeoutId = setTimeout(() => {
            if (pollInterval) clearInterval(pollInterval);
            if (!authSucceededRef.current) {
                showError('Device code expired. Please generate a new one.');
                setDeviceCode('');
                setUserCode('');
            }
        }, 15 * 60 * 1000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-ui-bg-primary animate-in fade-in duration-300">
                <div className="relative">
                    <Loader />
                </div>
                {loadingMessage && (
                    <p className="mt-6 text-sm text-ui-text-secondary animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingMessage}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ui-bg-primary flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-3xl sm:text-4xl font-bold text-ui-text-primary mb-2">
                        Olympia Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-ui-text-secondary">
                        Sign in to access your dashboard
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Microsoft OAuth Login */}
                    <Card className="bg-ui-bg-secondary border-ui-border-primary">
                        <CardHeader className="space-y-1 pb-4 sm:pb-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <div className="p-1.5 sm:p-2 bg-ui-accent-primary-bg rounded-lg">
                                    <FaMicrosoft className="w-5 h-5 sm:w-6 sm:h-6 text-ui-accent-primary-text" />
                                </div>
                                <CardTitle className="text-xl sm:text-2xl text-ui-text-primary">
                                    Microsoft Account
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs sm:text-sm text-ui-text-secondary">
                                Sign in with your Microsoft work account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-11 sm:h-12 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium text-sm sm:text-base transition-all duration-200"
                            >
                                <FaMicrosoft className="mr-2 h-4 w-4" />
                                {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                            </Button>
                            {/* Error message with animation */}
                            <div
                                className={`overflow-hidden transition-all duration-200 ease-out ${errorVisible && error && !deviceCode
                                        ? 'max-h-20 opacity-100 mt-3 sm:mt-4'
                                        : 'max-h-0 opacity-0 mt-0'
                                    }`}
                            >
                                <p className="text-xs sm:text-sm text-ui-danger-text break-words bg-ui-danger-bg/10 px-3 py-2 rounded-md border border-ui-danger-border/20">
                                    {error}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Device Pairing */}
                    <Card className="bg-ui-bg-secondary border-ui-border-primary">
                        <CardHeader className="space-y-1 pb-4 sm:pb-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <div className="p-1.5 sm:p-2 bg-ui-accent-secondary-bg rounded-lg">
                                    <MdDevices className="w-5 h-5 sm:w-6 sm:h-6 text-ui-accent-secondary-text" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="text-xl sm:text-2xl text-ui-text-primary">
                                        Device Pairing
                                    </CardTitle>
                                </div>
                            </div>
                            <CardDescription className="text-xs sm:text-sm text-ui-text-secondary">
                                Display dashboard on a TV or kiosk screen
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {deviceLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 sm:py-8 animate-in fade-in duration-200">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-2 border-ui-accent-secondary/20 animate-ping" />
                                        <div className="relative w-full h-full rounded-full border-2 border-ui-accent-secondary border-t-transparent animate-spin" />
                                    </div>
                                    <p className="text-ui-text-secondary mt-4 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
                                        Generating pairing code...
                                    </p>
                                </div>
                            ) : userCode ? (
                                <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-ui-bg-primary border border-ui-border-primary rounded-lg p-4 sm:p-6">
                                        {/* QR Code Section */}
                                        <div className="flex flex-col items-center mb-4 sm:mb-6">
                                            <p className="text-xs sm:text-sm text-ui-text-secondary mb-3">
                                                Scan with your phone:
                                            </p>
                                            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg">
                                                <QRCodeSVG
                                                    value={`${window.location.origin}/pair?code=${userCode}`}
                                                    size={160}
                                                    level="M"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative my-4 sm:my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-ui-border-primary"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="bg-ui-bg-primary px-2 text-ui-text-muted">
                                                    or manually enter
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-center mb-3 sm:mb-4">
                                            <p className="text-xs sm:text-sm text-ui-text-secondary mb-1">
                                                Visit on your computer:
                                            </p>
                                            <p className="text-sm sm:text-lg font-semibold text-ui-accent-primary-text font-mono break-all">
                                                {window.location.origin}/pair
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-xs sm:text-sm text-ui-text-secondary mb-2 sm:mb-3">
                                                Enter this code:
                                            </p>
                                            <div className="text-3xl sm:text-5xl font-bold text-ui-text-primary tracking-[0.3em] sm:tracking-[0.5em] font-mono py-3 sm:py-4">
                                                {userCode}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 text-xs text-ui-text-muted">
                                            <IoTimeOutline className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />
                                            <span>Expires in 15 minutes</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            setDeviceCode('');
                                            setUserCode('');
                                            handleRequestDeviceCode();
                                        }}
                                        variant="outline"
                                        className="w-full h-10 sm:h-auto border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary text-sm transition-all duration-200"
                                    >
                                        <MdRefresh className="mr-2 h-4 w-4" />
                                        Generate New Code
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-6 sm:py-8 animate-in fade-in duration-200">
                                    {/* Error state with animation */}
                                    <div
                                        className={`transition-all duration-200 ease-out ${errorVisible && error
                                                ? 'opacity-100 transform translate-y-0'
                                                : 'opacity-0 transform -translate-y-2'
                                            }`}
                                    >
                                        <p className="text-ui-danger-text mb-3 sm:mb-4 text-xs sm:text-sm break-words px-2 bg-ui-danger-bg/10 py-2 rounded-md mx-2">
                                            {error || 'Failed to generate code'}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleRequestDeviceCode}
                                        className="bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover h-10 sm:h-auto text-sm transition-all duration-200"
                                    >
                                        <MdRefresh className="mr-2 h-4 w-4" />
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
                <Loader />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
