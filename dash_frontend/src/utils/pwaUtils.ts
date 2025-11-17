/**
 * Utility functions for Progressive Web App (PWA) detection and handling
 */

/**
 * Check if the app is running in iOS standalone mode (added to home screen)
 */
export const isIOSPWA = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches;
    
    return isIOS && isStandalone;
};

/**
 * Check if running in any PWA/standalone mode (iOS or Android)
 */
export const isPWA = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    return (window.navigator as any).standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
};

/**
 * Check if running on iOS (PWA or browser)
 */
export const isIOS = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Store the redirect URL in sessionStorage before OAuth
 * This ensures we can return to the app after OAuth completes
 */
export const storeOAuthRedirect = (redirectUrl: string = '/'): void => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_redirect', redirectUrl);
    }
};

/**
 * Get and clear the stored OAuth redirect URL
 */
export const getOAuthRedirect = (): string => {
    if (typeof window === 'undefined') return '/';
    
    const redirect = sessionStorage.getItem('oauth_redirect') || '/';
    sessionStorage.removeItem('oauth_redirect');
    return redirect;
};

/**
 * For iOS PWA: Open OAuth in Safari browser (which will redirect back to PWA)
 * This prevents the browser-within-PWA issue
 */
export const openOAuthInBrowser = (authUrl: string): void => {
    if (typeof window === 'undefined') return;
    
    // Store where we want to go after OAuth
    storeOAuthRedirect(window.location.pathname);
    
    // For iOS PWA, use target="_blank" which opens in Safari
    // The OAuth callback URL should be the PWA URL scheme if registered,
    // or a universal link that redirects back to the PWA
    window.location.href = authUrl;
};
