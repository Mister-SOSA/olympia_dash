import React, { useState, useEffect, useRef } from "react";
import Widget from "./Widget";
import { IoWaterSharp } from "react-icons/io5";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";

const WIDGET_ID = 'Humidity';

interface HumidityData {
    [x: string]: any;
    humidity: number;
}

const HumidityContent: React.FC<{ data: HumidityData | null }> = ({ data }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Get widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const lowThreshold = settings.lowThreshold as number;
    const highThreshold = settings.highThreshold as number;

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const humidityValue = data ? Number(data.toFixed(0)) : null;

    // Get color based on humidity level using configurable thresholds
    const getHumidityColor = (value: number) => {
        if (value < lowThreshold) return "#FF9500"; // Low - orange
        if (value >= lowThreshold && value < highThreshold) return "#007AFF"; // Good - blue
        return "#FF3B30"; // High - red
    };

    const color = humidityValue !== null ? getHumidityColor(humidityValue) : "#007AFF";
    const fillPercentage = humidityValue !== null ? humidityValue : 0;

    const { width, height } = dimensions;
    const aspectRatio = width / height;

    // VERTICAL (tall & narrow) - Wide bar with text inside
    if (aspectRatio < 0.7) {
        const barWidth = Math.min(width * 0.7, 120);
        const fontSize = Math.min(width * 0.3, height * 0.08, 42);

        return (
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                }}
            >
                <div style={{
                    width: `${barWidth}px`,
                    height: "80%",
                    maxHeight: "400px",
                    backgroundColor: "var(--ui-bg-tertiary)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
                }}>
                    {/* Fill */}
                    <div style={{
                        width: "100%",
                        height: `${fillPercentage}%`,
                        backgroundColor: color,
                        transition: "height 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                    }} />

                    {/* Text overlay */}
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.25rem",
                    }}>
                        <IoWaterSharp
                            size={fontSize * 0.8}
                            style={{
                                color: "var(--text-primary)",
                                opacity: 0.9,
                            }}
                        />
                        <div style={{
                            display: "flex",
                            alignItems: "baseline",
                        }}>
                            <span style={{
                                fontSize: `${fontSize}px`,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                lineHeight: 1,
                                letterSpacing: "-0.02em",
                            }}>
                                {humidityValue !== null ? humidityValue : "--"}
                            </span>
                            <span style={{
                                fontSize: `${fontSize * 0.5}px`,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                            }}>
                                %
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // HORIZONTAL (wide) - Simple horizontal bar
    if (aspectRatio > 1.6) {
        const barHeight = Math.min(height * 0.35, 50);
        const fontSize = Math.min(height * 0.4, 40);

        return (
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem 1.5rem",
                    gap: "1rem",
                }}
            >
                <div style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.5rem",
                    flexShrink: 0,
                }}>
                    <IoWaterSharp
                        size={fontSize * 0.6}
                        style={{
                            color,
                            marginBottom: fontSize * 0.05,
                        }}
                    />
                    <span style={{
                        fontSize: `${fontSize}px`,
                        fontWeight: 700,
                        color,
                        lineHeight: 1,
                    }}>
                        {humidityValue !== null ? humidityValue : "--"}
                    </span>
                    <span style={{
                        fontSize: `${fontSize * 0.45}px`,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                    }}>
                        %
                    </span>
                </div>

                <div style={{
                    flex: 1,
                    height: `${barHeight}px`,
                    backgroundColor: "var(--ui-bg-tertiary)",
                    borderRadius: "100px",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 4px rgba(0,0,0,0.1)",
                }}>
                    <div style={{
                        width: `${fillPercentage}%`,
                        height: "100%",
                        backgroundColor: color,
                        borderRadius: "100px",
                        transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    }} />
                </div>
            </div>
        );
    }

    // SQUARE/BALANCED - Circular gauge
    const gaugeSize = Math.min(width * 0.65, height * 0.65, 200);
    const strokeWidth = gaugeSize * 0.12;
    const radius = (gaugeSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (fillPercentage / 100) * circumference;
    const fontSize = gaugeSize * 0.28;

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
        >
            <div style={{ position: "relative", width: gaugeSize, height: gaugeSize }}>
                <svg
                    width={gaugeSize}
                    height={gaugeSize}
                    style={{ transform: "rotate(-90deg)" }}
                >
                    {/* Background circle */}
                    <circle
                        cx={gaugeSize / 2}
                        cy={gaugeSize / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--ui-bg-tertiary)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress circle */}
                    <circle
                        cx={gaugeSize / 2}
                        cy={gaugeSize / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{
                            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    />
                </svg>

                {/* Center text */}
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.25rem",
                }}>
                    <IoWaterSharp
                        size={fontSize * 0.6}
                        style={{ color, opacity: 0.9 }}
                    />
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                        <span style={{
                            fontSize: `${fontSize}px`,
                            fontWeight: 700,
                            color,
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                        }}>
                            {humidityValue !== null ? humidityValue : "--"}
                        </span>
                        <span style={{
                            fontSize: `${fontSize * 0.4}px`,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                        }}>
                            %
                        </span>
                    </div>
                </div>
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
            skeletonType="metric"
        >
            {(data: HumidityData | null, loading) => {
                return <HumidityContent data={data} />;
            }}
        </Widget>
    );
};

export default HumidityWidget;