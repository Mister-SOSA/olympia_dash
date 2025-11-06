import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";

/* -------------------------------------- */
/* 📊 Beef Price Data Types               */
/* -------------------------------------- */
interface BeefPriceData {
    date: string;       // MM/DD/YYYY format from API
    lean_50: number | null;
    lean_85: number | null;
}

interface BeefPriceStats {
    current50: number | null;
    current85: number | null;
    avg50: number;
    avg85: number;
    min50: number;
    max50: number;
    min85: number;
    max85: number;
    change50: number;
    change85: number;
}

type TimeRange = '7d' | '30d' | '90d' | '180d' | 'all';

/* -------------------------------------- */
/* 🔎 Responsive Configuration Hook       */
/* -------------------------------------- */
function useResponsiveConfig(ref: React.RefObject<HTMLDivElement | null>) {
    const [config, setConfig] = useState({
        showGrid: true,
        compactMode: false,
        strokeWidth: 2.5,
        fontSize: 11,
    });

    useEffect(() => {
        if (!ref.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                if (width >= 600 && height >= 300) {
                    setConfig({
                        showGrid: true,
                        compactMode: false,
                        strokeWidth: 2.5,
                        fontSize: 11,
                    });
                } else if (width >= 400 && height >= 200) {
                    setConfig({
                        showGrid: true,
                        compactMode: true,
                        strokeWidth: 2,
                        fontSize: 10,
                    });
                } else {
                    setConfig({
                        showGrid: false,
                        compactMode: true,
                        strokeWidth: 1.5,
                        fontSize: 9,
                    });
                }
            }
        });

        resizeObserver.observe(ref.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return config;
}

/* -------------------------------------- */
/* 📊 Price Display Component             */
/* -------------------------------------- */
interface PriceDisplayProps {
    price: number | null;
    change: number;
    color: string;
    label: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, change, color, label }) => {
    const formatChange = (val: number) => {
        const sign = val >= 0 ? '+' : '';
        return `${sign}${val.toFixed(1)}%`;
    };

    const changeColor = change >= 0 ? 'var(--success)' : 'var(--error)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ color, fontWeight: 700, fontSize: '24px', lineHeight: '1' }}>
                    ${price?.toFixed(2) || 'N/A'}
                </span>
                <span style={{ color: changeColor, fontSize: '16px', fontWeight: 600 }}>
                    {formatChange(change)}
                </span>
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Compact Time Range Selector         */
/* -------------------------------------- */
interface TimeRangeSelectorProps {
    selected: TimeRange;
    onChange: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onChange }) => {
    const ranges: { value: TimeRange; label: string }[] = [
        { value: '7d', label: '7D' },
        { value: '30d', label: '1M' },
        { value: '90d', label: '3M' },
        { value: '180d', label: '6M' },
        { value: 'all', label: 'ALL' },
    ];

    return (
        <div style={{
            display: 'flex',
            gap: '1px',
        }}>
            {ranges.map((range) => (
                <button
                    key={range.value}
                    onClick={() => onChange(range.value)}
                    style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: selected === range.value ? 'var(--text-primary)' : 'var(--text-muted)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: selected === range.value ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                        if (selected !== range.value) {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selected !== range.value) {
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }
                    }}
                >
                    {range.label}
                </button>
            ))}
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Custom Line Chart Component         */
/* -------------------------------------- */
interface CustomLineChartProps {
    data: BeefPriceData[];
    config: ReturnType<typeof useResponsiveConfig>;
}

const CustomLineChart: React.FC<CustomLineChartProps> = ({ data, config }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (!data.length || !dimensions.width) {
        return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
    }

    const padding = {
        top: 10,
        right: 15,
        bottom: 25,
        left: 50
    };
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Get min/max values for scaling
    const allPrices = data.flatMap(d => [d.lean_50, d.lean_85].filter(p => p !== null)) as number[];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const yMin = minPrice - priceRange * 0.1;
    const yMax = maxPrice + priceRange * 0.1;

    // Scale functions
    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (price: number) => padding.top + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

    // Generate points for each line
    const lean50Points = data
        .map((d, i) => (d.lean_50 !== null ? `${xScale(i)},${yScale(d.lean_50)}` : null))
        .filter(p => p !== null);
    const lean85Points = data
        .map((d, i) => (d.lean_85 !== null ? `${xScale(i)},${yScale(d.lean_85)}` : null))
        .filter(p => p !== null);

    // Format date for display
    const formatDate = (dateStr: string, short: boolean = false) => {
        const [month, day, year] = dateStr.split('/');
        if (short) return `${month}/${day}`;
        return `${month}/${day}/${year.slice(-2)}`;
    };

    // Generate Y-axis labels
    const yAxisSteps = config.compactMode ? 4 : 5;
    const yLabels = Array.from({ length: yAxisSteps }, (_, i) => {
        const value = yMin + (yMax - yMin) * (i / (yAxisSteps - 1));
        return value;
    });

    // Sample dates for X-axis labels based on data length
    const xLabelInterval = Math.max(1, Math.floor(data.length / (config.compactMode ? 5 : 8)));

    return (
        <div ref={chartRef} style={{ width: "100%", height: "100%", position: "relative" }}>
            <svg width={dimensions.width} height={dimensions.height} style={{ overflow: "visible" }}>
                {/* Grid lines */}
                {config.showGrid && yLabels.map((price, i) => {
                    const y = yScale(price);
                    return (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={dimensions.width - padding.right}
                                y2={y}
                                stroke="var(--border-light)"
                                strokeWidth="1"
                                opacity="0.3"
                            />
                            <text
                                x={padding.left - 8}
                                y={y}
                                textAnchor="end"
                                alignmentBaseline="middle"
                                fill="var(--text-secondary)"
                                fontSize="10"
                                fontWeight="500"
                            >
                                ${price.toFixed(2)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis date labels */}
                {data.map((d, i) => {
                    if (i % xLabelInterval !== 0 && i !== data.length - 1) return null;
                    const x = xScale(i);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={padding.top + chartHeight + 16}
                            textAnchor="middle"
                            fill="var(--text-secondary)"
                            fontSize="10"
                            fontWeight="500"
                        >
                            {formatDate(d.date, true)}
                        </text>
                    );
                })}

                {/* Smooth gradient fills */}
                {lean50Points.length > 1 && (
                    <>
                        <defs>
                            <linearGradient id="gradient50" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`${padding.left},${padding.top + chartHeight} ${lean50Points.join(' ')} ${dimensions.width - padding.right},${padding.top + chartHeight}`}
                            fill="url(#gradient50)"
                        />
                    </>
                )}
                {lean85Points.length > 1 && (
                    <>
                        <defs>
                            <linearGradient id="gradient85" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`${padding.left},${padding.top + chartHeight} ${lean85Points.join(' ')} ${dimensions.width - padding.right},${padding.top + chartHeight}`}
                            fill="url(#gradient85)"
                        />
                    </>
                )}

                {/* Smooth lines */}
                {lean50Points.length > 1 && (
                    <polyline
                        points={lean50Points.join(' ')}
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {lean85Points.length > 1 && (
                    <polyline
                        points={lean85Points.join(' ')}
                        fill="none"
                        stroke="var(--chart-2)"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Blinking endpoint indicators */}
                {data[data.length - 1].lean_50 !== null && (
                    <g className="endpoint-blink">
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].lean_50!)}
                            r="10"
                            fill="var(--chart-1)"
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].lean_50!)}
                            r="5"
                            fill="var(--chart-1)"
                        />
                    </g>
                )}
                {data[data.length - 1].lean_85 !== null && (
                    <g className="endpoint-blink">
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].lean_85!)}
                            r="10"
                            fill="var(--chart-2)"
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].lean_85!)}
                            r="5"
                            fill="var(--chart-2)"
                        />
                    </g>
                )}

                {/* Hover indicator */}
                {hoveredIndex !== null && hoveredIndex !== data.length - 1 && (() => {
                    const x = xScale(hoveredIndex);
                    const d = data[hoveredIndex];
                    return (
                        <g>
                            <line
                                x1={x}
                                y1={padding.top}
                                x2={x}
                                y2={padding.top + chartHeight}
                                stroke="var(--text-muted)"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity="0.4"
                            />
                            {d.lean_50 !== null && (
                                <circle
                                    cx={x}
                                    cy={yScale(d.lean_50)}
                                    r="4"
                                    fill="var(--chart-1)"
                                    stroke="var(--ui-bg-primary)"
                                    strokeWidth="2"
                                />
                            )}
                            {d.lean_85 !== null && (
                                <circle
                                    cx={x}
                                    cy={yScale(d.lean_85)}
                                    r="4"
                                    fill="var(--chart-2)"
                                    stroke="var(--ui-bg-primary)"
                                    strokeWidth="2"
                                />
                            )}
                        </g>
                    );
                })()}

                {/* Interactive overlay for hover detection */}
                <rect
                    x={padding.left}
                    y={padding.top}
                    width={chartWidth}
                    height={chartHeight}
                    fill="transparent"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left - padding.left;
                        const index = Math.round((x / chartWidth) * (data.length - 1));
                        if (index >= 0 && index < data.length) {
                            setHoveredIndex(index);
                        }
                    }}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'crosshair' }}
                />
            </svg>

            {/* Clean minimal tooltip */}
            {hoveredIndex !== null && (() => {
                const x = xScale(hoveredIndex);
                const tooltipX = x > dimensions.width / 2 ? x - 10 : x + 10;
                const tooltipAlign = x > dimensions.width / 2 ? 'right' : 'left';

                return (
                    <div
                        style={{
                            position: "absolute",
                            top: padding.top + 10,
                            [tooltipAlign]: tooltipAlign === 'left' ? tooltipX : dimensions.width - tooltipX,
                            backgroundColor: "var(--ui-bg-primary)",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--ui-border-primary)",
                            pointerEvents: "none",
                            zIndex: 1000,
                            whiteSpace: "nowrap",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "4px" }}>
                            {formatDate(data[hoveredIndex].date)}
                        </div>
                        {data[hoveredIndex].lean_50 !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: "2px" }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--chart-1)' }} />
                                <span style={{ color: "var(--chart-1)", fontSize: "13px", fontWeight: 700 }}>
                                    ${data[hoveredIndex].lean_50?.toFixed(2)}
                                </span>
                            </div>
                        )}
                        {data[hoveredIndex].lean_85 !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--chart-2)' }} />
                                <span style={{ color: "var(--chart-2)", fontSize: "13px", fontWeight: 700 }}>
                                    ${data[hoveredIndex].lean_85?.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })()}

            <style>{`
                @keyframes endpoint-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .endpoint-blink {
                    animation: endpoint-pulse 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 BeefPricesChart Component           */
/* -------------------------------------- */
export default function BeefPricesChart() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('180d');
    const config = useResponsiveConfig(containerRef);

    const calculateStats = useCallback((data: BeefPriceData[]): BeefPriceStats => {
        const lean50Values = data.map(d => d.lean_50).filter(p => p !== null) as number[];
        const lean85Values = data.map(d => d.lean_85).filter(p => p !== null) as number[];

        const current50 = data[data.length - 1]?.lean_50 ?? null;
        const current85 = data[data.length - 1]?.lean_85 ?? null;
        const first50 = data[0]?.lean_50 ?? null;
        const first85 = data[0]?.lean_85 ?? null;

        return {
            current50,
            current85,
            avg50: lean50Values.reduce((a, b) => a + b, 0) / lean50Values.length,
            avg85: lean85Values.reduce((a, b) => a + b, 0) / lean85Values.length,
            min50: Math.min(...lean50Values),
            max50: Math.max(...lean50Values),
            min85: Math.min(...lean85Values),
            max85: Math.max(...lean85Values),
            change50: first50 && current50 ? ((current50 - first50) / first50) * 100 : 0,
            change85: first85 && current85 ? ((current85 - first85) / first85) * 100 : 0,
        };
    }, []);

    const filterDataByTimeRange = useCallback((data: BeefPriceData[], range: TimeRange): BeefPriceData[] => {
        if (range === 'all') return data;

        const days = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '180d': 180,
        }[range];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return data.filter(item => {
            const [month, day, year] = item.date.split('/').map(Number);
            const itemDate = new Date(year, month - 1, day);
            return itemDate >= cutoffDate;
        });
    }, []);

    return (
        <div ref={containerRef} style={{ height: "100%", width: "100%", display: 'flex', flexDirection: 'column' }}>
            <Widget
                endpoint="/api/beef-prices"
                title="USDA Beef Prices (National)"
                refreshInterval={3600000} // Refresh every hour
            >
                {(data, loading) => {
                    if (!data || data.length === 0) {
                        return (
                            <div
                                className="widget-empty"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    gap: "8px",
                                }}
                            >
                                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
                                    No Price Data Available
                                </div>
                                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                                    Unable to load beef price data
                                </div>
                            </div>
                        );
                    }

                    const filteredData = filterDataByTimeRange(data, timeRange);
                    const stats = calculateStats(filteredData);

                    return (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {/* Header with prices and time range */}
                            <div style={{ 
                                padding: '12px 16px 8px',
                                borderBottom: '1px solid var(--ui-border-primary)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '32px' }}>
                                        <PriceDisplay 
                                            price={stats.current50} 
                                            change={stats.change50} 
                                            color="var(--chart-1)" 
                                            label="50% LEAN" 
                                        />
                                        <PriceDisplay 
                                            price={stats.current85} 
                                            change={stats.change85} 
                                            color="var(--chart-2)" 
                                            label="85% LEAN" 
                                        />
                                    </div>
                                    <TimeRangeSelector
                                        selected={timeRange}
                                        onChange={setTimeRange}
                                    />
                                </div>
                            </div>
                            {/* Chart */}
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <CustomLineChart data={filteredData} config={config} />
                            </div>
                        </div>
                    );
                }}
            </Widget>
        </div>
    );
}
