import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'ClockWidget';

const DateTimeContent: React.FC = () => {
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Use widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const clockFormat = settings.clockFormat as '12h' | '24h';
    const showSeconds = settings.showSeconds as boolean;
    const timezone = settings.timezone as string;

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);

        return () => clearInterval(interval); // Cleanup on unmount
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