import React from "react";
import { nFormatter } from "@/utils/helpers";

interface LegendItem {
    name: string;
    value: number;
    color: string;
    percent: number;
}

interface PieChartLegendProps {
    data: LegendItem[];
    activeIndex: number | null;
    onItemClick: (index: number) => void;
    position: "right" | "bottom";
}

export const PieChartLegend: React.FC<PieChartLegendProps> = ({
    data,
    activeIndex,
    onItemClick,
    position,
}) => {
    const isVertical = position === "right";

    return (
        <div
            className="pie-chart-legend"
            style={{
                display: "flex",
                flexDirection: isVertical ? "column" : "row",
                flexWrap: isVertical ? "nowrap" : "wrap",
                gap: "0.5rem",
                justifyContent: isVertical ? "flex-start" : "center",
                alignItems: isVertical ? "stretch" : "center",
                padding: isVertical ? "0.5rem" : "0.5rem 0",
                width: "100%",
                height: "100%",
                overflowY: isVertical ? "auto" : "visible",
                overflowX: "hidden",
            }}
        >
            {data.map((entry, index) => (
                <div
                    key={`legend-${index}`}
                    onClick={() => onItemClick(index)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        opacity: activeIndex === null || activeIndex === index ? 1 : 0.4,
                        transition: "all 0.2s ease",
                        padding: "0.35rem 0.5rem",
                        borderRadius: "0.375rem",
                        backgroundColor:
                            activeIndex === index
                                ? "rgba(255, 255, 255, 0.12)"
                                : "transparent",
                        minWidth: 0,
                        flex: isVertical ? "0 0 auto" : "0 0 auto",
                    }}
                    onMouseEnter={(e) => {
                        if (activeIndex !== index) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeIndex !== index) {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }
                    }}
                >
                    <div
                        style={{
                            width: "0.875rem",
                            height: "0.875rem",
                            borderRadius: "0.1875rem",
                            backgroundColor: entry.color,
                            flexShrink: 0,
                            boxShadow: activeIndex === index
                                ? `0 0 0 2px ${entry.color}40`
                                : "none",
                            transition: "box-shadow 0.2s ease",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: isVertical ? "column" : "row",
                            gap: isVertical ? "0.125rem" : "0.5rem",
                            minWidth: 0,
                            flex: 1,
                            alignItems: isVertical ? "flex-start" : "center",
                        }}
                    >
                        <span
                            style={{
                                fontWeight: 600,
                                fontSize: "0.8125rem",
                                lineHeight: "1.2",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "rgba(255, 255, 255, 0.95)",
                            }}
                        >
                            {entry.name}
                        </span>
                        <span
                            style={{
                                fontSize: "0.75rem",
                                lineHeight: "1.2",
                                color: "rgba(255, 255, 255, 0.65)",
                                whiteSpace: "nowrap",
                                fontWeight: 500,
                            }}
                        >
                            ${nFormatter(entry.value, 1)} • {Math.round(entry.percent)}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};
