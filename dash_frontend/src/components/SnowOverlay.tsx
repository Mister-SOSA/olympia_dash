'use client';

import Snowfall from 'react-snowfall';
import { useAppSettings } from '@/contexts/SettingsContext';
import { useEffect, useState } from 'react';

/**
 * ChristmasOverlay Component
 * 
 * A festive snow overlay for the dashboard.
 * Can be toggled in Settings > Appearance > Christmas Mode
 * 
 * Features:
 * - Gentle falling snow animation
 * - Twinkling Christmas lights border
 * - User-controllable via settings (syncs across devices)
 */

function ChristmasLights() {
    const [lights, setLights] = useState<{ color: string; delay: number; left: number }[]>([]);

    useEffect(() => {
        // Generate random light positions along the top edge
        const lightColors = ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff6600', '#ff00ff', '#00ffff'];
        const generatedLights = Array.from({ length: 30 }, (_, i) => ({
            color: lightColors[Math.floor(Math.random() * lightColors.length)],
            delay: Math.random() * 2,
            left: (i / 29) * 100, // Evenly distributed
        }));
        setLights(generatedLights);
    }, []);

    return (
        <>
            {/* Top border lights */}
            <div className="fixed top-0 left-0 right-0 h-3 pointer-events-none z-[9999]">
                {lights.map((light, i) => (
                    <div
                        key={i}
                        className="absolute top-0 w-2 h-2 rounded-full animate-twinkle"
                        style={{
                            left: `${light.left}%`,
                            backgroundColor: light.color,
                            boxShadow: `0 0 10px ${light.color}, 0 0 20px ${light.color}`,
                            animationDelay: `${light.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* CSS for twinkling animation */}
            <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }
      `}</style>
        </>
    );
}

export function SnowOverlay() {
    const { snowEffect } = useAppSettings();

    if (!snowEffect) {
        return null;
    }

    return (
        <>
            {/* Snow effect */}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                <Snowfall
                    snowflakeCount={100}
                    color="#ffffff"
                    style={{
                        position: 'fixed',
                        width: '100vw',
                        height: '100vh',
                        opacity: 0.6,
                    }}
                />
            </div>

            {/* Christmas lights */}
            <ChristmasLights />
        </>
    );
}
