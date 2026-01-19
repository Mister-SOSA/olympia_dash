'use client';

import { Loader } from '@/components/ui/loader';
import { MdAdminPanelSettings } from 'react-icons/md';

export function AdminLoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-ui-bg-primary">
            <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-ui-accent-primary-bg rounded-full animate-pulse">
                    <MdAdminPanelSettings className="w-12 h-12 text-ui-accent-primary-text" />
                </div>
                <Loader />
                <div className="text-center">
                    <p className="text-lg font-semibold text-ui-text-primary">Loading Admin Console</p>
                    <p className="text-sm text-ui-text-secondary mt-1">Fetching system data...</p>
                </div>
            </div>
        </div>
    );
}
