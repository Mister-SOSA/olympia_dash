import { format, startOfMonth, endOfMonth, subMonths, subYears, eachMonthOfInterval } from "date-fns";
import { SalesData, ProcessedSalesData } from "@/types";

export const formatDate = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
};

export const calculateDateRange = (months: number) => {
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(endDate, months - 1));

    const startDateLastYear = subYears(startDate, 1);
    const endDateLastYear = subYears(endDate, 1);

    return {
        startDateFormatted: format(startDate, "yyyy-MM-dd"),
        endDateFormatted: format(endDate, "yyyy-MM-dd"),
        startDateLastYearFormatted: format(startDateLastYear, "yyyy-MM-dd"),
        endDateLastYearFormatted: format(endDateLastYear, "yyyy-MM-dd"),
        currentYear: endDate.getFullYear(),
        lastYear: endDateLastYear.getFullYear(),
        months: eachMonthOfInterval({ start: startDate, end: endDate }).map((date) =>
            format(date, "yyyy-MM")
        ),
    };
};

export const processData = (
    data: SalesData[],
    months: string[]
): ProcessedSalesData[] => {
    console.log("🗓️ Months for Comparison:", months);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Create a map for quick lookup
    const dataMap = new Map<string, number>();
    data.forEach(({ month, total }) => {
        dataMap.set(month, Math.trunc(total));
    });

    console.log("🗺️ Data Map:", dataMap);

    // Process each month
    const groupedData = months.map((currentMonth) => {
        const [currentYear, currentMonthNum] = currentMonth.split("-");
        const previousYear = (parseInt(currentYear, 10) - 1).toString();
        const previousMonth = `${previousYear}-${currentMonthNum}`;

        const monthName = `${monthNames[parseInt(currentMonthNum, 10) - 1]} ${currentYear}`;
        const previousMonthName = `${monthNames[parseInt(currentMonthNum, 10) - 1]} ${previousYear}`;

        // Fetch data for current and previous months
        const currentYearValue = dataMap.get(currentMonth) || 0;
        const lastYearValue = dataMap.get(previousMonth) || 0;

        console.log(
            `🔍 Month: ${monthName} | Current (${currentMonth}): ${currentYearValue} | Last (${previousMonth}): ${lastYearValue}`
        );

        return {
            month: monthName,
            currentYear: currentYearValue,
            lastYear: lastYearValue,
        };
    });

    console.log("✅ Final Processed Data:", groupedData);
    return groupedData;
};


export const prepareChartData = (data: ProcessedSalesData[]) => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ Chart data is empty or invalid!");
        return [];
    }

    return data.map((entry) => ({
        month: entry.month,
        currentYear: entry.currentYear || 0,
        lastYear: entry.lastYear || 0,
    }));
};

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

export const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : "-"}${nFormatter(Math.abs(change), 2)}%`;
};

export const calculateTotal = (data: ProcessedSalesData[], key: "currentYear" | "lastYear"): number => {
    return data.reduce((acc, entry) => acc + entry[key], 0);
};

export const getLatestEntry = (data: ProcessedSalesData[]): ProcessedSalesData => {
    return data[data.length - 1] || { month: "", currentYear: 0, lastYear: 0 };
};

export const getPreviousEntry = (data: ProcessedSalesData[]): ProcessedSalesData => {
    return data[data.length - 2] || { month: "", currentYear: 0, lastYear: 0 };
};
