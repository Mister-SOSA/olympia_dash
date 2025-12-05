'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { Loader } from '@/components/ui/loader';
import { getOAuthRedirect } from '@/utils/pwaUtils';
import { MdCheckCircle, MdError } from 'react-icons/md';

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
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [statusMessage, setStatusMessage] = useState('Completing authentication...');
    const processedRef = useRef(false);

    useEffect(() => {
        // Prevent double processing
        if (processedRef.current) return;
        processedRef.current = true;

        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            if (error) {
                const errorMsg = errorDescription || error;
                setError(errorMsg);
                setStatus('error');
                setStatusMessage('Authentication failed');
                const inPopup = isOAuthPopupContext();

                // If we're in a popup (from PWA), close it and notify parent
                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: errorMsg
                    }, window.location.origin);
                    setTimeout(() => window.close(), 1500);
                    return;
                }

                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            if (!code) {
                const errorMsg = 'No authorization code received';
                setError(errorMsg);
                setStatus('error');
                setStatusMessage('Authentication failed');
                const inPopup = isOAuthPopupContext();

                // If we're in a popup, close it
                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: errorMsg
                    }, window.location.origin);
                    setTimeout(() => window.close(), 1500);
                    return;
                }

                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            try {
                setStatusMessage('Verifying credentials...');
                const response = await authService.handleCallback(code);
                const inPopup = isOAuthPopupContext();

                if (response.success) {
                    setStatus('success');
                    setStatusMessage('Success! Redirecting...');

                    // If we're in a popup (from PWA), notify parent and close
                    if (inPopup) {
                        window.opener?.postMessage({
                            type: 'oauth_success',
                            accessToken: response.access_token,
                            refreshToken: response.refresh_token,
                            user: response.user
                        }, window.location.origin);

                        // Give parent time to receive message before closing
                        setTimeout(() => window.close(), 800);
                        return;
                    }

                    // Normal flow - not in popup
                    const storedRedirect = getOAuthRedirect();
                    const redirectTo = storedRedirect !== '/' ? storedRedirect : (state || '/');

                    setTimeout(() => {
                        router.push(redirectTo);
                    }, 500);
                } else {
                    const errorMsg = response.error || 'Authentication failed';
                    setError(errorMsg);
                    setStatus('error');
                    setStatusMessage('Authentication failed');

                    if (inPopup) {
                        window.opener?.postMessage({
                            type: 'oauth_error',
                            error: errorMsg
                        }, window.location.origin);
                        setTimeout(() => window.close(), 1500);
                        return;
                    }

                    setTimeout(() => router.push('/login'), 3000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                const errorMsg = 'An error occurred during authentication';
                setError(errorMsg);
                setStatus('error');
                setStatusMessage('Authentication failed');
                const inPopup = isOAuthPopupContext();

                if (inPopup) {
                    window.opener?.postMessage({
                        type: 'oauth_error',
                        error: errorMsg
                    }, window.location.origin);
                    setTimeout(() => window.close(), 1500);
                    return;
                }

                setTimeout(() => router.push('/login'), 3000);
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ui-bg-primary">
            <div className="flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                {status === 'loading' && (
                    <>
                        <div className="relative">
                            <Loader />
                        </div>
                        <p className="text-ui-text-secondary mt-6 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {statusMessage}
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-ui-success-bg/20 flex items-center justify-center mb-4">
                            <MdCheckCircle className="w-10 h-10 text-ui-success-text" />
                        </div>
                        <p className="text-ui-text-primary font-medium text-lg">{statusMessage}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center max-w-md animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-ui-danger-bg/20 flex items-center justify-center mb-4">
                            <MdError className="w-10 h-10 text-ui-danger-text" />
                        </div>
                        <h2 className="text-xl font-bold text-ui-text-primary mb-2">{statusMessage}</h2>
                        <p className="text-ui-text-secondary text-sm text-center mb-4 px-4">{error}</p>
                        <p className="text-ui-text-muted text-xs">Redirecting to login...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-ui-bg-primary">
                <Loader />
                <p className="text-ui-text-secondary mt-6 text-sm animate-in fade-in duration-300">
                    Loading...
                </p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
