import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import config from "@/config";
import { IoWater, IoWaterSharp } from "react-icons/io5";

/* -------------------------------------- */
/* Widget Metadata                        */
/* -------------------------------------- */
export const humidityWidgetMeta = {
    id: "Humidity",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    enabled: true,
    displayName: "Humidity",
    category: "🔧 Utilities",
    description: "Displays the current humidity.",
    icon: <IoWater size={24} />,
};

interface HumidityData {
    [x: string]: any;
    humidity: number;
}

const HumidityContent: React.FC<{ data: HumidityData | null }> = ({ data }) => {
    const [fontSize, setFontSize] = useState<string>("16px");
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width } = entry.contentRect;
            const newFontSize = `${Math.max(80, Math.floor(width / 4))}px`;
            setFontSize(newFontSize);
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="widget-container" style={{ width: "100%", height: "100%" }}>
            <div className="humidity" style={{ fontSize, textAlign: "center", whiteSpace: "nowrap", fontWeight: "bold", flexDirection: "row", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IoWaterSharp size={parseInt(fontSize) / 1.2} className="p-4" />
                {data ? `${data.toFixed(0)}%` : "Loading..."}
            </div>
        </div>
    );
};

const HumidityWidget: React.FC = () => {
    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/humidity`} // API endpoint for humidity data
            payload={null} // No payload needed for this endpoint
            title="Humidity" // Widget title
            updateInterval={60000} // Update every 60 seconds
            render={(data: HumidityData | null) => <HumidityContent data={data} />} // Pass the API response data to HumidityContent
        />
    );
};

export default HumidityWidget;