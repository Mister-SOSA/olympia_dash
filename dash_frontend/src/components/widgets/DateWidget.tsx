import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";

const DateContent: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

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
            const newFontSize = `${Math.max(16, Math.floor(width / 13))}px`;
            setFontSize(newFontSize);
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        return date.toLocaleDateString(undefined, options);
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
            apiEndpoint={null} // No fetching needed
            payload={null}     // No payload needed
            title=""
            updateInterval={undefined} // No updates triggered from Widget
            render={() => <DateContent />} // Directly render the DateContent
        />
    );
};

export default DateWidget;
