import React from "react";
import Widget from "./Widget";
import { calculateDateRange, processData, nFormatter, calculateTotal, calculatePercentageChange, getLatestEntry, getPreviousEntry } from "@/utils/helpers";
import config from "@/config";
import { SalesData, ProcessedSalesData } from "@/types";

/* 📊 OverviewWidget Component */
const OverviewWidget = ({ data }: { data: SalesData[] }) => {
    const { currentYear, lastYear, months } = calculateDateRange(12);

    // Process the data safely
    const groupedData: ProcessedSalesData[] = React.useMemo(
        () => processData(data, months),
        [data, months, currentYear, lastYear]
    );

    const totalSalesYTD = calculateTotal(groupedData, "currentYear");
    const latestEntry = getLatestEntry(groupedData);
    const previousEntry = getPreviousEntry(groupedData);

    return (
        <div className="overview-widget">
            {/* Sales YTD */}
            <OverviewSubwidget
                title="Sales YTD"
                value={totalSalesYTD}
                subtitle={calculatePercentageChange(latestEntry.currentYear, totalSalesYTD)}
            />

            {/* Sales This Month */}
            <OverviewSubwidget
                title="Sales This Month"
                value={latestEntry.currentYear}
                subtitle={calculatePercentageChange(latestEntry.currentYear, previousEntry.currentYear)}
            />

            {/* Sales This Week */}
            <OverviewSubwidget
                title="Sales This Week"
                value={latestEntry.currentYear}
                subtitle={calculatePercentageChange(latestEntry.currentYear, previousEntry.currentYear)}
            />
        </div>
    );
};

/* 🧩 Subwidget Component */
type OverviewSubwidgetProps = {
    title: string;
    value: number;
    subtitle: string;
};

const OverviewSubwidget = ({ title, value, subtitle }: OverviewSubwidgetProps) => (
    <div className="overview-subwidget">
        <div className="overview-header-container">
            <div className="overview-subwidget-value">${nFormatter(value, 2)}</div>
            <div className="overview-subwidget-subtitle percent">{subtitle}</div>
        </div>
        <div className="overview-subwidget-title">{title}</div>
    </div>
);

/* 📊 Main Overview Component */
export default function Overview() {
    const { startDateFormatted, endDateFormatted } = calculateDateRange(12);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                filters: `(
                    (sale_date >= '${startDateFormatted}' AND sale_date <= '${endDateFormatted}') 
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                sort: ["month ASC", "year ASC"],
            }}
            title=""
            updateInterval={300000}
            render={(data: SalesData[]) => <OverviewWidget data={data} />}
        />
    );
}