import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";

const DateTimeContent: React.FC = () => {
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

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
        let hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds} ${ampm}`;
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