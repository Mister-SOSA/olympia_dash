'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { FaMicrosoft } from 'react-icons/fa';
import { MdCheckCircle } from 'react-icons/md';

export const dynamic = 'force-dynamic';

function PairContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [autoSubmit, setAutoSubmit] = useState(false);

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            if (authService.isAuthenticated()) {
                setIsAuthenticated(true);
            }
            setCheckingAuth(false);
        };

        checkAuth();

        // Check for code parameter in URL
        const codeParam = searchParams.get('code');
        if (codeParam) {
            setUserCode(codeParam.toUpperCase());
            // Auto-submit if code is valid
            if (codeParam.length === 6) {
                setAutoSubmit(true);
            }
        }
    }, [searchParams]);

    // Auto-submit effect when code is set from QR scan
    useEffect(() => {
        if (autoSubmit && userCode.length === 6 && isAuthenticated && !loading) {
            handlePairAutomatic();
        }
    }, [autoSubmit, userCode, isAuthenticated, loading]);

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const authUrl = await authService.getLoginUrl(`/pair`);
            window.location.href = authUrl;
        } catch (err: any) {
            setError(err.message || 'Failed to initiate login');
            setLoading(false);
        }
    };

    const handlePairAutomatic = async () => {
        if (!userCode || userCode.length !== 6) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authService.fetchWithAuth('/api/auth/device/pair', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_code: userCode.toUpperCase() }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                setError(data.error || 'Failed to pair device');
                setAutoSubmit(false); // Allow manual retry
            }
        } catch (err) {
            setError('An error occurred while pairing the device');
            console.error('Pairing error:', err);
            setAutoSubmit(false); // Allow manual retry
        } finally {
            setLoading(false);
        }
    };

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userCode || userCode.length !== 6) {
            setError('Please enter a valid 6-character code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authService.fetchWithAuth('/api/auth/device/pair', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_code: userCode.toUpperCase() }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                setError(data.error || 'Failed to pair device');
            }
        } catch (err) {
            setError('An error occurred while pairing the device');
            console.error('Pairing error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary p-4">
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
                        <h1 className="text-2xl font-bold text-ui-text-primary mb-2">Sign in Required</h1>
                        <p className="text-sm text-ui-text-secondary">You must sign in before pairing a device</p>
                    </div>

                    {/* Sign in card */}
                    <div className="p-5 rounded-xl bg-ui-bg-secondary border border-ui-border-primary">
                        <Button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full h-11 bg-ui-accent-primary hover:bg-ui-accent-primary-hover text-white font-medium transition-colors"
                        >
                            <FaMicrosoft className="mr-2 h-4 w-4" />
                            {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <img
                            src="/icon-512.png"
                            alt="Olympia"
                            className="w-16 h-16 rounded-2xl"
                        />
                    </div>

                    {/* Success card */}
                    <div className="p-6 rounded-xl bg-ui-bg-secondary border border-ui-border-primary text-center">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <MdCheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                        <h1 className="text-xl font-bold text-ui-text-primary mb-2">Device Paired!</h1>
                        <p className="text-sm text-ui-text-secondary">
                            Your device has been paired successfully. The dashboard will now authenticate automatically.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary p-4">
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
                    <h1 className="text-2xl font-bold text-ui-text-primary mb-2">Pair Device</h1>
                    <p className="text-sm text-ui-text-secondary">Enter the code displayed on your TV dashboard</p>
                </div>

                {/* Pair form */}
                <div className="p-5 rounded-xl bg-ui-bg-secondary border border-ui-border-primary">
                    <form onSubmit={handlePair} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="userCode" className="text-sm font-medium text-ui-text-primary">
                                Pairing Code
                            </label>
                            <Input
                                id="userCode"
                                type="text"
                                placeholder="ABC123"
                                value={userCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="text-center text-2xl font-mono tracking-widest uppercase h-14"
                                disabled={loading}
                            />
                            <p className="text-xs text-ui-text-muted">
                                Enter the 6-character code shown on your TV
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-ui-danger-text bg-ui-danger-bg/10 px-3 py-2 rounded-md border border-ui-danger-border/20">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || userCode.length !== 6}
                            className="w-full h-11 bg-ui-accent-secondary hover:bg-ui-accent-secondary-hover text-white font-medium transition-colors"
                        >
                            {loading ? 'Pairing...' : 'Pair Device'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function PairPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
                <Loader />
            </div>
        }>
            <PairContent />
        </Suspense>
    );
}
