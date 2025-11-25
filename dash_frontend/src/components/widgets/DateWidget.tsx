import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'DateWidget';

const DateContent: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Use widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const dateFormat = settings.dateFormat as string;
    const showWeekday = settings.showDayOfWeek as boolean;

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width } = entry.contentRect;

            // Adjust font size based on width
            const newFontSize = `${Math.max(48, Math.floor(width / 12))}px`;
            setFontSize(newFontSize);
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const getDateFormatOptions = (): Intl.DateTimeFormatOptions => {
        const options: Intl.DateTimeFormatOptions = {};

        if (showWeekday) {
            options.weekday = 'long';
        }

        // Map date format strings to Intl options
        switch (dateFormat) {
            case 'MM/DD/YYYY':
                options.month = '2-digit';
                options.day = '2-digit';
                options.year = 'numeric';
                break;
            case 'DD/MM/YYYY':
                options.month = '2-digit';
                options.day = '2-digit';
                options.year = 'numeric';
                break;
            case 'YYYY-MM-DD':
                options.year = 'numeric';
                options.month = '2-digit';
                options.day = '2-digit';
                break;
            case 'DD MMM YYYY':
                options.day = 'numeric';
                options.month = 'short';
                options.year = 'numeric';
                break;
            case 'MMMM DD, YYYY':
                options.month = 'long';
                options.day = 'numeric';
                options.year = 'numeric';
                break;
            default: // 'MMM DD, YYYY'
                options.month = 'short';
                options.day = 'numeric';
                options.year = 'numeric';
                break;
        }

        return options;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString(undefined, getDateFormatOptions());
    };

    return (
        <div ref={containerRef} className="widget-container" style={{ width: "100%", height: "100%" }}>
            <div className="date" style={{ fontSize, textAlign: "center", whiteSpace: "nowrap" }}>
                {formatDate(currentDate)}
            </div>
        </div>
    );
};

const DateWidget: React.FC = () => {
    return (
        <Widget
            endpoint={undefined} // No fetching needed
            payload={undefined}  // No payload needed
            title=""
            refreshInterval={undefined} // No updates triggered from Widget
        >
            {() => <DateContent />}
        </Widget>
    );
};

export default DateWidget;