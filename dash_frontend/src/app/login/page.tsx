'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { FaMicrosoft } from 'react-icons/fa';
import { MdDevices, MdRefresh } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';

export const dynamic = 'force-dynamic';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [deviceCode, setDeviceCode] = useState<string>('');
    const [userCode, setUserCode] = useState<string>('');
    const [deviceLoading, setDeviceLoading] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
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

        // Auto-generate device code on mount
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
        <div className="min-h-screen bg-ui-bg-primary flex items-center justify-center p-6">
            <div className="w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-ui-text-primary mb-2">Olympia Dashboard</h1>
                    <p className="text-ui-text-secondary">Sign in to access your dashboard</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Microsoft OAuth Login */}
                    <Card className="bg-ui-bg-secondary border-ui-border-primary">
                        <CardHeader className="space-y-1 pb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-ui-accent-primary-bg rounded-lg">
                                    <FaMicrosoft className="w-6 h-6 text-ui-accent-primary-text" />
                                </div>
                                <CardTitle className="text-2xl text-ui-text-primary">Microsoft Account</CardTitle>
                            </div>
                            <CardDescription className="text-ui-text-secondary">
                                Sign in with your Microsoft work account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-12 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium"
                            >
                                <FaMicrosoft className="mr-2 h-4 w-4" />
                                {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                            </Button>
                            {error && !deviceCode && (
                                <p className="mt-4 text-sm text-ui-danger-text">{error}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Device Pairing */}
                    <Card className="bg-ui-bg-secondary border-ui-border-primary">
                        <CardHeader className="space-y-1 pb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-ui-accent-secondary-bg rounded-lg">
                                    <MdDevices className="w-6 h-6 text-ui-accent-secondary-text" />
                                </div>
                                <CardTitle className="text-2xl text-ui-text-primary">TV Dashboard</CardTitle>
                            </div>
                            <CardDescription className="text-ui-text-secondary">
                                Display dashboard on a TV or kiosk screen
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {deviceLoading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <Loader />
                                    <p className="text-ui-text-secondary mt-4 text-sm">Generating pairing code...</p>
                                </div>
                            ) : userCode ? (
                                <div className="space-y-4">
                                    <div className="bg-ui-bg-primary border border-ui-border-primary rounded-lg p-6">
                                        <div className="text-center mb-4">
                                            <p className="text-sm text-ui-text-secondary mb-1">Visit on your computer:</p>
                                            <p className="text-lg font-semibold text-ui-accent-primary-text font-mono">
                                                {window.location.origin}/pair
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-sm text-ui-text-secondary mb-3">Enter this code:</p>
                                            <div className="text-5xl font-bold text-ui-text-primary tracking-[0.5em] font-mono py-4">
                                                {userCode}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-ui-text-muted">
                                            <IoTimeOutline className="w-4 h-4" />
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
                                        className="w-full border-ui-border-primary hover:bg-ui-bg-tertiary text-ui-text-secondary"
                                    >
                                        <MdRefresh className="mr-2 h-4 w-4" />
                                        Generate New Code
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-ui-danger-text mb-4">{error || 'Failed to generate code'}</p>
                                    <Button
                                        onClick={handleRequestDeviceCode}
                                        className="bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover"
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
