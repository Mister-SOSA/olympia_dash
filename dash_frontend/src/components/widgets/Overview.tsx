import React, { useMemo } from "react";
import Widget from "./Widget";
import { nFormatter, calculatePercentageChange } from "@/utils/helpers";
import { SalesData } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* -------------------------------------- */
/* 📊 Types & Interfaces                  */
/* -------------------------------------- */

interface MetricData {
    title: string;
    value: number;
    changePercent: string;
    isToday?: boolean;
    tooltip?: string;
}

interface OverviewMetrics {
    totalSalesYTD: number;
    totalSalesPreviousYTD: number;
    totalSalesCurrentMonth: number;
    totalSalesPreviousMonth: number;
    totalSalesRolling7Days: number;
    totalSalesPreviousRolling7Days: number;
    totalSalesToday: number;
}

/* -------------------------------------- */
/* 📊 Helper Functions                    */
/* -------------------------------------- */

const calculateMetrics = (data: SalesData[], todayGMT: Date): OverviewMetrics => {
    const dailyData = data.map((entry) => ({
        ...entry,
        date: new Date(entry.period),
    }));

    // Year-to-Date (YTD)
    const startOfYearGMT = new Date(Date.UTC(todayGMT.getUTCFullYear(), 0, 1));
    const totalSalesYTD = dailyData
        .filter((entry) => entry.date >= startOfYearGMT && entry.date <= todayGMT)
        .reduce((sum, entry) => sum + entry.total, 0);

    const startOfPreviousYearGMT = new Date(Date.UTC(todayGMT.getUTCFullYear() - 1, 0, 1));
    const sameDayPreviousYearGMT = new Date(todayGMT);
    sameDayPreviousYearGMT.setUTCFullYear(todayGMT.getUTCFullYear() - 1);
    const totalSalesPreviousYTD = dailyData
        .filter((entry) => entry.date >= startOfPreviousYearGMT && entry.date <= sameDayPreviousYearGMT)
        .reduce((sum, entry) => sum + entry.total, 0);

    // Monthly Sales
    const startOfCurrentMonthGMT = new Date(Date.UTC(todayGMT.getUTCFullYear(), todayGMT.getUTCMonth(), 1));
    const startOfPreviousYearSameMonthGMT = new Date(
        Date.UTC(todayGMT.getUTCFullYear() - 1, todayGMT.getUTCMonth(), 1)
    );
    const totalSalesCurrentMonth = dailyData
        .filter((entry) => entry.date >= startOfCurrentMonthGMT && entry.date <= todayGMT)
        .reduce((sum, entry) => sum + entry.total, 0);

    const totalSalesPreviousMonth = dailyData
        .filter(
            (entry) =>
                entry.date >= startOfPreviousYearSameMonthGMT &&
                entry.date <= new Date(
                    Date.UTC(
                        startOfPreviousYearSameMonthGMT.getUTCFullYear(),
                        startOfPreviousYearSameMonthGMT.getUTCMonth(),
                        todayGMT.getUTCDate()
                    )
                )
        )
        .reduce((sum, entry) => sum + entry.total, 0);

    // Rolling 7-Day Sales
    const rolling7DaysStartGMT = new Date(todayGMT);
    rolling7DaysStartGMT.setUTCDate(todayGMT.getUTCDate() - 7);
    const rolling7DaysEndGMT = todayGMT;

    const previousRolling7DaysStartGMT = new Date(rolling7DaysStartGMT);
    previousRolling7DaysStartGMT.setUTCDate(previousRolling7DaysStartGMT.getUTCDate() - 7);
    const previousRolling7DaysEndGMT = new Date(rolling7DaysStartGMT);
    previousRolling7DaysEndGMT.setUTCDate(rolling7DaysStartGMT.getUTCDate() - 1);

    const totalSalesRolling7Days = dailyData
        .filter((entry) => entry.date >= rolling7DaysStartGMT && entry.date <= rolling7DaysEndGMT)
        .reduce((sum, entry) => sum + entry.total, 0);

    const totalSalesPreviousRolling7Days = dailyData
        .filter((entry) => entry.date >= previousRolling7DaysStartGMT && entry.date <= previousRolling7DaysEndGMT)
        .reduce((sum, entry) => sum + entry.total, 0);

    // Sales Today (GMT)
    const totalSalesToday = dailyData
        .filter((entry) => {
            const entryDate = new Date(entry.date);
            const normalizedEntryDate = new Date(
                Date.UTC(entryDate.getUTCFullYear(), entryDate.getUTCMonth(), entryDate.getUTCDate())
            );
            return normalizedEntryDate.getTime() === todayGMT.getTime();
        })
        .reduce((sum, entry) => sum + entry.total, 0);

    return {
        totalSalesYTD,
        totalSalesPreviousYTD,
        totalSalesCurrentMonth,
        totalSalesPreviousMonth,
        totalSalesRolling7Days,
        totalSalesPreviousRolling7Days,
        totalSalesToday,
    };
};

/* -------------------------------------- */
/* 📊 MetricCard Component                */
/* -------------------------------------- */

const MetricCard = ({ metric }: { metric: MetricData }) => {
    const getChangeStyle = (changePercent: string) => {
        if (!changePercent) return "neutral";
        if (changePercent.startsWith("+")) return "positive";
        if (changePercent.startsWith("-")) return "negative";
        return "neutral";
    };

    const getArrowIcon = (changePercent: string) => {
        if (changePercent.startsWith("+")) {
            return (
                <svg className="overview-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="18 15 12 9 6 15" />
                </svg>
            );
        }
        if (changePercent.startsWith("-")) {
            return (
                <svg className="overview-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            );
        }
        return null;
    };

    const changeStyle = getChangeStyle(metric.changePercent);

    return (
        <div className="overview-metric-card">
            <div className="overview-metric-header">
                <h3 className="overview-metric-title">{metric.title}</h3>
                {metric.changePercent && metric.tooltip && (
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`overview-metric-change overview-metric-change--${changeStyle}`}>
                                    {getArrowIcon(metric.changePercent)}
                                    <span>{metric.changePercent.replace(/[+-]/, '')}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="overview-tooltip">
                                <p>{metric.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="overview-metric-content">
                <div className="overview-metric-value">${nFormatter(metric.value, 2)}</div>
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 OverviewWidget Component            */
/* -------------------------------------- */

const OverviewWidget = ({ data }: { data: SalesData[] }) => {
    const now = new Date();
    const todayGMT = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const metrics = useMemo(() => calculateMetrics(data, todayGMT), [data, todayGMT]);

    const metricsData: MetricData[] = useMemo(
        () => [
            {
                title: "Sales YTD",
                value: metrics.totalSalesYTD,
                changePercent: calculatePercentageChange(metrics.totalSalesYTD, metrics.totalSalesPreviousYTD),
                tooltip: "Compared to same period last year (YTD)",
            },
            {
                title: "Sales This Month",
                value: metrics.totalSalesCurrentMonth,
                changePercent: calculatePercentageChange(
                    metrics.totalSalesCurrentMonth,
                    metrics.totalSalesPreviousMonth
                ),
                tooltip: "Compared to same month last year (month-to-date)",
            },
            {
                title: "Sales Last 7 Days",
                value: metrics.totalSalesRolling7Days,
                changePercent: calculatePercentageChange(
                    metrics.totalSalesRolling7Days,
                    metrics.totalSalesPreviousRolling7Days
                ),
                tooltip: "Compared to previous 7 days",
            },
            {
                title: "Sales Today",
                value: metrics.totalSalesToday,
                changePercent: "",
                isToday: true,
                tooltip: "",
            },
        ],
        [metrics]
    );

    return (
        <div className="overview-widget-container">
            <div className="overview-metrics-grid">
                {metricsData.map((metric, index) => (
                    <MetricCard key={`${metric.title}-${index}`} metric={metric} />
                ))}
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Main Overview Component             */
/* -------------------------------------- */

export default function Overview() {
    const previousYearStart = useMemo(
        () => new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0],
        []
    );
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);
    const sevenDaysAgoDate = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sevenDaysAgo.toISOString().split("T")[0];
    }, []);

    const widgetPayload = useMemo(
        () => ({
            module: "Overview",
            raw_query: `
        -- Fetch sales data for the last 7 days from orditem
        SELECT 
            FORMAT(duedate, 'yyyy-MM-dd') AS period,
            SUM(ext_price) AS total
        FROM 
            orditem
        WHERE 
            duedate >= '${sevenDaysAgoDate}'
            AND duedate <= '${currentDate}'
        GROUP BY 
            FORMAT(duedate, 'yyyy-MM-dd')

        UNION ALL

        -- Fetch sales data beyond the last 7 days (within the full year) from sumsales
        SELECT 
            FORMAT(sale_date, 'yyyy-MM-dd') AS period,
            SUM(sales_dol) AS total
        FROM 
            sumsales
        WHERE 
            sale_date >= '${previousYearStart}'
            AND sale_date < '${sevenDaysAgoDate}'
            AND sale_date <= '${currentDate}'
        GROUP BY 
            FORMAT(sale_date, 'yyyy-MM-dd')

        ORDER BY 
            period ASC;
      `,
        }),
        [sevenDaysAgoDate, currentDate, previousYearStart]
    );

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title=""
            refreshInterval={300000}
        >
            {(data: SalesData[], loading) => {
                if (loading) {
                    return <div className="widget-loading">Loading sales data...</div>;
                }

                if (!data || data.length === 0) {
                    return <div className="widget-empty">No sales data available</div>;
                }

                return <OverviewWidget data={data} />;
            }}
        </Widget>
    );
}