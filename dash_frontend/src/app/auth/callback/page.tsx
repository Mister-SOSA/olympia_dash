'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Loader } from '@/components/ui/loader';
import { getOAuthRedirect } from '@/utils/pwaUtils';

const isOAuthPopupContext = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.name === 'oauth_popup' && !!window.opener;
};

export const dynamic = 'force-dynamic';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            if (error) {
                setError(errorDescription || error);
                const inPopup = isOAuthPopupContext();

                // If we're in a popup (from PWA), close it and notify parent
                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: errorDescription || error
                    }, window.location.origin);
                    window.close();
                    return;
                }

                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            if (!code) {
                setError('No authorization code received');
                const inPopup = isOAuthPopupContext();

                // If we're in a popup, close it
                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: 'No authorization code received'
                    }, window.location.origin);
                    window.close();
                    return;
                }

                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            try {
                const response = await authService.handleCallback(code);
                const inPopup = isOAuthPopupContext();

                if (response.success) {
                    // If we're in a popup (from PWA), notify parent and close
                    if (inPopup) {
                        window.opener?.postMessage({
                            type: 'oauth_success',
                            accessToken: response.access_token,
                            refreshToken: response.refresh_token,
                            user: response.user
                        }, window.location.origin);

                        // Give parent time to receive message before closing
                        setTimeout(() => window.close(), 500);
                        return;
                    }

                    // Normal flow - not in popup
                    const storedRedirect = getOAuthRedirect();
                    const redirectTo = storedRedirect !== '/' ? storedRedirect : (state || '/');

                    setTimeout(() => {
                        router.push(redirectTo);
                    }, 100);
                } else {
                    setError(response.error || 'Authentication failed');

                    if (inPopup) {
                        window.opener?.postMessage({
                            type: 'oauth_error',
                            error: response.error || 'Authentication failed'
                        }, window.location.origin);
                        window.close();
                        return;
                    }

                    setTimeout(() => router.push('/login'), 3000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                const errorMsg = 'An error occurred during authentication';
                setError(errorMsg);
                const inPopup = isOAuthPopupContext();

                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: errorMsg
                    }, window.location.origin);
                    window.close();
                    return;
                }

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

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader />
                <p className="text-slate-300 mt-4">Loading...</p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
