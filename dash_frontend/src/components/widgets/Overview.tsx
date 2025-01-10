import React, { useMemo } from "react";
import Widget from "./Widget";
import { nFormatter, calculatePercentageChange } from "@/utils/helpers";
import config from "@/config";
import { SalesData } from "@/types";

/* 📊 OverviewWidget Component */
const OverviewWidget = ({ data }: { data: SalesData[] }) => {
    const today = new Date();

    const metrics = useMemo(() => {
        const dailyData = data.map((entry) => ({
            ...entry,
            date: new Date(entry.period), // Convert period string to Date object
        }));

        // **Year-to-Date (YTD)**
        const startOfYear = new Date(today.getFullYear(), 0, 1); // Jan 1 of the current year
        const totalSalesYTD = dailyData
            .filter((entry) => entry.date >= startOfYear && entry.date <= today)
            .reduce((sum, entry) => sum + entry.total, 0);

        const startOfPreviousYear = new Date(today.getFullYear() - 1, 0, 1); // Jan 1 of the previous year
        const sameDayPreviousYear = new Date(today);
        sameDayPreviousYear.setFullYear(today.getFullYear() - 1);
        const totalSalesPreviousYTD = dailyData
            .filter((entry) => entry.date >= startOfPreviousYear && entry.date <= sameDayPreviousYear)
            .reduce((sum, entry) => sum + entry.total, 0);

        // **Monthly Sales (Matching Ranges Across Years)**
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1); // First day of this month
        const startOfPreviousYearSameMonth = new Date(today.getFullYear() - 1, today.getMonth(), 1); // First day of same month last year
        const totalSalesCurrentMonth = dailyData
            .filter((entry) => entry.date >= startOfCurrentMonth && entry.date <= today)
            .reduce((sum, entry) => sum + entry.total, 0);

        const totalSalesPreviousMonth = dailyData
            .filter(
                (entry) =>
                    entry.date >= startOfPreviousYearSameMonth &&
                    entry.date <= new Date(startOfPreviousYearSameMonth.getFullYear(), startOfPreviousYearSameMonth.getMonth(), today.getDate())
            )
            .reduce((sum, entry) => sum + entry.total, 0);

        // **Rolling 7-Day Sales**
        const rolling7DaysStart = new Date(today);
        rolling7DaysStart.setDate(today.getDate() - 8); // 7 days including today
        const rolling7DaysEnd = today;

        const previousRolling7DaysStart = new Date(rolling7DaysStart);
        previousRolling7DaysStart.setDate(previousRolling7DaysStart.getDate() - 8); // Previous 7-day range
        const previousRolling7DaysEnd = new Date(rolling7DaysStart);
        previousRolling7DaysEnd.setDate(rolling7DaysStart.getDate() - 1);

        const totalSalesRolling7Days = dailyData
            .filter((entry) => entry.date >= rolling7DaysStart && entry.date <= rolling7DaysEnd)
            .reduce((sum, entry) => sum + entry.total, 0);

        const totalSalesPreviousRolling7Days = dailyData
            .filter((entry) => entry.date >= previousRolling7DaysStart && entry.date <= previousRolling7DaysEnd)
            .reduce((sum, entry) => sum + entry.total, 0);

        return {
            totalSalesYTD,
            totalSalesPreviousYTD,
            totalSalesCurrentMonth,
            totalSalesPreviousMonth,
            totalSalesRolling7Days,
            totalSalesPreviousRolling7Days,
        };
    }, [data]);

    const {
        totalSalesYTD,
        totalSalesPreviousYTD,
        totalSalesCurrentMonth,
        totalSalesPreviousMonth,
        totalSalesRolling7Days,
        totalSalesPreviousRolling7Days,
    } = metrics;

    return (
        <div className="overview-widget">
            <OverviewSubwidget
                title="Sales YTD"
                value={totalSalesYTD}
                subtitle={calculatePercentageChange(totalSalesYTD, totalSalesPreviousYTD)}
            />
            <OverviewSubwidget
                title="Sales This Month"
                value={totalSalesCurrentMonth}
                subtitle={calculatePercentageChange(totalSalesCurrentMonth, totalSalesPreviousMonth)}
            />
            <OverviewSubwidget
                title="Sales (Last 7 Days)"
                value={totalSalesRolling7Days}
                subtitle={calculatePercentageChange(totalSalesRolling7Days, totalSalesPreviousRolling7Days)}
            />
            <OverviewSubwidget
                title="Sales Today"
                value={data[data.length - 1].total}
                subtitle=""
            />
        </div>
    );
};

const OverviewSubwidget = ({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: number;
    subtitle: string;
}) => {
    // Determine the class name for positive/negative/neutral percentage
    const subtitleClass = (() => {
        if (subtitle.startsWith("+")) return "percent positive";
        if (subtitle.startsWith("-")) return "percent negative";
        return "percent neutral";
    })();

    return (
        <div className="overview-subwidget">
            <div className="overview-header-container">
                <div className="overview-subwidget-value">${nFormatter(value, 2)}</div>
                <div className={`overview-subwidget-subtitle ${subtitleClass}`}>{subtitle}</div>
            </div>
            <div className="overview-subwidget-title">{title}</div>
        </div>
    );
};

/* 📊 Main Overview Component */
export default function Overview() {
    const previousYearStart = new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0];
    const currentDate = new Date().toISOString().split("T")[0];

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM-dd') AS period", "SUM(sales_dol) AS total"],
                filters: `(
                    sale_date >= '${previousYearStart}' 
                    AND sale_date <= '${currentDate}'
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM-dd')"],
                sort: ["period ASC"],
            }}
            title=""
            updateInterval={300000}
            render={(data: SalesData[]) => <OverviewWidget data={data} />}
        />
    );
}