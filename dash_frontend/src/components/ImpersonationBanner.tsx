'use client';

import { authService } from '@/lib/auth';
import { MdPerson, MdClose, MdWarning } from 'react-icons/md';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

interface ImpersonationBannerProps {
    onEndImpersonation: () => void;
}

export function ImpersonationBanner({ onEndImpersonation }: ImpersonationBannerProps) {
    const impersonatedUser = authService.getImpersonatedUser();
    const adminUser = authService.getAdminUser();
    const router = useRouter();

    if (!impersonatedUser || !adminUser) {
        return null;
    }

    const handleEndImpersonation = async () => {
        console.log('🎭 Exit impersonation button clicked');
        const success = await authService.endImpersonation();
        if (success) {
            console.log('✅ Ending impersonation, redirecting to admin panel...');
            onEndImpersonation();
            // Force reload to ensure clean state
            window.location.href = '/admin';
        } else {
            console.error('❌ Failed to end impersonation');
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-ui-bg-tertiary/80 px-3 py-1.5 rounded-lg">
                        <MdWarning className="h-5 w-5 animate-pulse" />
                        <span className="font-bold text-sm">IMPERSONATION MODE</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <MdPerson className="h-4 w-4" />
                        <span>Viewing as:</span>
                        <span className="font-semibold">{impersonatedUser.name}</span>
                        <span className="text-white/70">({impersonatedUser.email})</span>
                    </div>

                    <div className="text-white/50 text-xs">
                        |
                    </div>

                    <div className="text-sm text-white/80">
                        Admin: <span className="font-medium">{adminUser.name}</span>
                    </div>
                </div>

                <Button
                    onClick={handleEndImpersonation}
                    size="sm"
                    className="bg-ui-bg-tertiary/80 hover:bg-ui-bg-quaternary text-ui-text-primary border-ui-border-primary"
                    variant="outline"
                >
                    <MdClose className="mr-2 h-4 w-4" />
                    Exit Impersonation
                </Button>
            </div>
        </div>
    );
}

