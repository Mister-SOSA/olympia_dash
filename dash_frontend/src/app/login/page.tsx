'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { FaMicrosoft } from 'react-icons/fa';
import { MdDevices, MdRefresh, MdWarning } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { isIOSPWA, isPWA } from '@/utils/pwaUtils';

export const dynamic = 'force-dynamic';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [userCode, setUserCode] = useState<string>('');
    const [deviceLoading, setDeviceLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [isPWAMode, setIsPWAMode] = useState(false);

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
    }, [searchParams, router]);

    const handleOAuthCallback = async (code: string) => {
        setLoading(true);
        setError('');

        try {
            const result = await authService.handleCallback(code);

            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Authentication failed');
            }
        } catch (err) {
            setError('An error occurred during authentication');
            console.error('OAuth callback error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const authUrl = await authService.getLoginUrl();

            // For iOS PWA: OAuth redirect creates a browser-in-app issue
            // Show warning instead
            if (isIOSPWA()) {
                setError('OAuth login not recommended in iOS web app mode. Please use Device Pairing instead.');
                setLoading(false);
                return;
            }

            // Store current path to return after auth
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('oauth_redirect', '/');
            }

            window.location.href = authUrl;
        } catch (err: any) {
            setError(err.message || 'Failed to initiate login');
            setLoading(false);
        }
    };

    const handleRequestDeviceCode = async () => {
        setDeviceLoading(true);
        setError('');

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
                setError(data.error || 'Failed to generate device code');
            }
        } catch (err) {
            setError(`Failed to generate device code: ${err}`);
            console.error('Device code error:', err);
        } finally {
            setDeviceLoading(false);
        }
    };

    const startPolling = async (deviceCode: string) => {
        const pollInterval = setInterval(async () => {
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
                    clearInterval(pollInterval);
                    authService.setTokens(data.access_token, data.refresh_token, data.user);
                    router.push('/');
                } else if (data.status === 'expired') {
                    clearInterval(pollInterval);
                    setError('Device code expired. Please generate a new one.');
                    setDeviceCode('');
                    setUserCode('');
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 5000); // Poll every 5 seconds

        // Stop polling after 15 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            setError('Device code expired. Please generate a new one.');
            setDeviceCode('');
            setUserCode('');
        }, 15 * 60 * 1000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
                <Loader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ui-bg-primary flex items-center justify-center p-4 sm:p-6">
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

                {/* iOS PWA Warning Banner */}
                {isPWAMode && (
                    <div className="mb-6 sm:mb-8 bg-amber-500/10 border border-amber-500/50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <MdWarning className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-base text-amber-500 font-semibold mb-1">
                                    Web App Mode Detected
                                </h3>
                                <p className="text-xs sm:text-sm text-ui-text-secondary">
                                    For the best experience in web app mode, use <strong>Device Pairing</strong> instead of Microsoft OAuth login.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Microsoft OAuth Login */}
                    <Card className={`bg-ui-bg-secondary border-ui-border-primary ${isPWAMode ? 'opacity-60' : ''}`}>
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
                                {isPWAMode && (
                                    <span className="block mt-2 text-amber-500 text-xs font-medium">
                                        ⚠️ Not recommended in web app mode
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-11 sm:h-12 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium text-sm sm:text-base"
                            >
                                <FaMicrosoft className="mr-2 h-4 w-4" />
                                {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                            </Button>
                            {error && !deviceCode && (
                                <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-ui-danger-text break-words">
                                    {error}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Device Pairing */}
                    <Card className={`bg-ui-bg-secondary border-ui-border-primary ${isPWAMode ? 'ring-2 ring-ui-accent-secondary' : ''}`}>
                        <CardHeader className="space-y-1 pb-4 sm:pb-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <div className="p-1.5 sm:p-2 bg-ui-accent-secondary-bg rounded-lg">
                                    <MdDevices className="w-5 h-5 sm:w-6 sm:h-6 text-ui-accent-secondary-text" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="text-xl sm:text-2xl text-ui-text-primary flex items-center flex-wrap gap-2">
                                        <span>Device Pairing</span>
                                        {isPWAMode && (
                                            <span className="text-xs font-normal text-ui-accent-secondary-text whitespace-nowrap">
                                                ✓ Recommended
                                            </span>
                                        )}
                                    </CardTitle>
                                </div>
                            </div>
                            <CardDescription className="text-xs sm:text-sm text-ui-text-secondary">
                                {isPWAMode
                                    ? 'Perfect for web app mode - pair this device with your account'
                                    : 'Display dashboard on a TV or kiosk screen'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {deviceLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                                    <Loader />
                                    <p className="text-ui-text-secondary mt-4 text-xs sm:text-sm">
                                        Generating pairing code...
                                    </p>
                                </div>
                            ) : userCode ? (
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="bg-ui-bg-primary border border-ui-border-primary rounded-lg p-4 sm:p-6">
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
                                            <IoTimeOutline className="w-3 h-3 sm:w-4 sm:h-4" />
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
                                        className="w-full h-10 sm:h-auto border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary text-sm"
                                    >
                                        <MdRefresh className="mr-2 h-4 w-4" />
                                        Generate New Code
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-6 sm:py-8">
                                    <p className="text-ui-danger-text mb-3 sm:mb-4 text-xs sm:text-sm break-words px-2">
                                        {error || 'Failed to generate code'}
                                    </p>
                                    <Button
                                        onClick={handleRequestDeviceCode}
                                        className="bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover h-10 sm:h-auto text-sm"
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
