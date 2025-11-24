import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { preferencesService } from "@/lib/preferences";
import { DATETIME_SETTINGS } from "@/constants/settings";

const DateTimeContent: React.FC = () => {
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Subscribe to settings changes
    const [clockFormat, setClockFormat] = useState<'12h' | '24h'>(
        preferencesService.get(DATETIME_SETTINGS.clockFormat.key, DATETIME_SETTINGS.clockFormat.default) as '12h' | '24h'
    );
    const [showSeconds, setShowSeconds] = useState<boolean>(
        preferencesService.get(DATETIME_SETTINGS.showSeconds.key, DATETIME_SETTINGS.showSeconds.default) as boolean
    );
    const [timezone, setTimezone] = useState<string>(
        preferencesService.get(DATETIME_SETTINGS.timezone.key, DATETIME_SETTINGS.timezone.default) as string
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    // Subscribe to preference changes
    useEffect(() => {
        const unsubscribe = preferencesService.subscribe(() => {
            setClockFormat(preferencesService.get(DATETIME_SETTINGS.clockFormat.key, DATETIME_SETTINGS.clockFormat.default) as '12h' | '24h');
            setShowSeconds(preferencesService.get(DATETIME_SETTINGS.showSeconds.key, DATETIME_SETTINGS.showSeconds.default) as boolean);
            setTimezone(preferencesService.get(DATETIME_SETTINGS.timezone.key, DATETIME_SETTINGS.timezone.default) as string);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width } = entry.contentRect;
            const newFontSize = `${Math.max(16, Math.floor(width / 7))}px`;
            setFontSize(newFontSize);
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const formatTime = (time: Date): string => {
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: clockFormat === '12h',
        };

        if (showSeconds) {
            options.second = '2-digit';
        }

        return new Intl.DateTimeFormat('en-US', options).format(time);
    };

    return (
        <div ref={containerRef} className="widget-container" style={{ width: "100%", height: "100%" }}>
            <div className="time" style={{ fontSize, textAlign: "center", whiteSpace: "nowrap" }}>
                {formatTime(currentDateTime)}
            </div>
        </div>
    );
};

const ClockWidget: React.FC = () => {
    return (
        <Widget
            endpoint={undefined} // No fetching needed
            payload={undefined}  // No payload needed
            title=""
            refreshInterval={undefined} // No updates triggered from Widget
        >
            {() => <DateTimeContent />}
        </Widget>
    );
};

export default ClockWidget;