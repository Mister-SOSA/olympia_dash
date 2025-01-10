import {
    format,
    subDays,
    subWeeks,
    subMonths,
    subYears,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
} from "date-fns";
import { SalesData, ProcessedSalesData } from "@/types";

/* -------------------------------------- */
/* 📅 Date Helpers                        */
/* -------------------------------------- */

export const formatDate = (date: Date): string => format(date, "yyyy-MM-dd");

export const calculateDateRange = (
    interval: number,
    resolution: "daily" | "weekly" | "monthly",
    referenceDate = new Date()
) => {
    const endDate = referenceDate;
    let startDate, periods;

    switch (resolution) {
        case "daily":
            startDate = subDays(endDate, interval - 1);
            periods = eachDayOfInterval({ start: startDate, end: endDate }).map((date) =>
                format(date, "yyyy-MM-dd")
            );
            break;
        case "weekly":
            startDate = subWeeks(endDate, interval - 1);
            periods = eachWeekOfInterval({ start: startDate, end: endDate }).map((date) =>
                format(date, "yyyy-'W'ww")
            );
            break;
        case "monthly":
            startDate = subMonths(endDate, interval - 1);
            periods = eachMonthOfInterval({ start: startDate, end: endDate }).map((date) =>
                format(date, "yyyy-MM")
            );
            break;
        default:
            throw new Error("Unsupported resolution.");
    }

    const lastYearStartDate = subYears(startDate, 1);
    const lastYearEndDate = subYears(endDate, 1);

    return {
        current: { start: startDate, end: endDate, periods },
        lastYear: { start: lastYearStartDate, end: lastYearEndDate },
    };
};

export const determinePreviousPeriod = (period: string): string => {
    if (period.includes("W")) {
        const [year, week] = period.split("-W");
        const currentDate = new Date(`${year}-01-01`);
        const previousWeek = subWeeks(currentDate, 1);
        return format(previousWeek, "yyyy-'W'ww");
    } else if (period.includes("-")) {
        const previousMonth = subMonths(new Date(`${period}-01`), 1);
        return format(previousMonth, "yyyy-MM");
    } else {
        const previousDay = subDays(new Date(period), 1);
        return format(previousDay, "yyyy-MM-dd");
    }
};

export const formatPeriodLabel = (period: string): string => {
    if (period.includes("W")) {
        return `Week ${period.split("-W")[1]}, ${period.split("-")[0]}`;
    } else if (period.includes("-")) {
        const [year, month] = period.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    }
    return period;
};

/* -------------------------------------- */
/* 🛠️ Data Processing Helpers             */
/* -------------------------------------- */

export const processSalesData = (
    data: SalesData[],
    periods: string[]
): ProcessedSalesData[] => {
    const dataMap = new Map(data.map(({ period, total }) => [period, total]));

    return periods.map((currentPeriod) => {
        const previousPeriod = determinePreviousPeriod(currentPeriod);

        return {
            period: currentPeriod,
            periodLabel: formatPeriodLabel(currentPeriod), // Ensure periodLabel is added
            currentPeriodSales: dataMap.get(currentPeriod) || 0,
            previousPeriodSales: dataMap.get(previousPeriod) || 0,
        };
    });
};

export const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) {
        return current === 0 ? "0%" : "N/A"; // No change or undefined
    }
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
};

export const calculateTotal = (data: ProcessedSalesData[], key: "currentPeriodSales" | "previousPeriodSales"): number =>
    data.reduce((acc, entry) => acc + entry[key], 0);

/* -------------------------------------- */
/* 📊 Chart Formatting Helpers            */
/* -------------------------------------- */

export const nFormatter = (num: number, digits: number): string => {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "B" },
        { value: 1e12, symbol: "T" },
    ];
    const item = lookup.findLast((item) => num >= item.value);
    return item
        ? (num / item.value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/, "") + item.symbol
        : "0";
};

export const prepareChartData = (data: ProcessedSalesData[]) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ Chart data is empty or invalid!");
        return [];
    }

    return data.map((entry) => ({
        period: entry.period,              // Keep original fields
        periodLabel: entry.periodLabel,    // Preserve periodLabel
        currentPeriodSales: entry.currentPeriodSales,
        previousPeriodSales: entry.previousPeriodSales,
    }));
};