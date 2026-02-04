'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { FaMicrosoft } from 'react-icons/fa';
import { MdDevices, MdRefresh } from 'react-icons/md';
import { IoTimeOutline } from 'react-icons/io5';
import { HiOutlineQrCode } from 'react-icons/hi2';
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
    const [activeTab, setActiveTab] = useState<'microsoft' | 'device'>('microsoft');

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

    // Track if API is unavailable to avoid repeated requests
    const [apiUnavailable, setApiUnavailable] = useState(false);
    const deviceCodeRequestedRef = useRef(false);

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

        // Auto-generate device code on mount (only once)
        if (!deviceCodeRequestedRef.current) {
            deviceCodeRequestedRef.current = true;
            handleRequestDeviceCode();
        }

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
            // Check if it's a network error (API unavailable)
            if (err.message?.includes('fetch') || err.name === 'TypeError') {
                setApiUnavailable(true);
                showError('Unable to connect to server. Please check that the API is running.');
            } else {
                showError(err.message || 'Failed to initiate login');
            }
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleRequestDeviceCode = async () => {
        // Don't retry if we already know API is unavailable
        if (apiUnavailable) return;

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
                setApiUnavailable(false);
                setDeviceCode(data.device_code);
                setUserCode(data.user_code);
                startPolling(data.device_code);
            } else {
                showError(data.error || 'Failed to generate device code');
            }
        } catch (err) {
            setApiUnavailable(true);
            showError('Unable to connect to server. Please check that the API is running.');
            console.error('Device code error:', err);
        } finally {
            setDeviceLoading(false);
        }
    };

    const startPolling = async (deviceCode: string) => {
        let pollInterval: NodeJS.Timeout | null = null;
        let timeoutId: NodeJS.Timeout | null = null;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 3;

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
                consecutiveErrors = 0; // Reset on successful response

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
                consecutiveErrors++;
                console.error('Polling error:', err);

                // Stop polling after too many consecutive errors (API likely down)
                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    if (pollInterval) clearInterval(pollInterval);
                    if (timeoutId) clearTimeout(timeoutId);
                    setApiUnavailable(true);
                    showError('Lost connection to server. Click "Generate New Code" to retry.');
                    setDeviceCode('');
                    setUserCode('');
                }
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
                <Loader />
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
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <img
                        src="/icon-512.png"
                        alt="Olympia"
                        className="w-16 h-16 rounded-2xl"
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-ui-text-primary mb-2">Sign in</h1>
                    <p className="text-sm text-ui-text-secondary">Choose how you'd like to sign in</p>
                </div>

                {/* Mobile Tab Switcher */}
                <div className="sm:hidden flex gap-1 p-1 bg-ui-bg-secondary rounded-lg mb-6 border border-ui-border-primary">
                    <button
                        onClick={() => setActiveTab('microsoft')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'microsoft'
                            ? 'bg-ui-bg-tertiary text-ui-text-primary'
                            : 'text-ui-text-muted hover:text-ui-text-secondary'
                            }`}
                    >
                        <FaMicrosoft className="w-4 h-4" />
                        Microsoft
                    </button>
                    <button
                        onClick={() => setActiveTab('device')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'device'
                            ? 'bg-ui-bg-tertiary text-ui-text-primary'
                            : 'text-ui-text-muted hover:text-ui-text-secondary'
                            }`}
                    >
                        <MdDevices className="w-4 h-4" />
                        Device Pair
                    </button>
                </div>

                {/* Login Methods */}
                <div className="space-y-4">
                    {/* Microsoft Login */}
                    <div className={`${activeTab !== 'microsoft' ? 'hidden sm:block' : ''}`}>
                        <div className="p-5 rounded-xl bg-ui-bg-secondary border border-ui-border-primary">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-ui-accent-primary-bg flex items-center justify-center flex-shrink-0">
                                    <FaMicrosoft className="w-5 h-5 text-ui-accent-primary-text" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-ui-text-primary">Microsoft Account</h3>
                                    <p className="text-xs text-ui-text-muted">Sign in with your work account</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleLogin}
                                disabled={loading}
                                className="w-full h-11 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium transition-colors"
                            >
                                <FaMicrosoft className="mr-2 h-4 w-4" />
                                Continue with Microsoft
                            </Button>

                            {/* Error Message */}
                            <div
                                className={`overflow-hidden transition-all duration-200 ease-out ${errorVisible && error && !deviceCode
                                    ? 'max-h-20 opacity-100 mt-4'
                                    : 'max-h-0 opacity-0 mt-0'
                                    }`}
                            >
                                <p className="text-sm text-ui-danger-text bg-ui-danger-bg/10 px-3 py-2 rounded-md border border-ui-danger-border/20">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Divider - Desktop only */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex-1 h-px bg-ui-border-primary" />
                        <span className="text-xs text-ui-text-muted uppercase">or</span>
                        <div className="flex-1 h-px bg-ui-border-primary" />
                    </div>

                    {/* Device Pairing */}
                    <div className={`${activeTab !== 'device' ? 'hidden sm:block' : ''}`}>
                        <div className="p-5 rounded-xl bg-ui-bg-secondary border border-ui-border-primary">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-ui-accent-secondary-bg flex items-center justify-center flex-shrink-0">
                                    <HiOutlineQrCode className="w-5 h-5 text-ui-accent-secondary-text" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-ui-text-primary">Device Pairing</h3>
                                    <p className="text-xs text-ui-text-muted">For TVs, kiosks & shared displays</p>
                                </div>
                            </div>

                            {deviceLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-200">
                                    <Loader />
                                    <p className="text-ui-text-secondary mt-4 text-sm">
                                        Generating pairing code...
                                    </p>
                                </div>
                            ) : userCode ? (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* QR Code Section */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start bg-ui-bg-tertiary p-4 rounded-lg">
                                        <div className="bg-white p-2 rounded-lg flex-shrink-0">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/pair?code=${userCode}`}
                                                size={100}
                                                level="M"
                                            />
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <p className="text-xs text-ui-text-muted mb-1">
                                                Scan QR code or visit:
                                            </p>
                                            <p className="text-sm font-mono text-ui-accent-primary-text font-medium mb-3 break-all">
                                                {window.location.origin}/pair
                                            </p>
                                            <p className="text-xs text-ui-text-muted mb-1">Enter code:</p>
                                            <div className="text-2xl font-bold text-ui-text-primary tracking-[0.2em] font-mono">
                                                {userCode}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-ui-text-muted">
                                            <IoTimeOutline className="w-4 h-4" />
                                            <span>Expires in 15 minutes</span>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setDeviceCode('');
                                                setUserCode('');
                                                setApiUnavailable(false);
                                                deviceCodeRequestedRef.current = false;
                                                handleRequestDeviceCode();
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="text-ui-text-muted hover:text-ui-text-primary"
                                        >
                                            <MdRefresh className="mr-1 h-4 w-4" />
                                            Refresh
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2 animate-in fade-in duration-200">
                                    {errorVisible && error && (
                                        <p className="text-sm text-ui-danger-text bg-ui-danger-bg/10 px-3 py-2 rounded-md border border-ui-danger-border/20 mb-4">
                                            {error || 'Failed to generate code'}
                                        </p>
                                    )}
                                    <Button
                                        onClick={() => {
                                            setApiUnavailable(false);
                                            deviceCodeRequestedRef.current = false;
                                            handleRequestDeviceCode();
                                        }}
                                        className="bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white"
                                    >
                                        <MdRefresh className="mr-2 h-4 w-4" />
                                        Generate Pairing Code
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
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

