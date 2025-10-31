'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Loader } from '@/components/ui/loader';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            if (error) {
                setError(errorDescription || error);
                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            if (!code) {
                setError('No authorization code received');
                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            try {
                const response = await authService.handleCallback(code);

                if (response.success) {
                    // Redirect to dashboard
                    router.push('/');
                } else {
                    setError(response.error || 'Authentication failed');
                    setTimeout(() => router.push('/login'), 3000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                setError('An error occurred during authentication');
                setTimeout(() => router.push('/login'), 3000);
            }
        };

        handleCallback();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="bg-slate-900 border border-red-500 rounded-lg p-8 max-w-md">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
                    <p className="text-slate-300 mb-4">{error}</p>
                    <p className="text-slate-400 text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
            <Loader />
            <p className="text-slate-300 mt-4">Completing authentication...</p>
        </div>
    );
}
