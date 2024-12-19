import { SalesData } from "@/types";

export const formatDate = (date: Date, day: number): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const calculateDates = (months: number) => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const sixMonthsAgo = new Date(endOfMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - (months - 1));

    const sixMonthsAgoLastYear = new Date(sixMonthsAgo);
    sixMonthsAgoLastYear.setFullYear(sixMonthsAgoLastYear.getFullYear() - 1);

    const endOfMonthLastYear = new Date(endOfMonth);
    endOfMonthLastYear.setFullYear(endOfMonthLastYear.getFullYear() - 1);

    return {
        sixMonthsAgoFormatted: formatDate(sixMonthsAgo, 1),
        endOfMonthFormatted: formatDate(endOfMonth, endOfMonth.getDate()),
        sixMonthsAgoLastYearFormatted: formatDate(sixMonthsAgoLastYear, 1),
        endOfMonthLastYearFormatted: formatDate(endOfMonthLastYear, endOfMonthLastYear.getDate()),
        currentYear: today.getFullYear(),
    };
};

export const processData = (data: SalesData[], currentYear: number) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataMap = new Map<string, { currentYear: number; lastYear: number }>();

    data.forEach(({ month, total, year }) => {
        const monthKey = month.split("-")[1];
        if (!dataMap.has(monthKey)) {
            dataMap.set(monthKey, { currentYear: 0, lastYear: 0 });
        }

        const values = dataMap.get(monthKey)!;
        if (year === currentYear) {
            values.currentYear = Math.trunc(total);
        } else {
            values.lastYear = Math.trunc(total);
        }
    });

    return Array.from(dataMap.entries()).map(([monthKey, values]) => ({
        month: monthNames[parseInt(monthKey, 10) - 1],
        ...values,
    }));
};

export const nFormatter = (num: number, digits: number) => {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
    ];
    const item = lookup.findLast((item) => num >= item.value);
    return item
        ? (num / item.value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/, "") + item.symbol
        : "0";
};