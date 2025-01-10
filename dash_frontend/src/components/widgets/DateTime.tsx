import React, { useState, useEffect } from "react";
import Widget from "./Widget";

/* -------------------------------------- */
/* 📅 DateTimeWidget Component            */
/* -------------------------------------- */

const DateTimeContent = () => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        };
        return date.toLocaleDateString(undefined, options);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    return (
        <div style={{ textAlign: "center", padding: "20px", fontSize: "1.5rem" }}>
            <div style={{ marginBottom: "10px" }}>{formatDate(currentDateTime)}</div>
            <div style={{ fontWeight: "bold" }}>{formatTime(currentDateTime)}</div>
        </div>
    );
};

export default function DateTimeWidget() {
    return (
        <Widget
            apiEndpoint={null} // No fetching needed
            payload={null}     // No payload needed
            title="Current Date & Time"
            updateInterval={null} // No updates triggered from Widget
            render={() => <DateTimeContent />} // Directly render the DateTimeContent
        />
    );
}