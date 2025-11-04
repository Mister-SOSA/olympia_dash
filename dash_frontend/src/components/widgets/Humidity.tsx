import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { IoWaterSharp } from "react-icons/io5";

interface HumidityData {
    [x: string]: any;
    humidity: number;
}

const HumidityContent: React.FC<{ data: HumidityData | null }> = ({ data }) => {
    const [fontSize, setFontSize] = useState<string>("16px");
    const [iconSize, setIconSize] = useState<number>(32);
    const [layoutMode, setLayoutMode] = useState<'compact' | 'medium' | 'full'>('full');
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;

            // Determine layout mode based on size
            if (width < 200 || height < 150) {
                setLayoutMode('compact');
                setFontSize(`${Math.max(24, Math.floor(width / 5))}px`);
                setIconSize(Math.max(20, Math.floor(width / 6)));
            } else if (width < 300 || height < 200) {
                setLayoutMode('medium');
                setFontSize(`${Math.max(28, Math.floor(width / 6))}px`);
                setIconSize(Math.max(24, Math.floor(width / 7)));
            } else {
                setLayoutMode('full');
                setFontSize(`${Math.max(32, Math.floor(width / 7))}px`);
                setIconSize(Math.max(28, Math.floor(width / 8)));
            }
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const humidityValue = data ? Number(data.toFixed(0)) : null;

    // Get color based on humidity level
    const getHumidityColor = (value: number) => {
        if (value < 30) return "#FFC107"; // Low - yellow
        if (value >= 30 && value < 60) return "#2196F3"; // Good - blue
        return "#FF5722"; // High - orange/red
    };

    // Get humidity level label
    const getHumidityLabel = (value: number) => {
        if (value < 30) return "Low";
        if (value >= 30 && value < 40) return "Comfortable";
        if (value >= 40 && value < 60) return "Ideal";
        if (value >= 60 && value < 70) return "Comfortable";
        return "High";
    };

    const color = humidityValue !== null ? getHumidityColor(humidityValue) : "#2196F3";
    const label = humidityValue !== null ? getHumidityLabel(humidityValue) : "";
    const fillPercentage = humidityValue !== null ? humidityValue : 0;

    // Compact layout for very small widgets
    if (layoutMode === 'compact') {
        return (
            <div
                ref={containerRef}
                className="widget-container"
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.5rem"
                }}
            >
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                    <IoWaterSharp
                        size={iconSize}
                        style={{
                            color: color,
                            flexShrink: 0,
                            transition: "color 0.3s ease"
                        }}
                    />
                    <span
                        style={{
                            fontSize,
                            fontWeight: "bold",
                            color: color,
                            transition: "color 0.3s ease",
                            whiteSpace: "nowrap"
                        }}
                    >
                        {humidityValue !== null ? `${humidityValue}%` : "--"}
                    </span>
                </div>
            </div>
        );
    }

    // Medium layout - value + bar only
    if (layoutMode === 'medium') {
        return (
            <div
                ref={containerRef}
                className="widget-container"
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    padding: "0.75rem"
                }}
            >
                {/* Icon and value */}
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                    <IoWaterSharp
                        size={iconSize}
                        style={{
                            color: color,
                            flexShrink: 0,
                            transition: "color 0.3s ease"
                        }}
                    />
                    <span
                        style={{
                            fontSize,
                            fontWeight: "bold",
                            color: color,
                            transition: "color 0.3s ease"
                        }}
                    >
                        {humidityValue !== null ? `${humidityValue}%` : "--"}
                    </span>
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        width: "85%",
                        height: "16px",
                        backgroundColor: "var(--ui-bg-tertiary)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid var(--ui-border-primary)",
                        opacity: 0.5
                    }}
                >
                    <div
                        style={{
                            width: `${fillPercentage}%`,
                            height: "100%",
                            backgroundColor: color,
                            transition: "width 0.5s ease, background-color 0.3s ease",
                            borderRadius: "8px"
                        }}
                    />
                    <div style={{ position: "absolute", left: "30%", top: 0, bottom: 0, width: "1px", backgroundColor: "var(--border-light)", opacity: 0.5 }} />
                    <div style={{ position: "absolute", left: "60%", top: 0, bottom: 0, width: "1px", backgroundColor: "var(--border-light)", opacity: 0.5 }} />
                </div>
            </div>
        );
    }

    // Full layout with all details
    return (
        <div
            ref={containerRef}
            className="widget-container"
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                padding: "1rem"
            }}
        >
            {/* Main humidity display with icon */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    marginBottom: "0.5rem"
                }}
            >
                <IoWaterSharp
                    size={iconSize}
                    style={{
                        color: color,
                        flexShrink: 0,
                        transition: "color 0.3s ease"
                    }}
                />
                <span
                    style={{
                        fontSize,
                        fontWeight: "bold",
                        color: color,
                        transition: "color 0.3s ease"
                    }}
                >
                    {humidityValue !== null ? `${humidityValue}%` : "--"}
                </span>
            </div>

            {/* Humidity meter bar */}
            <div
                style={{
                    width: "80%",
                    maxWidth: "300px",
                    height: "20px",
                    backgroundColor: "var(--ui-bg-tertiary)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    position: "relative",
                    border: "1px solid var(--ui-border-primary)",
                    opacity: 0.5
                }}
            >
                {/* Fill bar */}
                <div
                    style={{
                        width: `${fillPercentage}%`,
                        height: "100%",
                        backgroundColor: color,
                        transition: "width 0.5s ease, background-color 0.3s ease",
                        borderRadius: "10px"
                    }}
                />

                {/* Markers for ideal range */}
                <div
                    style={{
                        position: "absolute",
                        left: "30%",
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        backgroundColor: "var(--border-light)",
                        opacity: 0.5
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        left: "60%",
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        backgroundColor: "var(--border-light)",
                        opacity: 0.5
                    }}
                />
            </div>

            {/* Status label */}
            {humidityValue !== null && (
                <div
                    style={{
                        fontSize: `${Math.max(12, parseInt(fontSize) * 0.35)}px`,
                        color: "var(--text-secondary)",
                        fontWeight: "500",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}
                >
                    {label}
                </div>
            )}

            {/* Range indicators */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "80%",
                    maxWidth: "300px",
                    fontSize: `${Math.max(10, parseInt(fontSize) * 0.25)}px`,
                    color: "var(--text-muted)",
                    marginTop: "-0.25rem"
                }}
            >
                <span>0%</span>
                <span style={{ color: "rgba(33, 150, 243, 0.8)" }}>30-60%</span>
                <span>100%</span>
            </div>
        </div>
    );
};

const HumidityWidget: React.FC = () => {
    return (
        <Widget
            endpoint="/api/humidity"
            payload={undefined}
            title="Humidity"
            refreshInterval={60000}
        >
            {(data: HumidityData | null, loading) => {
                return <HumidityContent data={data} />;
            }}
        </Widget>
    );
};

export default HumidityWidget;