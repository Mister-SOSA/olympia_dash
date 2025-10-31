'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';

export default function PairPage() {
    const router = useRouter();
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            if (authService.isAuthenticated()) {
                setIsAuthenticated(true);
            }
            setCheckingAuth(false);
        };

        checkAuth();
    }, []);

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white">Authentication Required</CardTitle>
                        <CardDescription className="text-slate-400">
                            You must sign in before pairing a device
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? 'Redirecting...' : 'Sign in with Microsoft'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-green-400">Success!</CardTitle>
                        <CardDescription className="text-slate-400">
                            Device paired successfully
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">
                            Your device has been paired. The TV dashboard will now authenticate automatically.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
            <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-2xl text-white">Pair Device</CardTitle>
                    <CardDescription className="text-slate-400">
                        Enter the code displayed on your TV dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePair} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="userCode" className="text-slate-300">
                                Pairing Code
                            </Label>
                            <Input
                                id="userCode"
                                type="text"
                                placeholder="ABC123"
                                value={userCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="text-center text-2xl font-mono tracking-widest uppercase bg-slate-900/50 border-slate-700 text-white"
                                disabled={loading}
                            />
                            <p className="text-xs text-slate-400">
                                Enter the 6-character code shown on your TV
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || userCode.length !== 6}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {loading ? 'Pairing...' : 'Pair Device'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
