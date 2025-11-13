import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter } from "@/utils/helpers";
import appConfig from "@/config";
import { authService } from "@/lib/auth";

/* -------------------------------------- */
/* 📊 Beef Price Data Types               */
/* -------------------------------------- */
interface BeefPriceData {
    date: string;       // MM/DD/YYYY format from API
    lean_50: number | null;
    lean_85: number | null;
    beef_heart: number | null;
}

interface BeefPriceStats {
    current50: number | null;
    current85: number | null;
    currentHeart: number | null;
    avg50: number;
    avg85: number;
    avgHeart: number;
    min50: number;
    max50: number;
    min85: number;
    max85: number;
    minHeart: number;
    maxHeart: number;
    change50: number;
    change85: number;
    changeHeart: number;
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
                    ${price?.toFixed(2) || 'N/A'}<span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>/lb</span>
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

    // Convert prices from cents to dollars per pound (divide by 100 for lean, beef_heart is already $/lb)
    const convertPrice = (price: number, isHeart: boolean = false) => isHeart ? price : price / 100;

    // Get min/max values for scaling
    const allPrices = data.flatMap(d => [
        d.lean_50 ? convertPrice(d.lean_50) : null,
        d.lean_85 ? convertPrice(d.lean_85) : null,
        d.beef_heart ? d.beef_heart : null
    ].filter(p => p !== null)) as number[];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const yMin = minPrice - priceRange * 0.1;
    const yMax = maxPrice + priceRange * 0.1;

    // Scale functions
    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (price: number) => padding.top + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

    // Generate points for each line (convert prices to per-pound)
    const lean50Points = data
        .map((d, i) => (d.lean_50 !== null ? `${xScale(i)},${yScale(convertPrice(d.lean_50))}` : null))
        .filter(p => p !== null);
    const lean85Points = data
        .map((d, i) => (d.lean_85 !== null ? `${xScale(i)},${yScale(convertPrice(d.lean_85))}` : null))
        .filter(p => p !== null);
    const beefHeartPoints = data
        .map((d, i) => (d.beef_heart !== null ? `${xScale(i)},${yScale(d.beef_heart)}` : null))
        .filter(p => p !== null);

    // Format date for display
    const formatDate = (dateStr: string, formatType: 'month' | 'monthYear' | 'short' = 'short') => {
        const [month, day, year] = dateStr.split('/');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (formatType === 'month') return monthNames[parseInt(month) - 1];
        if (formatType === 'monthYear') return `${monthNames[parseInt(month) - 1]} '${year.slice(-2)}`;
        return `${month}/${day}`;
    };

    // Generate Y-axis labels
    const yAxisSteps = config.compactMode ? 4 : 5;
    const yLabels = Array.from({ length: yAxisSteps }, (_, i) => {
        const value = yMin + (yMax - yMin) * (i / (yAxisSteps - 1));
        return value;
    });

    // Intelligent X-axis label selection
    const getXAxisLabels = () => {
        const labels: { index: number; date: string; isMonthStart: boolean; isFirstOfYear: boolean }[] = [];
        let lastMonth = -1;
        let lastYear = -1;

        data.forEach((d, i) => {
            const [month, day, year] = d.date.split('/').map(Number);
            const isMonthStart = month !== lastMonth;
            const isFirstOfYear = year !== lastYear && i > 0;

            if (isMonthStart) {
                labels.push({
                    index: i,
                    date: d.date,
                    isMonthStart: true,
                    isFirstOfYear
                });
                lastMonth = month;
            }

            if (year !== lastYear) {
                lastYear = year;
            }
        });

        // For short time ranges, add week markers between months
        if (data.length <= 90 && labels.length < 8) {
            const weekLabels: typeof labels = [];
            data.forEach((d, i) => {
                const [month, day] = d.date.split('/').map(Number);
                // Add label every 7 days if it's not already a month start
                if (i % 7 === 0 && !labels.find(l => l.index === i)) {
                    weekLabels.push({
                        index: i,
                        date: d.date,
                        isMonthStart: false,
                        isFirstOfYear: false
                    });
                }
            });

            // Merge and sort
            return [...labels, ...weekLabels].sort((a, b) => a.index - b.index);
        }

        // For longer ranges, potentially thin out labels if too dense
        if (labels.length > 12) {
            return labels.filter((_, i) => i % 2 === 0 || i === labels.length - 1);
        }

        return labels;
    };

    const xAxisLabels = getXAxisLabels();

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
                                ${price.toFixed(2)}/lb
                            </text>
                        </g>
                    );
                })}

                {/* Vertical gridlines for month starts */}
                {xAxisLabels
                    .filter(label => label.isMonthStart)
                    .map((label) => {
                        const x = xScale(label.index);
                        return (
                            <line
                                key={`vgrid-${label.index}`}
                                x1={x}
                                y1={padding.top}
                                x2={x}
                                y2={padding.top + chartHeight}
                                stroke="var(--border-light)"
                                strokeWidth="1.5"
                                opacity="0.4"
                                strokeDasharray="4 4"
                            />
                        );
                    })
                }

                {/* X-axis date labels */}
                {xAxisLabels.map((label) => {
                    const x = xScale(label.index);
                    const labelText = label.isMonthStart
                        ? (label.isFirstOfYear ? formatDate(label.date, 'monthYear') : formatDate(label.date, 'month'))
                        : formatDate(label.date, 'short');

                    return (
                        <text
                            key={label.index}
                            x={x}
                            y={padding.top + chartHeight + 16}
                            textAnchor="middle"
                            fill={label.isMonthStart ? 'var(--text-primary)' : 'var(--text-secondary)'}
                            fontSize={label.isMonthStart ? "10" : "9"}
                            fontWeight={label.isMonthStart ? "600" : "500"}
                        >
                            {labelText}
                        </text>
                    );
                })}

                {/* Smooth gradient fills */}
                {lean50Points.length > 1 && (
                    <>
                        <defs>
                            <linearGradient id="gradient50" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--line-chart-1)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--line-chart-1)" stopOpacity="0" />
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
                                <stop offset="0%" stopColor="var(--line-chart-2)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--line-chart-2)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`${padding.left},${padding.top + chartHeight} ${lean85Points.join(' ')} ${dimensions.width - padding.right},${padding.top + chartHeight}`}
                            fill="url(#gradient85)"
                        />
                    </>
                )}
                {beefHeartPoints.length > 1 && (
                    <>
                        <defs>
                            <linearGradient id="gradientHeart" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--line-chart-3)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="var(--line-chart-3)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`${padding.left},${padding.top + chartHeight} ${beefHeartPoints.join(' ')} ${dimensions.width - padding.right},${padding.top + chartHeight}`}
                            fill="url(#gradientHeart)"
                        />
                    </>
                )}

                {/* Smooth lines */}
                {lean50Points.length > 1 && (
                    <polyline
                        points={lean50Points.join(' ')}
                        fill="none"
                        stroke="var(--line-chart-1)"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {lean85Points.length > 1 && (
                    <polyline
                        points={lean85Points.join(' ')}
                        fill="none"
                        stroke="var(--line-chart-2)"
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {beefHeartPoints.length > 1 && (
                    <polyline
                        points={beefHeartPoints.join(' ')}
                        fill="none"
                        stroke="var(--line-chart-3)"
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
                            cy={yScale(convertPrice(data[data.length - 1].lean_50!))}
                            r="10"
                            fill="var(--line-chart-1)"
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(convertPrice(data[data.length - 1].lean_50!))}
                            r="5"
                            fill="var(--line-chart-1)"
                        />
                    </g>
                )}
                {data[data.length - 1].lean_85 !== null && (
                    <g className="endpoint-blink">
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(convertPrice(data[data.length - 1].lean_85!))}
                            r="10"
                            fill="var(--line-chart-2)"
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(convertPrice(data[data.length - 1].lean_85!))}
                            r="5"
                            fill="var(--line-chart-2)"
                        />
                    </g>
                )}
                {data[data.length - 1].beef_heart !== null && (
                    <g className="endpoint-blink">
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].beef_heart!)}
                            r="10"
                            fill="var(--line-chart-3)"
                            opacity="0.2"
                        />
                        <circle
                            cx={xScale(data.length - 1)}
                            cy={yScale(data[data.length - 1].beef_heart!)}
                            r="5"
                            fill="var(--line-chart-3)"
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
                                    cy={yScale(convertPrice(d.lean_50))}
                                    r="4"
                                    fill="var(--line-chart-1)"
                                    stroke="var(--ui-bg-primary)"
                                    strokeWidth="2"
                                />
                            )}
                            {d.lean_85 !== null && (
                                <circle
                                    cx={x}
                                    cy={yScale(convertPrice(d.lean_85))}
                                    r="4"
                                    fill="var(--line-chart-2)"
                                    stroke="var(--ui-bg-primary)"
                                    strokeWidth="2"
                                />
                            )}
                            {d.beef_heart !== null && (
                                <circle
                                    cx={x}
                                    cy={yScale(d.beef_heart)}
                                    r="4"
                                    fill="var(--line-chart-3)"
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
                        <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "4px", fontWeight: 600 }}>
                            {formatDate(data[hoveredIndex].date, 'monthYear')}
                        </div>
                        {data[hoveredIndex].lean_85 !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: "2px" }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--line-chart-2)' }} />
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>85% Lean:</span>
                                <span style={{ color: "var(--line-chart-2)", fontSize: "13px", fontWeight: 700 }}>
                                    ${(convertPrice(data[hoveredIndex].lean_85!)).toFixed(2)}/lb
                                </span>
                            </div>
                        )}
                        {data[hoveredIndex].lean_50 !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: "2px" }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--line-chart-1)' }} />
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>50% Lean:</span>
                                <span style={{ color: "var(--line-chart-1)", fontSize: "13px", fontWeight: 700 }}>
                                    ${(convertPrice(data[hoveredIndex].lean_50!)).toFixed(2)}/lb
                                </span>
                            </div>
                        )}
                        {data[hoveredIndex].beef_heart !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--line-chart-3)' }} />
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginRight: "4px" }}>Beef Heart:</span>
                                <span style={{ color: "var(--line-chart-3)", fontSize: "13px", fontWeight: 700 }}>
                                    ${data[hoveredIndex].beef_heart!.toFixed(2)}/lb
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
    const [combinedData, setCombinedData] = useState<BeefPriceData[]>([]);
    const [loading, setLoading] = useState(true);
    const config = useResponsiveConfig(containerRef);

    // Fetch and merge beef prices with beef heart prices
    useEffect(() => {
        const fetchAllPrices = async () => {
            try {
                setLoading(true);

                // Fetch both datasets in parallel using authService
                const [beefPricesRes, beefHeartRes] = await Promise.all([
                    authService.fetchWithAuth(`${appConfig.API_BASE_URL}/api/beef-prices`),
                    authService.fetchWithAuth(`${appConfig.API_BASE_URL}/api/beef-heart-prices`)
                ]);

                const beefPricesData = await beefPricesRes.json();
                const beefHeartData = await beefHeartRes.json();

                if (beefPricesData.success && beefHeartData.success) {
                    // Create a map of beef heart prices by date
                    const heartPriceMap = new Map<string, number>();
                    beefHeartData.data.forEach((item: { date: string; beef_heart: number }) => {
                        heartPriceMap.set(item.date, item.beef_heart);
                    });

                    // Merge the data
                    const merged: BeefPriceData[] = beefPricesData.data.map((item: any) => ({
                        date: item.date,
                        lean_50: item.lean_50,
                        lean_85: item.lean_85,
                        beef_heart: heartPriceMap.get(item.date) || null
                    }));

                    // Also add any heart prices that don't have corresponding beef prices
                    beefHeartData.data.forEach((item: { date: string; beef_heart: number }) => {
                        if (!merged.find(m => m.date === item.date)) {
                            merged.push({
                                date: item.date,
                                lean_50: null,
                                lean_85: null,
                                beef_heart: item.beef_heart
                            });
                        }
                    });

                    // Sort by date
                    merged.sort((a, b) => {
                        const [monthA, dayA, yearA] = a.date.split('/').map(Number);
                        const [monthB, dayB, yearB] = b.date.split('/').map(Number);
                        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
                    });

                    // Forward-fill missing values for lean datasets
                    let lastLean50: number | null = null;
                    let lastLean85: number | null = null;

                    const leanFilled = merged.map(item => {
                        if (item.lean_50 !== null) lastLean50 = item.lean_50;
                        if (item.lean_85 !== null) lastLean85 = item.lean_85;

                        return {
                            date: item.date,
                            lean_50: item.lean_50 ?? lastLean50,
                            lean_85: item.lean_85 ?? lastLean85,
                            beef_heart: item.beef_heart
                        };
                    });

                    // Linear interpolation for beef heart (weekly data)
                    const heartInterpolated = leanFilled.map((item, index) => {
                        if (item.beef_heart !== null) {
                            // This is a real data point, keep it
                            return item;
                        }

                        // Find the previous and next actual beef heart values
                        let prevIndex = index - 1;
                        let nextIndex = index + 1;

                        while (prevIndex >= 0 && leanFilled[prevIndex].beef_heart === null) {
                            prevIndex--;
                        }

                        while (nextIndex < leanFilled.length && leanFilled[nextIndex].beef_heart === null) {
                            nextIndex++;
                        }

                        // If we have both previous and next values, interpolate
                        if (prevIndex >= 0 && nextIndex < leanFilled.length) {
                            const prevValue = leanFilled[prevIndex].beef_heart!;
                            const nextValue = leanFilled[nextIndex].beef_heart!;
                            const totalGap = nextIndex - prevIndex;
                            const currentGap = index - prevIndex;
                            const interpolatedValue = prevValue + ((nextValue - prevValue) * currentGap / totalGap);

                            return {
                                ...item,
                                beef_heart: interpolatedValue
                            };
                        }

                        // If we only have previous value (at the end), forward fill
                        if (prevIndex >= 0) {
                            return {
                                ...item,
                                beef_heart: leanFilled[prevIndex].beef_heart
                            };
                        }

                        // If we only have next value (at the beginning), backward fill
                        if (nextIndex < leanFilled.length) {
                            return {
                                ...item,
                                beef_heart: leanFilled[nextIndex].beef_heart
                            };
                        }

                        // No values found at all
                        return item;
                    });

                    setCombinedData(heartInterpolated);
                }
            } catch (error) {
                console.error('Error fetching beef prices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPrices();

        // Refresh every hour
        const interval = setInterval(fetchAllPrices, 3600000);
        return () => clearInterval(interval);
    }, []);

    const calculateStats = useCallback((data: BeefPriceData[]): BeefPriceStats => {
        const lean50Values = data.map(d => d.lean_50).filter(p => p !== null).map(p => p! / 100) as number[];
        const lean85Values = data.map(d => d.lean_85).filter(p => p !== null).map(p => p! / 100) as number[];
        const beefHeartValues = data.map(d => d.beef_heart).filter(p => p !== null) as number[];

        const current50 = data[data.length - 1]?.lean_50 !== null ? data[data.length - 1].lean_50! / 100 : null;
        const current85 = data[data.length - 1]?.lean_85 !== null ? data[data.length - 1].lean_85! / 100 : null;
        const currentHeart = data[data.length - 1]?.beef_heart !== null ? data[data.length - 1].beef_heart! : null;
        const first50 = data[0]?.lean_50 !== null ? data[0].lean_50! / 100 : null;
        const first85 = data[0]?.lean_85 !== null ? data[0].lean_85! / 100 : null;
        const firstHeart = data[0]?.beef_heart !== null ? data[0].beef_heart! : null;

        return {
            current50,
            current85,
            currentHeart,
            avg50: lean50Values.length > 0 ? lean50Values.reduce((a, b) => a + b, 0) / lean50Values.length : 0,
            avg85: lean85Values.length > 0 ? lean85Values.reduce((a, b) => a + b, 0) / lean85Values.length : 0,
            avgHeart: beefHeartValues.length > 0 ? beefHeartValues.reduce((a, b) => a + b, 0) / beefHeartValues.length : 0,
            min50: lean50Values.length > 0 ? Math.min(...lean50Values) : 0,
            max50: lean50Values.length > 0 ? Math.max(...lean50Values) : 0,
            min85: lean85Values.length > 0 ? Math.min(...lean85Values) : 0,
            max85: lean85Values.length > 0 ? Math.max(...lean85Values) : 0,
            minHeart: beefHeartValues.length > 0 ? Math.min(...beefHeartValues) : 0,
            maxHeart: beefHeartValues.length > 0 ? Math.max(...beefHeartValues) : 0,
            change50: first50 && current50 ? ((current50 - first50) / first50) * 100 : 0,
            change85: first85 && current85 ? ((current85 - first85) / first85) * 100 : 0,
            changeHeart: firstHeart && currentHeart ? ((currentHeart - firstHeart) / firstHeart) * 100 : 0,
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
            <div style={{
                backgroundColor: 'var(--ui-bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--ui-border-primary)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Widget Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--ui-border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0
                    }}>
                        USDA Beef Prices (National)
                    </h3>
                </div>

                {/* Widget Content */}
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            flex: 1
                        }}
                    >
                        <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                            Loading price data...
                        </div>
                    </div>
                ) : !combinedData || combinedData.length === 0 ? (
                    <div
                        className="widget-empty"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            flex: 1,
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
                ) : (
                    (() => {
                        const filteredData = filterDataByTimeRange(combinedData, timeRange);
                        const stats = calculateStats(filteredData);

                        return (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                {/* Header with prices and time range */}
                                <div style={{
                                    padding: '12px 16px 8px',
                                    borderBottom: '1px solid var(--ui-border-primary)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                            {[
                                                { price: stats.current85, change: stats.change85, color: 'var(--line-chart-2)', label: '85% LEAN' },
                                                { price: stats.current50, change: stats.change50, color: 'var(--line-chart-1)', label: '50% LEAN' },
                                                { price: stats.currentHeart, change: stats.changeHeart, color: 'var(--line-chart-3)', label: 'BEEF HEART' }
                                            ]
                                                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                                                .map((item, index) => (
                                                    <PriceDisplay
                                                        key={index}
                                                        price={item.price}
                                                        change={item.change}
                                                        color={item.color}
                                                        label={item.label}
                                                    />
                                                ))
                                            }
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
                    })()
                )}
            </div>
        </div>
    );
}
