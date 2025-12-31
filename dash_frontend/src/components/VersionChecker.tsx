'use client';

import { useEffect, useRef } from 'react';

const VERSION_CHECK_INTERVAL = 30000; // Check every 30 seconds

export function VersionChecker() {
    const currentVersion = useRef<string | null>(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Fetch the version with cache busting
                const res = await fetch(`/api/version?t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                const newVersion = data.version;

                if (currentVersion.current === null) {
                    // First load, just store the version
                    currentVersion.current = newVersion;
                    console.log('[VersionChecker] Initial version:', newVersion);
                } else if (currentVersion.current !== newVersion) {
                    // Version changed, reload the page
                    console.log('[VersionChecker] New version detected:', newVersion, '- reloading...');
                    window.location.reload();
                }
            } catch (error) {
                // Silently fail - don't want to spam console on network issues
            }
        };

        // Check immediately on mount
        checkVersion();

        // Then check periodically
        const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    return null; // This component doesn't render anything
}
